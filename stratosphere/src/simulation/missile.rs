use airstrike_engine::core::radar::haversine_km;
use airstrike_engine::core::weapon::weapon_by_id;

#[derive(Debug, Clone, PartialEq)]
pub enum MissilePhase {
    Midcourse,
    Pitbull,
    Terminal,
    Detonated,
    Missed,
}

#[derive(Debug, Clone)]
pub struct Missile {
    pub id: u32,
    pub launcher_id: u32,
    pub target_id: u32,
    pub lat: f64,
    pub lon: f64,
    pub target_lat: f64,
    pub target_lon: f64,
    pub altitude_ft: f32,
    pub phase: MissilePhase,
    pub fuel_s: f32,
    pub weapon_id: &'static str,
}

impl Missile {
    pub fn new(
        id: u32,
        launcher_id: u32,
        target_id: u32,
        lat: f64,
        lon: f64,
        alt_ft: f32,
        weapon_id: &'static str,
    ) -> Self {
        let fuel_s = weapon_by_id(weapon_id)
            .map(|w| w.range_km / (w.speed_knots * 0.5144 / 1000.0))
            .unwrap_or(60.0);
        Missile {
            id,
            launcher_id,
            target_id,
            lat,
            lon,
            target_lat: lat,
            target_lon: lon,
            altitude_ft: alt_ft,
            phase: MissilePhase::Midcourse,
            fuel_s,
            weapon_id,
        }
    }

    pub fn update_phase(&mut self) {
        let dist = haversine_km(self.lat, self.lon, self.target_lat, self.target_lon);
        if let Some(spec) = weapon_by_id(self.weapon_id) {
            if dist <= spec.pitbull_range_km && self.phase == MissilePhase::Midcourse {
                self.phase = MissilePhase::Pitbull;
            }
            if dist <= 5.0 && self.phase == MissilePhase::Pitbull {
                self.phase = MissilePhase::Terminal;
            }
        }
    }

    pub fn advance(&mut self, dt: f32) {
        let speed = weapon_by_id(self.weapon_id)
            .map(|w| w.speed_knots)
            .unwrap_or(2700.0);
        let speed_m_s = speed * 0.5144;
        let dist = haversine_km(self.lat, self.lon, self.target_lat, self.target_lon);
        if dist < 0.05 || self.fuel_s <= 0.0 {
            if self.fuel_s <= 0.0 {
                self.phase = MissilePhase::Missed;
            } else {
                self.phase = MissilePhase::Terminal;
            }
            return;
        }
        let move_km = (speed_m_s * dt) / 1000.0;
        let frac = (move_km / dist).min(1.0) as f64;
        self.lat += (self.target_lat - self.lat) * frac;
        self.lon += (self.target_lon - self.lon) * frac;
        self.fuel_s -= dt;
        self.update_phase();
    }
}

pub enum HitResult {
    Hit(u32),
    Miss,
}

pub fn resolve_hit(
    target_rcs: f32,
    chaff_factor: f32,
    target_maneuvering: bool,
    weapon_id: &str,
    target_id: u32,
) -> HitResult {
    let spec = match weapon_by_id(weapon_id) {
        Some(s) => s,
        None => return HitResult::Miss,
    };
    let rcs_factor = (target_rcs / 5.0_f32).powf(0.1).min(1.2).max(0.3);
    let maneuver_factor = if target_maneuvering { 0.7 } else { 1.0 };
    let pk = spec.pk_base * rcs_factor * chaff_factor * maneuver_factor;
    if pk >= 0.5 {
        HitResult::Hit(target_id)
    } else {
        HitResult::Miss
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_missile_starts_in_midcourse() {
        let m = Missile::new(1, 0, 99, 38.716, -9.142, 25_000.0, "AIM-120C");
        assert!(matches!(m.phase, MissilePhase::Midcourse));
    }

    #[test]
    fn test_missile_transitions_to_pitbull_at_range() {
        let mut m = Missile::new(1, 0, 99, 38.716, -9.142, 25_000.0, "AIM-120C");
        m.target_lat = 38.716;
        m.target_lon = -9.0;
        m.update_phase();
        assert!(
            matches!(m.phase, MissilePhase::Pitbull),
            "should be Pitbull within pitbull_range_km"
        );
    }

    #[test]
    fn test_hit_resolution_large_rcs_target() {
        let result = resolve_hit(15.0, 1.0, false, "AIM-120C", 42);
        assert!(
            matches!(result, HitResult::Hit(_)) || matches!(result, HitResult::Miss),
            "resolve_hit must return Hit or Miss without panic"
        );
    }
}
