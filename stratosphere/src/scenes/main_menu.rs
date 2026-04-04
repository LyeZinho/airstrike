pub enum MenuAction {
    GoToModeSelect,
    GoToSettings,
    Quit,
    None,
}

pub struct MainMenu {
    pub selected: usize,
    pub hovered_index: Option<usize>,
    items: [&'static str; 3],
}

impl MainMenu {
    pub fn new() -> Self {
        MainMenu {
            selected: 0,
            hovered_index: None,
            items: ["PLAY", "SETTINGS", "QUIT"],
        }
    }

    pub fn move_down(&mut self) {
        self.selected = (self.selected + 1) % self.items.len();
    }

    pub fn move_up(&mut self) {
        self.selected = (self.selected + self.items.len() - 1) % self.items.len();
    }

    pub fn confirm(&self) -> MenuAction {
        match self.selected {
            0 => MenuAction::GoToModeSelect,
            1 => MenuAction::GoToSettings,
            2 => MenuAction::Quit,
            _ => MenuAction::None,
        }
    }

    pub fn handle_mouse_move(&mut self, mx: i32, my: i32, window_w: i32) {
        self.hovered_index = self.hit_index(mx, my, window_w);
    }

    pub fn handle_mouse_click(&mut self, mx: i32, my: i32, window_w: i32) -> Option<MenuAction> {
        if let Some(i) = self.hit_index(mx, my, window_w) {
            self.selected = i;
            Some(self.confirm())
        } else {
            None
        }
    }

    fn hit_index(&self, mx: i32, my: i32, window_w: i32) -> Option<usize> {
        for i in 0..self.items.len() {
            let item_y = 300 + i as i32 * 40;
            if (my - item_y).abs() <= 16 {
                let text_w = self.items[i].len() as i32 * 8;
                let x_start = (window_w - text_w) / 2 - 8;
                let x_end = (window_w + text_w) / 2 + 8;
                if mx >= x_start && mx <= x_end {
                    return Some(i);
                }
            }
        }
        None
    }

    pub fn items(&self) -> &[&'static str] {
        &self.items
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_main_menu_initial_selection_is_play() {
        let menu = MainMenu::new();
        assert_eq!(menu.selected, 0, "PLAY should be selected by default");
    }

    #[test]
    fn test_main_menu_down_wraps() {
        let mut menu = MainMenu::new();
        menu.move_down();
        menu.move_down();
        menu.move_down();
        assert_eq!(menu.selected, 0);
    }

    #[test]
    fn test_main_menu_up_wraps() {
        let mut menu = MainMenu::new();
        menu.move_up();
        assert_eq!(menu.selected, 2);
    }

    #[test]
    fn test_main_menu_confirm_returns_action() {
        let menu = MainMenu::new();
        let action = menu.confirm();
        assert!(matches!(action, MenuAction::GoToModeSelect));
    }

    #[test]
    fn test_mouse_move_sets_hovered_index() {
        let mut menu = MainMenu::new();
        menu.handle_mouse_move(640, 300, 1280);
        assert_eq!(menu.hovered_index, Some(0));
    }

    #[test]
    fn test_mouse_click_returns_action() {
        let mut menu = MainMenu::new();
        let action = menu.handle_mouse_click(640, 300, 1280);
        assert!(matches!(action, Some(MenuAction::GoToModeSelect)));
    }

    #[test]
    fn test_mouse_outside_items_clears_hover() {
        let mut menu = MainMenu::new();
        menu.handle_mouse_move(640, 10, 1280);
        assert_eq!(menu.hovered_index, None);
    }
}
