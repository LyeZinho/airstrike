use crate::core::datalink::IffStatus;
use crate::core::mission::MissionPlan;
use crate::core::radar::haversine_km;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Side {
    Friendly,
    Hostile,
    Unknown,
}

#[derive(Debug, Clone, PartialEq)]
pub enum RadarType {
    Mechanical,
    PESA,
    AESA,
    AEWandC,
}

#[derive(Debug, Clone)]
pub enum FlightPhase {
    ColdDark,
    Preflight { elapsed_s: f32, required_s: f32 },
    Taxiing { target_lat: f64, target_lon: f64 },
    TakeoffRoll { speed_knots: f32 },
    Climbing { target_alt_ft: f32 },
    EnRoute,
    OnStation,
    Rtb,
    Landing { airport_lat: f64, airport_lon: f64 },
    Landed,
    Maintenance { elapsed_s: f32, required_s: f32 },
    Destroyed,
}

#[derive(Debug, Clone)]
pub struct Aircraft {
    pub id: u32,
    pub callsign: String,
    pub model: String,
    pub side: Side,

    pub lat: f64,
    pub lon: f64,
    pub altitude_ft: f32,

    pub heading_deg: f32,
    pub speed_knots: f32,

    pub fuel_kg: f32,
    pub fuel_burn_kg_per_s: f32,

    pub rcs_base: f32,

    pub is_detected: bool,
    pub detection_confidence: f32,

    pub phase: FlightPhase,
    pub radar_type: Option<RadarType>,
    pub iff: IffStatus,
    pub iff_track_s: f32,
    pub home_airport_icao: String,
    pub home_airport_lat: f64,
    pub home_airport_lon: f64,
    pub mission: Option<MissionPlan>,
    pub waypoint_index: usize,
}

