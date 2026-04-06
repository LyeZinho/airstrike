use sdl2::pixels::Color;
use sdl2::rect::Rect;
use sdl2::render::{Canvas, TextureCreator};
use sdl2::video::{Window, WindowContext};
use airstrike_engine::core::airbase::{Airbase, ComponentType};
use crate::ui::hud::{draw_glass_panel, render_text};

pub fn render_base_panel<'tc>(
    canvas: &mut Canvas<Window>,
    texture_creator: &'tc TextureCreator<WindowContext>,
    font: &sdl2::ttf::Font,
    base: &Airbase,
) -> Result<(), String> {
    let (_win_w, win_h) = canvas.window().size();
    let p_w = 300;
    let p_h = 450;
    let p_x = 20;
    let p_y = (win_h as i32 - p_h) / 2;

    draw_glass_panel(canvas, p_x, p_y, p_w as u32, p_h as u32)?;

    // Title
    render_text(canvas, texture_creator, font, &format!("BASE: {}", base.icao), p_x + 20, p_y + 20, Color::RGB(0, 255, 255))?;
    render_text(canvas, texture_creator, font, &base.name, p_x + 20, p_y + 45, Color::RGB(150, 200, 255))?;

    let mut y_offset = p_y + 90;

    // Component Status
    render_text(canvas, texture_creator, font, "INFRASTRUCTURE", p_x + 20, y_offset, Color::RGB(200, 200, 200))?;
    y_offset += 30;

    let component_names = [
        (ComponentType::Runway, "Runway"),
        (ComponentType::FuelDepot, "Fuel Storage"),
        (ComponentType::CommandCenter, "Command Center"),
        (ComponentType::Hangar, "Aircraft Shelters"),
    ];

    for (ctype, label) in component_names {
        if let Some(comp) = base.components.get(&ctype) {
            let health_pct = comp.health / comp.max_health;
            let color = if health_pct > 0.7 { Color::RGB(0, 255, 100) } 
                        else if health_pct > 0.3 { Color::RGB(255, 200, 0) } 
                        else { Color::RGB(255, 50, 50) };

            render_text(canvas, texture_creator, font, label, p_x + 30, y_offset, Color::RGB(220, 220, 220))?;
            
            // Health Bar
            canvas.set_draw_color(Color::RGBA(255, 255, 255, 30));
            canvas.fill_rect(Rect::new(p_x + 160, y_offset + 5, 100, 10))?;
            canvas.set_draw_color(color);
            canvas.fill_rect(Rect::new(p_x + 160, y_offset + 5, (health_pct * 100.0) as u32, 10))?;
            
            y_offset += 25;
        }
    }

    y_offset += 20;
    // Resources
    render_text(canvas, texture_creator, font, "RESOURCES", p_x + 20, y_offset, Color::RGB(200, 200, 200))?;
    y_offset += 30;

    let _fuel_pct = base.fuel_kg / base.max_fuel_kg;
    render_text(canvas, texture_creator, font, "Fuel", p_x + 30, y_offset, Color::RGB(220, 220, 220))?;
    render_text(canvas, texture_creator, font, &format!("{:.0} kg", base.fuel_kg), p_x + 160, y_offset, Color::RGB(150, 255, 150))?;
    y_offset += 25;

    render_text(canvas, texture_creator, font, "Slots", p_x + 30, y_offset, Color::RGB(220, 220, 220))?;
    render_text(canvas, texture_creator, font, &format!("{}/{}", base.current_aircraft_ids.len(), base.hangar_capacity), p_x + 160, y_offset, Color::RGB(255, 255, 255))?;

    // Quick Status Alert
    y_offset += 40;
    if !base.can_takeoff() {
        render_text(canvas, texture_creator, font, "CRITICAL: RUNWAY NO-GO", p_x + 20, y_offset, Color::RGB(255, 50, 50))?;
    } else {
        render_text(canvas, texture_creator, font, "READY FOR SCRAMBLE", p_x + 20, y_offset, Color::RGB(0, 255, 150))?;
    }

    Ok(())
}
