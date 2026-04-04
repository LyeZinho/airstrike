const FEET_TO_METERS: f32 = 0.3048;
const NOTCH_ASPECT_THRESHOLD: f32 = 0.15;

/// A ground-based or airborne radar system
pub struct RadarSystem {
    pub range_km: f32,
    pub position_lat: f64, // radar position in decimal degrees
    pub position_lon: f64,
    pub altitude_m: f32, // radar altitude in metres above sea level
    #[allow(dead_code)] // reserved for directional radar (Phase 4)
    pub scan_angle_deg: f32, // full scan cone width (360.0 = omni)
}

impl RadarSystem {
    pub fn new(lat: f64, lon: f64, altitude_m: f32, range_km: f32) -> Self {
        RadarSystem {
            position_lat: lat,
            position_lon: lon,
            altitude_m,
            range_km,
            scan_angle_deg: 360.0,
        }
    }

    /// Compute dynamic RCS given the target's heading and the bearing FROM radar TO target.
    /// aspect_dot = 1.0 → head-on (frontal), 0.0 → beam (lateral), -1.0 → tail-on (frontal)
    /// Formula:
    ///   heading_vec = (sin(heading_deg), cos(heading_deg))
    ///   radar_bearing_vec = normalised vector from target to radar
    ///   aspect_dot = dot(heading_vec, radar_bearing_vec)
    ///   rcs = lerp(rcs_lateral, rcs_frontal, aspect_dot.abs())
    pub fn dynamic_rcs(
        rcs_frontal: f32,
        rcs_lateral: f32,
        heading_deg: f32,
        bearing_from_target_to_radar_deg: f32,
    ) -> f32 {
        let aspect = aspect_dot(heading_deg, bearing_from_target_to_radar_deg);
        let t = aspect.abs();
        rcs_lateral + t * (rcs_frontal - rcs_lateral)
    }

    /// Radar horizon formula: D_max ≈ 4.12 * (sqrt(h_radar_m) + sqrt(h_target_m))  [km]
    pub fn horizon_range_km(radar_alt_m: f32, target_alt_m: f32) -> f32 {
        let radar_alt_clamped = radar_alt_m.max(0.0);
        let target_alt_clamped = target_alt_m.max(0.0);
        // 4.12 is an empirical constant for Earth's curvature and k-factor (km / sqrt(m))
        4.12 * (radar_alt_clamped.sqrt() + target_alt_clamped.sqrt())
    }

    /// Full detection check.
    /// Returns true if target is detectable.
    ///
    /// Detection conditions (ALL must be true):
    ///   1. distance_km ≤ radar.range_km * (dynamic_rcs ^ 0.25)
    ///   2. distance_km ≤ horizon_range_km(radar.altitude_m, target_altitude_m)
    ///   3. Notch filter: target NOT notched
    ///      Notch = aspect_dot.abs() < 0.15  (target beam-on)
    ///              AND target_altitude_ft < 1000.0  (low, in ground clutter)
    ///
    /// Parameters:
    ///   target_lat, target_lon: decimal degrees
    ///   target_altitude_ft: feet
    ///   target_heading_deg: degrees (0 = north, clockwise)
    ///   rcs_frontal, rcs_lateral: in m²
    pub fn is_detected(
        &self,
        target_lat: f64,
        target_lon: f64,
        target_altitude_ft: f32,
        target_heading_deg: f32,
        rcs_frontal: f32,
        rcs_lateral: f32,
    ) -> bool {
        let distance_km =
            haversine_km(self.position_lat, self.position_lon, target_lat, target_lon);

        let bearing_to_target =
            bearing_deg(self.position_lat, self.position_lon, target_lat, target_lon);
        let bearing_from_target_to_radar = (bearing_to_target + 180.0) % 360.0;

        let dynamic_rcs = Self::dynamic_rcs(
            rcs_frontal,
            rcs_lateral,
            target_heading_deg,
            bearing_from_target_to_radar,
        );

        let max_range_km = self.range_km * dynamic_rcs.powf(0.25);
        if distance_km > max_range_km {
            return false;
        }

        let target_altitude_m = target_altitude_ft * FEET_TO_METERS;
        let horizon_km = Self::horizon_range_km(self.altitude_m, target_altitude_m);
        if distance_km > horizon_km {
            return false;
        }

        let aspect = aspect_dot(target_heading_deg, bearing_from_target_to_radar);
        let is_notched = aspect.abs() < NOTCH_ASPECT_THRESHOLD && target_altitude_ft < 1000.0;
        if is_notched {
            return false;
        }

        true
    }
}

/// Returns (rcs_frontal, rcs_lateral) for a given aircraft model string.
/// Falls back to (5.0, 10.0) for unknown models.
pub fn rcs_for_model(model: &str) -> (f32, f32) {
    match model {
        "F-16C" => (1.2, 5.0),
        "Gripen" => (0.1, 1.5),
        "Su-27" => (15.0, 25.0),
        "F-35A" => (0.001, 0.01),
        "C-130" => (80.0, 120.0),
        _ => (5.0, 10.0),
    }
}

