use sdl2::pixels::Color;
use sdl2::rect::Rect;
use sdl2::render::{Canvas, TextureCreator};
use sdl2::ttf::Font;
use sdl2::video::{Window, WindowContext};

pub fn render_brevity_log(
    canvas: &mut Canvas<Window>,
    tc: &TextureCreator<WindowContext>,
    font: &Font,
    log: &[String],
    window_h: u32,
) -> Result<(), String> {
    let max_lines = 8usize;
    let line_h = 18i32;
    let padding = 6i32;
    let panel_h = (max_lines as i32 * line_h + padding * 2) as u32;
    let panel_y = window_h as i32 - panel_h as i32 - 8;
    let panel_w = 500u32;

    canvas.set_draw_color(Color::RGBA(0, 0, 0, 160));
    canvas.fill_rect(Rect::new(8, panel_y, panel_w, panel_h))?;

    let recent: Vec<&String> = log
        .iter()
        .rev()
        .take(max_lines)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect();

    for (i, line) in recent.iter().enumerate() {
        let surf = font
            .render(line)
            .blended(Color::RGB(0, 200, 100))
            .map_err(|e| e.to_string())?;
        let tex = tc
            .create_texture_from_surface(&surf)
            .map_err(|e| e.to_string())?;
        let sdl2::render::TextureQuery { width, height, .. } = tex.query();
        canvas.copy(
            &tex,
            None,
            Some(Rect::new(
                8 + padding,
                panel_y + padding + i as i32 * line_h,
                width,
                height,
            )),
        )?;
    }
    Ok(())
}
