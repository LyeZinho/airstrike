/// Tactical overlay: renders aircraft symbols, tags, and movement trails.
use sdl2::pixels::Color;
use sdl2::rect::Rect;
use sdl2::render::{Canvas, TextureCreator};
use sdl2::video::{Window, WindowContext};

use crate::core::aircraft::{Aircraft, Side};
use crate::core::geo;
use crate::ui::camera::Camera;

/// Maximum trail points stored per aircraft.
pub const MAX_TRAIL: usize = 60;

/// Off-screen culling margin in pixels (accounts for tag width/height).
const CULLING_MARGIN: i32 = 50;

/// A recorded position snapshot for trail rendering.
#[derive(Debug, Clone, Copy)]
pub struct TrailPoint {
    pub lat: f64,
    pub lon: f64,
}

/// Per-aircraft rendering state (trail history).
pub struct AircraftRenderState {
    pub id: u32,
    pub trail: Vec<TrailPoint>,
    /// Seconds since last trail point was recorded.
    pub trail_timer: f32,
    /// Ghost rendering: last known position when detected
    pub last_known_lat: f64,
    pub last_known_lon: f64,
    /// Frames since detection was lost (0 = still detected or never seen)
    pub frames_since_detection_lost: u32,
}

impl AircraftRenderState {
    pub fn new(id: u32) -> Self {
        AircraftRenderState {
            id,
            trail: Vec::new(),
            trail_timer: 0.0,
            last_known_lat: 0.0,
            last_known_lon: 0.0,
            frames_since_detection_lost: 0,
        }
    }

    /// Sample current position into trail every `interval` seconds.
    pub fn tick(&mut self, ac: &Aircraft, dt: f32, interval: f32) {
        if ac.is_detected {
            self.last_known_lat = ac.lat;
            self.last_known_lon = ac.lon;
            self.frames_since_detection_lost = 0;
        } else if self.frames_since_detection_lost < 180 {
            self.frames_since_detection_lost += 1;
        }

        self.trail_timer += dt;
        if self.trail_timer >= interval {
            self.trail_timer = 0.0;
            self.trail.push(TrailPoint {
                lat: ac.lat,
                lon: ac.lon,
            });
            if self.trail.len() > MAX_TRAIL {
                self.trail.remove(0);
            }
        }
    }
}

/// Returns SDL2 draw color for a side.
fn side_color(side: Side) -> Color {
    match side {
        Side::Friendly => Color::RGB(80, 140, 255), // Blue
        Side::Hostile => Color::RGB(255, 70, 70),   // Red
        Side::Unknown => Color::RGB(180, 180, 180), // Grey
    }
}

/// Draw a filled 10×10 square symbol centered at (sx, sy).
fn draw_symbol(canvas: &mut Canvas<Window>, sx: i32, sy: i32, color: Color) {
    canvas.set_draw_color(color);
    let _ = canvas.fill_rect(Rect::new(sx - 5, sy - 5, 10, 10));
    // Thin white border
    canvas.set_draw_color(Color::RGB(220, 220, 220));
    let _ = canvas.draw_rect(Rect::new(sx - 5, sy - 5, 10, 10));
}

/// Draw trail dots for a single aircraft.
fn draw_trail(canvas: &mut Canvas<Window>, trail: &[TrailPoint], camera: &Camera, color: Color) {
    for (i, pt) in trail.iter().enumerate() {
        let (wx, wy) = geo::lat_lon_to_world(pt.lat, pt.lon, camera.zoom);
        let (sx, sy) = camera.world_to_screen(wx, wy);
        let sx = sx as i32;
        let sy = sy as i32;
        // Fade: older points more transparent
        let alpha = ((i as f32 / trail.len() as f32) * 180.0) as u8;
        canvas.set_draw_color(Color::RGBA(color.r, color.g, color.b, alpha));
        let _ = canvas.fill_rect(Rect::new(sx - 2, sy - 2, 4, 4));
    }
}

