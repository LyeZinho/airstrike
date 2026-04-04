mod scenes;
mod simulation;
mod ui;

use scenes::main_menu::{MainMenu, MenuAction};
use scenes::mode_select::{ModeSelect, ModeSelectAction};
use scenes::sandbox_settings::{SandboxAction, SandboxSettings};
use std::time::{Duration, Instant};

use sdl2::event::Event;
use sdl2::keyboard::Keycode;
use sdl2::mouse::MouseButton;
use sdl2::pixels::Color;
use sdl2::rect::Rect;

use airstrike_engine::ui::camera::Camera;
use airstrike_engine::ui::grid::draw_grid;
use airstrike_engine::ui::tactical::{draw_aircraft, draw_radar_sweep, AircraftRenderState};
use airstrike_engine::ui::tile_manager::{visible_tiles, TileManager};
use simulation::world::World;

const WINDOW_W: u32 = 1280;
const WINDOW_H: u32 = 720;
const TARGET_FPS: u64 = 60;
const FRAME_DURATION: Duration = Duration::from_millis(1000 / TARGET_FPS);
const TRAIL_INTERVAL_S: f32 = 2.0;

const DEFAULT_LAT: f64 = 38.716;
const DEFAULT_LON: f64 = -9.142;
const DEFAULT_ZOOM: u32 = 7;

struct HudCache<'tc> {
    last_lines: [String; 4],
    textures: Option<Vec<sdl2::render::Texture<'tc>>>,
    sizes: [(u32, u32); 4],
}

impl<'tc> HudCache<'tc> {
    fn new() -> Self {
        HudCache {
            last_lines: [String::new(), String::new(), String::new(), String::new()],
            textures: None,
            sizes: [(0, 0); 4],
        }
    }
}

enum Scene {
    MainMenu(MainMenu),
    ModeSelect(ModeSelect),
    SandboxSettings(SandboxSettings),
    InGame,
}

