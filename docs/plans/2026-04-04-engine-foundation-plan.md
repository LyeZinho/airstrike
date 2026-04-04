# Air Strike Engine — Phase 1 Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a runnable Rust+SDL2 desktop window with an interactive OSM tile map — pan, zoom, coordinate grid, debug HUD — as the rendering foundation for all future gameplay.

**Architecture:** SDL2 handles window/rendering/events; a thread pool (std::thread + mpsc) fetches OSM tiles asynchronously; Mercator projection (`core/geo.rs`) converts lat/lon to pixels; `Camera` holds view state; `TileManager` orchestrates fetch, cache, and draw. No async runtime needed.

**Tech Stack:** Rust stable, sdl2 0.37 (image+ttf features), glam 0.24, ureq 2, image 0.25, serde+serde_json 1, dirs 5

---

## Prerequisites

SDL2 dev libs must be installed:

```bash
# Linux (Debian/Ubuntu)
sudo apt-get install libsdl2-dev libsdl2-image-dev libsdl2-ttf-dev

# Verify
sdl2-config --version   # should print e.g. 2.0.20
```

For Windows: download SDL2 dev libs from https://github.com/libsdl-org/SDL/releases and set `SDL2_DIR` env var. (Linux-first for now.)

---

## Task 1: Project Scaffolding

**Files:**
- Create: `Cargo.toml`
- Create: `src/main.rs`
- Create: `src/core/mod.rs`
- Create: `src/ui/mod.rs`
- Create: `assets/fonts/.gitkeep`

**Step 1: Initialize cargo project**

```bash
cd /home/pedro/repo/airstrike
cargo init --name air_strike
```

**Step 2: Write `Cargo.toml`**

Replace the generated file with:

```toml
[package]
name = "air_strike"
version = "0.1.0"
edition = "2021"

[[bin]]
name = "air_strike"
path = "src/main.rs"

[dependencies]
sdl2 = { version = "0.37", features = ["image", "ttf"] }
glam = "0.24"
ureq = { version = "2", features = [] }
image = { version = "0.25", default-features = false, features = ["png"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
dirs = "5"

[profile.release]
opt-level = 3
lto = true
```

**Step 3: Create module stubs**

`src/core/mod.rs`:
```rust
pub mod geo;
```

`src/ui/mod.rs`:
```rust
pub mod camera;
pub mod tile_manager;
```

**Step 4: Write minimal `src/main.rs` (just compiles)**

```rust
mod core;
mod ui;

fn main() {
    println!("Air Strike Engine starting...");
}
```

**Step 5: Verify it compiles**

```bash
cargo build
```

Expected: compiles without errors (may show unused warnings — fine).

**Step 6: Commit**

```bash
git add Cargo.toml src/ assets/
git commit -m "feat: scaffold Rust project structure"
```

---

## Task 2: Mercator Projection (`core/geo.rs`)

**Files:**
- Create: `src/core/geo.rs`

The Mercator projection converts geographic coordinates to a flat pixel grid. Each zoom level doubles the pixel dimensions. At zoom `z`, the world is `256 * 2^z` pixels wide and tall.

**Step 1: Write the unit tests first**

Create `src/core/geo.rs` with tests:

