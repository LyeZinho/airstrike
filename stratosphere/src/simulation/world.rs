use airstrike_engine::core::aircraft::{Aircraft, FlightPhase, Side};
use airstrike_engine::core::airport::{Airport, AirportDb, AirportType};
use airstrike_engine::core::airbase::Airbase;
use airstrike_engine::core::radar::{RadarSystem, bearing_deg, haversine_km};
use airstrike_engine::core::datalink::{ContactPicture, Contact, IffStatus};
use airstrike_engine::core::mission::MissionPlan;
// use crate::ui::mission_panel::MissionBriefingState; // Removed unused

use super::missile::{resolve_hit, HitResult, Missile, MissilePhase};

pub struct World {
    pub aircraft: Vec<Aircraft>,
    pub airports: Vec<Airport>,
    pub airbases: Vec<Airbase>, // NEW: Managed airbases
    pub radars: Vec<RadarSystem>,
    pub credits: u32,
    pub game_time_s: f32,
    pub missiles: Vec<Missile>,
    pub contact_picture: ContactPicture,
    pub brevity_log: Vec<String>,
    pub objectives: Vec<airstrike_engine::core::mission::MissionObjective>,
    next_id: u32,
    pub spatial_index: airstrike_engine::core::spatial_index::SpatialIndex,
    pub event_bus: airstrike_engine::core::event_bus::EventBus,
    pub diplomacy: airstrike_engine::core::diplomacy::DiplomacySystem,
    pub ew: airstrike_engine::core::ew::EwSystem,
    pub theater_lat: f64,
    pub theater_lon: f64,
    pub theater_radius_km: f32,
    pub use_culling: bool,
}

impl World {
    pub fn new() -> Self {
        World {
            aircraft: Vec::new(),
            airports: Vec::new(),
            airbases: Vec::new(),
            radars: vec![RadarSystem::new(1, 38.716, -9.142, 50.0, 400.0, Side::Friendly)],
            credits: 0,
            game_time_s: 0.0,
            missiles: Vec::new(),
            contact_picture: ContactPicture::new(),
            brevity_log: Vec::new(),
            objectives: Vec::new(),
            next_id: 2,
            spatial_index: airstrike_engine::core::spatial_index::SpatialIndex::new(50.0),
            event_bus: airstrike_engine::core::event_bus::EventBus::new(),
            diplomacy: airstrike_engine::core::diplomacy::DiplomacySystem::new(),
            ew: airstrike_engine::core::ew::EwSystem::new(),
            theater_lat: 0.0,
            theater_lon: 0.0,
            theater_radius_km: 500.0,
            use_culling: true,
        }
    }

