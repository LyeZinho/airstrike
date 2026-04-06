mod scenes;
mod simulation;
mod ui;

use crate::ui::base_panel::render_base_panel;
use scenes::main_menu::{MainMenu, MenuAction};
use scenes::mode_select::{ModeSelect, ModeSelectAction};
use scenes::sandbox_settings::{SandboxAction, SandboxSettings};
use std::time::{Duration, Instant};
use ui::mission_panel::{MissionBriefingState, render_mission_briefing};

use sdl2::event::Event;
use sdl2::keyboard::Keycode;
use sdl2::mouse::MouseButton;
use sdl2::pixels::Color;
use sdl2::rect::Rect;
use sdl2::render::BlendMode;

use airstrike_engine::ui::camera::Camera;
use airstrike_engine::ui::grid::draw_grid;
use airstrike_engine::ui::tactical::{draw_aircraft, draw_radar_sweep, AircraftRenderState};
use airstrike_engine::ui::tile_manager::{visible_tiles, TileManager};
use airstrike_engine::core::mission::{Waypoint, WaypointAction};
use airstrike_engine::core::aircraft::{FlightPhase, Side};
use simulation::missile::MissilePhase;
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

#[derive(PartialEq, Clone)]
enum Selection {
    None,
    Aircraft(u32),
    Airport(String),
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
    let mut selection = Selection::None;
    let mut drag_start: (i32, i32) = (0, 0);
    let mut mission_state = MissionBriefingState::new();

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

    // Center camera on first airport so player sees their assets

