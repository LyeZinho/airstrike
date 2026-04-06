#[derive(Debug, Clone, Copy, PartialEq)]
pub enum SeekerType {
    ActiveRadar,
    SemiActive,
    Ir,
    PassiveRadar, // For SEAD (Anti-radiation)
}

#[derive(Debug, Clone)]
pub struct WeaponSpec {
    pub id: &'static str,
    pub display_name: &'static str,
    pub range_km: f32,
    pub nez_km: f32,
    pub pitbull_range_km: f32,
    pub speed_knots: f32,
    pub pk_base: f32,
    pub seeker: SeekerType,
}

pub static WEAPON_CATALOG: &[WeaponSpec] = &[
    WeaponSpec {
        id: "AIM-120C",
        display_name: "AIM-120C-5 AMRAAM",
        range_km: 105.0,
        nez_km: 25.0,
        pitbull_range_km: 20.0,
        speed_knots: 2700.0,
        pk_base: 0.85,
        seeker: SeekerType::ActiveRadar,
    },
    WeaponSpec {
        id: "AIM-120D",
        display_name: "AIM-120D AMRAAM",
        range_km: 160.0,
        nez_km: 35.0,
        pitbull_range_km: 25.0,
        speed_knots: 2700.0,
        pk_base: 0.88,
        seeker: SeekerType::ActiveRadar,
    },
    WeaponSpec {
        id: "Meteor",
        display_name: "MBDA Meteor",
        range_km: 200.0,
        nez_km: 60.0,
        pitbull_range_km: 30.0,
        speed_knots: 2400.0,
        pk_base: 0.92,
        seeker: SeekerType::ActiveRadar,
    },
    WeaponSpec {
        id: "R-77",
        display_name: "R-77 Adder",
        range_km: 80.0,
        nez_km: 15.0,
        pitbull_range_km: 15.0,
        speed_knots: 2600.0,
        pk_base: 0.78,
        seeker: SeekerType::ActiveRadar,
    },
    WeaponSpec {
        id: "R-77-1",
        display_name: "R-77-1",
        range_km: 110.0,
        nez_km: 22.0,
        pitbull_range_km: 18.0,
        speed_knots: 2700.0,
        pk_base: 0.82,
        seeker: SeekerType::ActiveRadar,
    },
    WeaponSpec {
        id: "AIM-9X",
        display_name: "AIM-9X Sidewinder",
        range_km: 35.0,
        nez_km: 8.0,
        pitbull_range_km: 2.0,
        speed_knots: 2000.0,
        pk_base: 0.90,
        seeker: SeekerType::Ir,
    },
    WeaponSpec {
        id: "PL-15",
        display_name: "PL-15",
        range_km: 200.0,
        nez_km: 50.0,
        pitbull_range_km: 25.0,
        speed_knots: 2800.0,
        pk_base: 0.87,
        seeker: SeekerType::ActiveRadar,
    },
    WeaponSpec {
        id: "AGM-88",
        display_name: "AGM-88 HARM",
        range_km: 150.0,
        nez_km: 40.0,
        pitbull_range_km: 5.0,
        speed_knots: 2280.0,
        pk_base: 0.70,
        seeker: SeekerType::PassiveRadar,
    },
];

pub fn weapon_by_id(id: &str) -> Option<&'static WeaponSpec> {
    WEAPON_CATALOG.iter().find(|w| w.id == id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_catalog_not_empty() {
        assert!(!WEAPON_CATALOG.is_empty());
    }

    #[test]
    fn test_aim120c_in_catalog() {
        let w = WEAPON_CATALOG.iter().find(|w| w.id == "AIM-120C");
        assert!(w.is_some());
        let w = w.unwrap();
        assert!((w.range_km - 105.0).abs() < 1.0);
        assert!((w.nez_km - 25.0).abs() < 1.0);
        assert!((w.pk_base - 0.85).abs() < 0.01);
        assert!(matches!(w.seeker, SeekerType::ActiveRadar));
    }

    #[test]
    fn test_meteor_has_highest_nez() {
        let meteor = WEAPON_CATALOG.iter().find(|w| w.id == "Meteor").unwrap();
        let max_nez = WEAPON_CATALOG
            .iter()
            .map(|w| w.nez_km)
            .fold(f32::NEG_INFINITY, f32::max);
        assert!(
            (meteor.nez_km - max_nez).abs() < 0.01,
            "Meteor should have highest NEZ"
        );
    }

    #[test]
    fn test_weapon_by_id_finds_and_not_finds() {
        assert!(weapon_by_id("AIM-120D").is_some());
        assert!(weapon_by_id("NONEXISTENT").is_none());
    }
}
