use airstrike_engine::core::airport::{Airport, AirportType};
use airstrike_engine::core::geo;
use airstrike_engine::ui::camera::Camera;
use sdl2::pixels::Color;
use sdl2::rect::Rect;
use sdl2::render::Canvas;
use sdl2::video::Window;

pub fn should_render(airport: &Airport, camera: &Camera) -> bool {
    match airport.airport_type {
        AirportType::Large => camera.zoom >= 5,
        AirportType::Medium => camera.zoom >= 6,
        AirportType::Small => camera.zoom >= 7,
        AirportType::Other => false,
    }
}

pub fn show_label(_airport: &Airport, camera: &Camera) -> bool {
    camera.zoom >= 9
}

pub fn dot_size(airport: &Airport) -> u32 {
    match airport.airport_type {
        AirportType::Large => 6,
        AirportType::Medium => 4,
        AirportType::Small => 3,
        AirportType::Other => 0,
    }
}

pub fn draw_airports(
    canvas: &mut Canvas<Window>,
    airports: &[Airport],
    camera: &Camera,
    is_player_country: bool,
) -> Result<(), String> {
    for airport in airports {
        if !should_render(airport, camera) {
            continue;
        }
        let (wx, wy) = geo::lat_lon_to_world(airport.lat, airport.lon, camera.zoom);
        let (sx, sy) = camera.world_to_screen(wx, wy);
        let size = dot_size(airport);
        let color = if is_player_country {
            Color::RGB(0, 200, 200)
        } else {
            Color::RGB(150, 50, 50)
        };
        canvas.set_draw_color(color);
        let half = size as i32 / 2;
        canvas.fill_rect(Rect::new(sx as i32 - half, sy as i32 - half, size, size))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use airstrike_engine::ui::camera::Camera;

    fn make_camera(zoom: u32) -> Camera {
        let mut cam = Camera::new(38.716, -9.142, 7, 1280.0, 720.0);
        cam.zoom = zoom;
        cam
    }

    fn make_airport(t: AirportType) -> Airport {
        Airport {
            icao: "LPPT".into(),
            name: "Test".into(),
            lat: 38.716,
            lon: -9.142,
            country_iso: "PT".into(),
            airport_type: t,
            elevation_ft: 100.0,
        }
    }

    #[test]
    fn test_should_render_large_airport_at_zoom_6() {
        let apt = make_airport(AirportType::Large);
        let cam = make_camera(7);
        assert!(should_render(&apt, &cam));
    }

    #[test]
    fn test_should_not_render_small_airport_at_low_zoom() {
        let apt = make_airport(AirportType::Small);
        let cam = make_camera(5);
        assert!(!should_render(&apt, &cam));
    }

    #[test]
    fn test_show_label_only_at_zoom_9_plus() {
        let apt = make_airport(AirportType::Large);
        let cam8 = make_camera(8);
        assert!(!show_label(&apt, &cam8));
        let cam9 = make_camera(9);
        assert!(show_label(&apt, &cam9));
    }
}