    pub fn new_from_settings(country_iso: &str, starting_credits: u32, db: &AirportDb) -> Self {
        // Load airports for the player country and neighbors
        let mut airports = Vec::new();
        // Load ALL Large and Medium airports globally (5k total)
        // With frustum culling, this is fine for rendering.
        for a in &db.airports {
            if matches!(a.airport_type, AirportType::Large | AirportType::Medium) {
                let mut apt = a.clone();
                apt.side = if apt.country_iso == country_iso { Side::Friendly } else { Side::Hostile };
                airports.push(apt);
            }
        }

        use rand::Rng;
        let mut rng = rand::thread_rng();

        // Find the "Theater of Operations" center (player's first friendly airport)
        let first_friendly = airports.iter().find(|a| a.side == Side::Friendly);
        let theater_center = first_friendly.map(|a| (a.lat, a.lon)).unwrap_or((0.0, 0.0));
        let theater_radius_km = 2500.0; // Theater of operations size

        // National Defense Network Spawning (Limited to Theater)
        let mut next_id = 1;
        let mut radars: Vec<RadarSystem> = Vec::new();
        for a in &airports {
            let r = match a.airport_type {
                AirportType::Large => {
                    let mut rs = RadarSystem::new(next_id, a.lat, a.lon, a.elevation_ft * 0.3048, 480.0, a.side);
                    next_id += 1;
                    rs.tier = airstrike_engine::core::radar::RadarTier::Tier3;
                    Some(rs)
                },
                AirportType::Medium if rng.gen_bool(0.4) => {
                    let mut rs = RadarSystem::new(next_id, a.lat, a.lon, a.elevation_ft * 0.3048, 320.0, a.side);
                    next_id += 1;
                    rs.tier = airstrike_engine::core::radar::RadarTier::Tier2;
                    Some(rs)
                },
                _ => None,
            };
            if let Some(mut radar) = r {
                radar.sweep_angle = rng.gen_range(0.0..360.0);
                radar.sweep_dir = if rng.gen_bool(0.5) { 1.0 } else { -1.0 };
                radars.push(radar);
            }
        }

        // Add 2-3 isolated GCI "Sítios de Radar" in high-ground areas for the player
        if let Some(first) = airports.iter().find(|a| a.side == Side::Friendly) {
             for _ in 0..3 {
                 let mut gci = RadarSystem::new(
                     next_id,
                     first.lat + rng.gen_range(-2.0..2.0),
                     first.lon + rng.gen_range(-2.0..2.0),
                     1500.0, // High mountain
                     550.0,  // Massive range
                     Side::Friendly
                 );
                 next_id += 1;
                 gci.tier = airstrike_engine::core::radar::RadarTier::Tier3;
                 radars.push(gci);
             }
        }

        let mut airbases = Vec::new();
        for airport in &airports {
            if airport.side == Side::Friendly || airport.airport_type == AirportType::Large {
                airbases.push(Airbase::new(&airport.icao, &airport.name, airport.lat, airport.lon, airport.side));
            }
        }

        let mut world = World {
            aircraft: Vec::new(),
            airports: airports.clone(),
            airbases,
            radars,
            credits: starting_credits,
            game_time_s: 0.0,
            missiles: Vec::new(),
            contact_picture: ContactPicture::new(),
            brevity_log: Vec::new(),
            objectives: Vec::new(),
            next_id: 1,
            spatial_index: airstrike_engine::core::spatial_index::SpatialIndex::new(50.0),
            event_bus: airstrike_engine::core::event_bus::EventBus::new(),
            diplomacy: airstrike_engine::core::diplomacy::DiplomacySystem::new(),
            ew: airstrike_engine::core::ew::EwSystem::new(),
            theater_lat: theater_center.0,
            theater_lon: theater_center.1,
            theater_radius_km: theater_radius_km as f32,
            use_culling: true,
        };

        for airport in &airports {
            // Theater range check for hostile aircraft spawning
            if airport.side == Side::Hostile && airstrike_engine::core::radar::haversine_km(theater_center.0, theater_center.1, airport.lat, airport.lon) > theater_radius_km as f32 {
                continue;
            }

            // Spawn 2-4 aircraft per large airport, 1-2 per medium
            let count = match airport.airport_type {
                AirportType::Large => rng.gen_range(2..4),
                AirportType::Medium => rng.gen_range(1..2),
                _ => 0,
            };

            for i in 0..count {
                let spec = airstrike_engine::core::aircraft_specs::get_random_spec(airport.side);
                let callsign = format!("{}-{:02}", airport.icao, i + 1);
                let mut ac = Aircraft::new(world.next_id, &callsign, spec.model, airport.side);
                world.next_id += 1;
                ac.apply_spec(&spec);
                ac.lat = airport.lat;
                ac.lon = airport.lon;
                ac.altitude_ft = airport.elevation_ft;
                ac.phase = FlightPhase::ColdDark;
                ac.home_airport_icao = airport.icao.clone();
                ac.home_airport_lat = airport.lat;
                ac.home_airport_lon = airport.lon;
                ac.home_runway_heading_deg = airport.runway_heading_deg;
                world.aircraft.push(ac);
            }
        }

        // Initial Objectives
        world.objectives.push(airstrike_engine::core::mission::MissionObjective {
            id: 1,
            title: "Border Patrol".to_string(),
            description: "Patrol the border to deter hostile incursions.".to_string(),
            objective_type: airstrike_engine::core::mission::ObjectiveType::PatrolArea { lat: 39.0, lon: -7.0, radius_km: 100.0 },
            is_completed: false,
            reward_credits: 5000,
        });

        world
    }
    pub fn dispatch_with_mission(&mut self, id: u32, mut plan: MissionPlan) -> bool {
        let mut nearest_airport_lat = 0.0;
        let mut nearest_airport_lon = 0.0;
        let mut nearest_dist = f32::MAX;
        let mut ac_side = Side::Friendly;

        // Try to get the Aircraft side first
        if let Some(ac) = self.aircraft.iter().find(|a| a.id == id) {
            ac_side = ac.side;
        }

        // Check if last waypoint is near a friendly airport
        if let Some(last_wp) = plan.waypoints.last_mut() {
            for airport in &self.airports {
                if airport.side == ac_side {
                    let d = airstrike_engine::core::radar::haversine_km(last_wp.lat, last_wp.lon, airport.lat, airport.lon);
                    if d < nearest_dist {
                        nearest_dist = d;
                        nearest_airport_lat = airport.lat;
                        nearest_airport_lon = airport.lon;
                    }
                }
            }
            if nearest_dist < 20.0 {
                last_wp.action = airstrike_engine::core::mission::WaypointAction::Rtb;
            } else {
                last_wp.action = airstrike_engine::core::mission::WaypointAction::OrbitCap {
                    radius_km: 5.0,
                    duration_s: 999999.0,
                };
            }
        }

        if let Some(ac) = self.aircraft.iter_mut().find(|a| a.id == id) {
            if matches!(ac.phase, FlightPhase::ColdDark) {
                ac.mission = Some(plan);
                ac.waypoint_index = 0;
                ac.phase = FlightPhase::Preflight {
                    elapsed_s: 0.0,
                    required_s: 10.0, // Reduced from 30.0 for faster gameplay
                };
                return true;
            }
        }
        false
    }

