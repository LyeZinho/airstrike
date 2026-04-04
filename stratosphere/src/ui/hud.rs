use sdl2::pixels::Color;
use sdl2::rect::Rect;
use sdl2::render::{Canvas, TextureCreator};
use sdl2::ttf::Font;
use sdl2::video::{Window, WindowContext};

pub enum HudAction {
    Dispatch(u32),
    Close,
}

pub enum HudRow {
    KeyValue(String, String),
    Separator,
    Button { label: String, action: HudAction },
    ListItem { text: String, id: u32 },
}

pub struct HudPanel {
    pub x: i32,
    pub y: i32,
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
    let line_h = 18i32;
    let padding = 6i32;
    let title_h = 20i32;
    let panel_h = (title_h + panel.rows.len() as i32 * line_h + padding * 2) as u32;

    canvas.set_draw_color(Color::RGBA(0, 0, 0, 200));
    canvas.fill_rect(Rect::new(panel.x, panel.y, panel.width, panel_h))?;

    canvas.set_draw_color(Color::RGB(0, 120, 180));
    canvas.fill_rect(Rect::new(panel.x, panel.y, panel.width, title_h as u32))?;

    render_text(
        canvas,
        tc,
        font,
        &panel.title,
        Color::RGB(255, 255, 255),
        panel.x + padding,
        panel.y + 3,
    )?;

    for (i, row) in panel.rows.iter().enumerate() {
        let row_y = panel.y + title_h + padding + i as i32 * line_h;
        match row {
            HudRow::KeyValue(key, val) => {
                let text = format!("{:<10} {}", key, val);
                render_text(
                    canvas,
                    tc,
                    font,
                    &text,
                    Color::RGB(0, 220, 120),
                    panel.x + padding,
                    row_y,
                )?;
            }
            HudRow::Separator => {
                canvas.set_draw_color(Color::RGBA(80, 80, 80, 255));
                canvas.draw_line(
                    (panel.x + padding, row_y + line_h / 2),
                    (
                        panel.x + panel.width.min(i32::MAX as u32) as i32 - padding,
                        row_y + line_h / 2,
                    ),
                )?;
            }
            HudRow::Button { label, .. } => {
                canvas.set_draw_color(Color::RGBA(0, 80, 120, 220));
                canvas.fill_rect(Rect::new(
                    panel.x + padding,
                    row_y,
                    panel.width.saturating_sub(padding as u32 * 2),
                    (line_h - 2) as u32,
                ))?;
                render_text(
                    canvas,
                    tc,
                    font,
                    label,
                    Color::RGB(0, 255, 180),
                    panel.x + padding + 4,
                    row_y + 1,
                )?;
            }
            HudRow::ListItem { text, .. } => {
                render_text(
                    canvas,
                    tc,
                    font,
                    &format!("> {}", text),
                    Color::RGB(0, 180, 255),
                    panel.x + padding,
                    row_y,
                )?;
            }
        }
    }

    Ok(())
}

fn render_text(
    canvas: &mut Canvas<Window>,
    tc: &TextureCreator<WindowContext>,
    font: &Font,
    text: &str,
    color: Color,
    x: i32,
    y: i32,
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