```rust
/// Mercator projection utilities.
/// World-space pixel coordinates at a given zoom level.
/// Each tile is 256x256 pixels; world size = 256 * 2^zoom.

use std::f64::consts::PI;

/// Convert (lat, lon) in degrees to world-space pixel coordinates at `zoom`.
/// Returns (world_x, world_y) as f64.
pub fn lat_lon_to_world(lat: f64, lon: f64, zoom: u32) -> (f64, f64) {
    let scale = 256.0 * (1u64 << zoom) as f64;
    let x = (lon + 180.0) / 360.0 * scale;
    let lat_rad = lat.to_radians();
    let y = (1.0 - (lat_rad.tan() + 1.0 / lat_rad.cos()).ln() / PI) / 2.0 * scale;
    (x, y)
}

/// Convert world-space pixel coordinates back to (lat, lon) at `zoom`.
pub fn world_to_lat_lon(world_x: f64, world_y: f64, zoom: u32) -> (f64, f64) {
    let scale = 256.0 * (1u64 << zoom) as f64;
    let lon = world_x / scale * 360.0 - 180.0;
    let n = PI - 2.0 * PI * world_y / scale;
    let lat = (0.5 * (n.exp() - (-n).exp())).atan().to_degrees();
    (lat, lon)
}

/// Convert (lat, lon) to tile coordinates (tile_x, tile_y) at `zoom`.
pub fn lat_lon_to_tile(lat: f64, lon: f64, zoom: u32) -> (u32, u32) {
    let (wx, wy) = lat_lon_to_world(lat, lon, zoom);
    ((wx / 256.0) as u32, (wy / 256.0) as u32)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lon_zero_maps_to_center() {
        let (wx, _) = lat_lon_to_world(0.0, 0.0, 0);
        // At zoom 0, world is 256px wide; lon=0 → x=128
        assert!((wx - 128.0).abs() < 0.001, "wx={}", wx);
    }

    #[test]
    fn test_lon_180_maps_to_right_edge() {
        let (wx, _) = lat_lon_to_world(0.0, 180.0, 0);
        assert!((wx - 256.0).abs() < 0.001, "wx={}", wx);
    }

    #[test]
    fn test_lon_minus_180_maps_to_left_edge() {
        let (wx, _) = lat_lon_to_world(0.0, -180.0, 0);
        assert!(wx.abs() < 0.001, "wx={}", wx);
    }

    #[test]
    fn test_equator_maps_to_center_y() {
        let (_, wy) = lat_lon_to_world(0.0, 0.0, 0);
        assert!((wy - 128.0).abs() < 0.001, "wy={}", wy);
    }

    #[test]
    fn test_round_trip_lisbon() {
        let lat = 38.716;
        let lon = -9.142;
        let zoom = 7;
        let (wx, wy) = lat_lon_to_world(lat, lon, zoom);
        let (lat2, lon2) = world_to_lat_lon(wx, wy, zoom);
        assert!((lat - lat2).abs() < 0.0001, "lat diff: {}", (lat - lat2).abs());
        assert!((lon - lon2).abs() < 0.0001, "lon diff: {}", (lon - lon2).abs());
    }

    #[test]
    fn test_tile_coords_lisbon_zoom7() {
        // Lisbon tile at zoom 7 should be approximately (59, 47)
        let (tx, ty) = lat_lon_to_tile(38.716, -9.142, 7);
        assert_eq!(tx, 59, "tile_x={}", tx);
        assert_eq!(ty, 47, "tile_y={}", ty);
    }
}
```

**Step 2: Run tests to confirm they pass**

```bash
cargo test core::geo
```

Expected output:
```
test core::geo::tests::test_lon_zero_maps_to_center ... ok
test core::geo::tests::test_lon_180_maps_to_right_edge ... ok
test core::geo::tests::test_lon_minus_180_maps_to_left_edge ... ok
test core::geo::tests::test_equator_maps_to_center_y ... ok
test core::geo::tests::test_round_trip_lisbon ... ok
test core::geo::tests::test_tile_coords_lisbon_zoom7 ... ok
```

**Step 3: Commit**

```bash
git add src/core/geo.rs
git commit -m "feat: add Mercator projection with unit tests"
```

---

## Task 3: Camera (`ui/camera.rs`)

**Files:**
- Create: `src/ui/camera.rs`

The camera tracks the center of the viewport in world-space pixels and the current zoom level.

**Step 1: Write the camera struct and tests**

