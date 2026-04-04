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
use ui::tile_manager::{visible_tiles, TileManager};

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

    let mut camera = Camera::new(
        DEFAULT_LAT,
        DEFAULT_LON,
        DEFAULT_ZOOM,
        WINDOW_W as f32,
        WINDOW_H as f32,
    );
    let mut tile_manager = TileManager::new();

    let mut event_pump = sdl_context.event_pump()?;

    // Pan state
    let mut mouse_down = false;
    let mut last_mouse: (i32, i32) = (0, 0);
    let mut current_mouse: (i32, i32) = (0, 0);

    // FPS tracking
    let mut fps_timer = Instant::now();
    let mut frame_count = 0u32;
    let mut fps_display = 0u32;

    'running: loop {
        let frame_start = Instant::now();

        // ── 1. EVENTS ──────────────────────────────────────────────────────
        for event in event_pump.poll_iter() {
            match event {
                Event::Quit { .. }
                | Event::KeyDown {
                    keycode: Some(Keycode::Escape),
                    ..
                } => {
                    break 'running;
                }
                Event::MouseButtonDown {
                    mouse_btn: MouseButton::Left,
                    x,
                    y,
                    ..
                } => {
                    mouse_down = true;
                    last_mouse = (x, y);
                    current_mouse = (x, y);
                }
                Event::MouseButtonUp {
                    mouse_btn: MouseButton::Left,
                    ..
                } => {
                    mouse_down = false;
                }
                Event::MouseMotion { x, y, .. } => {
                    current_mouse = (x, y);
                    if mouse_down {
                        let dx = (x - last_mouse.0) as f32;
                        let dy = (y - last_mouse.1) as f32;
                        camera.pan(dx, dy);
                        last_mouse = (x, y);
                    }
                }
                Event::MouseWheel { y, .. } => {
                    // y > 0 → scroll up → zoom in
                    let mx = current_mouse.0 as f32;
                    let my = current_mouse.1 as f32;
                    camera.zoom_at(if y > 0 { 1 } else { -1 }, mx, my);
                }
                Event::Window {
                    win_event: sdl2::event::WindowEvent::Resized(w, h),
                    ..
                } => {
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
        render_hud(
            &mut canvas,
            texture_creator,
            &font,
            &camera,
            fps_display,
            tile_manager.loaded,
            tile_manager.pending,
        )?;

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
    let bg = Rect::new(
        8,
        8,
        280,
        (lines.len() as i32 * line_h + padding * 2) as u32,
    );
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