impl Aircraft {
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
            phase: FlightPhase::ColdDark,
            radar_type: None,
            iff: IffStatus::Unknown,
            iff_track_s: 0.0,
            home_airport_icao: String::new(),
            home_airport_lat: 0.0,
            home_airport_lon: 0.0,
            mission: None,
            waypoint_index: 0,
        }
    }

    pub fn is_visible(&self) -> bool {
        self.is_detected
    }

    pub fn update(&mut self, dt: f32) {
        if matches!(
            self.phase,
            FlightPhase::ColdDark | FlightPhase::Maintenance { .. } | FlightPhase::Destroyed
        ) {
            self.advance_phase(dt);
            return;
        }

        if self.fuel_kg > 0.0 {
            let speed_m_per_s = self.speed_knots * 0.5144;
            let dist_m = speed_m_per_s * dt;
            let heading_rad = self.heading_deg.to_radians();
            let delta_lat = (dist_m * heading_rad.cos()) / 111_320.0;
            let delta_lon =
                (dist_m * heading_rad.sin()) / (111_320.0 * (self.lat as f32).to_radians().cos());
            self.lat += delta_lat as f64;
            self.lon += delta_lon as f64;
            let burn = self.fuel_burn_kg_per_s * dt;
            self.fuel_kg = (self.fuel_kg - burn).max(0.0);
        }

        self.advance_phase(dt);
    }

    fn advance_phase(&mut self, dt: f32) {
        match &mut self.phase {
            FlightPhase::Preflight {
                elapsed_s,
                required_s,
            } => {
                *elapsed_s += dt;
                if *elapsed_s >= *required_s {
                    let target_lat = self.home_airport_lat;
                    let target_lon = self.home_airport_lon;
                    self.phase = FlightPhase::Taxiing {
                        target_lat,
                        target_lon,
                    };
                }
            }
            FlightPhase::Maintenance {
                elapsed_s,
                required_s,
            } => {
                *elapsed_s += dt;
                if *elapsed_s >= *required_s {
                    self.phase = FlightPhase::ColdDark;
                }
            }
            FlightPhase::TakeoffRoll { speed_knots } => {
                *speed_knots += 10.0 * dt;
                if *speed_knots >= 160.0 {
                    let target = self
                        .mission
                        .as_ref()
                        .and_then(|m| m.waypoints.first())
                        .map(|w| w.altitude_ft)
                        .unwrap_or(25_000.0);
                    self.phase = FlightPhase::Climbing {
                        target_alt_ft: target,
                    };
                }
            }
            FlightPhase::Climbing { target_alt_ft } => {
                self.altitude_ft += 2000.0 * dt;
                let target = *target_alt_ft;
                if self.altitude_ft >= target {
                    self.altitude_ft = target;
                    self.phase = FlightPhase::EnRoute;
                }
            }
            FlightPhase::Landing {
                airport_lat,
                airport_lon,
            } => {
                let target_lat = *airport_lat;
                let target_lon = *airport_lon;
                let dist = haversine_km(self.lat, self.lon, target_lat, target_lon);
                if dist < 0.1 {
                    self.phase = FlightPhase::Landed;
                }
            }
            FlightPhase::Landed => {
                self.phase = FlightPhase::Maintenance {
                    elapsed_s: 0.0,
                    required_s: 300.0,
                };
            }
            _ => {}
        }
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
        ac.heading_deg = 0.0;
        ac.speed_knots = 600.0;
        ac.phase = FlightPhase::EnRoute;
        let lat_before = ac.lat;
        ac.update(60.0);
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
        ac.heading_deg = 90.0;
        ac.speed_knots = 600.0;
        ac.phase = FlightPhase::EnRoute;
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
        ac.phase = FlightPhase::EnRoute;
        ac.update(60.0);
        assert!((ac.lat - 38.716).abs() < 1e-9, "no fuel → no movement");
    }

    #[test]
    fn test_fuel_decreases_over_time() {
        let mut ac = Aircraft::new(4, "TANK1", "F-16", Side::Friendly);
        ac.fuel_kg = 3000.0;
        ac.fuel_burn_kg_per_s = 2.0;
        ac.phase = FlightPhase::EnRoute;
        ac.update(10.0);
        assert!((ac.fuel_kg - 2980.0).abs() < 0.01, "fuel_kg={}", ac.fuel_kg);
    }

    #[test]
    fn test_fuel_does_not_go_negative() {
        let mut ac = Aircraft::new(5, "LAST1", "F-16", Side::Friendly);
        ac.fuel_kg = 5.0;
        ac.fuel_burn_kg_per_s = 10.0;
        ac.phase = FlightPhase::EnRoute;
        ac.update(10.0);
        assert_eq!(ac.fuel_kg, 0.0);
    }

    #[test]
    fn test_speed_at_600_knots_1min_moves_about_18km() {
        let mut ac = Aircraft::new(6, "FAST1", "F-16", Side::Friendly);
        ac.lat = 0.0;
        ac.lon = 0.0;
        ac.heading_deg = 0.0;
        ac.speed_knots = 600.0;
        ac.phase = FlightPhase::EnRoute;
        ac.update(60.0);
        assert!((ac.lat - 0.1664).abs() < 0.002, "lat={}", ac.lat);
    }

    #[test]
    fn test_new_aircraft_starts_not_detected() {
        let ac = Aircraft::new(1, "TEST", "F-16C", Side::Friendly);
        assert!(!ac.is_detected);
        assert_eq!(ac.detection_confidence, 0.0);
    }

    #[test]
    fn test_new_aircraft_starts_cold_dark() {
        let ac = Aircraft::new(1, "TEST", "F-16C", Side::Friendly);
        assert!(matches!(ac.phase, FlightPhase::ColdDark));
    }

    #[test]
    fn test_aircraft_has_iff_unknown_by_default() {
        let ac = Aircraft::new(1, "TEST", "F-16C", Side::Friendly);
        assert!(matches!(ac.iff, IffStatus::Unknown));
    }

    #[test]
    fn test_aircraft_has_no_radar_by_default() {
        let ac = Aircraft::new(1, "TEST", "F-16C", Side::Friendly);
        assert!(ac.radar_type.is_none());
    }

    #[test]
    fn test_aircraft_with_aesa_radar() {
        let mut ac = Aircraft::new(1, "TEST", "F-16C", Side::Friendly);
        ac.radar_type = Some(RadarType::AESA);
        assert!(matches!(ac.radar_type, Some(RadarType::AESA)));
    }

    #[test]
    fn test_preflight_timer_advances() {
        let mut ac = Aircraft::new(1, "TEST", "F-16C", Side::Friendly);
        ac.phase = FlightPhase::Preflight {
            elapsed_s: 0.0,
            required_s: 60.0,
        };
        ac.update(10.0);
        match ac.phase {
            FlightPhase::Preflight { elapsed_s, .. } => {
                assert!((elapsed_s - 10.0).abs() < 0.01);
            }
            _ => panic!("should still be Preflight after 10s of 60s required"),
        }
    }

    #[test]
    fn test_preflight_transitions_to_taxiing_when_complete() {
        let mut ac = Aircraft::new(1, "TEST", "F-16C", Side::Friendly);
        ac.home_airport_lat = 38.7813;
        ac.home_airport_lon = -9.13592;
        ac.phase = FlightPhase::Preflight {
            elapsed_s: 59.0,
            required_s: 60.0,
        };
        ac.update(2.0);
        assert!(
            matches!(ac.phase, FlightPhase::Taxiing { .. }),
            "should transition to Taxiing"
        );
    }
}
