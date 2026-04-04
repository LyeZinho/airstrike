//! Camera: tracks the center of the view in world-space pixels and zoom level.
//! Zoom range: ZOOM_MIN (3) to ZOOM_MAX (12).

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
        Camera {
            center_x: cx,
            center_y: cy,
            zoom,
            window_w,
            window_h,
        }
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
        let (sx2, sy2) = self.world_to_screen(wx2, wy2);
        self.center_x += (sx2 - cursor_sx) as f64;
        self.center_y += (sy2 - cursor_sy) as f64;
    }

    /// Current center as (lat, lon).
    pub fn center_lat_lon(&self) -> (f64, f64) {
        geo::world_to_lat_lon(self.center_x, self.center_y, self.zoom)
    }

    /// Returns the world-pixel bounds of the visible area: (min_wx, min_wy, max_wx, max_wy).
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