```rust
/// Camera: tracks the center of the view in world-space pixels and zoom level.
/// Zoom range: 3 (world view) to 12 (city-level detail).

use crate::core::geo;

pub const ZOOM_MIN: u32 = 3;
pub const ZOOM_MAX: u32 = 12;

pub struct Camera {
    /// Center of the viewport in world-space pixels at current zoom.
    pub center_x: f64,
    pub center_y: f64,
    pub zoom: u32,
    pub window_w: f32,
    pub window_h: f32,
}

impl Camera {
    /// Create a new camera centered on the given lat/lon at `zoom`.
    pub fn new(lat: f64, lon: f64, zoom: u32, window_w: f32, window_h: f32) -> Self {
        let (cx, cy) = geo::lat_lon_to_world(lat, lon, zoom);
        Camera { center_x: cx, center_y: cy, zoom, window_w, window_h }
    }

    /// Convert world-space pixel coords to screen pixel coords.
    pub fn world_to_screen(&self, wx: f64, wy: f64) -> (f32, f32) {
        let sx = (wx - self.center_x) as f32 + self.window_w / 2.0;
        let sy = (wy - self.center_y) as f32 + self.window_h / 2.0;
        (sx, sy)
    }

    /// Convert screen pixel coords to world-space pixel coords.
    pub fn screen_to_world(&self, sx: f32, sy: f32) -> (f64, f64) {
        let wx = (sx - self.window_w / 2.0) as f64 + self.center_x;
        let wy = (sy - self.window_h / 2.0) as f64 + self.center_y;
        (wx, wy)
    }

    /// Pan the camera by (dx, dy) screen pixels.
    pub fn pan(&mut self, dx: f32, dy: f32) {
        self.center_x -= dx as f64;
        self.center_y -= dy as f64;
    }

    /// Zoom in (+1) or out (-1), keeping `cursor_sx, cursor_sy` stationary on screen.
    pub fn zoom_at(&mut self, delta: i32, cursor_sx: f32, cursor_sy: f32) {
        let new_zoom = (self.zoom as i32 + delta).clamp(ZOOM_MIN as i32, ZOOM_MAX as i32) as u32;
        if new_zoom == self.zoom {
            return;
        }

        // World position under cursor before zoom
        let (wx, wy) = self.screen_to_world(cursor_sx, cursor_sy);
        // Convert to lat/lon (zoom-independent)
        let (lat, lon) = geo::world_to_lat_lon(wx, wy, self.zoom);

        // Change zoom, re-project center
        let old_zoom = self.zoom;
        self.zoom = new_zoom;
        let scale = if new_zoom > old_zoom {
            (1u64 << (new_zoom - old_zoom)) as f64
        } else {
            1.0 / (1u64 << (old_zoom - new_zoom)) as f64
        };
        self.center_x *= scale;
        self.center_y *= scale;

        // World position under cursor after zoom
        let (wx2, wy2) = geo::lat_lon_to_world(lat, lon, new_zoom);

        // Adjust center so cursor stays on same point
        let (sx, sy) = self.world_to_screen(wx2, wy2);
        self.center_x += (sx - cursor_sx) as f64;
        self.center_y += (sy - cursor_sy) as f64;
    }

    /// Current center in (lat, lon).
    pub fn center_lat_lon(&self) -> (f64, f64) {
        geo::world_to_lat_lon(self.center_x, self.center_y, self.zoom)
    }

    /// Returns the world-pixel bounds of the visible area:
    /// (min_wx, min_wy, max_wx, max_wy)
    pub fn world_bounds(&self) -> (f64, f64, f64, f64) {
        let hw = self.window_w as f64 / 2.0;
        let hh = self.window_h as f64 / 2.0;
        (
            self.center_x - hw,
            self.center_y - hh,
            self.center_x + hw,
            self.center_y + hh,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn lisbon_cam() -> Camera {
        Camera::new(38.716, -9.142, 7, 1280.0, 720.0)
    }

    #[test]
    fn test_world_to_screen_center_is_window_center() {
        let cam = lisbon_cam();
        let (sx, sy) = cam.world_to_screen(cam.center_x, cam.center_y);
        assert!((sx - 640.0).abs() < 0.01, "sx={}", sx);
        assert!((sy - 360.0).abs() < 0.01, "sy={}", sy);
    }

    #[test]
    fn test_screen_to_world_roundtrip() {
        let cam = lisbon_cam();
        let sx = 300.0f32;
        let sy = 200.0f32;
        let (wx, wy) = cam.screen_to_world(sx, sy);
        let (sx2, sy2) = cam.world_to_screen(wx, wy);
        assert!((sx - sx2).abs() < 0.01);
        assert!((sy - sy2).abs() < 0.01);
    }

    #[test]
    fn test_pan_moves_center() {
        let mut cam = lisbon_cam();
        let cx0 = cam.center_x;
        cam.pan(100.0, 0.0);
        assert!((cam.center_x - (cx0 - 100.0)).abs() < 0.01);
    }

    #[test]
    fn test_zoom_clamps_at_min_max() {
        let mut cam = lisbon_cam();
        cam.zoom_at(-100, 640.0, 360.0);
        assert_eq!(cam.zoom, ZOOM_MIN);
        cam.zoom_at(100, 640.0, 360.0);
        assert_eq!(cam.zoom, ZOOM_MAX);
    }
}
```

**Step 2: Run tests**

```bash
cargo test ui::camera
```

Expected: 4 tests pass.

**Step 3: Commit**

