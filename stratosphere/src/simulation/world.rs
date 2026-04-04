use airstrike_engine::core::aircraft::{Aircraft, FlightPhase, Side};
use airstrike_engine::core::airport::{Airport, AirportDb, AirportType};
use airstrike_engine::core::radar::RadarSystem;

use super::missile::{resolve_hit, HitResult, Missile, MissilePhase};

pub struct World {
    pub aircraft: Vec<Aircraft>,
    pub airports: Vec<Airport>,
    pub radar: RadarSystem,
    pub credits: u32,
    pub game_time_s: f32,
    pub missiles: Vec<Missile>,
    pub brevity_log: Vec<String>,
    next_id: u32,
    next_missile_id: u32,
}

impl World {
    pub fn new() -> Self {
        World {
            aircraft: Vec::new(),
            airports: Vec::new(),
            radar: RadarSystem::new(38.716, -9.142, 50.0, 400.0),
            credits: 0,
            game_time_s: 0.0,
            missiles: Vec::new(),
            brevity_log: Vec::new(),
            next_id: 1,
            next_missile_id: 1,
        }
    }

    pub fn new_from_settings(country_iso: &str, starting_credits: u32, db: &AirportDb) -> Self {
        let airports: Vec<Airport> = db.for_country(country_iso).into_iter().cloned().collect();
        let mut world = World {
            aircraft: Vec::new(),
            airports: airports.clone(),
            radar: RadarSystem::new(38.716, -9.142, 50.0, 400.0),
            credits: starting_credits,
            game_time_s: 0.0,
            missiles: Vec::new(),
            brevity_log: Vec::new(),
            next_id: 1,
            next_missile_id: 1,
        };
        for airport in &airports {
            let model = match airport.airport_type {
                AirportType::Large => "F-16C",
                AirportType::Medium => "Gripen",
                AirportType::Small | AirportType::Other => continue,
            };
            let callsign = format!("{}-01", airport.icao);
            let mut ac = Aircraft::new(world.next_id, &callsign, model, Side::Friendly);
            world.next_id += 1;
            ac.lat = airport.lat;
            ac.lon = airport.lon;
            ac.altitude_ft = airport.elevation_ft;
            ac.phase = FlightPhase::ColdDark;
            ac.home_airport_icao = airport.icao.clone();
            ac.home_airport_lat = airport.lat;
            ac.home_airport_lon = airport.lon;
            if matches!(airport.airport_type, AirportType::Large)
                && world.radar.position_lat == 38.716
            {
                world.radar = RadarSystem::new(airport.lat, airport.lon, 50.0, 400.0);
            }
            world.aircraft.push(ac);
        }
        world
    }

    pub fn launch_missile(&mut self, launcher_id: u32, target_id: u32, weapon_id: &'static str) {
        if let Some(launcher) = self.aircraft.iter().find(|a| a.id == launcher_id) {
            let m = Missile::new(
                self.next_missile_id,
                launcher_id,
                target_id,
                launcher.lat,
                launcher.lon,
                launcher.altitude_ft,
                weapon_id,
            );
            self.next_missile_id += 1;
            self.brevity_log.push(format!(
                "Fox 3! {} fires {} at target {}",
                launcher.callsign, weapon_id, target_id
            ));
            self.missiles.push(m);
        }
    }

    pub fn dispatch_aircraft(&mut self, id: u32) {
        if let Some(ac) = self.aircraft.iter_mut().find(|a| a.id == id) {
            if matches!(ac.phase, FlightPhase::ColdDark) {
                ac.phase = FlightPhase::Preflight {
                    elapsed_s: 0.0,
                    required_s: 60.0,
                };
            }
        }
    }

