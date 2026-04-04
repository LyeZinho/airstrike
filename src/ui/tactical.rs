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
}

impl AircraftRenderState {
    pub fn new(id: u32) -> Self {
        AircraftRenderState {
            id,
            trail: Vec::new(),
            trail_timer: 0.0,
        }
    }

    /// Sample current position into trail every `interval` seconds.
    pub fn tick(&mut self, ac: &Aircraft, dt: f32, interval: f32) {
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

    for ac in aircraft {
        // World → screen
        let (wx, wy) = geo::lat_lon_to_world(ac.lat, ac.lon, camera.zoom);
        let (sx, sy) = camera.world_to_screen(wx, wy);
        let sx = sx as i32;
        let sy = sy as i32;

        // Off-screen culling (with margin for tags)
        if sx < -50 || sy < -50 || sx > win_w as i32 + 50 || sy > win_h as i32 + 50 {
            continue;
        }

        let color = side_color(ac.side);

        // Trail
        if let Some(state) = render_states.iter().find(|s| s.id == ac.id) {
            draw_trail(canvas, &state.trail, camera, color);
        }

        // Symbol
        draw_symbol(canvas, sx, sy, color);

        // Tag
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
}