```bash
git add src/ui/camera.rs
git commit -m "feat: add Camera with pan/zoom and unit tests"
```

---

## Task 4: Tile Manager (`ui/tile_manager.rs`)

**Files:**
- Create: `src/ui/tile_manager.rs`

The tile manager owns the SDL2 texture cache, orchestrates disk cache reads, and dispatches HTTP fetches to worker threads.

**Note:** This module requires SDL2 (`sdl2::render::Canvas`, `sdl2::render::TextureCreator`) so it cannot be unit tested in isolation without a display. We test the tile coordinate math separately.

**Step 1: Write the tile coordinate helpers with tests**

```rust
use std::collections::{HashMap, HashSet};
use std::sync::mpsc::{self, Receiver, Sender};
use std::path::PathBuf;

use sdl2::render::{Canvas, TextureCreator};
use sdl2::video::{Window, WindowContext};
use sdl2::rect::Rect;
use sdl2::pixels::Color;

use crate::ui::camera::Camera;

// ---------------------------------------------------------------------------
// Tile coordinate math (pure, testable)
// ---------------------------------------------------------------------------

/// Unique identifier for a map tile.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct TileCoords {
    pub z: u32,
    pub x: u32,
    pub y: u32,
}

impl TileCoords {
    /// OSM tile URL.
    pub fn url(&self) -> String {
        format!("https://tile.openstreetmap.org/{}/{}/{}.png", self.z, self.x, self.y)
    }

    /// Local disk cache path.
    pub fn cache_path(&self) -> PathBuf {
        let base = dirs::cache_dir()
            .unwrap_or_else(|| PathBuf::from(".cache"))
            .join("airstrike")
            .join("tiles")
            .join(self.z.to_string())
            .join(self.x.to_string());
        base.join(format!("{}.png", self.y))
    }

    /// Screen-space rect for this tile given a camera.
    pub fn screen_rect(&self, camera: &Camera) -> Rect {
        let tile_world_x = (self.x as f64) * 256.0;
        let tile_world_y = (self.y as f64) * 256.0;
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
            tiles.push(TileCoords { z: camera.zoom, x: tx as u32, y: ty as u32 });
        }
    }
    tiles
}

// ---------------------------------------------------------------------------
// Worker: fetch tile bytes (blocking, runs in std::thread)
// ---------------------------------------------------------------------------

fn fetch_tile(coords: TileCoords, tx: Sender<(TileCoords, Vec<u8>)>) {
    // 1. Check disk cache
    let path = coords.cache_path();
    if path.exists() {
        if let Ok(bytes) = std::fs::read(&path) {
            let _ = tx.send((coords, bytes));
            return;
        }
    }

    // 2. Fetch from OSM
    let url = coords.url();
    let result = ureq::get(&url)
        .set("User-Agent", "AirStrikeEngine/0.1 (educational game)")
        .call();

    match result {
        Ok(resp) => {
            let mut bytes = Vec::new();
            if resp.into_reader().read_to_end(&mut bytes).is_ok() {
                // Save to disk cache
                if let Some(parent) = path.parent() {
                    let _ = std::fs::create_dir_all(parent);
                }
                let _ = std::fs::write(&path, &bytes);
                let _ = tx.send((coords, bytes));
            }
        }
        Err(_) => {
            // Silently ignore failed fetches; tile stays as placeholder
        }
    }
}

// ---------------------------------------------------------------------------
// TileManager: owns textures, dispatches workers
// ---------------------------------------------------------------------------

pub struct TileManager {
    /// SDL2 texture cache: tile coord → texture index in `textures` vec.
    /// We store raw SDL2 textures via unsafe pointer trick to dodge lifetime issues.
    /// In practice we use a Vec<(TileCoords, sdl2::render::Texture)>.
    textures: Vec<(TileCoords, sdl2::render::Texture<'static>)>,
    in_flight: HashSet<TileCoords>,
    rx: Receiver<(TileCoords, Vec<u8>)>,
    tx: Sender<(TileCoords, Vec<u8>)>,
    worker_count: usize,
    pub loaded: usize,
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

    /// Drain the channel and upload any newly fetched tiles as SDL2 textures.
    pub fn drain_channel<T>(&mut self, texture_creator: &'static TextureCreator<T>)
    where
        T: 'static,
    {
        while let Ok((coords, bytes)) = self.rx.try_recv() {
            self.in_flight.remove(&coords);
            self.worker_count = self.worker_count.saturating_sub(1);

            // Decode PNG bytes → SDL2 surface → texture
            if let Ok(img) = image::load_from_memory(&bytes) {
                let rgba = img.to_rgba8();
                let (w, h) = rgba.dimensions();
                let surface = sdl2::surface::Surface::from_data(
                    &mut rgba.into_raw(),
                    w, h,
                    w * 4,
                    sdl2::pixels::PixelFormatEnum::RGBA32,
                );
                if let Ok(surf) = surface {
                    if let Ok(tex) = texture_creator.create_texture_from_surface(&surf) {
                        // SAFETY: texture_creator is &'static so texture is 'static
                        let tex: sdl2::render::Texture<'static> = unsafe {
                            std::mem::transmute(tex)
                        };
                        self.textures.push((coords, tex));
                        self.loaded += 1;
                    }
                }
            }
        }
        self.pending = self.in_flight.len();
    }

    /// Request missing tiles (dispatch workers, max 4 concurrent).
    pub fn request_tiles(&mut self, tiles: &[TileCoords]) {
        const MAX_WORKERS: usize = 4;
        for &coords in tiles {
            if self.worker_count >= MAX_WORKERS { break; }
            let already_loaded = self.textures.iter().any(|(c, _)| *c == coords);
            if already_loaded || self.in_flight.contains(&coords) { continue; }

            self.in_flight.insert(coords);
            self.worker_count += 1;
            let tx = self.tx.clone();
            std::thread::spawn(move || fetch_tile(coords, tx));
        }
    }

    /// Draw all cached tiles that are visible on screen.
    pub fn render(&self, canvas: &mut Canvas<Window>, camera: &Camera) {
        for (coords, texture) in &self.textures {
            if coords.z != camera.zoom { continue; }
            let rect = coords.screen_rect(camera);
            // Rough visibility cull
            let (w, h) = canvas.window().size();
            if rect.right() < 0 || rect.bottom() < 0
                || rect.left() > w as i32 || rect.top() > h as i32 {
                continue;
            }
            let _ = canvas.copy(texture, None, Some(rect));
        }
    }

    /// Draw placeholder rectangles for tiles that are in-flight (not yet loaded).
    pub fn render_placeholders(&self, canvas: &mut Canvas<Window>, camera: &Camera) {
        canvas.set_draw_color(Color::RGB(26, 26, 46)); // #1a1a2e
        for &coords in &self.in_flight {
            if coords.z != camera.zoom { continue; }
            let rect = coords.screen_rect(camera);
            let _ = canvas.fill_rect(rect);
        }
    }
}

// ---------------------------------------------------------------------------
// Unit tests for pure tile math
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ui::camera::Camera;

    #[test]
    fn test_tile_url_format() {
        let t = TileCoords { z: 7, x: 59, y: 47 };
        assert_eq!(t.url(), "https://tile.openstreetmap.org/7/59/47.png");
    }

    #[test]
    fn test_visible_tiles_returns_non_empty() {
        let cam = Camera::new(38.716, -9.142, 7, 1280.0, 720.0);
        let tiles = visible_tiles(&cam);
        assert!(!tiles.is_empty(), "should have visible tiles");
    }

    #[test]
    fn test_visible_tiles_all_at_correct_zoom() {
        let cam = Camera::new(38.716, -9.142, 7, 1280.0, 720.0);
        let tiles = visible_tiles(&cam);
        for t in &tiles {
            assert_eq!(t.z, 7);
        }
    }

    #[test]
    fn test_visible_tiles_reasonable_count() {
        // 1280x720 window at zoom 7 → about 5x3 = 15 tiles visible
        let cam = Camera::new(38.716, -9.142, 7, 1280.0, 720.0);
        let tiles = visible_tiles(&cam);
        assert!(tiles.len() >= 6 && tiles.len() <= 30,
            "unexpected tile count: {}", tiles.len());
    }
}
```