    pub fn spawn_demo(&mut self) {
        let mut f1 = Aircraft::new(self.next_id, "EAGLE1", "F-16C", Side::Friendly);
        self.next_id += 1;
        f1.lat = 39.5;
        f1.lon = -9.5;
        f1.heading_deg = 120.0;
        f1.speed_knots = 450.0;
        f1.altitude_ft = 25_000.0;
        f1.rcs_base = 1.2;
        f1.phase = FlightPhase::EnRoute;
        self.aircraft.push(f1);

        let mut f2 = Aircraft::new(self.next_id, "EAGLE2", "F-16C", Side::Friendly);
        self.next_id += 1;
        f2.lat = 39.3;
        f2.lon = -8.8;
        f2.heading_deg = 300.0;
        f2.speed_knots = 450.0;
        f2.altitude_ft = 24_000.0;
        f2.rcs_base = 1.2;
        f2.phase = FlightPhase::EnRoute;
        self.aircraft.push(f2);

        let mut h1 = Aircraft::new(self.next_id, "BOGEY1", "Su-27", Side::Hostile);
        self.next_id += 1;
        h1.lat = 38.9;
        h1.lon = -7.5;
        h1.heading_deg = 270.0;
        h1.speed_knots = 520.0;
        h1.altitude_ft = 500.0;
        h1.rcs_base = 4.0;
        h1.phase = FlightPhase::EnRoute;
        self.aircraft.push(h1);

        let mut h2 = Aircraft::new(self.next_id, "BOGEY2", "Su-27", Side::Hostile);
        self.next_id += 1;
        h2.lat = 39.1;
        h2.lon = -7.2;
        h2.heading_deg = 250.0;
        h2.speed_knots = 500.0;
        h2.altitude_ft = 18_000.0;
        h2.rcs_base = 3.5;
        h2.phase = FlightPhase::EnRoute;
        self.aircraft.push(h2);
    }