    'running: loop {
        let frame_start = Instant::now();
        let dt = fps_timer.elapsed().as_secs_f32().min(0.1);
        fps_timer = Instant::now();

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
                    Event::MouseMotion { x, y, .. } => {
                        menu.handle_mouse_move(x, y, WINDOW_W as i32);
                    }
                    Event::MouseButtonDown {
                        mouse_btn: MouseButton::Left,
                        x,
                        y,
                        ..
                    } => match menu.handle_mouse_click(x, y, WINDOW_W as i32) {
                        Some(MenuAction::GoToModeSelect) => {
                            scene = Scene::ModeSelect(ModeSelect::new());
                        }
                        Some(MenuAction::Quit) => break 'running,
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
                    } => {
                        if let ModeSelectAction::GoToSandboxSettings = ms.confirm() {
                            let settings = SandboxSettings::new(&airport_db);
                            scene = Scene::SandboxSettings(settings);
                        }
                    }
                    Event::MouseMotion { x, y, .. } => {
                        ms.handle_mouse_move(x, y, WINDOW_W as i32);
                    }
                    Event::MouseButtonDown {
                        mouse_btn: MouseButton::Left,
                        x,
                        y,
                        ..
                    } => {
                        if let Some(ModeSelectAction::GoToSandboxSettings) =
                            ms.handle_mouse_click(x, y, WINDOW_W as i32)
                        {
                            let settings = SandboxSettings::new(&airport_db);
                            scene = Scene::SandboxSettings(settings);
                        }
                    }
                    _ => {}
                },
                Scene::SandboxSettings(ss) => match event {
                    Event::Quit { .. } => break 'running,
                    Event::KeyDown {
                        keycode: Some(Keycode::Escape),
                        ..
                    } => {
                        if selection != Selection::None {
                            selection = Selection::None;
                        } else {
                            scene = Scene::MainMenu(MainMenu::new());
                        }
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
                    } => {
                        if let SandboxAction::StartGame {
                            country_iso,
                            starting_credits,
                        } = ss.confirm()
                        {
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
                            mission_state = MissionBriefingState::new();
                            scene = Scene::InGame;
                            // Center camera on first friendly airport so player sees their assets
                            if let Some(first) = world.airports.iter().find(|a| a.side == Side::Friendly) {
                                camera = Camera::new(
                                    first.lat,
                                    first.lon,
                                    10,
                                    camera.window_w,
                                    camera.window_h,
                                );
                            }
                        }
                    }
                    Event::MouseMotion { x, y, .. } => {
                        ss.handle_mouse_move(x, y, WINDOW_W as i32);
                    }
                    Event::MouseButtonDown {
                        mouse_btn: MouseButton::Left,
                        x,
                        y,
                        ..
                    } => {
                        ss.handle_mouse_click(x, y, WINDOW_W as i32);
                    }
                    _ => {}
                },
                Scene::InGame => match event {
                    Event::Quit { .. } => break 'running,
                    Event::KeyDown {
                        keycode: Some(Keycode::Escape),
                        ..
                    } => {
                        if selection != Selection::None {
                            selection = Selection::None;
                        } else {
                            scene = Scene::MainMenu(MainMenu::new());
                        }
                    }
                    Event::MouseButtonDown {
                        mouse_btn: MouseButton::Left,
                        x,
                        y,
                        ..
                    } => {
                        let mut intercepted = false;
                        
                        // Mission Panel Hit Test
                        let current_selection = selection.clone();
                        if let Selection::Aircraft(id) = current_selection {
                             if let Some(ac) = world.aircraft.iter().find(|a| a.id == id) {
                                 if ac.phase == FlightPhase::ColdDark && ac.side == Side::Friendly {
                                     let (win_w, win_h) = canvas.window().size();
                                     let p_w = 700;
                                     let p_h = win_h - 100;
                                     let p_x = win_w as i32 - p_w - 20;
                                     let p_y = 20;
                                     let p_rect = Rect::new(p_x, p_y, p_w as u32, p_h as u32);
                                     
                                     if p_rect.contains_point((x, y)) {
                                         intercepted = true;
                                         // Close Button
                                         let close_rect = Rect::new(p_x + p_w - 40, p_y + 10, 30, 30);
                                         if close_rect.contains_point((x, y)) {
                                             selection = Selection::None;
                                         }
                                         
                                         // Tabs
                                         for i in 0..5 { // Fixed: check all 5 tabs
                                             let tx = p_x + 20 + i as i32 * 80; // Fixed spacing
                                             let ty = p_y + 60;
                                             let tab_rect = Rect::new(tx, ty, 70, 30);
                                             if tab_rect.contains_point((x, y)) {
                                                 mission_state.active_tab = i;
                                             }
                                         }
                                         
                                         // Waypoint Deletion
                                         if mission_state.active_tab == 0 {
                                             let mut to_remove = None;
                                             for i in 0..mission_state.current_plan.waypoints.len() {
                                                 let row_y = p_y + 140 + i as i32 * 25;
                                                 let del_rect = Rect::new(p_x + 280, row_y, 20, 20);
                                                 if del_rect.contains_point((x, y)) {
                                                     to_remove = Some(i);
                                                     break;
                                                 }
                                             }
                                             if let Some(idx) = to_remove {
                                                 mission_state.current_plan.waypoints.remove(idx);
                                             }
                                         }
                                         
                                         // Dispatch Button
                                         let btn_y = p_y + p_h as i32 - 60;
                                         let btn_rect = Rect::new(p_x + 100, btn_y, 200, 40);
                                         if btn_rect.contains_point((x, y)) {
                                             if !mission_state.current_plan.waypoints.is_empty() {
                                                 world.dispatch_with_mission(id, mission_state.current_plan.clone());
                                                 selection = Selection::None;
                                             }
                                         }
                                     }
                                 }
                             }
                        }

                        if !intercepted {
                            if let Selection::Airport(icao) = &selection.clone() {
                                if let Some(airport) = world.airports.iter().find(|a| a.icao == *icao) {
                                    let panel = build_airport_panel(airport, &world.aircraft);
                                    if let Some(dispatch_id) = hit_test_panel_dispatch(&panel, x, y) {
                                        world.dispatch_with_mission(dispatch_id, mission_state.current_plan.clone());
                                    }
                                }
                            }
                        }
                        mouse_down = true;
                        last_mouse = (x, y);
                        current_mouse = (x, y);
                        drag_start = (x, y);
                    }
                    Event::MouseButtonDown {
                        mouse_btn: MouseButton::Right,
                        x,
                        y,
                        ..
                    } => {
                        if let Selection::Aircraft(id) = &selection {
                             if let Some(ac) = world.aircraft.iter().find(|a| a.id == *id) {
                                 if ac.phase == FlightPhase::ColdDark {
                                     let (wx, wy) = camera.screen_to_world(x as f32, y as f32);
                                     let (lat, lon) = airstrike_engine::core::geo::world_to_lat_lon(wx, wy, camera.zoom);
                                     mission_state.current_plan.waypoints.push(Waypoint {
                                         lat,
                                         lon,
                                         altitude_ft: 25_000.0,
                                         speed_knots: 450.0,
                                         action: WaypointAction::FlyOver,
                                     });
                                 }
                             }
                        }
                    }
                    Event::MouseButtonUp {
                        mouse_btn: MouseButton::Left,
                        x,
                        y,
                        ..
                    } => {
                        mouse_down = false;
                        let drag_dist =
                            (((x - drag_start.0).pow(2) + (y - drag_start.1).pow(2)) as f32).sqrt();
                        if drag_dist < 5.0 {
                            // Check if we are clicking inside the mission panel first
                            let mut in_panel = false;
                            if let Selection::Aircraft(id) = &selection {
                                 if let Some(ac) = world.aircraft.iter().find(|a| a.id == *id) {
                                     if ac.phase == FlightPhase::ColdDark && ac.side == Side::Friendly {
                                         let (win_w, win_h) = canvas.window().size();
                                         let p_w = 700;
                                         let p_x = win_w as i32 - p_w - 20;
                                         let p_rect = Rect::new(p_x, 20, p_w as u32, win_h - 100);
                                         if p_rect.contains_point((x, y)) {
                                             in_panel = true;
                                         }
                                     }
                                 }
                            }
                            
                            if !in_panel {
                                selection = hit_test_map(x, y, &world, &camera);
                            }
                        }
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
                    Event::KeyDown {
                        keycode: Some(Keycode::D),
                        ..
                    } => {
                        if let Selection::Aircraft(id) = &selection {
                             world.dispatch_with_mission(*id, mission_state.current_plan.clone());
                        }
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
                let (cam_lat, cam_lon) = camera.center_lat_lon();
                world.theater_lat = cam_lat;
                world.theater_lon = cam_lon;
                
                world.update(dt);
                // Optimize: Build a quick lookup map for render states
                use std::collections::HashMap;
                let ac_map: HashMap<u32, &airstrike_engine::core::aircraft::Aircraft> = world.aircraft.iter().map(|a| (a.id, a)).collect();

                for state in &mut render_states {
                    if let Some(ac) = ac_map.get(&state.id) {
                        if ac.side == airstrike_engine::core::aircraft::Side::Friendly
                            || ac.is_visible()
                        {
                            state.tick(ac, dt, TRAIL_INTERVAL_S);
                        }
                    }
                }

                tile_manager.render_placeholders(&mut canvas, &camera);
                tile_manager.render(&mut canvas, &camera);
                draw_grid(&mut canvas, &camera);
                ui::airport_layer::draw_airports(&mut canvas, &world.airports, &camera)?;
                ui::airport_layer::draw_airport_labels(
                    &mut canvas,
                    texture_creator,
                    &font,
                    &world.airports,
                    &camera,
                )?;

                for radar in &world.radars {
                    let mut should_render = false;
                    
                    // Always show friendly ground radars or if selected
                    let is_friendly = radar.side == airstrike_engine::core::aircraft::Side::Friendly;

                    if is_friendly {
                        should_render = true;
                    } else if let Selection::Airport(ref icao) = selection {
                         if let Some(apt) = world.airports.iter().find(|a| &a.icao == icao) {
                             if (apt.lat - radar.position_lat).abs() < 0.01 && (apt.lon - radar.position_lon).abs() < 0.01 {
                                 should_render = true;
                             }
                         }
                    }
                    
                    if !should_render { continue; }

                    // LOD Culling: Don't draw tiny distant radar circles if there are hundreds
                    let dist_to_radar = airstrike_engine::core::radar::haversine_km(cam_lat, cam_lon, radar.position_lat, radar.position_lon);
                    if dist_to_radar > 1000.0 && !is_friendly {
                        continue; // Hide distant enemy radars to declutter
                    }

                    let (wx, wy) = airstrike_engine::core::geo::lat_lon_to_world(radar.position_lat, radar.position_lon, camera.zoom);
                    let (rx, ry) = camera.world_to_screen(wx, wy);
                    let km_per_px = 156.543 / (1u32 << camera.zoom) as f32 * (radar.position_lat as f64).to_radians().cos() as f32;
                    let radius_px = radar.range_km / km_per_px;
                    
                    if rx + radius_px < 0.0 || rx - radius_px > camera.window_w || ry + radius_px < 0.0 || ry - radius_px > camera.window_h {
                        continue;
                    }

                    draw_radar_sweep(
                        &mut canvas,
                        radar.position_lat,
                        radar.position_lon,
                        radar.range_km,
                        radar.sweep_angle,
                        &camera,
                    );
                }

                draw_aircraft(
                    &mut canvas,
                    texture_creator,
                    &font,
                    &world.aircraft,
                    &render_states,
                    &camera,
                );

                // Draw Selected Friendly Aircraft Radar Sweep (Restored visuals)
                if let Selection::Aircraft(id) = selection {
                    if let Some(ac) = world.aircraft.iter().find(|a| a.id == id) {
                        if ac.side == airstrike_engine::core::aircraft::Side::Friendly && ac.phase != airstrike_engine::core::aircraft::FlightPhase::Destroyed {
                            if let Some(radar) = &ac.own_radar {
                                draw_radar_sweep(
                                    &mut canvas,
                                    ac.lat,
                                    ac.lon,
                                    radar.range_km,
                                    radar.sweep_angle,
                                    &camera,
                                );
                            }
                        }
                    }
                }

                for missile in &world.missiles {
                    let (wx, wy) = airstrike_engine::core::geo::lat_lon_to_world(
                        missile.lat,
                        missile.lon,
                        camera.zoom,
                    );
                    let (sx, sy) = camera.world_to_screen(wx, wy);
                    let color = match missile.phase {
                        MissilePhase::Midcourse => Color::RGB(200, 200, 200),
                        MissilePhase::Pitbull => Color::RGB(255, 200, 0),
                        MissilePhase::Terminal => Color::RGB(255, 60, 60),
                        _ => continue,
                    };
                    canvas.set_draw_color(color);
                    canvas.fill_rect(Rect::new(sx as i32 - 2, sy as i32 - 2, 4, 4))?;
                }

                // Render selected aircraft route
                if let Selection::Aircraft(id) = &selection {
                    if let Some(ac) = world.aircraft.iter().find(|a| a.id == *id) {
                        airstrike_engine::ui::tactical::draw_route(&mut canvas, ac, &camera);
                    }
                }

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
                ui::hud_panels::render_brevity_log(
                    &mut canvas,
                    texture_creator,
                    &font,
                    &world.brevity_log,
                    WINDOW_H,
                )?;

                let mut show_standard_hud = true;

                if let Selection::Aircraft(id) = &selection {
                    if let Some(idx) = world.aircraft.iter().position(|a| &a.id == id) {
                        let ac = &world.aircraft[idx];
                        let rs = &render_states[idx];
                        if ac.phase == FlightPhase::ColdDark && ac.side == Side::Friendly {
                            show_standard_hud = false;
                            render_mission_briefing(
                                &mut canvas,
                                texture_creator,
                                &font,
                                ac,
                                &mission_state,
                                rs,
                                &world,
                            )?;
                        } else {
                            // NEW: Aircraft Detail Panel for more specs
                            let detail_panel = ui::aircraft_detail_panel::create_aircraft_detail_panel(ac);
                            ui::hud::render_hud_panel(&mut canvas, texture_creator, &font, &detail_panel)?;
                        }

                        // NEW: EW Panel for friendly aircraft or if selected and visible
                        if ac.side == Side::Friendly && show_standard_hud {
                             let context_radars: Vec<(u32, f64, f64, bool)> = world.radars.iter().map(|r| (r.id, r.position_lat, r.position_lon, r.is_emitting)).collect();
                             let ew_panel = ui::ew_panel::create_ew_panel(ac, &world.ew, &context_radars);
                             ui::hud::render_hud_panel(&mut canvas, texture_creator, &font, &ew_panel)?;
                        }
                    }
                }

                if let Selection::Airport(icao) = &selection {
                    if let Some(airport) = world.airports.iter().find(|a| &a.icao == icao) {
                        // Priority: If it's a managed airbase, show the airbase panel
                        if let Some(base) = world.airbases.iter().find(|b| &b.icao == icao) {
                            show_standard_hud = false;
                            render_base_panel(&mut canvas, texture_creator, &font, base)?;
                        } else {
                            let panel = build_airport_panel(airport, &world.aircraft);
                            ui::hud::render_hud_panel(&mut canvas, texture_creator, &font, &panel)?;
                        }
                    }
                }

                // NEW: Global Diplomacy Panel - Only show if not in a "major" modal
                if show_standard_hud {
                    let diplomacy_panel = ui::diplomacy_panel::create_diplomacy_panel(&mut world.diplomacy);
                    ui::hud::render_hud_panel(&mut canvas, texture_creator, &font, &diplomacy_panel)?;
                }
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

#[allow(clippy::needless_lifetimes, clippy::too_many_arguments)]
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

    let line_h = 20i32;
    let padding = 10i32;
    let w = 300;
    let h = (4 * line_h + padding * 2) as u32;

    canvas.set_blend_mode(BlendMode::Blend);
    // Premium Glassmorphism Background
    for i in 0..10 {
        let alpha = 140 + (i * 6);
        canvas.set_draw_color(Color::RGBA(0, 10 + i as u8, 20 + i as u8, alpha as u8));
        let step_h = h / 10;
        let _ = canvas.fill_rect(Rect::new(10, 10 + (i as i32 * step_h as i32), w, step_h.max(1)));
    }
    
    // Cyan top accent
    canvas.set_draw_color(Color::RGB(0, 200, 255));
    let _ = canvas.fill_rect(Rect::new(10, 10, w, 2));
    
    // Subtle border
    canvas.set_draw_color(Color::RGBA(0, 200, 255, 60));
    let _ = canvas.draw_rect(Rect::new(10, 10, w, h));

    if let Some(textures) = &cache.textures {
        for (i, texture) in textures.iter().enumerate() {
            let (tw, th) = cache.sizes[i];
            let dst = Rect::new(10 + padding, 10 + padding + i as i32 * line_h, tw, th);
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
    let h = WINDOW_H as i32;
    
    // Background Gradient Overlay
    canvas.set_blend_mode(sdl2::render::BlendMode::Blend);
    for i in 0..100 {
        let alpha = (i as f32 / 100.0 * 180.0) as u8;
        canvas.set_draw_color(Color::RGBA(0, 10, 20, alpha));
        let _ = canvas.fill_rect(Rect::new(0, h - (i * h / 100), w as u32, (h/100) as u32));
    }

    render_text_centered(
        canvas,
        font,
        tc,
        "AIRSTRIKE: STRATOSPHERE",
        Color::RGB(0, 220, 255),
        150,
        w,
    )?;
    
    canvas.set_draw_color(Color::RGB(0, 100, 150));
    let _ = canvas.draw_line((w / 2 - 150, 200), (w / 2 + 150, 200));

    for (i, item) in menu.items().iter().enumerate() {
        let is_selected = menu.selected == i || menu.hovered_index == Some(i);
        let color = if is_selected {
            Color::RGB(255, 255, 255)
        } else {
            Color::RGB(0, 180, 200)
        };
        
        let py = 320 + i as i32 * 60;
        if is_selected {
            // Selection highight
            canvas.set_draw_color(Color::RGBA(0, 255, 100, 40));
            let _ = canvas.fill_rect(Rect::new(w / 2 - 100, py - 5, 200, 40));
            canvas.set_draw_color(Color::RGB(0, 255, 100));
            let _ = canvas.draw_rect(Rect::new(w / 2 - 100, py - 5, 200, 40));
        }
        
        render_text_centered(canvas, font, tc, item, color, py, w)?;
    }
    
    // Footer hint
    render_text_centered(canvas, font, tc, "ENGINE ALPHA v0.5.2", Color::RGB(60, 60, 60), h - 40, w)?;

    Ok(())
}

fn render_mode_select(
    canvas: &mut sdl2::render::Canvas<sdl2::video::Window>,
    font: &sdl2::ttf::Font,
    tc: &sdl2::render::TextureCreator<sdl2::video::WindowContext>,
    ms: &scenes::mode_select::ModeSelect,
) -> Result<(), String> {
    let w = WINDOW_W as i32;
    let h = WINDOW_H as i32;
    
    // Background
    canvas.set_blend_mode(sdl2::render::BlendMode::Blend);
    canvas.set_draw_color(Color::RGBA(0, 10, 20, 200));
    let _ = canvas.fill_rect(Rect::new(0, 0, w as u32, h as u32));

    render_text_centered(
        canvas,
        font,
        tc,
        "SELECT OPERATIONAL MODE",
        Color::RGB(0, 200, 255),
        150,
        w,
    )?;
    for (i, item) in ms.items().iter().enumerate() {
        let is_selected = ms.selected == i || ms.hovered_index == Some(i);
        let color = if is_selected {
            Color::RGB(255, 255, 255)
        } else {
            Color::RGB(0, 180, 200)
        };
        
        let py = 320 + i as i32 * 60;
        if is_selected {
            canvas.set_draw_color(Color::RGBA(0, 255, 100, 40));
            let _ = canvas.fill_rect(Rect::new(w / 2 - 150, py - 5, 300, 40));
            canvas.set_draw_color(Color::RGB(0, 255, 100));
            let _ = canvas.draw_rect(Rect::new(w / 2 - 150, py - 5, 300, 40));
        }
        
        render_text_centered(canvas, font, tc, item, color, py, w)?;
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
        let color = if ss.selected_country == actual_i || ss.hovered_index == Some(list_i) {
            Color::RGB(0, 255, 100)
        } else {
            Color::RGB(0, 100, 50)
        };
        render_text_centered(canvas, font, tc, iso, color, 160 + list_i as i32 * 22, w)?;
    }
    Ok(())
}

fn hit_test_map(
    sx: i32,
    sy: i32,
    world: &simulation::world::World,
    camera: &airstrike_engine::ui::camera::Camera,
) -> Selection {
    use airstrike_engine::core::geo;

    for ac in &world.aircraft {
        if matches!(
            ac.phase,
            airstrike_engine::core::aircraft::FlightPhase::Destroyed
        ) {
            continue;
        }
        if ac.side == airstrike_engine::core::aircraft::Side::Hostile && !ac.is_visible() {
            continue;
        }
        let (wx, wy) = geo::lat_lon_to_world(ac.lat, ac.lon, camera.zoom);
        let (asx, asy) = camera.world_to_screen(wx, wy);
        let dist = ((sx as f32 - asx).powi(2) + (sy as f32 - asy).powi(2)).sqrt();
        if dist < 12.0 {
            return Selection::Aircraft(ac.id);
        }
    }

    for airport in &world.airports {
        if !ui::airport_layer::should_render(airport, camera) {
            continue;
        }
        let (wx, wy) = geo::lat_lon_to_world(airport.lat, airport.lon, camera.zoom);
        let (asx, asy) = camera.world_to_screen(wx, wy);
        let radius = (ui::airport_layer::dot_size(airport) + 6) as f32;
        let dist = ((sx as f32 - asx).powi(2) + (sy as f32 - asy).powi(2)).sqrt();
        if dist < radius {
            return Selection::Airport(airport.icao.clone());
        }
    }

    Selection::None
}

fn build_aircraft_panel(ac: &airstrike_engine::core::aircraft::Aircraft) -> ui::hud::HudPanel {
    use airstrike_engine::core::aircraft::FlightPhase;
    use ui::hud::{HudPanel, HudRow};

    let phase_str = match &ac.phase {
        FlightPhase::ColdDark => "Cold & Dark".into(),
        FlightPhase::Preflight {
            elapsed_s,
            required_s,
        } => {
            format!("Preflight {:.0}/{:.0}s", elapsed_s, required_s)
        }
        FlightPhase::Taxiing { .. } => "Taxiing".into(),
        FlightPhase::TakeoffRoll { .. } => "Takeoff Roll".into(),
        FlightPhase::Climbing { target_alt_ft } => format!("Climbing → {:.0}ft", target_alt_ft),
        FlightPhase::EnRoute => "En Route".into(),
        FlightPhase::OnStation => "On Station".into(),
        FlightPhase::FormationHold { .. } => "Formation Hold".into(),
        FlightPhase::Rtb => "RTB".into(),
        FlightPhase::Landing { .. } => "Landing".into(),
        FlightPhase::Landed => "Landed".into(),
        FlightPhase::Maintenance { .. } => "Maintenance".into(),
        FlightPhase::Destroyed => "Destroyed".into(),
    };

    let mut rows = vec![
        HudRow::KeyValue("Model".into(), ac.model.clone()),
        HudRow::KeyValue("Phase".into(), phase_str),
        HudRow::KeyValue("Altitude".into(), format!("{:.0} ft", ac.altitude_ft)),
        HudRow::KeyValue("Speed".into(), format!("{:.0} kts", ac.speed_knots)),
        HudRow::KeyValue("Heading".into(), format!("{:.0}°", ac.heading_deg)),
        HudRow::Separator,
    ];

    if let Some(m) = &ac.mission {
        let wp_count = m.waypoints.len();
        let cur_wp = ac.waypoint_index + 1;
        rows.push(HudRow::KeyValue("Mission".into(), format!("{}/{}", cur_wp, wp_count)));
        if let Some(wp) = m.waypoints.get(ac.waypoint_index) {
             let dist = airstrike_engine::core::radar::haversine_km(ac.lat, ac.lon, wp.lat, wp.lon);
             rows.push(HudRow::KeyValue("WP Dist".into(), format!("{:.1} km", dist)));
        }
    }

    let fuel_pct = (ac.fuel_kg / 5000.0 * 100.0).clamp(0.0, 100.0); // Rough estimate
    rows.push(HudRow::KeyValue("Fuel".into(), format!("{:.0}%", fuel_pct)));

    HudPanel {
        anchor: ui::hud::HudAnchor::TopRight,
        offset_x: 10,
        offset_y: 10,
        width: 220,
        title: ac.callsign.clone(),
        rows,
    }
}

fn build_airport_panel(
    airport: &airstrike_engine::core::airport::Airport,
    aircraft: &[airstrike_engine::core::aircraft::Aircraft],
) -> ui::hud::HudPanel {
    use airstrike_engine::core::aircraft::FlightPhase;
    use airstrike_engine::core::airport::AirportType;
    use ui::hud::{HudAction, HudPanel, HudRow};

    let type_str = match airport.airport_type {
        AirportType::Large => "Large",
        AirportType::Medium => "Medium",
        AirportType::Small => "Small",
        AirportType::Other => "Other",
    };

    let mut rows = vec![
        HudRow::KeyValue("ICAO".into(), airport.icao.clone()),
        HudRow::KeyValue("Type".into(), type_str.into()),
        HudRow::KeyValue(
            "Elevation".into(),
            format!("{:.0} ft", airport.elevation_ft),
        ),
        HudRow::Separator,
    ];

    let cold_dark: Vec<_> = aircraft
        .iter()
        .filter(|ac| {
            ac.home_airport_icao == airport.icao && matches!(ac.phase, FlightPhase::ColdDark)
        })
        .collect();

    if cold_dark.is_empty() {
        rows.push(HudRow::KeyValue("Dispatch".into(), "None available".into()));
    } else {
        for ac in cold_dark {
            rows.push(HudRow::Button {
                label: format!("{} — {}", ac.callsign, ac.model),
                action: HudAction::Dispatch(ac.id),
            });
        }
    }

    HudPanel {
        anchor: ui::hud::HudAnchor::TopRight,
        offset_x: 10,
        offset_y: 10,
        width: 220,
        title: format!("{} — {}", airport.icao, airport.name),
        rows,
    }
}

fn hit_test_panel_dispatch(panel: &ui::hud::HudPanel, mx: i32, my: i32) -> Option<u32> {
    use ui::hud::{HudAction, HudRow};

    let (win_w, win_h) = (1280, 720); // TODO: get from world or context
    let line_h = 18i32;
    let padding = 6i32;
    let title_h = 20i32;
    let (px, py) = match panel.anchor {
        ui::hud::HudAnchor::TopLeft => (panel.offset_x, panel.offset_y),
        ui::hud::HudAnchor::TopRight => (win_w as i32 - panel.width as i32 - panel.offset_x, panel.offset_y),
        ui::hud::HudAnchor::BottomLeft => (panel.offset_x, win_h as i32 - 300 - panel.offset_y), // estimate h
        ui::hud::HudAnchor::BottomRight => (win_w as i32 - panel.width as i32 - panel.offset_x, win_h as i32 - 300 - panel.offset_y),
    };

    for (i, row) in panel.rows.iter().enumerate() {
        if let HudRow::Button {
            action: HudAction::Dispatch(id),
            ..
        } = row
        {
            let row_y = py + title_h + padding + i as i32 * line_h;
            let btn_rect = sdl2::rect::Rect::new(
                px + padding,
                row_y,
                panel.width.saturating_sub(padding as u32 * 2),
                (line_h - 2) as u32,
            );
            if btn_rect.contains_point(sdl2::rect::Point::new(mx, my)) {
                return Some(*id);
            }
        }
    }
    None
}
