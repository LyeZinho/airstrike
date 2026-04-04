use airstrike_engine::core::airport::AirportDb;

pub enum SandboxAction {
    StartGame {
        country_iso: String,
        starting_credits: u32,
    },
    Back,
    None,
}

pub struct SandboxSettings {
    pub country_list: Vec<(String, String)>,
    pub selected_country: usize,
    pub starting_credits: u32,
    pub hovered_index: Option<usize>,
}

impl SandboxSettings {
    pub fn new(db: &AirportDb) -> Self {
        let mut country_list = db.countries();
        country_list.sort_by(|a, b| a.1.cmp(&b.1));
        SandboxSettings {
            country_list,
            selected_country: 0,
            starting_credits: 100_000,
            hovered_index: None,
        }
    }

    pub fn move_down(&mut self) {
        if !self.country_list.is_empty() {
            self.selected_country = (self.selected_country + 1) % self.country_list.len();
        }
    }

    pub fn move_up(&mut self) {
        if !self.country_list.is_empty() {
            self.selected_country =
                (self.selected_country + self.country_list.len() - 1) % self.country_list.len();
        }
    }

    pub fn confirm(&self) -> SandboxAction {
        if let Some((iso, _)) = self.country_list.get(self.selected_country) {
            SandboxAction::StartGame {
                country_iso: iso.clone(),
                starting_credits: self.starting_credits,
            }
        } else {
            SandboxAction::None
        }
    }

    pub fn selected_country_iso(&self) -> Option<&str> {
        self.country_list
            .get(self.selected_country)
            .map(|(iso, _)| iso.as_str())
    }

    pub fn handle_mouse_move(&mut self, mx: i32, my: i32, window_w: i32) {
        self.hovered_index = self.hit_index(mx, my, window_w);
    }

    pub fn handle_mouse_click(&mut self, mx: i32, my: i32, window_w: i32) {
        if let Some(list_i) = self.hit_index(mx, my, window_w) {
            let visible = 12usize;
            let start = self.selected_country.saturating_sub(visible / 2);
            let actual_i = start + list_i;
            if actual_i < self.country_list.len() {
                self.selected_country = actual_i;
            }
        }
    }

    fn hit_index(&self, mx: i32, my: i32, window_w: i32) -> Option<usize> {
        let visible = 12usize;
        let start = self.selected_country.saturating_sub(visible / 2);
        let end = (start + visible).min(self.country_list.len());
        for list_i in 0..(end - start) {
            let item_y = 160 + list_i as i32 * 22;
            if (my - item_y).abs() <= 10 {
                let iso = &self.country_list[start + list_i].0;
                let text_w = iso.len() as i32 * 8;
                let x_start = (window_w - text_w) / 2 - 8;
                let x_end = (window_w + text_w) / 2 + 8;
                if mx >= x_start && mx <= x_end {
                    return Some(list_i);
                }
            }
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_settings() -> SandboxSettings {
        SandboxSettings {
            country_list: vec![
                ("PT".into(), "Portugal".into()),
                ("ES".into(), "Spain".into()),
                ("FR".into(), "France".into()),
            ],
            selected_country: 0,
            starting_credits: 100_000,
            hovered_index: None,
        }
    }

    #[test]
    fn test_hover_sets_index() {
        let mut ss = make_settings();
        ss.handle_mouse_move(640, 160, 1280);
        assert_eq!(ss.hovered_index, Some(0));
    }

    #[test]
    fn test_click_selects_country() {
        let mut ss = make_settings();
        ss.handle_mouse_click(640, 182, 1280);
        // visible start = 0, list_i=1 → actual_i=1
        assert_eq!(ss.selected_country, 1);
    }
}