fn main() -> Result<(), String> {
    let sdl_context = sdl2::init()?;
    let video = sdl_context.video()?;
    let ttf = sdl2::ttf::init().map_err(|e| e.to_string())?;
    let _image = sdl2::image::init(sdl2::image::InitFlag::PNG)?;

    let window = video
        .window("STRATOSPHERE v0.1", WINDOW_W, WINDOW_H)
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

    let texture_creator = Box::new(canvas.texture_creator());
    let texture_creator: &'static _ = Box::leak(texture_creator);

    let font = ttf.load_font("stratosphere/assets/fonts/JetBrainsMonoNL-Regular.ttf", 14)?;

    let mut camera = Camera::new(
        DEFAULT_LAT,
        DEFAULT_LON,
        DEFAULT_ZOOM,
        WINDOW_W as f32,
        WINDOW_H as f32,
    );
    let mut tile_manager = TileManager::new();
    let mut event_pump = sdl_context.event_pump()?;

    let airport_csv = include_bytes!("../assets/airports.csv");
    let airport_db = airstrike_engine::core::airport::AirportDb::load(airport_csv);
    let mut scene = Scene::MainMenu(MainMenu::new());

    let mut mouse_down = false;
    let mut last_mouse: (i32, i32) = (0, 0);
    let mut current_mouse: (i32, i32) = (0, 0);

    let mut fps_timer = Instant::now();
    let mut frame_count = 0u32;
    let mut fps_display = 0u32;
    let mut hud_cache = HudCache::new();

    let mut world = World::new();
    world.spawn_demo();
    let mut render_states: Vec<AircraftRenderState> = world
        .aircraft
        .iter()
        .map(|ac| AircraftRenderState::new(ac.id))
        .collect();

    let mut sweep_angle: f32 = 0.0;

    'running: loop {
        let frame_start = Instant::now();

        for event in event_pump.poll_iter() {
            match &mut scene {
                Scene::MainMenu(menu) => match event {
                    Event::Quit { .. } => break 'running,
                    Event::KeyDown {
                        keycode: Some(Keycode::Escape),
                        ..
                    } => break 'running,
                    Event::KeyDown {
                        keycode: Some(Keycode::Down),
                        ..
                    } => menu.move_down(),
                    Event::KeyDown {
                        keycode: Some(Keycode::Up),
                        ..
                    } => menu.move_up(),
                    Event::KeyDown {
                        keycode: Some(Keycode::Return),
                        ..
                    } => match menu.confirm() {
                        MenuAction::GoToModeSelect => {
                            scene = Scene::ModeSelect(ModeSelect::new());
                        }
                        MenuAction::Quit => break 'running,
                        _ => {}
                    },
                    _ => {}
                },
                Scene::ModeSelect(ms) => match event {
                    Event::Quit { .. } => break 'running,
                    Event::KeyDown {
                        keycode: Some(Keycode::Escape),
                        ..
                    } => {
                        scene = Scene::MainMenu(MainMenu::new());
                    }
                    Event::KeyDown {
                        keycode: Some(Keycode::Down),
                        ..
                    } => ms.move_down(),
                    Event::KeyDown {
                        keycode: Some(Keycode::Up),
                        ..
                    } => ms.move_up(),
                    Event::KeyDown {
                        keycode: Some(Keycode::Return),
                        ..
                    } => match ms.confirm() {
                        ModeSelectAction::GoToSandboxSettings => {
                            let settings = SandboxSettings::new(&airport_db);
                            scene = Scene::SandboxSettings(settings);
                        }
                        _ => {}
                    },
                    _ => {}
                },
                Scene::SandboxSettings(ss) => match event {
                    Event::Quit { .. } => break 'running,
                    Event::KeyDown {
                        keycode: Some(Keycode::Escape),
                        ..
                    } => {
                        scene = Scene::ModeSelect(ModeSelect::new());
                    }
                    Event::KeyDown {
                        keycode: Some(Keycode::Down),
                        ..
                    } => ss.move_down(),
                    Event::KeyDown {
                        keycode: Some(Keycode::Up),
                        ..
                    } => ss.move_up(),
                    Event::KeyDown {
                        keycode: Some(Keycode::Return),
                        ..
                    } => match ss.confirm() {
                        SandboxAction::StartGame {
                            country_iso,
                            starting_credits,
                        } => {
                            world = World::new_from_settings(
                                &country_iso,
                                starting_credits,
                                &airport_db,
                            );
                            render_states = world
                                .aircraft
                                .iter()
                                .map(|ac| AircraftRenderState::new(ac.id))
                                .collect();
                            scene = Scene::InGame;
                        }
                        _ => {}
                    },
                    _ => {}
                },
                Scene::InGame => match event {
                    Event::Quit { .. } => break 'running,
                    Event::KeyDown {
                        keycode: Some(Keycode::Escape),
                        ..
                    } => {
                        scene = Scene::MainMenu(MainMenu::new());
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
                },
            }
        }

        let tiles = visible_tiles(&camera);
        tile_manager.request_tiles(&tiles);
        tile_manager.drain_channel(texture_creator);

        let dt = frame_start.elapsed().as_secs_f32().min(0.1);

        frame_count += 1;
        if fps_timer.elapsed() >= Duration::from_secs(1) {
            fps_display = frame_count;
            frame_count = 0;
            fps_timer = Instant::now();
        }

        canvas.set_draw_color(Color::RGB(10, 10, 20));
        canvas.clear();

        match &scene {
            Scene::MainMenu(menu) => {
                render_main_menu(&mut canvas, &font, texture_creator, menu)?;
            }
            Scene::ModeSelect(ms) => {
                render_mode_select(&mut canvas, &font, texture_creator, ms)?;
            }
            Scene::SandboxSettings(ss) => {
                render_sandbox_settings(&mut canvas, &font, texture_creator, ss)?;
            }
            Scene::InGame => {
                world.update(dt);
                for state in &mut render_states {
                    if let Some(ac) = world.aircraft.iter().find(|a| a.id == state.id) {
                        state.tick(ac, dt, TRAIL_INTERVAL_S);
                    }
                }

                tile_manager.render_placeholders(&mut canvas, &camera);
                tile_manager.render(&mut canvas, &camera);
                draw_grid(&mut canvas, &camera);
                ui::airport_layer::draw_airports(&mut canvas, &world.airports, &camera, true)?;

                sweep_angle = (sweep_angle + 3.0 * dt) % 360.0;
                draw_radar_sweep(
                    &mut canvas,
                    DEFAULT_LAT,
                    DEFAULT_LON,
                    400.0,
                    sweep_angle,
                    &camera,
                );

                draw_aircraft(
                    &mut canvas,
                    texture_creator,
                    &font,
                    &world.aircraft,
                    &render_states,
                    &camera,
                );

                let tracked_count = world.aircraft.iter().filter(|a| a.is_detected).count();
                render_hud(
                    &mut canvas,
                    texture_creator,
                    &font,
                    &camera,
                    fps_display,
                    tile_manager.loaded,
                    tile_manager.pending,
                    "RWS",
                    tracked_count,
                    &mut hud_cache,
                )?;
            }
        }

        canvas.present();

        let elapsed = frame_start.elapsed();
        if elapsed < FRAME_DURATION {
            std::thread::sleep(FRAME_DURATION - elapsed);
        }
    }

    Ok(())
}

