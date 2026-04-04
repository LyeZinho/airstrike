use sdl2::pixels::Color;
/// Draws a geographic coordinate grid (lat/lon lines) over the map.
/// Lines spaced at configurable degree intervals.
use sdl2::render::Canvas;
use sdl2::video::Window;

use crate::core::geo;
use crate::ui::camera::Camera;

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