    pub fn spawn_demo(&mut self) {
        let mut f1 = Aircraft::new(self.next_id, "EAGLE1", "F-16C", Side::Friendly);
        self.next_id += 1;
        f1.lat = 39.5;
        f1.lon = -9.5;
        f1.heading_deg = 120.0;
        f1.speed_knots = 450.0;
        f1.altitude_ft = 25_000.0;
        f1.rcs_frontal = 1.2;
        f1.rcs_side = 3.5;
        f1.phase = FlightPhase::EnRoute;
        self.aircraft.push(f1);

        let mut f2 = Aircraft::new(self.next_id, "EAGLE2", "F-16C", Side::Friendly);
        self.next_id += 1;
        f2.lat = 39.3;
        f2.lon = -8.8;
        f2.heading_deg = 300.0;
        f2.speed_knots = 450.0;
        f2.altitude_ft = 24_000.0;
        f2.rcs_frontal = 1.2;
        f2.rcs_side = 3.5;
        f2.phase = FlightPhase::EnRoute;
        self.aircraft.push(f2);

        let mut h1 = Aircraft::new(self.next_id, "BOGEY1", "Su-27", Side::Hostile);
        self.next_id += 1;
        h1.lat = 38.9;
        h1.lon = -7.5;
        h1.heading_deg = 270.0;
        h1.speed_knots = 520.0;
        h1.altitude_ft = 500.0;
        h1.rcs_frontal = 4.0;
        h1.rcs_side = 10.0;
        h1.phase = FlightPhase::EnRoute;
        self.aircraft.push(h1);

        let mut h2 = Aircraft::new(self.next_id, "BOGEY2", "Su-27", Side::Hostile);
        self.next_id += 1;
        h2.lat = 39.1;
        h2.lon = -7.2;
        h2.heading_deg = 250.0;
        h2.speed_knots = 500.0;
        h2.altitude_ft = 18_000.0;
        h2.rcs_frontal = 3.5;
        h2.rcs_side = 8.0;
        h2.phase = FlightPhase::EnRoute;
        self.aircraft.push(h2);
    }

