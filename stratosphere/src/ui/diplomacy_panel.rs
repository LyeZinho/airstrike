use crate::ui::hud::{HudPanel, HudRow, HudAnchor};
use airstrike_engine::core::diplomacy::DiplomacySystem;

pub fn create_diplomacy_panel(diplomacy: &mut DiplomacySystem) -> HudPanel {
    let mut rows = Vec::new();
    
    // For now, let's show Hostile vs Friendly relationship
    let rel = diplomacy.get_relationship_mut("Hostile", "Friendly");
    
    rows.push(HudRow::KeyValue("FACTION".to_string(), "REBEL FORCES".to_string()));
    rows.push(HudRow::Separator);
    rows.push(HudRow::KeyValue("TRUST".to_string(), format!("{:.0}", rel.trust)));
    rows.push(HudRow::KeyValue("FEAR".to_string(), format!("{:.0}", rel.fear)));
    rows.push(HudRow::KeyValue("ALIGN".to_string(), format!("{:.0}", rel.alignment)));
    rows.push(HudRow::Separator);
    
    let posture = if rel.quality() < -30.0 { "HOSTILE" } else if rel.quality() > 30.0 { "ALLIED" } else { "NEUTRAL" };
    rows.push(HudRow::KeyValue("POSTURE".to_string(), posture.to_string()));
    rows.push(HudRow::KeyValue("INCIDENTS".to_string(), rel.incident_count.to_string()));

    HudPanel {
        anchor: HudAnchor::TopRight,
        offset_x: 20,
        offset_y: 20,
        width: 200,
        title: "DIPLOMACY".to_string(),
        rows,
    }
}
