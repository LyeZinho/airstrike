use crate::ui::hud::{HudPanel, HudRow, HudAnchor};
use airstrike_engine::core::aircraft::Aircraft;

pub fn create_aircraft_detail_panel(ac: &Aircraft) -> HudPanel {
    let mut rows = Vec::new();
    
    rows.push(HudRow::KeyValue("MODEL".to_string(), ac.model.clone()));
    rows.push(HudRow::KeyValue("CALLSIGN".to_string(), ac.callsign.clone()));
    rows.push(HudRow::Separator);
    
    rows.push(HudRow::KeyValue("ALTITUDE".to_string(), format!("{:.0} ft", ac.altitude_ft)));
    rows.push(HudRow::KeyValue("SPEED".to_string(), format!("{:.0} kts", ac.speed_knots)));
    rows.push(HudRow::KeyValue("HEADING".to_string(), format!("{:03}°", ac.heading_deg as i32)));
    rows.push(HudRow::Separator);
    
    rows.push(HudRow::KeyValue("RCS FRONT".to_string(), format!("{:.4}", ac.rcs_frontal)));
    rows.push(HudRow::KeyValue("RCS SIDE".to_string(), format!("{:.4}", ac.rcs_side)));
    rows.push(HudRow::KeyValue("STEALTH".to_string(), (if ac.is_stealth { "YES" } else { "NO" }).to_string()));
    rows.push(HudRow::Separator);
    
    let fuel_pct = (ac.fuel_kg / 5000.0 * 100.0).min(100.0); // Assume max 5000 for display
    rows.push(HudRow::KeyValue("FUEL".to_string(), format!("{:.1}%", fuel_pct)));
    rows.push(HudRow::KeyValue("PHASE".to_string(), format!("{:?}", ac.phase)));

    HudPanel {
        anchor: HudAnchor::TopLeft,
        offset_x: 10,
        offset_y: 200, // Below the main HUD
        width: 240,
        title: "UNIT DATA".to_string(),
        rows,
    }
}
