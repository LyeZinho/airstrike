use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct JammingEffect {
    pub source_id: u32,
    pub strength: f32, // 0.0 to 1.0
    pub range_km: f32,
}

pub struct RwrAlert {
    pub source_id: u32,
    pub bearing_deg: f32,
    pub distance_km: f32,
    pub is_lock: bool,
}

pub struct EwSystem {
    active_jammers: HashMap<u32, (f64, f64, JammingEffect)>, // (lat, lon, effect)
}

impl EwSystem {
    pub fn new() -> Self {
        EwSystem {
            active_jammers: HashMap::new(),
        }
    }

    pub fn update_jammer(&mut self, id: u32, lat: f64, lon: f64, effect: JammingEffect) {
        self.active_jammers.insert(id, (lat, lon, effect));
    }

    pub fn remove_jammer(&mut self, id: u32) {
        self.active_jammers.remove(&id);
    }

    /// Calculate detection multiplier for a radar looking at a target.
    /// Returns 1.0 (no jamming) down to 0.1 (heavy jamming).
    pub fn calculate_detection_multiplier(&self, radar_lat: f64, radar_lon: f64, _target_lat: f64, _target_lon: f64) -> f32 {
        let mut multiplier = 1.0;

        use crate::core::radar::haversine_km;

        for (_id, (j_lat, j_lon, effect)) in &self.active_jammers {
            let dist_to_jammer = haversine_km(radar_lat, radar_lon, *j_lat, *j_lon);
            if dist_to_jammer < effect.range_km {
                let range_falloff = 1.0 - (dist_to_jammer / effect.range_km);
                // Simple jamming effect model
                multiplier *= 1.0 - (effect.strength * range_falloff * 0.9);
            }
        }

        multiplier.max(0.1)
    }

    pub fn generate_rwr_alerts(&self, _ac_id: u32, ac_lat: f64, ac_lon: f64, radars: &[(u32, f64, f64, bool)]) -> Vec<RwrAlert> {
        use crate::core::radar::{haversine_km, bearing_deg};
        
        let mut alerts = Vec::new();
        for &(r_id, r_lat, r_lon, is_lock) in radars {
            let dist = haversine_km(ac_lat, ac_lon, r_lat, r_lon);
            if dist < 400.0 { // Static RWR sensitivity range
                alerts.push(RwrAlert {
                    source_id: r_id,
                    bearing_deg: bearing_deg(ac_lat, ac_lon, r_lat, r_lon),
                    distance_km: dist,
                    is_lock,
                });
            }
        }
        alerts
    }
}
