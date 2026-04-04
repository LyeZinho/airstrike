//! Mercator projection utilities.
//! World-space pixel coordinates at a given zoom level.
//! Each tile is 256x256 pixels; world size = 256 * 2^zoom.

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
        assert!(
            (lat - lat2).abs() < 0.0001,
            "lat diff: {}",
            (lat - lat2).abs()
        );
        assert!(
            (lon - lon2).abs() < 0.0001,
            "lon diff: {}",
            (lon - lon2).abs()
        );
    }

    #[test]
    fn test_tile_coords_lisbon_zoom7() {
        let (tx, ty) = lat_lon_to_tile(38.716, -9.142, 7);
        assert_eq!(tx, 60, "tile_x={}", tx);
        assert_eq!(ty, 49, "tile_y={}", ty);
    }
}