fn render_hud<'tc>(
    canvas: &mut sdl2::render::Canvas<sdl2::video::Window>,
    texture_creator: &'tc sdl2::render::TextureCreator<sdl2::video::WindowContext>,
    font: &sdl2::ttf::Font,
    camera: &Camera,
    fps: u32,
    loaded: usize,
    pending: usize,
    radar_mode: &str,
    tracked_count: usize,
    cache: &mut HudCache<'tc>,
) -> Result<(), String> {
    let (lat, lon) = camera.center_lat_lon();
    let new_lines = [
        format!("ZOOM: {:2}   FPS: {}", camera.zoom, fps),
        format!("LAT: {:+.4}°  LON: {:+.4}°", lat, lon),
        format!("TILES: {} loaded / {} pending", loaded, pending),
        format!("RADAR: {} | TRACKED: {}", radar_mode, tracked_count),
    ];

    if cache.textures.is_none() || new_lines != cache.last_lines {
        let mut textures = Vec::with_capacity(4);
        let mut sizes = [(0u32, 0u32); 4];
        for (i, line) in new_lines.iter().enumerate() {
            let surface = font
                .render(line)
                .blended(Color::RGB(0, 255, 100))
                .map_err(|e| e.to_string())?;
            let texture = texture_creator
                .create_texture_from_surface(&surface)
                .map_err(|e| e.to_string())?;
            let sdl2::render::TextureQuery { width, height, .. } = texture.query();
            sizes[i] = (width, height);
            textures.push(texture);
        }
        cache.textures = None;
        cache.textures = Some(textures);
        cache.last_lines = new_lines;
        cache.sizes = sizes;
    }

    let line_h = 18i32;
    let padding = 8i32;

    canvas.set_draw_color(Color::RGBA(0, 0, 0, 180));
    let bg = Rect::new(8, 8, 280, (4 * line_h + padding * 2) as u32);
    canvas.fill_rect(bg)?;

    if let Some(textures) = &cache.textures {
        for (i, texture) in textures.iter().enumerate() {
            let (w, h) = cache.sizes[i];
            let dst = Rect::new(padding + 8, padding + 8 + i as i32 * line_h, w, h);
            canvas.copy(texture, None, Some(dst))?;
        }
    }

    Ok(())
}

fn render_text_centered(
    canvas: &mut sdl2::render::Canvas<sdl2::video::Window>,
    font: &sdl2::ttf::Font,
    tc: &sdl2::render::TextureCreator<sdl2::video::WindowContext>,
    text: &str,
    color: Color,
    y: i32,
    window_w: i32,
) -> Result<(), String> {
    let surf = font
        .render(text)
        .blended(color)
        .map_err(|e| e.to_string())?;
    let tex = tc
        .create_texture_from_surface(&surf)
        .map_err(|e| e.to_string())?;
    let sdl2::render::TextureQuery { width, height, .. } = tex.query();
    let x = (window_w - width as i32) / 2;
    canvas.copy(&tex, None, Some(Rect::new(x, y, width, height)))?;
    Ok(())
}

fn render_main_menu(
    canvas: &mut sdl2::render::Canvas<sdl2::video::Window>,
    font: &sdl2::ttf::Font,
    tc: &sdl2::render::TextureCreator<sdl2::video::WindowContext>,
    menu: &scenes::main_menu::MainMenu,
) -> Result<(), String> {
    let w = WINDOW_W as i32;
    render_text_centered(
        canvas,
        font,
        tc,
        "STRATOSPHERE",
        Color::RGB(0, 200, 255),
        180,
        w,
    )?;
    for (i, item) in menu.items().iter().enumerate() {
        let color = if menu.selected == i {
            Color::RGB(0, 255, 100)
        } else {
            Color::RGB(0, 100, 50)
        };
        render_text_centered(canvas, font, tc, item, color, 300 + i as i32 * 40, w)?;
    }
    Ok(())
}

fn render_mode_select(
    canvas: &mut sdl2::render::Canvas<sdl2::video::Window>,
    font: &sdl2::ttf::Font,
    tc: &sdl2::render::TextureCreator<sdl2::video::WindowContext>,
    ms: &scenes::mode_select::ModeSelect,
) -> Result<(), String> {
    let w = WINDOW_W as i32;
    render_text_centered(
        canvas,
        font,
        tc,
        "SELECT MODE",
        Color::RGB(0, 200, 255),
        180,
        w,
    )?;
    for (i, item) in ms.items().iter().enumerate() {
        let color = if ms.selected == i {
            Color::RGB(0, 255, 100)
        } else {
            Color::RGB(0, 100, 50)
        };
        render_text_centered(canvas, font, tc, item, color, 300 + i as i32 * 40, w)?;
    }
    Ok(())
}

fn render_sandbox_settings(
    canvas: &mut sdl2::render::Canvas<sdl2::video::Window>,
    font: &sdl2::ttf::Font,
    tc: &sdl2::render::TextureCreator<sdl2::video::WindowContext>,
    ss: &scenes::sandbox_settings::SandboxSettings,
) -> Result<(), String> {
    let w = WINDOW_W as i32;
    render_text_centered(
        canvas,
        font,
        tc,
        "SELECT COUNTRY",
        Color::RGB(0, 200, 255),
        100,
        w,
    )?;
    let visible = 12usize;
    let start = ss.selected_country.saturating_sub(visible / 2);
    let end = (start + visible).min(ss.country_list.len());
    for (list_i, (iso, _)) in ss.country_list[start..end].iter().enumerate() {
        let actual_i = start + list_i;
        let color = if ss.selected_country == actual_i {
            Color::RGB(0, 255, 100)
        } else {
            Color::RGB(0, 100, 50)
        };
        render_text_centered(canvas, font, tc, iso, color, 160 + list_i as i32 * 22, w)?;
    }
    Ok(())
}
