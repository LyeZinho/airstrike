//! Tile manager: downloads OSM map tiles, caches them on disk, and renders them via SDL2.

use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::mpsc::{self, Receiver, Sender};

use sdl2::pixels::{Color, PixelFormatEnum};
use sdl2::rect::Rect;
use sdl2::render::{Canvas, Texture, TextureCreator};
use sdl2::video::{Window, WindowContext};

use crate::ui::camera::Camera;

// ─────────────────────────────────────────────────────────────────────────────
// Tile coordinate math (pure, testable)
// ─────────────────────────────────────────────────────────────────────────────

/// Unique identifier for a map tile in the OSM slippy-map scheme.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct TileCoords {
    pub z: u32,
    pub x: u32,
    pub y: u32,
}

impl TileCoords {
    /// OSM tile URL.
    pub fn url(&self) -> String {
        format!(
            "https://tile.openstreetmap.org/{}/{}/{}.png",
            self.z, self.x, self.y
        )
    }

    /// Local disk cache path: ~/.cache/airstrike/tiles/z/x/y.png
    pub fn cache_path(&self) -> PathBuf {
        let base = dirs::cache_dir()
            .unwrap_or_else(|| PathBuf::from(".cache"))
            .join("airstrike")
            .join("tiles")
            .join(self.z.to_string())
            .join(self.x.to_string());
        base.join(format!("{}.png", self.y))
    }

    /// Screen-space SDL2 Rect for this tile given a camera.
    pub fn screen_rect(&self, camera: &Camera) -> Rect {
        let tile_world_x = self.x as f64 * 256.0;
        let tile_world_y = self.y as f64 * 256.0;
        let (sx, sy) = camera.world_to_screen(tile_world_x, tile_world_y);
        Rect::new(sx as i32, sy as i32, 256, 256)
    }
}

/// Compute which tile coords are visible given camera bounds.
pub fn visible_tiles(camera: &Camera) -> Vec<TileCoords> {
    let (min_wx, min_wy, max_wx, max_wy) = camera.world_bounds();
    let tile_min_x = (min_wx / 256.0).floor() as i64;
    let tile_min_y = (min_wy / 256.0).floor() as i64;
    let tile_max_x = (max_wx / 256.0).ceil() as i64;
    let tile_max_y = (max_wy / 256.0).ceil() as i64;

    let max_tile = (1u32 << camera.zoom) as i64;
    let mut tiles = Vec::new();
    for ty in tile_min_y..=tile_max_y {
        for tx in tile_min_x..=tile_max_x {
            if tx < 0 || ty < 0 || tx >= max_tile || ty >= max_tile {
                continue;
            }
            tiles.push(TileCoords {
                z: camera.zoom,
                x: tx as u32,
                y: ty as u32,
            });
        }
    }
    tiles
}

// ─────────────────────────────────────────────────────────────────────────────
// Worker: fetch tile bytes (blocking, runs in std::thread)
// ─────────────────────────────────────────────────────────────────────────────