/// Draw the callsign + altitude tag above the symbol.
fn draw_tag<'tc>(
    canvas: &mut Canvas<Window>,
    texture_creator: &'tc TextureCreator<WindowContext>,
    font: &sdl2::ttf::Font,
    ac: &Aircraft,
    sx: i32,
    sy: i32,
    color: Color,
) {
    let text = format!("{} {:05.0}ft", ac.callsign, ac.altitude_ft);
    if let Ok(surface) = font.render(&text).blended(color) {
        if let Ok(texture) = texture_creator.create_texture_from_surface(&surface) {
            let sdl2::render::TextureQuery { width, height, .. } = texture.query();
            let dst = sdl2::rect::Rect::new(sx + 8, sy - 16, width, height);
            let _ = canvas.copy(&texture, None, Some(dst));
        }
    }
}

pub fn draw_radar_sweep(
    canvas: &mut Canvas<Window>,
    radar_lat: f64,
    radar_lon: f64,
    radar_range_km: f32,
    sweep_angle_deg: f32,
    camera: &Camera,
) {
    let (wx, wy) = geo::lat_lon_to_world(radar_lat, radar_lon, camera.zoom);
    let (rx, ry) = camera.world_to_screen(wx, wy);

    let km_per_px = 156.543 / (1u32 << camera.zoom) as f32;
    let radius_px = radar_range_km / km_per_px;

    let arc_start = sweep_angle_deg - 15.0;
    let arc_end = sweep_angle_deg + 15.0;

    canvas.set_draw_color(Color::RGBA(0, 255, 100, 60));
    for i in 0..=20 {
        let angle = arc_start + (arc_end - arc_start) * i as f32 / 20.0;
        let rad = angle.to_radians();
        let x2 = (rx + radius_px * rad.sin()) as i32;
        let y2 = (ry - radius_px * rad.cos()) as i32;
        let _ = canvas.draw_line((rx as i32, ry as i32), (x2, y2));
    }
}

/// Draw all aircraft: trails, symbols, and tags.
pub fn draw_aircraft<'tc>(
    canvas: &mut Canvas<Window>,
    texture_creator: &'tc TextureCreator<WindowContext>,
    font: &sdl2::ttf::Font,
    aircraft: &[Aircraft],
    render_states: &[AircraftRenderState],
    camera: &Camera,
) {
    let (win_w, win_h) = canvas.window().size();

    for (ac, state) in aircraft.iter().zip(render_states.iter()) {
        if ac.is_detected {
            continue;
        }
        if state.frames_since_detection_lost == 0 {
            continue;
        }
        if state.frames_since_detection_lost >= 180 {
            continue;
        }

        let (wx, wy) =
            geo::lat_lon_to_world(state.last_known_lat, state.last_known_lon, camera.zoom);
        let (sx, sy) = camera.world_to_screen(wx, wy);
        let sx = sx as i32;
        let sy = sy as i32;

        if sx < -CULLING_MARGIN
            || sy < -CULLING_MARGIN
            || sx > win_w as i32 + CULLING_MARGIN
            || sy > win_h as i32 + CULLING_MARGIN
        {
            continue;
        }

        let fade = 1.0 - (state.frames_since_detection_lost as f32 / 180.0);
        let alpha = (fade * 120.0) as u8;
        let base_color = side_color(ac.side);
        let ghost_color = Color::RGBA(base_color.r, base_color.g, base_color.b, alpha);

        canvas.set_draw_color(ghost_color);
        let _ = canvas.fill_rect(Rect::new(sx - 3, sy - 3, 6, 6));
    }

    for ac in aircraft {
        if !ac.is_detected {
            continue;
        }

        let (wx, wy) = geo::lat_lon_to_world(ac.lat, ac.lon, camera.zoom);
        let (sx, sy) = camera.world_to_screen(wx, wy);
        let sx = sx as i32;
        let sy = sy as i32;

        if sx < -CULLING_MARGIN
            || sy < -CULLING_MARGIN
            || sx > win_w as i32 + CULLING_MARGIN
            || sy > win_h as i32 + CULLING_MARGIN
        {
            continue;
        }

        let color = side_color(ac.side);

        if let Some(state) = render_states.iter().find(|s| s.id == ac.id) {
            draw_trail(canvas, &state.trail, camera, color);
        }

        draw_symbol(canvas, sx, sy, color);

        draw_tag(canvas, texture_creator, font, ac, sx, sy, color);
    }
}

