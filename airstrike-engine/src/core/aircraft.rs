/// Aircraft entity: position, performance, radar signature.

/// Side / IFF identification of an aircraft.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Side {
    Friendly,
    Hostile,
    Unknown,
}

/// A single aircraft in the simulation.
#[derive(Debug, Clone)]
pub struct Aircraft {
    pub id: u32,
    pub callsign: String,
    pub model: String,
    pub side: Side,

    // Geographic position
    pub lat: f64,
    pub lon: f64,
    pub altitude_ft: f32,

    // Movement
    pub heading_deg: f32, // 0-359, clockwise from North
    pub speed_knots: f32,

    // Fuel
    pub fuel_kg: f32,
    pub fuel_burn_kg_per_s: f32, // fuel consumed per second at current throttle

    // Radar cross-section (base frontal, m²)
    pub rcs_base: f32,

    // Radar detection state (updated each frame by World)
    pub is_detected: bool,
    pub detection_confidence: f32, // 0.0 = not detected, 1.0 = strong track
}

impl Aircraft {
    /// Create a new aircraft with sane defaults.
    pub fn new(id: u32, callsign: impl Into<String>, model: impl Into<String>, side: Side) -> Self {
        Aircraft {
            id,
            callsign: callsign.into(),
            model: model.into(),
            side,
            lat: 0.0,
            lon: 0.0,
            altitude_ft: 20_000.0,
            heading_deg: 0.0,
            speed_knots: 400.0,
            fuel_kg: 3_000.0,
            fuel_burn_kg_per_s: 1.5,
            rcs_base: 1.0,
            is_detected: false,
            detection_confidence: 0.0,
        }
    }

    /// Advance position by `dt` seconds using dead-reckoning.
    /// Uses equirectangular approximation (accurate enough at tactical scales < 500km).
    pub fn update(&mut self, dt: f32) {
        if self.fuel_kg <= 0.0 {
            return; // No fuel — no movement
        }

        // Speed: knots → metres per second (1 knot = 0.5144 m/s)
        let speed_m_per_s = self.speed_knots * 0.5144;
        let dist_m = speed_m_per_s * dt;

        // Heading to radians (clockwise from North → standard math angle)
        let heading_rad = self.heading_deg.to_radians();

        // Delta lat/lon from distance + heading
        // 1 degree latitude ≈ 111_320 metres
        let delta_lat = (dist_m * heading_rad.cos()) / 111_320.0;
        // 1 degree longitude ≈ 111_320 * cos(lat) metres
        let delta_lon =
            (dist_m * heading_rad.sin()) / (111_320.0 * (self.lat as f32).to_radians().cos());

        self.lat += delta_lat as f64;
        self.lon += delta_lon as f64;

        // Fuel burn
        let burn = self.fuel_burn_kg_per_s * dt;
        self.fuel_kg = (self.fuel_kg - burn).max(0.0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_heading_north_moves_lat_up() {
        let mut ac = Aircraft::new(1, "EAGLE1", "F-16", Side::Friendly);
        ac.lat = 38.716;
        ac.lon = -9.142;
        ac.heading_deg = 0.0; // North
        ac.speed_knots = 600.0;
        let lat_before = ac.lat;
        ac.update(60.0); // 1 minute
        assert!(
            ac.lat > lat_before,
            "heading N should increase lat, got {}",
            ac.lat
        );
    }

    #[test]
    fn test_heading_east_moves_lon_right() {
        let mut ac = Aircraft::new(2, "VIPER1", "F-16", Side::Hostile);
        ac.lat = 38.716;
        ac.lon = -9.142;
        ac.heading_deg = 90.0; // East
        ac.speed_knots = 600.0;
        let lon_before = ac.lon;
        ac.update(60.0);
        assert!(
            ac.lon > lon_before,
            "heading E should increase lon, got {}",
            ac.lon
        );
    }

    #[test]
    fn test_no_movement_without_fuel() {
        let mut ac = Aircraft::new(3, "GHOST1", "Su-27", Side::Hostile);
        ac.lat = 38.716;
        ac.lon = -9.142;
        ac.fuel_kg = 0.0;
        ac.update(60.0);
        assert!((ac.lat - 38.716).abs() < 1e-9, "no fuel → no movement");
    }

    #[test]
    fn test_fuel_decreases_over_time() {
        let mut ac = Aircraft::new(4, "TANK1", "F-16", Side::Friendly);
        ac.fuel_kg = 3000.0;
        ac.fuel_burn_kg_per_s = 2.0;
        ac.update(10.0);
        assert!((ac.fuel_kg - 2980.0).abs() < 0.01, "fuel_kg={}", ac.fuel_kg);
    }

    #[test]
    fn test_fuel_does_not_go_negative() {
        let mut ac = Aircraft::new(5, "LAST1", "F-16", Side::Friendly);
        ac.fuel_kg = 5.0;
        ac.fuel_burn_kg_per_s = 10.0;
        ac.update(10.0);
        assert_eq!(ac.fuel_kg, 0.0);
    }

    #[test]
    fn test_speed_at_600_knots_1min_moves_about_18km() {
        // 600 knots * 0.5144 m/s per knot * 60s ≈ 18518 m ≈ 18.5 km
        let mut ac = Aircraft::new(6, "FAST1", "F-16", Side::Friendly);
        ac.lat = 0.0;
        ac.lon = 0.0;
        ac.heading_deg = 0.0; // North
        ac.speed_knots = 600.0;
        ac.update(60.0);
        // 18518m / 111320m_per_deg ≈ 0.1664 degrees
        assert!((ac.lat - 0.1664).abs() < 0.002, "lat={}", ac.lat);
    }

    #[test]
    fn test_new_aircraft_starts_not_detected() {
        let ac = Aircraft::new(1, "TEST", "F-16C", Side::Friendly);
        assert!(!ac.is_detected);
        assert_eq!(ac.detection_confidence, 0.0);
    }
}