    pub fn update(&mut self, dt: f32) {
        self.game_time_s += dt;
        // 0. Update Spatial Index
        self.spatial_index.clear();
        for ac in &self.aircraft {
            if ac.phase != FlightPhase::Destroyed {
                self.spatial_index.update_entity(ac.id, ac.lat, ac.lon, 0.0);
            }
        }

        use rayon::prelude::*;
        let use_culling = self.use_culling;
        let theater_lat = self.theater_lat;
        let theater_lon = self.theater_lon;
        let theater_radius_km = self.theater_radius_km;
        let sweep_speed = 45.0; // deg/s

        // 1. Flight Dynamics (Hibernation logic and Radar Sweep)
        self.aircraft.par_iter_mut().for_each(|ac| {
            if ac.phase == FlightPhase::Destroyed { return; }
            
            let dist_to_theater = if use_culling {
                haversine_km(ac.lat, ac.lon, theater_lat, theater_lon)
            } else {
                0.0
            };

            if let Some(ref mut radar) = ac.own_radar {
                radar.sweep_angle = (radar.sweep_angle + radar.sweep_dir * sweep_speed * dt).rem_euclid(360.0);
            }

            if use_culling && dist_to_theater > theater_radius_km {
                // HIBERNATED: Simple linear move, no complex AI/Radar
                ac.update(dt);
                ac.is_detected = false; // Hide from picture if outside theater
                return;
            }

            ac.update(dt);
        });

        // Rotate radars
        self.radars.par_iter_mut().for_each(|radar| {
            if use_culling && haversine_km(radar.position_lat, radar.position_lon, theater_lat, theater_lon) > theater_radius_km + radar.range_km as f32 {
                return;
            }
            radar.sweep_angle = (radar.sweep_angle + radar.sweep_dir * sweep_speed * dt).rem_euclid(360.0);
        });

        for base in &mut self.airbases {
            base.update(dt);
        }

        let game_time_s = self.game_time_s;

        // 1. Ground radars scan and update picture
        let mut new_contacts: Vec<Contact> = self.radars.par_iter().flat_map(|radar| {
            if !radar.is_emitting { return vec![]; }
            
            if use_culling {
                let dist_to_theater = haversine_km(radar.position_lat, radar.position_lon, theater_lat, theater_lon);
                if dist_to_theater > theater_radius_km + radar.range_km as f32 {
                    return vec![]; // Radar is too far to see anything in theater
                }
            }

            // OPTIMIZED: Use spatial index to find nearby targets
            let nearby_ids = self.spatial_index.get_nearby(radar.position_lat, radar.position_lon, radar.range_km as f64);
            
            let mut contacts = Vec::new();
            for id in nearby_ids {
                // OPTIMIZED: Binary search lookup instead of find
                if let Ok(idx) = self.aircraft.binary_search_by_key(&id, |a| a.id) {
                    let target = &self.aircraft[idx];
                    if target.phase == FlightPhase::Destroyed { continue; }

                    // EW: Apply jamming multiplier
                    let jamming_mult = self.ew.calculate_detection_multiplier(radar.position_lat, radar.position_lon, target.lat, target.lon);
                    
                    // RADAR: Check detection with RCS and EW
                    if radar.is_detected(
                        target.lat,
                        target.lon,
                        target.altitude_ft,
                        target.heading_deg,
                        target.rcs_frontal * jamming_mult,
                        target.rcs_side * jamming_mult,
                    ) {
                        contacts.push(Contact {
                            aircraft_id: target.id,
                            lat: target.lat,
                            lon: target.lon,
                            altitude_ft: target.altitude_ft,
                            heading_deg: target.heading_deg,
                            iff: match target.side {
                                Side::Friendly => IffStatus::Friendly,
                                Side::Hostile => IffStatus::Hostile,
                                Side::Unknown => IffStatus::Unknown,
                            },
                            last_updated_s: game_time_s,
                        });
                    }
                }
            }
            contacts
        }).collect();

        // 2. Airborne radars scan and update picture
        let airborne_contacts: Vec<Contact> = self.aircraft.par_iter().flat_map(|ac| {
            if ac.phase == FlightPhase::Destroyed || ac.side != Side::Friendly {
                return vec![];
            }
            
            if let Some(radar) = &ac.own_radar {
                let nearby_ids = self.spatial_index.get_nearby(ac.lat, ac.lon, radar.range_km as f64);
                let mut contacts = Vec::new();
                for target_id in nearby_ids {
                    if target_id == ac.id { continue; }
                    
                    if let Ok(idx) = self.aircraft.binary_search_by_key(&target_id, |a| a.id) {
                        let target = &self.aircraft[idx];
                        if target.phase == FlightPhase::Destroyed { continue; }

                        // Check FOV
                        let b = bearing_deg(ac.lat, ac.lon, target.lat, target.lon);
                        let diff = (b - ac.heading_deg).abs().rem_euclid(360.0);
                        let diff = if diff > 180.0 { 360.0 - diff } else { diff };
                        
                        if radar.arc_deg >= 360.0 || diff <= radar.arc_deg / 2.0 {
                            // EW: Apply jamming
                            let jamming_mult = self.ew.calculate_detection_multiplier(ac.lat, ac.lon, target.lat, target.lon);
                            let dist = haversine_km(ac.lat, ac.lon, target.lat, target.lon);
                            
                            if dist <= radar.range_km * (target.rcs_frontal * jamming_mult).max(0.1).powf(0.25) {
                                contacts.push(Contact {
                                    aircraft_id: target_id,
                                    lat: target.lat,
                                    lon: target.lon,
                                    altitude_ft: target.altitude_ft,
                                    heading_deg: target.heading_deg,
                                    iff: match target.side {
                                        Side::Friendly => IffStatus::Friendly,
                                        Side::Hostile => IffStatus::Hostile,
                                        Side::Unknown => IffStatus::Unknown,
                                    },
                                    last_updated_s: game_time_s,
                                });
                            }
                        }
                    }
                }
                contacts
            } else { vec![] }
        }).collect();

        new_contacts.extend(airborne_contacts);

        for c in new_contacts {
            self.contact_picture.upsert(c);
        }

        // 3. Update aircraft detection state from ContactPicture
        for ac in &mut self.aircraft {
            if ac.side == Side::Friendly {
                ac.is_detected = true; // Friendlies always seen by "center"
                ac.detection_confidence = 1.0;
            } else {
                let detected = self.contact_picture.contacts.contains_key(&ac.id);
                ac.is_detected = detected;
                ac.detection_confidence = if detected { 1.0 } else { 0.0 };
            }
        }

        // 4. Formation coordination
        let mut formation_status = std::collections::HashMap::new();
        for ac in &self.aircraft {
            if let Some(m) = &ac.mission {
                if !m.formation_ids.is_empty() {
                    let all_airborne = m.formation_ids.iter().all(|&id| {
                        if let Ok(idx) = self.aircraft.binary_search_by_key(&id, |a| a.id) {
                            let member = &self.aircraft[idx];
                            !matches!(member.phase, FlightPhase::ColdDark | FlightPhase::Preflight { .. } | FlightPhase::Taxiing { .. } | FlightPhase::TakeoffRoll { .. })
                        } else { true }
                    });
                    formation_status.insert(ac.id, all_airborne);
                }
            }
        }

        for ac in &mut self.aircraft {
            if let Some(&all_airborne) = formation_status.get(&ac.id) {
                if !all_airborne {
                    if matches!(ac.phase, FlightPhase::Climbing { .. } | FlightPhase::EnRoute) {
                        ac.phase = FlightPhase::FormationHold {
                            orbit_lat: ac.home_airport_lat,
                            orbit_lon: ac.home_airport_lon,
                            orbit_radius_km: 5.0,
                        };
                    }
                } else if matches!(ac.phase, FlightPhase::FormationHold { .. }) {
                    ac.phase = FlightPhase::EnRoute;
                }
            }
        }

        use rand::Rng;
        let mut rng = rand::thread_rng();

        for m in &mut self.missiles {
            let spec = airstrike_engine::core::weapon::weapon_by_id(m.weapon_id);
            if let Some(s) = spec {
                use airstrike_engine::core::weapon::SeekerType;
                if s.seeker == SeekerType::PassiveRadar {
                    // SEAD guidance: Track the target emitter
                    if let Some(emitter) = self.radars.iter().find(|r| r.id == m.target_id && r.is_emitting) {
                        m.target_lat = emitter.position_lat;
                        m.target_lon = emitter.position_lon;
                    }
                    // If radar is shutdown, missile stays on last known target_lat/lon
                } else {
                    // Active/SemiActive/IR: Track aircraft
                    if let Some(target) = self.aircraft.iter().find(|a| a.id == m.target_id) {
                        m.target_lat = target.lat;
                        m.target_lon = target.lon;
                    }
                }
            }
            m.advance(dt);
        }

        let mut destroyed_ids: Vec<u32> = Vec::new();
        for m in &mut self.missiles {
            if m.phase == MissilePhase::Terminal {
                // OPTIMIZED: Use spatial index to find target or nearby splashes
                // For now, still stick to the specific target_id, but faster lookup
                let target_opt = self.aircraft.iter().find(|a| a.id == m.target_id);
                
                if let Some(target) = target_opt {
                    // Countermeasures
                    let mut chaff_factor = 1.0;
                    if target.chaff_count > 0 && rng.gen_bool(0.3) {
                        chaff_factor = 0.5; // Simple chaff effectiveness
                        // decrement chaff handled in aircraft update or here?
                    }
                    
                    let jamming_factor = 1.0;
                    
                    match resolve_hit(target.rcs_frontal, chaff_factor * jamming_factor, false, m.weapon_id, target.id) {
                        HitResult::Hit(id) => {
                            destroyed_ids.push(id);
                            // Record diplomatic incident
                            let target_faction = match target.side {
                                Side::Friendly => "Friendly",
                                Side::Hostile => "Hostile",
                                Side::Unknown => "Unknown",
                            };
                            self.diplomacy.record_incident("Player", target_faction, 80.0);
                            
                            self.event_bus.publish(&format!("SPLASH! Target {} destroyed", id));
                            self.brevity_log.push(format!("Splash! Target {} destroyed.", id));
                        }
                        HitResult::Miss => {
                            self.brevity_log.push(format!("Target {} evaded missile.", m.target_id));
                        }
                    }
                } else if let Some(emitter) = self.radars.iter_mut().find(|r| r.id == m.target_id) {
                    // SEAD impact on radar
                    if rng.gen_bool(0.8) {
                        emitter.is_emitting = false;
                        self.brevity_log.push(format!("Magnum! Radar {} suppressed.", emitter.id));
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

        // 5. Strategic AI: Intercept and SEAD counter-logic
        let missiles_in_air: Vec<(f64, f64, u32, &'static str)> = self.missiles.iter()
            .map(|m| (m.lat, m.lon, m.target_id, m.weapon_id))
            .collect();

        for radar in &mut self.radars {
            if radar.side == Side::Friendly { continue; }
            if !radar.is_emitting { continue; }

            // SEAD Counter: Shutdown if a HARM is detected nearby tracking this radar
            for (m_lat, m_lon, m_target_id, m_weapon_id) in &missiles_in_air {
                if *m_target_id == radar.id {
                    let spec = airstrike_engine::core::weapon::weapon_by_id(m_weapon_id);
                    if let Some(s) = spec {
                        if s.seeker == airstrike_engine::core::weapon::SeekerType::PassiveRadar {
                             let dist = haversine_km(radar.position_lat, radar.position_lon, *m_lat, *m_lon);
                             if dist < 50.0 && rng.gen_bool(0.7) { // 70% chance to shutdown
                                 radar.is_emitting = false;
                                 self.brevity_log.push(format!("Radar {} going silent! (SEAD threat detected)", radar.id));
                             }
                        }
                    }
                }
            }
        }

        let hostile_bases: Vec<String> = self.airports.iter()
            .filter(|a| a.side == Side::Hostile)
            .map(|a| a.icao.clone())
            .collect();

        let threats: Vec<(f64, f64)> = self.aircraft.iter()
            .filter(|a| {
                if a.phase == FlightPhase::Destroyed || !a.is_detected { return false; }
                // Only target hostile or those who have negative relations
                self.diplomacy.is_hostile("Hostile", "Friendly") // Placeholder faction names
            })
            .map(|a| (a.lat, a.lon))
            .collect();

        if !threats.is_empty() {
            for base_icao in hostile_bases {
                let airport = self.airports.iter().find(|a| a.icao == base_icao).unwrap();
                // Check if any threat is near this base
                let has_threat = threats.iter().any(|(t_lat, t_lon)| {
                    airstrike_engine::core::radar::haversine_km(airport.lat, airport.lon, *t_lat, *t_lon) < 300.0
                });

                if has_threat {
                    // Try to find a ready aircraft at this base
                    let ready_ac_id = self.aircraft.iter()
                        .find(|a| a.home_airport_icao == base_icao && a.phase == FlightPhase::ColdDark)
                        .map(|a| a.id);

                    if let Some(id) = ready_ac_id {
                        // Launch it!
                        let threat_pos = threats[0]; // Intercept first threat
                        let plan = MissionPlan {
                            mission_type: airstrike_engine::core::mission::MissionType::CAP,
                            waypoints: vec![
                                airstrike_engine::core::mission::Waypoint {
                                    lat: threat_pos.0,
                                    lon: threat_pos.1,
                                    altitude_ft: 25_000.0,
                                    speed_knots: 450.0,
                                    action: airstrike_engine::core::mission::WaypointAction::FlyOver,
                                }
                            ],
                            loadout: vec![],
                            formation_ids: vec![],
                            roe: airstrike_engine::core::mission::Roe::EngageHostiles,
                            fuel_reserve_pct: 0.1,
                        };
                        self.dispatch_with_mission(id, plan);
                    }
                }
            }
        }

        // Check Objectives
        for obj in &mut self.objectives {
            if obj.is_completed { continue; }
            match &obj.objective_type {
                airstrike_engine::core::mission::ObjectiveType::InterceptAsset { target_id } => {
                    if let Some(target) = self.aircraft.iter().find(|a| a.id == *target_id) {
                        if target.phase == FlightPhase::Destroyed {
                            obj.is_completed = true;
                            self.credits += obj.reward_credits;
                            self.brevity_log.push(format!("Objective Complete: {}. Credits: +{}", obj.title, obj.reward_credits));
                        }
                    }
                }
                airstrike_engine::core::mission::ObjectiveType::PatrolArea { lat, lon, radius_km } => {
                    let has_friendly_near = self.aircraft.iter().any(|a| {
                        a.side == Side::Friendly && a.phase != FlightPhase::Destroyed &&
                        airstrike_engine::core::radar::haversine_km(a.lat, a.lon, *lat, *lon) < *radius_km
                    });
                    if has_friendly_near {
                        obj.is_completed = true;
                        self.credits += obj.reward_credits;
                        self.brevity_log.push(format!("Objective Complete: {}. Credits: +{}", obj.title, obj.reward_credits));
                    }
                }
                _ => {}
            }
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
        let plan = MissionPlan {
            mission_type: MissionType::CAP,
            waypoints: vec![],
            loadout: vec![],
            formation_ids: vec![],
            roe: Roe::ReturnFireOnly,
            fuel_reserve_pct: 0.15,
        };
        world.dispatch_with_mission(10, plan);
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
        let plan = MissionPlan {
            mission_type: MissionType::CAP,
            waypoints: vec![],
            loadout: vec![],
            formation_ids: vec![],
            roe: Roe::ReturnFireOnly,
            fuel_reserve_pct: 0.15,
        };
        world.dispatch_with_mission(11, plan.clone());
        world.dispatch_with_mission(11, plan);
        let found = world.aircraft.iter().find(|a| a.id == 11).unwrap();
        assert!(matches!(found.phase, FlightPhase::Preflight { .. }));
    }
}