    pub fn update(&mut self, dt: f32) {
        for ac in &mut self.aircraft {
            ac.update(dt);
        }

        use airstrike_engine::core::radar::rcs_for_model;
        let detections: Vec<bool> = self
            .aircraft
            .iter()
            .map(|ac| {
                let (rf, rl) = rcs_for_model(&ac.model);
                self.radar
                    .is_detected(ac.lat, ac.lon, ac.altitude_ft, ac.heading_deg, rf, rl)
            })
            .collect();

        for (ac, detected) in self.aircraft.iter_mut().zip(detections.iter()) {
            ac.is_detected = *detected;
            ac.detection_confidence = if *detected { 1.0 } else { 0.0 };
        }

        for m in &mut self.missiles {
            if let Some(target) = self.aircraft.iter().find(|a| a.id == m.target_id) {
                m.target_lat = target.lat;
                m.target_lon = target.lon;
            }
            m.advance(dt);
        }

        let mut destroyed_ids: Vec<u32> = Vec::new();
        for m in &mut self.missiles {
            if m.phase == MissilePhase::Terminal {
                let (target_rcs, target_id) = self
                    .aircraft
                    .iter()
                    .find(|a| a.id == m.target_id)
                    .map(|a| (a.rcs_base, a.id))
                    .unwrap_or((1.0, m.target_id));
                match resolve_hit(target_rcs, 1.0, false, m.weapon_id, target_id) {
                    HitResult::Hit(id) => {
                        destroyed_ids.push(id);
                        self.brevity_log
                            .push(format!("Splash! Target {} destroyed.", id));
                    }
                    HitResult::Miss => {
                        self.brevity_log
                            .push(format!("Target {} evaded missile.", m.target_id));
                    }
                }
                m.phase = MissilePhase::Detonated;
            }
        }
        for id in &destroyed_ids {
            if let Some(ac) = self.aircraft.iter_mut().find(|a| a.id == *id) {
                ac.phase = FlightPhase::Destroyed;
            }
        }
        self.missiles
            .retain(|m| !matches!(m.phase, MissilePhase::Detonated | MissilePhase::Missed));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_spawn_demo_creates_four_aircraft() {
        let mut world = World::new();
        world.spawn_demo();
        assert_eq!(world.aircraft.len(), 4);
    }

    #[test]
    fn test_update_moves_aircraft() {
        let mut world = World::new();
        world.spawn_demo();
        let lat_before = world.aircraft[0].lat;
        world.update(60.0);
        assert_ne!(
            world.aircraft[0].lat, lat_before,
            "aircraft should have moved"
        );
    }

    #[test]
    fn test_ids_are_unique() {
        let mut world = World::new();
        world.spawn_demo();
        let ids: Vec<u32> = world.aircraft.iter().map(|a| a.id).collect();
        let unique: std::collections::HashSet<u32> = ids.iter().cloned().collect();
        assert_eq!(ids.len(), unique.len(), "all aircraft IDs must be unique");
    }

    #[test]
    fn test_detection_state_initialised_false() {
        let mut world = World::new();
        world.spawn_demo();
        for ac in &world.aircraft {
            assert!(
                !ac.is_detected,
                "aircraft {} should start not detected",
                ac.id
            );
            assert_eq!(
                ac.detection_confidence, 0.0,
                "aircraft {} should have 0.0 confidence",
                ac.id
            );
        }
    }

    #[test]
    fn test_detected_aircraft_within_radar_range() {
        let mut world = World::new();
        let mut ac = Aircraft::new(1, "TEST1", "F-16C", Side::Friendly);
        ac.lat = 38.8;
        ac.lon = -9.2;
        ac.altitude_ft = 25_000.0;
        ac.heading_deg = 90.0;
        world.aircraft.push(ac);

        world.update(1.0);

        assert!(
            world.aircraft[0].is_detected,
            "aircraft within radar range should be detected"
        );
        assert_eq!(world.aircraft[0].detection_confidence, 1.0);
    }

    #[test]
    fn test_undetected_aircraft_beyond_radar_range() {
        let mut world = World::new();
        let mut ac = Aircraft::new(1, "FAR1", "F-16C", Side::Hostile);
        ac.lat = 42.0;
        ac.lon = -5.0;
        ac.altitude_ft = 25_000.0;
        ac.heading_deg = 90.0;
        world.aircraft.push(ac);

        world.update(1.0);

        assert!(
            !world.aircraft[0].is_detected,
            "aircraft beyond radar range should not be detected"
        );
        assert_eq!(world.aircraft[0].detection_confidence, 0.0);
    }

    #[test]
    fn test_world_from_portugal_has_airports() {
        let csv = include_bytes!("../../assets/airports.csv");
        let db = airstrike_engine::core::airport::AirportDb::load(csv);
        let world = World::new_from_settings("PT", 100_000, &db);
        assert!(!world.aircraft.is_empty(), "Portugal should spawn aircraft");
    }

    #[test]
    fn test_world_aircraft_start_cold_dark() {
        let csv = include_bytes!("../../assets/airports.csv");
        let db = airstrike_engine::core::airport::AirportDb::load(csv);
        let world = World::new_from_settings("PT", 100_000, &db);
        for ac in &world.aircraft {
            assert!(
                matches!(ac.phase, FlightPhase::ColdDark),
                "aircraft {} should start ColdDark",
                ac.callsign
            );
        }
    }

    #[test]
    fn test_world_credits_set_from_settings() {
        let csv = include_bytes!("../../assets/airports.csv");
        let db = airstrike_engine::core::airport::AirportDb::load(csv);
        let world = World::new_from_settings("PT", 75_000, &db);
        assert_eq!(world.credits, 75_000);
    }

    #[test]
    fn test_hostile_aircraft_not_visible_beyond_radar() {
        let mut world = World::new();
        let mut hostile = Aircraft::new(99, "BOGEY", "Su-27", Side::Hostile);
        hostile.lat = 50.0;
        hostile.lon = -9.142;
        hostile.altitude_ft = 25_000.0;
        world.aircraft.push(hostile);
        world.update(1.0);
        let h = world
            .aircraft
            .iter()
            .find(|a| a.callsign == "BOGEY")
            .unwrap();
        assert!(
            !h.is_visible(),
            "hostile outside radar should not be visible"
        );
    }

    #[test]
    fn test_aircraft_visible_inside_radar_range() {
        let mut world = World::new();
        let mut ac = Aircraft::new(99, "NEARPLANE", "F-16C", Side::Friendly);
        ac.lat = 38.8;
        ac.lon = -9.2;
        ac.altitude_ft = 25_000.0;
        world.aircraft.push(ac);
        world.update(1.0);
        let found = world
            .aircraft
            .iter()
            .find(|a| a.callsign == "NEARPLANE")
            .unwrap();
        assert!(
            found.is_visible(),
            "aircraft inside radar range should be visible"
        );
    }

    #[test]
    fn test_dispatch_transitions_cold_dark_to_preflight() {
        let mut world = World::new();
        let mut ac = Aircraft::new(10, "DISPATCH1", "F-16C", Side::Friendly);
        ac.phase = FlightPhase::ColdDark;
        world.aircraft.push(ac);
        world.dispatch_aircraft(10);
        let found = world.aircraft.iter().find(|a| a.id == 10).unwrap();
        assert!(
            matches!(found.phase, FlightPhase::Preflight { .. }),
            "dispatched aircraft should be in Preflight, got {:?}",
            found.phase
        );
    }

    #[test]
    fn test_dispatch_only_works_on_cold_dark() {
        let mut world = World::new();
        let mut ac = Aircraft::new(11, "DISPATCH2", "F-16C", Side::Friendly);
        ac.phase = FlightPhase::ColdDark;
        world.aircraft.push(ac);
        world.dispatch_aircraft(11);
        world.dispatch_aircraft(11);
        let found = world.aircraft.iter().find(|a| a.id == 11).unwrap();
        assert!(matches!(found.phase, FlightPhase::Preflight { .. }));
    }
}
