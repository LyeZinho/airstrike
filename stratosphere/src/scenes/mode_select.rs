pub enum ModeSelectAction {
    GoToSandboxSettings,
    Back,
    None,
}

pub struct ModeSelect {
    pub selected: usize,
    pub hovered_index: Option<usize>,
}

impl ModeSelect {
    pub fn new() -> Self {
        ModeSelect {
            selected: 0,
            hovered_index: None,
        }
    }

    pub fn move_down(&mut self) {
        self.selected = (self.selected + 1) % 3;
    }

    pub fn move_up(&mut self) {
        self.selected = (self.selected + 2) % 3;
    }

    pub fn confirm(&self) -> ModeSelectAction {
        match self.selected {
            0 => ModeSelectAction::GoToSandboxSettings,
            _ => ModeSelectAction::None,
        }
    }

    pub fn items(&self) -> [&'static str; 3] {
        ["SANDBOX", "CAREER", "MULTIPLAYER"]
    }

    pub fn handle_mouse_move(&mut self, mx: i32, my: i32, window_w: i32) {
        self.hovered_index = self.hit_index(mx, my, window_w);
    }

    pub fn handle_mouse_click(
        &mut self,
        mx: i32,
        my: i32,
        window_w: i32,
    ) -> Option<ModeSelectAction> {
        if let Some(i) = self.hit_index(mx, my, window_w) {
            self.selected = i;
            Some(self.confirm())
        } else {
            None
        }
    }

    fn hit_index(&self, mx: i32, my: i32, window_w: i32) -> Option<usize> {
        let items = self.items();
        for i in 0..items.len() {
            let item_y = 300 + i as i32 * 40;
            if (my - item_y).abs() <= 16 {
                let text_w = items[i].len() as i32 * 8;
                let x_start = (window_w - text_w) / 2 - 8;
                let x_end = (window_w + text_w) / 2 + 8;
                if mx >= x_start && mx <= x_end {
                    return Some(i);
                }
            }
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hover_first_item() {
        let mut ms = ModeSelect::new();
        ms.handle_mouse_move(640, 300, 1280);
        assert_eq!(ms.hovered_index, Some(0));
    }

    #[test]
    fn test_click_sandbox_returns_action() {
        let mut ms = ModeSelect::new();
        let action = ms.handle_mouse_click(640, 300, 1280);
        assert!(matches!(
            action,
            Some(ModeSelectAction::GoToSandboxSettings)
        ));
    }
}