// ---------------------------------------------------------------------------
// Unit tests (pure math — no SDL2 needed)
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn make_aircraft(id: u32, side: Side) -> Aircraft {
        Aircraft {
            id,
            callsign: format!("T{}", id),
            model: "F-16".to_string(),
            side,
            lat: 38.0,
            lon: -9.0,
            altitude_ft: 20_000.0,
            heading_deg: 90.0,
            speed_knots: 400.0,
            fuel_kg: 3000.0,
            fuel_burn_kg_per_s: 1.5,
            rcs_base: 1.0,
            is_detected: false,
            detection_confidence: 0.0,
        }
    }

    #[test]
    fn test_trail_grows_on_tick() {
        let ac = make_aircraft(1, Side::Friendly);
        let mut state = AircraftRenderState::new(1);
        // Each tick advances timer by 1.0s; interval is 2.0s
        state.tick(&ac, 1.0, 2.0);
        assert_eq!(state.trail.len(), 0, "not enough time elapsed");
        state.tick(&ac, 1.0, 2.0);
        assert_eq!(state.trail.len(), 1, "should have 1 trail point after 2s");
    }

    #[test]
    fn test_trail_capped_at_max() {
        let ac = make_aircraft(2, Side::Hostile);
        let mut state = AircraftRenderState::new(2);
        for _ in 0..(MAX_TRAIL + 10) {
            state.tick(&ac, 2.0, 1.0); // tick 2s, sample every 1s → records each tick
        }
        assert!(
            state.trail.len() <= MAX_TRAIL,
            "trail len={}",
            state.trail.len()
        );
    }

    #[test]
    fn test_side_color_friendly_is_blue() {
        let c = side_color(Side::Friendly);
        assert!(c.b > c.r, "friendly should be blue-ish");
    }

    #[test]
    fn test_side_color_hostile_is_red() {
        let c = side_color(Side::Hostile);
        assert!(c.r > c.b, "hostile should be red-ish");
    }

    #[test]
    fn test_ghost_state_initialised_zero() {
        let state = AircraftRenderState::new(1);
        assert_eq!(state.frames_since_detection_lost, 0);
        assert_eq!(state.last_known_lat, 0.0);
        assert_eq!(state.last_known_lon, 0.0);
    }

    #[test]
    fn test_ghost_increments_when_not_detected() {
        let mut ac = make_aircraft(1, Side::Friendly);
        ac.is_detected = false;
        ac.lat = 40.0;
        ac.lon = -8.0;
        let mut state = AircraftRenderState::new(1);
        state.tick(&ac, 0.016, 2.0);
        assert_eq!(state.frames_since_detection_lost, 1);
        state.tick(&ac, 0.016, 2.0);
        assert_eq!(state.frames_since_detection_lost, 2);
    }

    #[test]
    fn test_ghost_resets_when_detected() {
        let mut ac = make_aircraft(1, Side::Friendly);
        ac.is_detected = false;
        let mut state = AircraftRenderState::new(1);
        state.frames_since_detection_lost = 50;
        ac.is_detected = true;
        ac.lat = 42.0;
        ac.lon = -7.5;
        state.tick(&ac, 0.016, 2.0);
        assert_eq!(state.frames_since_detection_lost, 0);
        assert_eq!(state.last_known_lat, 42.0);
        assert_eq!(state.last_known_lon, -7.5);
    }

    #[test]
    fn test_ghost_does_not_exceed_180() {
        let mut ac = make_aircraft(1, Side::Friendly);
        ac.is_detected = false;
        let mut state = AircraftRenderState::new(1);
        for _ in 0..200 {
            state.tick(&ac, 0.016, 2.0);
        }
        assert_eq!(state.frames_since_detection_lost, 180);
    }
}