**Step 2: Run tile math tests**

```bash
cargo test ui::tile_manager
```

Expected: 4 tests pass.

**NOTE on SDL2 textures**: The `TileManager::drain_channel` uses `unsafe { std::mem::transmute }` to work around SDL2's lifetime constraints. This is a known pragmatic pattern for SDL2 texture caches in Rust. An alternative is storing textures in an `Arc<Mutex<...>>` arena, but transmute is simpler for a single-threaded renderer. Document this in a `// SAFETY:` comment.

**Step 3: Commit**

```bash
git add src/ui/tile_manager.rs
git commit -m "feat: add TileManager with disk cache and thread-based tile fetching"
```

---

## Task 5: Coordinate Grid Overlay

**Files:**
- Create: `src/ui/grid.rs`
- Modify: `src/ui/mod.rs` — add `pub mod grid;`

Draws dim green lat/lon lines over the map, spaced ~5° apart.

**Step 1: Write `src/ui/grid.rs`**

```rust
/// Draws a geographic coordinate grid (lat/lon lines) over the map.
/// Lines spaced at configurable degree intervals.

use sdl2::render::Canvas;
use sdl2::video::Window;
use sdl2::pixels::Color;

use crate::ui::camera::Camera;
use crate::core::geo;

const GRID_COLOR: Color = Color::RGBA(0, 255, 100, 40); // dim green, military radar
const GRID_STEP_DEG: f64 = 5.0; // degrees between lines

pub fn draw_grid(canvas: &mut Canvas<Window>, camera: &Camera) {
    canvas.set_draw_color(GRID_COLOR);
    let (w, h) = canvas.window().size();

    // Find lat/lon bounds of visible area
    let (min_wx, min_wy, max_wx, max_wy) = camera.world_bounds();
    let (lat_max, lon_min) = geo::world_to_lat_lon(min_wx, min_wy, camera.zoom);
    let (lat_min, lon_max) = geo::world_to_lat_lon(max_wx, max_wy, camera.zoom);

    // Clamp to valid Mercator bounds
    let lat_min = lat_min.max(-85.0);
    let lat_max = lat_max.min(85.0);

    // Draw latitude lines (horizontal)
    let first_lat = (lat_min / GRID_STEP_DEG).floor() * GRID_STEP_DEG;
    let mut lat = first_lat;
    while lat <= lat_max + GRID_STEP_DEG {
        let (wx, wy) = geo::lat_lon_to_world(lat, 0.0, camera.zoom);
        let (_, sy) = camera.world_to_screen(wx, wy);
        let sy = sy as i32;
        if sy >= 0 && sy <= h as i32 {
            let _ = canvas.draw_line((0, sy), (w as i32, sy));
        }
        lat += GRID_STEP_DEG;
    }

    // Draw longitude lines (vertical)
    let first_lon = (lon_min / GRID_STEP_DEG).floor() * GRID_STEP_DEG;
    let mut lon = first_lon;
    while lon <= lon_max + GRID_STEP_DEG {
        let (wx, wy) = geo::lat_lon_to_world(0.0, lon, camera.zoom);
        let (sx, _) = camera.world_to_screen(wx, wy);
        let sx = sx as i32;
        if sx >= 0 && sx <= w as i32 {
            let _ = canvas.draw_line((sx, 0), (sx, h as i32));
        }
        lon += GRID_STEP_DEG;
    }
}
```