fn aspect_dot(heading_deg: f32, bearing_from_target_to_radar_deg: f32) -> f32 {
    let heading_rad = heading_deg.to_radians();
    let bearing_rad = bearing_from_target_to_radar_deg.to_radians();

    let heading_vec_x = heading_rad.sin();
    let heading_vec_y = heading_rad.cos();

    let bearing_vec_x = bearing_rad.sin();
    let bearing_vec_y = bearing_rad.cos();

    heading_vec_x * bearing_vec_x + heading_vec_y * bearing_vec_y
}

/// Use the haversine formula for distance between two lat/lon points
pub fn haversine_km(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f32 {
    const EARTH_RADIUS_KM: f64 = 6371.0;

    let lat1_rad = lat1.to_radians();
    let lat2_rad = lat2.to_radians();
    let delta_lat = (lat2 - lat1).to_radians();
    let delta_lon = (lon2 - lon1).to_radians();

    let a = (delta_lat / 2.0).sin().powi(2)
        + lat1_rad.cos() * lat2_rad.cos() * (delta_lon / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());

    (EARTH_RADIUS_KM * c) as f32
}

/// Returns bearing in degrees from point 1 to point 2 (0 = north, clockwise)
pub fn bearing_deg(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f32 {
    let lat1_rad = lat1.to_radians();
    let lat2_rad = lat2.to_radians();
    let delta_lon = (lon2 - lon1).to_radians();

    let y = delta_lon.sin() * lat2_rad.cos();
    let x = lat1_rad.cos() * lat2_rad.sin() - lat1_rad.sin() * lat2_rad.cos() * delta_lon.cos();

    let bearing_rad = y.atan2(x);
    let bearing_deg = bearing_rad.to_degrees();

    ((bearing_deg + 360.0) % 360.0) as f32
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_haversine_km_lisbon_to_porto() {
        // Lisbon: 38.7223°N, 9.1393°W
        // Porto: 41.1579°N, 8.6291°W
        // Known distance ≈ 274 km
        let dist = haversine_km(38.7223, -9.1393, 41.1579, -8.6291);
        assert!((dist - 274.0).abs() < 5.0, "Expected ~274 km, got {}", dist);
    }

    #[test]
    fn test_haversine_km_same_point() {
        let dist = haversine_km(38.7223, -9.1393, 38.7223, -9.1393);
        assert!(dist < 0.01, "Same point should be ~0 km, got {}", dist);
    }

    #[test]
    fn test_rcs_for_model_f16c() {
        let (frontal, lateral) = rcs_for_model("F-16C");
        assert!((frontal - 1.2).abs() < 0.01);
        assert!((lateral - 5.0).abs() < 0.01);
    }

    #[test]
    fn test_rcs_for_model_gripen() {
        let (frontal, lateral) = rcs_for_model("Gripen");
        assert!((frontal - 0.1).abs() < 0.01);
        assert!((lateral - 1.5).abs() < 0.01);
    }

    #[test]
    fn test_rcs_for_model_su27() {
        let (frontal, lateral) = rcs_for_model("Su-27");
        assert!((frontal - 15.0).abs() < 0.01);
        assert!((lateral - 25.0).abs() < 0.01);
    }

    #[test]
    fn test_rcs_for_model_f35a() {
        let (frontal, lateral) = rcs_for_model("F-35A");
        assert!((frontal - 0.001).abs() < 0.0001);
        assert!((lateral - 0.01).abs() < 0.001);
    }

    #[test]
    fn test_rcs_for_model_c130() {
        let (frontal, lateral) = rcs_for_model("C-130");
        assert!((frontal - 80.0).abs() < 0.01);
        assert!((lateral - 120.0).abs() < 0.01);
    }

    #[test]
    fn test_rcs_for_model_unknown_fallback() {
        let (frontal, lateral) = rcs_for_model("UnknownAircraft");
        assert!(
            (frontal - 5.0).abs() < 0.01,
            "Unknown should fallback to 5.0 frontal"
        );
        assert!(
            (lateral - 10.0).abs() < 0.01,
            "Unknown should fallback to 10.0 lateral"
        );
    }

    #[test]
    fn test_dynamic_rcs_head_on_returns_frontal() {
        // Target heading north (0°), radar bearing from target to radar is also north (0°)
        // This means target is flying directly toward the radar → head-on
        let rcs = RadarSystem::dynamic_rcs(1.0, 10.0, 0.0, 0.0);
        assert!(
            (rcs - 1.0).abs() < 0.1,
            "Head-on should return frontal RCS, got {}",
            rcs
        );
    }

    #[test]
    fn test_dynamic_rcs_beam_on_returns_lateral() {
        // Target heading north (0°), radar bearing from target is east (90°)
        // Target is perpendicular to radar → beam-on
        let rcs = RadarSystem::dynamic_rcs(1.0, 10.0, 0.0, 90.0);
        assert!(
            (rcs - 10.0).abs() < 0.1,
            "Beam-on should return lateral RCS, got {}",
            rcs
        );
    }

    #[test]
    fn test_dynamic_rcs_45deg_is_lerped() {
        // Target heading north (0°), radar bearing 45° from target
        // Should be interpolated between frontal and lateral
        let rcs = RadarSystem::dynamic_rcs(1.0, 10.0, 0.0, 45.0);
        // aspect_dot should be cos(45°) ≈ 0.707
        // lerp(10.0, 1.0, 0.707) ≈ 10.0 + 0.707 * (1.0 - 10.0) = 10.0 - 6.363 ≈ 3.637
        assert!(
            rcs > 1.0 && rcs < 10.0,
            "45° should be between frontal and lateral, got {}",
            rcs
        );
        assert!((rcs - 3.637).abs() < 1.0, "Expected ~3.637, got {}", rcs);
    }

    #[test]
    fn test_horizon_range_km_both_at_sea_level() {
        let range = RadarSystem::horizon_range_km(0.0, 0.0);
        assert!(
            range < 1.0,
            "Both at sea level should have minimal horizon, got {}",
            range
        );
    }

    #[test]
    fn test_horizon_range_km_radar_100m_target_1000m() {
        // D_max ≈ 4.12 * (sqrt(100) + sqrt(1000))
        //      ≈ 4.12 * (10 + 31.62)
        //      ≈ 4.12 * 41.62
        //      ≈ 171.5 km
        let range = RadarSystem::horizon_range_km(100.0, 1000.0);
        assert!(
            (range - 171.5).abs() < 5.0,
            "Expected ~171.5 km, got {}",
            range
        );
    }

    #[test]
    fn test_is_detected_within_range_and_above_horizon() {
        // Radar at Lisbon, range 300 km
        let radar = RadarSystem::new(38.7223, -9.1393, 100.0, 300.0);

        // Target at Porto (~274 km from Lisbon), 30000 ft, heading north
        // Using F-16C RCS
        let detected = radar.is_detected(41.1579, -8.6291, 30_000.0, 0.0, 1.2, 5.0);

        assert!(
            detected,
            "Target within range and above horizon should be detected"
        );
    }

    #[test]
    fn test_is_detected_beyond_max_range() {
        // Radar at Lisbon, range only 100 km
        let radar = RadarSystem::new(38.7223, -9.1393, 100.0, 100.0);

        // Target at Porto (~274 km from Lisbon) - beyond max range
        let detected = radar.is_detected(41.1579, -8.6291, 30_000.0, 0.0, 1.2, 5.0);

        assert!(!detected, "Target beyond max range should not be detected");
    }

    #[test]
    fn test_is_detected_beyond_horizon() {
        // Radar at sea level with very short range
        let radar = RadarSystem::new(38.7223, -9.1393, 0.0, 500.0);

        // Target also at low altitude (100 ft = ~30 m), far away
        // Horizon will be very limited
        let detected = radar.is_detected(41.1579, -8.6291, 100.0, 0.0, 1.2, 5.0);

        assert!(!detected, "Target beyond horizon should not be detected");
    }

    #[test]
    fn test_is_detected_notched_low_and_beam() {
        // Radar at Lisbon
        let radar = RadarSystem::new(38.7223, -9.1393, 100.0, 300.0);

        // Target nearby (50 km away), LOW altitude (500 ft), heading perpendicular to radar
        // This should trigger the notch filter
        let target_lat = 38.7223 + 0.45; // ~50 km north
        let target_heading = 90.0; // heading east
                                   // Bearing from target to radar will be ~180° (south), perpendicular to heading

        let detected = radar.is_detected(
            target_lat,
            -9.1393,
            500.0, // low altitude
            target_heading,
            1.2,
            5.0,
        );

        assert!(
            !detected,
            "Target notched (beam-on AND low) should not be detected"
        );
    }

    #[test]
    fn test_is_detected_beam_but_high_altitude() {
        // Radar at Lisbon
        let radar = RadarSystem::new(38.7223, -9.1393, 100.0, 300.0);

        // Target nearby, HIGH altitude (20000 ft), heading perpendicular to radar
        // Beam-on but high altitude → notch filter should NOT apply
        let target_lat = 38.7223 + 0.45; // ~50 km north
        let target_heading = 90.0; // heading east

        let detected = radar.is_detected(
            target_lat,
            -9.1393,
            20_000.0, // HIGH altitude
            target_heading,
            1.2,
            5.0,
        );

        assert!(
            detected,
            "Target beam-on but HIGH altitude should be detected (notch filter doesn't apply)"
        );
    }

    #[test]
    fn test_radar_new() {
        let radar = RadarSystem::new(38.7, -9.1, 100.0, 250.0);
        assert!((radar.position_lat - 38.7).abs() < 0.01);
        assert!((radar.position_lon - (-9.1)).abs() < 0.01);
        assert!((radar.altitude_m - 100.0).abs() < 0.01);
        assert!((radar.range_km - 250.0).abs() < 0.01);
    }
}
