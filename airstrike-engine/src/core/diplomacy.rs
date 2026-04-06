use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum TreatyType {
    None,
    Peace,
    Trade,
    Alliance,
    MutualDefense,
}

pub struct FactionRelationship {
    pub faction_a: String,
    pub faction_b: String,
    pub trust: f32,
    pub fear: f32,
    pub alignment: f32,
    pub incident_count: u32,
    pub treaty: TreatyType,
}

impl FactionRelationship {
    pub fn quality(&self) -> f32 {
        self.trust - self.fear + self.alignment * 0.5
    }
}

pub struct DiplomacySystem {
    relationships: HashMap<(String, String), FactionRelationship>,
}

impl DiplomacySystem {
    pub fn new() -> Self {
        DiplomacySystem {
            relationships: HashMap::new(),
        }
    }

    /// Get or create a relationship between two factions.
    /// Faction IDs are sorted to ensure (A, B) and (B, A) are the same relationship.
    pub fn get_relationship_mut(&mut self, faction_a: &str, faction_b: &str) -> &mut FactionRelationship {
        let key = if faction_a < faction_b {
            (faction_a.to_string(), faction_b.to_string())
        } else {
            (faction_b.to_string(), faction_a.to_string())
        };

        self.relationships.entry(key.clone()).or_insert_with(|| FactionRelationship {
            faction_a: key.0,
            faction_b: key.1,
            trust: 50.0,
            fear: 50.0,
            alignment: 0.0,
            incident_count: 0,
            treaty: TreatyType::None,
        })
    }

    pub fn record_incident(&mut self, faction_a: &str, faction_b: &str, severity: f32) {
        let rel = self.get_relationship_mut(faction_a, faction_b);
        rel.incident_count += 1;
        rel.fear = (rel.fear + severity * 0.5).min(100.0);
        rel.trust = (rel.trust - severity * 0.3).max(0.0);
        
        if severity > 50.0 {
            rel.alignment = (rel.alignment - severity * 0.2).max(-100.0);
        }
    }

    pub fn establish_treaty(&mut self, faction_a: &str, faction_b: &str, treaty: TreatyType) {
        let rel = self.get_relationship_mut(faction_a, faction_b);
        rel.treaty = treaty;
        match treaty {
            TreatyType::Peace => rel.fear = (rel.fear - 15.0).max(0.0),
            TreatyType::Alliance => {
                rel.trust = (rel.trust + 20.0).min(100.0);
                rel.alignment = (rel.alignment + 10.0).min(100.0);
            }
            TreatyType::Trade => rel.trust = (rel.trust + 10.0).min(100.0),
            _ => {}
        }
    }

    pub fn is_hostile(&mut self, faction_a: &str, faction_b: &str) -> bool {
        self.get_relationship_mut(faction_a, faction_b).quality() < -30.0
    }

    pub fn are_allies(&mut self, faction_a: &str, faction_b: &str) -> bool {
        self.get_relationship_mut(faction_a, faction_b).quality() > 30.0
    }
}