**Step 2: Add to `src/ui/mod.rs`**

```rust
pub mod camera;
pub mod grid;
pub mod tile_manager;
```

**Step 3: Commit**

```bash
git add src/ui/grid.rs src/ui/mod.rs
git commit -m "feat: add coordinate grid overlay"
```

---

## Task 6: Main Loop + SDL2 Init + Debug HUD

**Files:**
- Modify: `src/main.rs` — full game loop
- Create: `assets/fonts/` — requires a monospace TTF font

**Step 1: Download a monospace font**

```bash
# Download JetBrains Mono (OFL license)
mkdir -p assets/fonts
curl -L "https://github.com/JetBrains/JetBrainsMono/raw/master/fonts/ttf/JetBrainsMonoNL-Regular.ttf" \
     -o assets/fonts/JetBrainsMonoNL-Regular.ttf
```

Alternatively, any `.ttf` file in `assets/fonts/` will work. Update the path in `main.rs` if using a different font.

**Step 2: Write `src/main.rs`**

```rust
mod core;
mod ui;

use std::time::{Duration, Instant};

use sdl2::event::Event;
use sdl2::keyboard::Keycode;
use sdl2::mouse::MouseButton;
use sdl2::pixels::Color;
use sdl2::rect::Rect;

use ui::camera::Camera;
use ui::grid::draw_grid;
use ui::tile_manager::{TileManager, visible_tiles};

const WINDOW_W: u32 = 1280;
const WINDOW_H: u32 = 720;
const TARGET_FPS: u64 = 60;
const FRAME_DURATION: Duration = Duration::from_millis(1000 / TARGET_FPS);

// Default start: Lisbon, Portugal
const DEFAULT_LAT: f64 = 38.716;
const DEFAULT_LON: f64 = -9.142;
const DEFAULT_ZOOM: u32 = 7;

fn main() -> Result<(), String> {
    // --- SDL2 init ---
    let sdl_context = sdl2::init()?;
    let video = sdl_context.video()?;
    let ttf = sdl2::ttf::init().map_err(|e| e.to_string())?;
    let _image = sdl2::image::init(sdl2::image::InitFlag::PNG)?;

    let window = video
        .window("AIR STRIKE ENGINE v0.1", WINDOW_W, WINDOW_H)
        .position_centered()
        .resizable()
        .build()
        .map_err(|e| e.to_string())?;

    let mut canvas = window
        .into_canvas()
        .accelerated()
        .present_vsync()
        .build()
        .map_err(|e| e.to_string())?;

    // TextureCreator must outlive all textures. We leak it to get 'static.
    // SAFETY: We never drop texture_creator before the textures that reference it.
    let texture_creator = Box::new(canvas.texture_creator());
    let texture_creator: &'static _ = Box::leak(texture_creator);

    // Load HUD font
    let font = ttf.load_font("assets/fonts/JetBrainsMonoNL-Regular.ttf", 14)?;

    let mut camera = Camera::new(DEFAULT_LAT, DEFAULT_LON, DEFAULT_ZOOM,
                                  WINDOW_W as f32, WINDOW_H as f32);
    let mut tile_manager = TileManager::new();

    let mut event_pump = sdl_context.event_pump()?;

    // Pan state
    let mut mouse_down = false;
    let mut last_mouse: (i32, i32) = (0, 0);

    // FPS tracking
    let mut fps_timer = Instant::now();
    let mut frame_count = 0u32;
    let mut fps_display = 0u32;

    'running: loop {
        let frame_start = Instant::now();

        // ── 1. EVENTS ──────────────────────────────────────────────────────
        for event in event_pump.poll_iter() {
            match event {
                Event::Quit { .. } | Event::KeyDown { keycode: Some(Keycode::Escape), .. } => {
                    break 'running;
                }
                Event::MouseButtonDown { mouse_btn: MouseButton::Left, x, y, .. } => {
                    mouse_down = true;
                    last_mouse = (x, y);
                }
                Event::MouseButtonUp { mouse_btn: MouseButton::Left, .. } => {
                    mouse_down = false;
                }
                Event::MouseMotion { x, y, .. } if mouse_down => {
                    let dx = (x - last_mouse.0) as f32;
                    let dy = (y - last_mouse.1) as f32;
                    camera.pan(dx, dy);
                    last_mouse = (x, y);
                }
                Event::MouseWheel { y, x: mx, .. } => {
                    // y > 0 → scroll up → zoom in
                    let (mx, my) = (
                        event_pump.mouse_state().x() as f32,
                        event_pump.mouse_state().y() as f32,
                    );
                    camera.zoom_at(if y > 0 { 1 } else { -1 }, mx, my);
                }
                Event::Window { win_event: sdl2::event::WindowEvent::Resized(w, h), .. } => {
                    camera.window_w = w as f32;
                    camera.window_h = h as f32;
                }
                _ => {}
            }
        }

        // ── 2. UPDATE ──────────────────────────────────────────────────────
        let tiles = visible_tiles(&camera);
        tile_manager.request_tiles(&tiles);
        tile_manager.drain_channel(texture_creator);

        // FPS counter
        frame_count += 1;
        if fps_timer.elapsed() >= Duration::from_secs(1) {
            fps_display = frame_count;
            frame_count = 0;
            fps_timer = Instant::now();
        }

        // ── 3. RENDER ──────────────────────────────────────────────────────
        canvas.set_draw_color(Color::RGB(15, 15, 25)); // Dark background
        canvas.clear();

        // a) Map tiles (loaded + placeholders)
        tile_manager.render_placeholders(&mut canvas, &camera);
        tile_manager.render(&mut canvas, &camera);

        // b) Coordinate grid
        draw_grid(&mut canvas, &camera);

        // c) Debug HUD
        render_hud(&mut canvas, texture_creator, &font, &camera, fps_display,
                   tile_manager.loaded, tile_manager.pending)?;

        canvas.present();

        // ── 4. FRAME CAP ───────────────────────────────────────────────────
        let elapsed = frame_start.elapsed();
        if elapsed < FRAME_DURATION {
            std::thread::sleep(FRAME_DURATION - elapsed);
        }
    }

    Ok(())
}

fn render_hud(
    canvas: &mut sdl2::render::Canvas<sdl2::video::Window>,
    texture_creator: &'static sdl2::render::TextureCreator<sdl2::video::WindowContext>,
    font: &sdl2::ttf::Font,
    camera: &Camera,
    fps: u32,
    loaded: usize,
    pending: usize,
) -> Result<(), String> {
    let (lat, lon) = camera.center_lat_lon();
    let lines = [
        format!("ZOOM: {:2}   FPS: {}", camera.zoom, fps),
        format!("LAT: {:+.4}°  LON: {:+.4}°", lat, lon),
        format!("TILES: {} loaded / {} pending", loaded, pending),
    ];

    let line_h = 18i32;
    let padding = 8i32;

    // Background rect
    canvas.set_draw_color(Color::RGBA(0, 0, 0, 180));
    let bg = Rect::new(8, 8, 280, (lines.len() as i32 * line_h + padding * 2) as u32);
    canvas.fill_rect(bg)?;

    for (i, line) in lines.iter().enumerate() {
        let surface = font
            .render(line)
            .blended(Color::RGB(0, 255, 100))
            .map_err(|e| e.to_string())?;
        let texture = texture_creator
            .create_texture_from_surface(&surface)
            .map_err(|e| e.to_string())?;
        let sdl2::render::TextureQuery { width, height, .. } = texture.query();
        let dst = Rect::new(padding + 8, padding + 8 + i as i32 * line_h, width, height);
        canvas.copy(&texture, None, Some(dst))?;
    }

    Ok(())
}
```

