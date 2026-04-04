/// World: owns all aircraft entities and drives physics updates.
use airstrike_engine::core::aircraft::{Aircraft, Side};
use airstrike_engine::core::radar::RadarSystem;

pub struct World {
    pub aircraft: Vec<Aircraft>,
    pub radar: RadarSystem,
    next_id: u32,
}

impl World {
    pub fn new() -> Self {
        World {
            aircraft: Vec::new(),
            radar: RadarSystem::new(38.716, -9.142, 50.0, 400.0),
            next_id: 1,
        }
    }

    /// Spawn a demo scenario: 2 friendly + 2 hostile aircraft near Lisbon.
    pub fn spawn_demo(&mut self) {
        // Friendly CAP patrol north of Lisbon
        let mut f1 = Aircraft::new(self.next_id, "EAGLE1", "F-16C", Side::Friendly);
        self.next_id += 1;
        f1.lat = 39.5;
        f1.lon = -9.5;
        f1.heading_deg = 120.0;
        f1.speed_knots = 450.0;
        f1.altitude_ft = 25_000.0;
        f1.rcs_base = 1.2;
        self.aircraft.push(f1);

        let mut f2 = Aircraft::new(self.next_id, "EAGLE2", "F-16C", Side::Friendly);
        self.next_id += 1;
        f2.lat = 39.3;
        f2.lon = -8.8;
        f2.heading_deg = 300.0;
        f2.speed_knots = 450.0;
        f2.altitude_ft = 24_000.0;
        f2.rcs_base = 1.2;
        self.aircraft.push(f2);

        // Hostile ingress from east
        let mut h1 = Aircraft::new(self.next_id, "BOGEY1", "Su-27", Side::Hostile);
        self.next_id += 1;
        h1.lat = 38.9;
        h1.lon = -7.5;
        h1.heading_deg = 270.0;
        h1.speed_knots = 520.0;
        h1.altitude_ft = 500.0;
        h1.rcs_base = 4.0;
        self.aircraft.push(h1);

        let mut h2 = Aircraft::new(self.next_id, "BOGEY2", "Su-27", Side::Hostile);
        self.next_id += 1;
        h2.lat = 39.1;
        h2.lon = -7.2;
        h2.heading_deg = 250.0;
        h2.speed_knots = 500.0;
        h2.altitude_ft = 18_000.0;
        h2.rcs_base = 3.5;
        self.aircraft.push(h2);
    }

    /// Update all entities by `dt` seconds.
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
}
