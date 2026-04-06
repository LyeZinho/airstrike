use sdl2::pixels::Color;
use sdl2::rect::Rect;
use sdl2::render::{BlendMode, Canvas, TextureCreator};
use sdl2::ttf::Font;
use sdl2::video::{Window, WindowContext};

pub enum HudAction {
    Dispatch(u32),
}

pub enum HudRow {
    KeyValue(String, String),
    Separator,
    Button { label: String, action: HudAction },
}

#[derive(Debug, Clone, Copy)]
pub enum HudAnchor {
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
}

pub struct HudPanel {
    pub anchor: HudAnchor,
    pub offset_x: i32,
    pub offset_y: i32,
    pub width: u32,
    pub title: String,
    pub rows: Vec<HudRow>,
}

pub fn render_hud_panel(
    canvas: &mut Canvas<Window>,
    tc: &TextureCreator<WindowContext>,
    font: &Font,
    panel: &HudPanel,
) -> Result<(), String> {
    let (win_w, win_h) = canvas.window().size();
    let line_h = 18i32;
    let padding = 6i32;
    let title_h = 20i32;
    let panel_h = (title_h + panel.rows.len() as i32 * line_h + padding * 2) as u32;

    let (x, y) = match panel.anchor {
        HudAnchor::TopLeft => (panel.offset_x, panel.offset_y),
        HudAnchor::TopRight => (win_w as i32 - panel.width as i32 - panel.offset_x, panel.offset_y),
        HudAnchor::BottomLeft => (panel.offset_x, win_h as i32 - panel_h as i32 - panel.offset_y),
        HudAnchor::BottomRight => (win_w as i32 - panel.width as i32 - panel.offset_x, win_h as i32 - panel_h as i32 - panel.offset_y),
    };

    draw_glass_panel(canvas, x, y, panel.width, panel_h)?;
    
    // Title background (darker)
    canvas.set_draw_color(Color::RGBA(0, 40, 60, 220));
    canvas.fill_rect(Rect::new(x, y + 2, panel.width, title_h as u32))?;

    render_text(
        canvas,
        tc,
        font,
        &panel.title,
        x + padding,
        y + 4,
        Color::RGB(255, 255, 255),
    )?;

    for (i, row) in panel.rows.iter().enumerate() {
        let row_y = y + title_h + padding + i as i32 * line_h;
        match row {
            HudRow::KeyValue(key, val) => {
                let text = format!("{:<10} {}", key, val);
                render_text(
                    canvas,
                    tc,
                    font,
                    &text,
                    x + padding,
                    row_y,
                    Color::RGB(0, 255, 150),
                )?;
            }
            HudRow::Separator => {
                canvas.set_draw_color(Color::RGBA(0, 100, 150, 100));
                canvas.draw_line(
                    (x + padding, row_y + line_h / 2),
                    (
                        x + panel.width as i32 - padding,
                        row_y + line_h / 2,
                    ),
                )?;
            }
            HudRow::Button { label, .. } => {
                canvas.set_draw_color(Color::RGBA(0, 80, 120, 200));
                canvas.fill_rect(Rect::new(
                    x + padding,
                    row_y,
                    panel.width.saturating_sub(padding as u32 * 2),
                    (line_h - 2) as u32,
                ))?;
                render_text(
                    canvas,
                    tc,
                    font,
                    label,
                    x + padding + 4,
                    row_y + 1,
                    Color::RGB(255, 255, 255),
                )?;
            }
        }
    }

    Ok(())
}

pub fn draw_glass_panel(
    canvas: &mut Canvas<Window>,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> Result<(), String> {
    canvas.set_blend_mode(BlendMode::Blend);
    // Gradient Background
    for i in 0..10 {
        let alpha = 180 + (i * 4);
        canvas.set_draw_color(Color::RGBA(0, 10 + i as u8, 20 + i as u8, alpha as u8));
        let step_h = height / 10;
        let _ = canvas.fill_rect(Rect::new(x, y + (i as i32 * step_h as i32), width, step_h.max(1)));
    }
    
    // Cyan accent line at top
    canvas.set_draw_color(Color::RGB(0, 200, 255));
    let _ = canvas.fill_rect(Rect::new(x, y, width, 2));
    canvas.set_blend_mode(BlendMode::None);
    Ok(())
}

pub fn render_text(
    canvas: &mut Canvas<Window>,
    tc: &TextureCreator<WindowContext>,
    font: &Font,
    text: &str,
    x: i32,
    y: i32,
    color: Color,
) -> Result<(), String> {
    if text.is_empty() {
        return Ok(());
    }
    let surf = font
        .render(text)
        .blended(color)
        .map_err(|e| e.to_string())?;
    let tex = tc
        .create_texture_from_surface(&surf)
        .map_err(|e| e.to_string())?;
    let sdl2::render::TextureQuery { width, height, .. } = tex.query();
    canvas.copy(&tex, None, Some(Rect::new(x, y, width, height)))?;
    Ok(())
}