**Step 3: Run the game**

```bash
cargo run
```

Expected result:
- Window opens 1280×720, titled "AIR STRIKE ENGINE v0.1"
- Dark background (`#0f0f19`)
- OSM map tiles load progressively (Lisbon area visible)
- Green dim grid lines overlaid
- Debug HUD in top-left: zoom, lat/lon, FPS, tile counts
- Left-click drag: pans the map
- Scroll wheel: zooms in/out
- ESC or close button: exits

**Step 4: Commit**

```bash
git add src/main.rs assets/fonts/
git commit -m "feat: main game loop with SDL2, tiles, camera, grid and debug HUD"
```

---

## Task 7: Final Integration Check

**Step 1: Run all unit tests**

```bash
cargo test
```

Expected:
```
test core::geo::tests::test_lon_zero_maps_to_center ... ok
test core::geo::tests::test_lon_180_maps_to_right_edge ... ok
test core::geo::tests::test_lon_minus_180_maps_to_left_edge ... ok
test core::geo::tests::test_equator_maps_to_center_y ... ok
test core::geo::tests::test_round_trip_lisbon ... ok
test core::geo::tests::test_tile_coords_lisbon_zoom7 ... ok
test ui::camera::tests::test_world_to_screen_center_is_window_center ... ok
test ui::camera::tests::test_screen_to_world_roundtrip ... ok
test ui::camera::tests::test_pan_moves_center ... ok
test ui::camera::tests::test_zoom_clamps_at_min_max ... ok
test ui::tile_manager::tests::test_tile_url_format ... ok
test ui::tile_manager::tests::test_visible_tiles_returns_non_empty ... ok
test ui::tile_manager::tests::test_visible_tiles_all_at_correct_zoom ... ok
test ui::tile_manager::tests::test_visible_tiles_reasonable_count ... ok

14 tests, 0 failed
```

**Step 2: Run release build to verify performance**

```bash
cargo build --release
./target/release/air_strike
```

Expected: stable 60 FPS with map tiles loaded.

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: Phase 1 foundation complete — SDL2+tiles+camera+grid"
```

---

## Phase 1 Done — What's Next

With this foundation in place, Phase 2 will add:
- Aircraft entities (struct with lat/lon/heading/speed/fuel)
- SVG icon rendering (NATO tactical symbols)
- Simple physics update (move aircraft along heading)
- Radar detection placeholder

When ready to continue, create a new plan doc and use `superpowers:executing-plans`.
