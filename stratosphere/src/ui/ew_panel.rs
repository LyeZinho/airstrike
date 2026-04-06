use crate::ui::hud::{HudPanel, HudRow, HudAnchor};
use airstrike_engine::core::ew::EwSystem;
use airstrike_engine::core::aircraft::Aircraft;

pub fn create_ew_panel(ac: &Aircraft, ew: &EwSystem, context_radars: &[(u32, f64, f64, bool)]) -> HudPanel {
    let mut rows = Vec::new();
    
    // RWR Alerts
    let alerts = ew.generate_rwr_alerts(ac.id, ac.lat, ac.lon, context_radars);
    rows.push(HudRow::KeyValue("RWR CONTACTS".to_string(), alerts.len().to_string()));
    rows.push(HudRow::Separator);
    
    for alert in alerts.iter().take(5) {
        let lock_status = if alert.is_lock { "!LOCK!" } else { "TRK" };
        rows.push(HudRow::KeyValue(
            format!("{:03}°", alert.bearing_deg as i32),
            format!("{:<5} {:.1}km", lock_status, alert.distance_km)
        ));
    }
    
    if alerts.is_empty() {
        rows.push(HudRow::KeyValue("SCAN".to_string(), "CLEAN".to_string()));
    }
    
    rows.push(HudRow::Separator);
    rows.push(HudRow::KeyValue("JAMMING".to_string(), (if ac.jamming_active { "ACTIVE" } else { "OFF" }).to_string()));
    if ac.jamming_active {
        rows.push(HudRow::KeyValue("POWER".to_string(), format!("{:.0}%", ac.jamming_strength * 100.0)));
    }
    
    rows.push(HudRow::Separator);
    rows.push(HudRow::KeyValue("FLARES".to_string(), ac.flare_count.to_string()));
    rows.push(HudRow::KeyValue("CHAFF".to_string(), ac.chaff_count.to_string()));

    HudPanel {
        anchor: HudAnchor::BottomRight,
        offset_x: 20,
        offset_y: 20,
        width: 220,
        title: "ELECTRONIC WARFARE".to_string(),
        rows,
    }
}