fn fetch_tile(coords: TileCoords, tx: Sender<(TileCoords, Vec<u8>)>) {
    use std::io::Read;

    // 1. Check disk cache first
    let path = coords.cache_path();
    if path.exists() {
        if let Ok(bytes) = std::fs::read(&path) {
            let _ = tx.send((coords, bytes));
            return;
        }
    }

    // 2. Fetch from OSM
    let result = ureq::get(&coords.url())
        .set(
            "User-Agent",
            "AirStrikeEngine/0.1 (educational game; contact via github)",
        )
        .call();

    match result {
        Ok(resp) => {
            let mut bytes = Vec::new();
            if resp.into_reader().read_to_end(&mut bytes).is_ok() && !bytes.is_empty() {
                // Save to disk cache
                if let Some(parent) = path.parent() {
                    let _ = std::fs::create_dir_all(parent);
                }
                let _ = std::fs::write(&path, &bytes);
                let _ = tx.send((coords, bytes));
            }
        }
        Err(_) => {
            // Silently ignore failed fetches; tile stays as dark placeholder
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TileManager
// ─────────────────────────────────────────────────────────────────────────────

/// Manages OSM tile lifecycle: request → fetch (background thread) → cache → render.
///
/// # SDL2 Texture Lifetime Note
/// SDL2 textures are tied to the `TextureCreator` they were created from.
/// We accept a `&'static TextureCreator<WindowContext>` (created via `Box::leak`
/// in main.rs) so that stored textures can be `'static`.
pub struct TileManager {
    /// Loaded textures: (TileCoords, Texture).
    /// We store them as `'static` via the leaked TextureCreator.
    textures: Vec<(TileCoords, Texture<'static>)>,
    /// Tiles currently being fetched in background threads.
    in_flight: HashSet<TileCoords>,
    /// Receives completed (coords, png_bytes) from worker threads.
    rx: Receiver<(TileCoords, Vec<u8>)>,
    /// Cloned into each worker thread to send results back.
    tx: Sender<(TileCoords, Vec<u8>)>,
    /// Number of active worker threads.
    worker_count: usize,
    /// Total tiles successfully loaded as textures.
    pub loaded: usize,
    /// Tiles currently in-flight (being fetched).
    pub pending: usize,
}

impl TileManager {
    pub fn new() -> Self {
        let (tx, rx) = mpsc::channel();
        TileManager {
            textures: Vec::new(),
            in_flight: HashSet::new(),
            rx,
            tx,
            worker_count: 0,
            loaded: 0,
            pending: 0,
        }
    }

    /// Drain the mpsc channel and upload any newly fetched PNG bytes as SDL2 textures.
    ///
    /// # Safety
    /// `texture_creator` must be `&'static` (created via `Box::leak` in main).
    pub fn drain_channel(&mut self, texture_creator: &'static TextureCreator<WindowContext>) {
        while let Ok((coords, bytes)) = self.rx.try_recv() {
            self.in_flight.remove(&coords);
            self.worker_count = self.worker_count.saturating_sub(1);

            // Decode PNG → RGBA8 → SDL2 Surface → Texture
            if let Ok(img) = image::load_from_memory(&bytes) {
                let rgba = img.to_rgba8();
                let (w, h) = rgba.dimensions();
                let mut raw = rgba.into_raw();

                let surface = sdl2::surface::Surface::from_data(
                    &mut raw,
                    w,
                    h,
                    w * 4,
                    PixelFormatEnum::RGBA32,
                );

                if let Ok(surface) = surface {
                    if let Ok(tex) = texture_creator.create_texture_from_surface(&surface) {
                        // SAFETY: texture_creator is &'static so the texture lifetime is 'static.
                        let tex: Texture<'static> = unsafe { std::mem::transmute(tex) };
                        self.textures.push((coords, tex));
                        self.loaded += 1;
                    }
                }
            }
        }
        self.pending = self.in_flight.len();
    }

    /// Dispatch background worker threads for tiles not yet loaded or in-flight.
    /// Caps concurrent workers at `MAX_WORKERS`.
    pub fn request_tiles(&mut self, tiles: &[TileCoords]) {
        const MAX_WORKERS: usize = 4;
        for &coords in tiles {
            if self.worker_count >= MAX_WORKERS {
                break;
            }
            let already_loaded = self.textures.iter().any(|(c, _)| *c == coords);
            if already_loaded || self.in_flight.contains(&coords) {
                continue;
            }
            self.in_flight.insert(coords);
            self.worker_count += 1;
            let tx = self.tx.clone();
            std::thread::spawn(move || fetch_tile(coords, tx));
        }
    }

    /// Draw all cached tile textures that are at the current zoom level.
    pub fn render(&self, canvas: &mut Canvas<Window>, camera: &Camera) {
        let (win_w, win_h) = canvas.window().size();
        for (coords, texture) in &self.textures {
            if coords.z != camera.zoom {
                continue;
            }
            let rect = coords.screen_rect(camera);
            // Frustum cull: skip tiles completely off-screen
            if rect.right() < 0
                || rect.bottom() < 0
                || rect.left() > win_w as i32
                || rect.top() > win_h as i32
            {
                continue;
            }
            let _ = canvas.copy(texture, None, Some(rect));
        }
    }

    /// Draw dark placeholder rectangles for tiles that are still loading.
    pub fn render_placeholders(&self, canvas: &mut Canvas<Window>, camera: &Camera) {
        canvas.set_draw_color(Color::RGB(26, 26, 46)); // #1a1a2e
        for &coords in &self.in_flight {
            if coords.z != camera.zoom {
                continue;
            }
            let rect = coords.screen_rect(camera);
            let _ = canvas.fill_rect(rect);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests (pure math only — no SDL2 display required)
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ui::camera::Camera;

    fn lisbon_cam() -> Camera {
        Camera::new(38.716, -9.142, 7, 1280.0, 720.0)
    }

    #[test]
    fn test_tile_url_format() {
        let t = TileCoords { z: 7, x: 59, y: 47 };
        assert_eq!(t.url(), "https://tile.openstreetmap.org/7/59/47.png");
    }

    #[test]
    fn test_visible_tiles_returns_non_empty() {
        let cam = lisbon_cam();
        let tiles = visible_tiles(&cam);
        assert!(!tiles.is_empty(), "should have visible tiles");
    }

    #[test]
    fn test_visible_tiles_all_at_correct_zoom() {
        let cam = lisbon_cam();
        let tiles = visible_tiles(&cam);
        for t in &tiles {
            assert_eq!(t.z, 7, "all tiles should be at zoom 7");
        }
    }

    #[test]
    fn test_visible_tiles_reasonable_count() {
        // 1280x720 window at zoom 7 → ~5x3 = 15 tiles visible (allow ±margin)
        let cam = lisbon_cam();
        let tiles = visible_tiles(&cam);
        assert!(
            tiles.len() >= 6 && tiles.len() <= 35,
            "unexpected tile count: {}",
            tiles.len()
        );
    }
}
