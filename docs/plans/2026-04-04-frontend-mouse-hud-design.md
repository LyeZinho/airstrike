# Frontend Mouse & HUD Design

**Date:** 2026-04-04  
**Status:** Approved  
**Scope:** Full mouse integration + standardised HUD panel system for Stratosphere

---

## Problem

The game launches and renders correctly but has no mouse interaction beyond pan/zoom on the map. Menus require keyboard-only navigation. Clicking on aircraft or airports does nothing. There is no standardised system for rendering UI panels — the brevity log is a one-off implementation.

---

## Approach: HUD System (Approach B)

Introduce a generic `HudPanel` abstraction in `ui/hud.rs` that all in-game panels (aircraft info, airport info/dispatch, brevity log) use. Add mouse hit-testing to all three menu scenes. Add click-to-select on the map for aircraft and airports.

This approach was chosen over direct integration (Approach A) because it aligns with the project's stated goal of keeping the engine malleable as the game grows.

---

## Design

### 1. HUD System — `stratosphere/src/ui/hud.rs`

A `HudPanel` struct with a list of `HudRow` variants:

```rust
pub struct HudPanel {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub title: String,
    pub rows: Vec<HudRow>,
}

pub enum HudRow {
    KeyValue(String, String),
    Separator,
    Button { label: String, action: HudAction },
    ListItem { text: String, id: String },
}

pub enum HudAction {
    Dispatch(String),  // aircraft id
    Close,
}
```

A single `render_hud_panel(canvas, font, tc, &HudPanel)` function handles all drawing:
- Semi-transparent dark background
- Title bar
- Each row rendered with consistent padding and typography

The existing brevity log migrates to use this system.

---

### 2. Selection State

A `Selection` enum stored on the `App` struct and threaded through the render and event pipeline:

```rust
pub enum Selection {
    None,
    Aircraft(String),   // callsign / id
    Airport(String),    // ICAO code
}
```

Rules:
- Left-click on aircraft → `Selection::Aircraft(id)`
- Left-click on airport → `Selection::Airport(icao)`
- Left-click on empty map → `Selection::None`
- Escape key → `Selection::None`

---

### 3. Menu Mouse Interaction

Each menu struct (`MainMenu`, `ModeSelect`, `SandboxSettings`) gains:

| Addition | Purpose |
|---|---|
| `hovered_index: Option<usize>` field | tracks which item the cursor is over |
| `handle_mouse_move(x: i32, y: i32)` | updates `hovered_index` using the same y-offsets as rendering |
| `handle_mouse_click(x: i32, y: i32) -> Option<Action>` | returns the same action that Enter already returns |

Hit-testing formula mirrors the render formula:
- Main menu / mode select: `y_item = 300 + i * 40`, hit if `|mouse_y - y_item| < 18` and centered x-range
- Sandbox country list: `y_item = 160 + i * 22`

Hover visual: highlighted with the same colour as the keyboard-selected item. The keyboard `selected_index` and `hovered_index` are independent — both draw with the highlight style.

---

### 4. Map Click → Selection

In the `InGame` event loop, on `MouseButtonDown` (left button, no active drag):

1. Convert screen coords → world coords using the camera transform
2. Iterate visible aircraft — hitbox radius 12px in screen space → if hit, `Selection::Aircraft(id)`
3. Iterate visible airports — hitbox = `dot_size(airport) + 6` px → if hit, `Selection::Airport(icao)`
4. If no hit → `Selection::None`

Priority: aircraft over airports (aircraft are interactive entities; airports are background).

---

### 5. Panel Layout

Both panels render at top-right: `x = WINDOW_W - 220`, `y = 10`, `width = 210`.

**Aircraft Info Panel**

```
╔══ TAP123 ══════════════╗
║ Model     A320neo      ║
║ Phase     Cruise       ║
║ Altitude  FL240        ║
║ Speed     452 kts      ║
║ Heading   090°         ║
╚════════════════════════╝
```

**Airport Info + Dispatch Panel**

```
╔══ LPPT — Lisboa ═══════╗
║ Type      Large        ║
║ Elevation 374 ft       ║
╠════════════════════════╣
║ DISPATCH               ║
║ > CS300   [Dispatch]   ║
║ > A320neo [Dispatch]   ║
╚════════════════════════╝
```

The dispatch list shows only aircraft in `ColdDark` phase located at that airport. Each row's Dispatch button calls `world.dispatch_aircraft(id)` — the same function the `D` key already uses.

---

## File Changes Summary

| File | Change |
|---|---|
| `stratosphere/src/ui/hud.rs` | **New** — HudPanel, HudRow, HudAction, render_hud_panel |
| `stratosphere/src/ui/mod.rs` | Export hud module |
| `stratosphere/src/main.rs` | Add Selection enum, selection field on App, map click handler, panel render calls |
| `stratosphere/src/scenes/main_menu.rs` | Add hovered_index, handle_mouse_move, handle_mouse_click |
| `stratosphere/src/scenes/mode_select.rs` | Add hovered_index, handle_mouse_move, handle_mouse_click |
| `stratosphere/src/scenes/sandbox_settings.rs` | Add hovered_index, handle_mouse_move, handle_mouse_click |
| `stratosphere/src/ui/hud_panels.rs` | Migrate brevity log to HudPanel |

---

## Constraints

- No `cargo run` in the environment — validate with `cargo check` only
- No async / Tokio — stay on `std::thread`
- No new external dependencies
- No type error suppression (`as any`, `@ts-ignore` equivalents in Rust: no `#[allow(unused)]` hacks)
- Engine must remain malleable — no hardcoded panel counts or magic indices
