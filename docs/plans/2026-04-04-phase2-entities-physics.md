# Air Strike Engine — Phase 2: Entities & Physics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add live aircraft entities to the map — each with a position, heading, speed, altitude, and fuel — moving in real time with a rendered NATO-style tactical symbol, callsign tag, and movement trail.

**Architecture:** New `core/aircraft.rs` defines the `Aircraft` data struct. New `simulation/world.rs` owns a `Vec<Aircraft>` and the physics `update(dt)` tick. New `ui/tactical.rs` renders symbols, tags, and trails on the SDL2 canvas. `main.rs` integrates world update and tactical render into the existing game loop. No SVG library needed — symbols are drawn as SDL2 primitives (squares/diamonds).

**Tech Stack:** Rust stable, sdl2 0.37 (already installed), glam 0.24 (already in Cargo.toml)

---

## Existing File Map (DO NOT BREAK)

```
src/main.rs                    ← game loop (modify: add world update + tactical render)
src/core/mod.rs                ← add: pub mod aircraft;
src/core/geo.rs                ← COMPLETE — lat_lon_to_world, world_to_lat_lon
src/ui/mod.rs                  ← add: pub mod tactical;
src/ui/camera.rs               ← COMPLETE — Camera with world_to_screen
src/ui/grid.rs                 ← COMPLETE — draw_grid
src/ui/tile_manager.rs         ← COMPLETE — TileManager
```

---

## Task 1: Aircraft Entity (`core/aircraft.rs`)

**Files:**
- Create: `src/core/aircraft.rs`
- Modify: `src/core/mod.rs` — add `pub mod aircraft;`

### Step 1: Write unit tests first (TDD)

Create `src/core/aircraft.rs`:

```rust
/// Aircraft entity: position, performance, radar signature.

/// Side / IFF identification of an aircraft.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Side {
    Friendly,
    Hostile,
    Unknown,
}

/// A single aircraft in the simulation.
#[derive(Debug, Clone)]
pub struct Aircraft {
    pub id: u32,
    pub callsign: String,
    pub model: String,
    pub side: Side,

    // Geographic position
    pub lat: f64,
    pub lon: f64,
    pub altitude_ft: f32,

    // Movement
    pub heading_deg: f32,  // 0-359, clockwise from North
    pub speed_knots: f32,

    // Fuel
    pub fuel_kg: f32,
    pub fuel_burn_kg_per_s: f32,  // fuel consumed per second at current throttle

    // Radar cross-section (base frontal, m²)
    pub rcs_base: f32,
}

impl Aircraft {
    /// Create a new aircraft with sane defaults.
    pub fn new(id: u32, callsign: impl Into<String>, model: impl Into<String>, side: Side) -> Self {
        Aircraft {
            id,
            callsign: callsign.into(),
            model: model.into(),
            side,
            lat: 0.0,
            lon: 0.0,
            altitude_ft: 20_000.0,
            heading_deg: 0.0,
            speed_knots: 400.0,
            fuel_kg: 3_000.0,
            fuel_burn_kg_per_s: 1.5,
            rcs_base: 1.0,
        }
    }

    /// Advance position by `dt` seconds using dead-reckoning.
    /// Uses equirectangular approximation (accurate enough at tactical scales < 500km).
    pub fn update(&mut self, dt: f32) {
        if self.fuel_kg <= 0.0 {
            return; // No fuel — no movement
        }

        // Speed: knots → metres per second (1 knot = 0.5144 m/s)
        let speed_m_per_s = self.speed_knots * 0.5144;
        let dist_m = speed_m_per_s * dt as f64 as f32;

        // Heading to radians (clockwise from North → standard math angle)
        let heading_rad = self.heading_deg.to_radians();

        // Delta lat/lon from distance + heading
        // 1 degree latitude ≈ 111_320 metres
        let delta_lat = (dist_m * heading_rad.cos()) / 111_320.0;
        // 1 degree longitude ≈ 111_320 * cos(lat) metres
        let delta_lon = (dist_m * heading_rad.sin())
            / (111_320.0 * (self.lat as f32).to_radians().cos());

        self.lat += delta_lat as f64;
        self.lon += delta_lon as f64;

        // Fuel burn
        let burn = self.fuel_burn_kg_per_s * dt;
        self.fuel_kg = (self.fuel_kg - burn).max(0.0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_heading_north_moves_lat_up() {
        let mut ac = Aircraft::new(1, "EAGLE1", "F-16", Side::Friendly);
        ac.lat = 38.716;
        ac.lon = -9.142;
        ac.heading_deg = 0.0; // North
        ac.speed_knots = 600.0;
        let lat_before = ac.lat;
        ac.update(60.0); // 1 minute
        assert!(ac.lat > lat_before, "heading N should increase lat, got {}", ac.lat);
    }

    #[test]
    fn test_heading_east_moves_lon_right() {
        let mut ac = Aircraft::new(2, "VIPER1", "F-16", Side::Hostile);
        ac.lat = 38.716;
        ac.lon = -9.142;
        ac.heading_deg = 90.0; // East
        ac.speed_knots = 600.0;
        let lon_before = ac.lon;
        ac.update(60.0);
        assert!(ac.lon > lon_before, "heading E should increase lon, got {}", ac.lon);
    }

    #[test]
    fn test_no_movement_without_fuel() {
        let mut ac = Aircraft::new(3, "GHOST1", "Su-27", Side::Hostile);
        ac.lat = 38.716;
        ac.lon = -9.142;
        ac.fuel_kg = 0.0;
        ac.update(60.0);
        assert!((ac.lat - 38.716).abs() < 1e-9, "no fuel → no movement");
    }

    #[test]
    fn test_fuel_decreases_over_time() {
        let mut ac = Aircraft::new(4, "TANK1", "F-16", Side::Friendly);
        ac.fuel_kg = 3000.0;
        ac.fuel_burn_kg_per_s = 2.0;
        ac.update(10.0);
        assert!((ac.fuel_kg - 2980.0).abs() < 0.01, "fuel_kg={}", ac.fuel_kg);
    }

    #[test]
    fn test_fuel_does_not_go_negative() {
        let mut ac = Aircraft::new(5, "LAST1", "F-16", Side::Friendly);
        ac.fuel_kg = 5.0;
        ac.fuel_burn_kg_per_s = 10.0;
        ac.update(10.0);
        assert_eq!(ac.fuel_kg, 0.0);
    }

    #[test]
    fn test_speed_at_600_knots_1min_moves_about_18km() {
        // 600 knots * 0.5144 m/s per knot * 60s ≈ 18518 m ≈ 18.5 km
        let mut ac = Aircraft::new(6, "FAST1", "F-16", Side::Friendly);
        ac.lat = 0.0;
        ac.lon = 0.0;
        ac.heading_deg = 0.0; // North
        ac.speed_knots = 600.0;
        ac.update(60.0);
        // 18518m / 111320m_per_deg ≈ 0.1664 degrees
        assert!((ac.lat - 0.1664).abs() < 0.002, "lat={}", ac.lat);
    }
}
```

### Step 2: Add to `src/core/mod.rs`

Add line:
```rust
pub mod aircraft;
```

### Step 3: Run tests

```bash
cargo test core::aircraft
```

Expected: 6 tests pass.

### Step 4: Commit

```bash
git add src/core/aircraft.rs src/core/mod.rs
git commit -m "feat: add Aircraft entity with dead-reckoning physics"
```

---

## Task 2: World State (`simulation/world.rs`)

**Files:**
- Create: `src/simulation/mod.rs`
- Create: `src/simulation/world.rs`
- Modify: `src/main.rs` — add `mod simulation;`

### Step 1: Create `src/simulation/mod.rs`

```rust
pub mod world;
```

### Step 2: Create `src/simulation/world.rs`

```rust
/// World: owns all aircraft entities and drives physics updates.

use crate::core::aircraft::{Aircraft, Side};

pub struct World {
    pub aircraft: Vec<Aircraft>,
    next_id: u32,
}

impl World {
    pub fn new() -> Self {
        World {
            aircraft: Vec::new(),
            next_id: 1,
        }
    }

    /// Spawn a demo scenario: 2 friendly + 2 hostile aircraft near Lisbon.
    pub fn spawn_demo(&mut self) {
        // Friendly CAP patrol north of Lisbon
        let mut f1 = Aircraft::new(self.next_id, "EAGLE1", "F-16C", Side::Friendly);
        self.next_id += 1;
        f1.lat = 39.5; f1.lon = -9.5;
        f1.heading_deg = 120.0; f1.speed_knots = 450.0;
        f1.altitude_ft = 25_000.0; f1.rcs_base = 1.2;
        self.aircraft.push(f1);

        let mut f2 = Aircraft::new(self.next_id, "EAGLE2", "F-16C", Side::Friendly);
        self.next_id += 1;
        f2.lat = 39.3; f2.lon = -8.8;
        f2.heading_deg = 300.0; f2.speed_knots = 450.0;
        f2.altitude_ft = 24_000.0; f2.rcs_base = 1.2;
        self.aircraft.push(f2);

        // Hostile ingress from east
        let mut h1 = Aircraft::new(self.next_id, "BOGEY1", "Su-27", Side::Hostile);
        self.next_id += 1;
        h1.lat = 38.9; h1.lon = -7.5;
        h1.heading_deg = 270.0; h1.speed_knots = 520.0;
        h1.altitude_ft = 500.0; h1.rcs_base = 4.0;   // low altitude, high RCS
        self.aircraft.push(h1);

        let mut h2 = Aircraft::new(self.next_id, "BOGEY2", "Su-27", Side::Hostile);
        self.next_id += 1;
        h2.lat = 39.1; h2.lon = -7.2;
        h2.heading_deg = 250.0; h2.speed_knots = 500.0;
        h2.altitude_ft = 18_000.0; h2.rcs_base = 3.5;
        self.aircraft.push(h2);
    }

    /// Update all entities by `dt` seconds.
    pub fn update(&mut self, dt: f32) {
        for ac in &mut self.aircraft {
            ac.update(dt);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_spawn_demo_creates_four_aircraft() {
        let mut world = World::new();
        world.spawn_demo();
        assert_eq!(world.aircraft.len(), 4);
    }

    #[test]
    fn test_update_moves_aircraft() {
        let mut world = World::new();
        world.spawn_demo();
        let lat_before = world.aircraft[0].lat;
        world.update(60.0);
        assert_ne!(world.aircraft[0].lat, lat_before, "aircraft should have moved");
    }

    #[test]
    fn test_ids_are_unique() {
        let mut world = World::new();
        world.spawn_demo();
        let ids: Vec<u32> = world.aircraft.iter().map(|a| a.id).collect();
        let unique: std::collections::HashSet<u32> = ids.iter().cloned().collect();
        assert_eq!(ids.len(), unique.len(), "all aircraft IDs must be unique");
    }
}
```

### Step 3: Add `mod simulation;` to `src/main.rs`

Find the top of `src/main.rs` (which starts with `mod core; mod ui;`) and add:

```rust
mod simulation;
```

### Step 4: Run tests

```bash
cargo test simulation::world
```

Expected: 3 tests pass.

### Step 5: Commit

```bash
git add src/simulation/ src/main.rs
git commit -m "feat: add World state with demo aircraft spawn"
```

---

## Task 3: Tactical Renderer (`ui/tactical.rs`)

**Files:**
- Create: `src/ui/tactical.rs`
- Modify: `src/ui/mod.rs` — add `pub mod tactical;`

This module renders each aircraft on the map as:
1. **Symbol**: A 10×10 pixel square (friendly = blue, hostile = red, unknown = grey)
2. **Tag**: Callsign + altitude above the symbol, rendered with SDL2_ttf
3. **Trail**: Last N positions drawn as fading dots

### Step 1: Create `src/ui/tactical.rs`

```rust
/// Tactical overlay: renders aircraft symbols, tags, and movement trails.

use sdl2::pixels::Color;
use sdl2::rect::Rect;
use sdl2::render::{Canvas, TextureCreator};
use sdl2::video::{Window, WindowContext};

use crate::core::aircraft::{Aircraft, Side};
use crate::core::geo;
use crate::ui::camera::Camera;

/// Maximum trail points stored per aircraft.
pub const MAX_TRAIL: usize = 60;

/// A recorded position snapshot for trail rendering.
#[derive(Debug, Clone, Copy)]
pub struct TrailPoint {
    pub lat: f64,
    pub lon: f64,
}

/// Per-aircraft rendering state (trail history).
pub struct AircraftRenderState {
    pub id: u32,
    pub trail: Vec<TrailPoint>,
    /// Seconds since last trail point was recorded.
    pub trail_timer: f32,
}

impl AircraftRenderState {
    pub fn new(id: u32) -> Self {
        AircraftRenderState { id, trail: Vec::new(), trail_timer: 0.0 }
    }

    /// Sample current position into trail every `interval` seconds.
    pub fn tick(&mut self, ac: &Aircraft, dt: f32, interval: f32) {
        self.trail_timer += dt;
        if self.trail_timer >= interval {
            self.trail_timer = 0.0;
            self.trail.push(TrailPoint { lat: ac.lat, lon: ac.lon });
            if self.trail.len() > MAX_TRAIL {
                self.trail.remove(0);
            }
        }
    }
}

/// Returns SDL2 draw color for a side.
fn side_color(side: Side) -> Color {
    match side {
        Side::Friendly => Color::RGB(80, 140, 255),   // Blue
        Side::Hostile  => Color::RGB(255, 70, 70),    // Red
        Side::Unknown  => Color::RGB(180, 180, 180),  // Grey
    }
}

/// Draw a filled 10×10 square symbol centered at (sx, sy).
fn draw_symbol(canvas: &mut Canvas<Window>, sx: i32, sy: i32, color: Color) {
    canvas.set_draw_color(color);
    let _ = canvas.fill_rect(Rect::new(sx - 5, sy - 5, 10, 10));
    // Thin white border
    canvas.set_draw_color(Color::RGB(220, 220, 220));
    let _ = canvas.draw_rect(Rect::new(sx - 5, sy - 5, 10, 10));
}

/// Draw trail dots for a single aircraft.
fn draw_trail(canvas: &mut Canvas<Window>, trail: &[TrailPoint], camera: &Camera, color: Color) {
    for (i, pt) in trail.iter().enumerate() {
        let (wx, wy) = geo::lat_lon_to_world(pt.lat, pt.lon, camera.zoom);
        let (sx, sy) = camera.world_to_screen(wx, wy);
        let sx = sx as i32;
        let sy = sy as i32;
        // Fade: older points more transparent
        let alpha = ((i as f32 / trail.len() as f32) * 180.0) as u8;
        canvas.set_draw_color(Color::RGBA(color.r, color.g, color.b, alpha));
        let _ = canvas.fill_rect(Rect::new(sx - 2, sy - 2, 4, 4));
    }
}

/// Draw the callsign + altitude tag above the symbol.
fn draw_tag<'tc>(
    canvas: &mut Canvas<Window>,
    texture_creator: &'tc TextureCreator<WindowContext>,
    font: &sdl2::ttf::Font,
    ac: &Aircraft,
    sx: i32,
    sy: i32,
    color: Color,
) {
    let text = format!("{} {:05.0}ft", ac.callsign, ac.altitude_ft);
    if let Ok(surface) = font.render(&text).blended(color) {
        if let Ok(texture) = texture_creator.create_texture_from_surface(&surface) {
            let sdl2::render::TextureQuery { width, height, .. } = texture.query();
            let dst = sdl2::rect::Rect::new(sx + 8, sy - 16, width, height);
            let _ = canvas.copy(&texture, None, Some(dst));
        }
    }
}

/// Draw all aircraft: trails, symbols, and tags.
pub fn draw_aircraft<'tc>(
    canvas: &mut Canvas<Window>,
    texture_creator: &'tc TextureCreator<WindowContext>,
    font: &sdl2::ttf::Font,
    aircraft: &[Aircraft],
    render_states: &[AircraftRenderState],
    camera: &Camera,
) {
    let (win_w, win_h) = canvas.window().size();

    for ac in aircraft {
        // World → screen
        let (wx, wy) = geo::lat_lon_to_world(ac.lat, ac.lon, camera.zoom);
        let (sx, sy) = camera.world_to_screen(wx, wy);
        let sx = sx as i32;
        let sy = sy as i32;

        // Off-screen culling (with margin for tags)
        if sx < -50 || sy < -50 || sx > win_w as i32 + 50 || sy > win_h as i32 + 50 {
            continue;
        }

        let color = side_color(ac.side);

        // Trail
        if let Some(state) = render_states.iter().find(|s| s.id == ac.id) {
            draw_trail(canvas, &state.trail, camera, color);
        }

        // Symbol
        draw_symbol(canvas, sx, sy, color);

        // Tag
        draw_tag(canvas, texture_creator, font, ac, sx, sy, color);
    }
}

// ---------------------------------------------------------------------------
// Unit tests (pure math — no SDL2 needed)
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_trail_grows_on_tick() {
        let ac = Aircraft {
            id: 1, callsign: "T1".to_string(), model: "F-16".to_string(),
            side: Side::Friendly,
            lat: 38.0, lon: -9.0, altitude_ft: 20_000.0,
            heading_deg: 90.0, speed_knots: 400.0,
            fuel_kg: 3000.0, fuel_burn_kg_per_s: 1.5, rcs_base: 1.0,
        };
        let mut state = AircraftRenderState::new(1);
        // Each tick advances timer by 1.0s; interval is 2.0s
        state.tick(&ac, 1.0, 2.0);
        assert_eq!(state.trail.len(), 0, "not enough time elapsed");
        state.tick(&ac, 1.0, 2.0);
        assert_eq!(state.trail.len(), 1, "should have 1 trail point after 2s");
    }

    #[test]
    fn test_trail_capped_at_max() {
        let ac = Aircraft {
            id: 2, callsign: "T2".to_string(), model: "Su-27".to_string(),
            side: Side::Hostile,
            lat: 38.0, lon: -9.0, altitude_ft: 5_000.0,
            heading_deg: 0.0, speed_knots: 500.0,
            fuel_kg: 3000.0, fuel_burn_kg_per_s: 1.5, rcs_base: 3.0,
        };
        let mut state = AircraftRenderState::new(2);
        for _ in 0..(MAX_TRAIL + 10) {
            state.tick(&ac, 2.0, 1.0); // tick 2s, sample every 1s → records each tick
        }
        assert!(state.trail.len() <= MAX_TRAIL, "trail len={}", state.trail.len());
    }

    #[test]
    fn test_side_color_friendly_is_blue() {
        let c = side_color(Side::Friendly);
        assert!(c.b > c.r, "friendly should be blue-ish");
    }

    #[test]
    fn test_side_color_hostile_is_red() {
        let c = side_color(Side::Hostile);
        assert!(c.r > c.b, "hostile should be red-ish");
    }
}
```

### Step 2: Add to `src/ui/mod.rs`

Current content:
```rust
pub mod camera;
pub mod grid;
pub mod tile_manager;
```

Change to:
```rust
pub mod camera;
pub mod grid;
pub mod tactical;
pub mod tile_manager;
```

### Step 3: Run tests

```bash
cargo test ui::tactical
```

Expected: 4 tests pass. Total: `cargo test` → 17 passing (14 old + 3 new from Task 2 world tests... wait, we're up to 14 + 6 (aircraft) + 3 (world) + 4 (tactical) = 27 tests).

Actually run `cargo test` to confirm all tests pass.

### Step 4: Commit

```bash
git add src/ui/tactical.rs src/ui/mod.rs
git commit -m "feat: add tactical renderer with symbols, tags, and trails"
```

---

## Task 4: Wire Into Main Loop

**Files:**
- Modify: `src/main.rs` — add World, delta time, render states, tactical render call

### Step 1: Read current `src/main.rs` to understand exact structure

The current `src/main.rs` has:
- `mod core; mod ui;` at top
- `use ui::camera::Camera;`, `use ui::grid::draw_grid;`, `use ui::tile_manager::{TileManager, visible_tiles};`
- Constants: `WINDOW_W`, `WINDOW_H`, `TARGET_FPS`, `FRAME_DURATION`, `DEFAULT_LAT`, `DEFAULT_LON`, `DEFAULT_ZOOM`
- `HudCache<'tc>` struct
- `fn main()` with game loop
- `fn render_hud(...)` at bottom

### Step 2: Apply the following changes to `src/main.rs`

**Change 1: Add module + use imports at top**

Find:
```rust
mod core;
mod ui;
```

Change to:
```rust
mod core;
mod simulation;
mod ui;
```

Find the `use` block:
```rust
use ui::camera::Camera;
use ui::grid::draw_grid;
use ui::tile_manager::{TileManager, visible_tiles};
```

Change to:
```rust
use ui::camera::Camera;
use ui::grid::draw_grid;
use ui::tactical::{draw_aircraft, AircraftRenderState};
use ui::tile_manager::{TileManager, visible_tiles};
use simulation::world::World;
```

**Change 2: Add `TRAIL_INTERVAL` constant**

After the existing constants block, add:
```rust
const TRAIL_INTERVAL_S: f32 = 2.0; // Record trail point every 2 seconds
```

**Change 3: Initialize World and render states before the game loop**

Find (after `let mut tile_manager = TileManager::new();`):
```rust
    let mut event_pump = sdl_context.event_pump()?;
```

Insert before it:
```rust
    // World state
    let mut world = World::new();
    world.spawn_demo();

    // Per-aircraft render state (trails)
    let mut render_states: Vec<AircraftRenderState> = world.aircraft
        .iter()
        .map(|ac| AircraftRenderState::new(ac.id))
        .collect();

```

**Change 4: Add delta time tracking**

Find (inside the loop, before the events section):
```rust
        let frame_start = Instant::now();
```

Add after the line:
```rust
        let frame_start = Instant::now();
        // Delta time is capped at 100ms to prevent physics explosion on freeze/resume
        let dt = FRAME_DURATION.as_secs_f32().min(0.1);
```

**Change 5: Add world update in the UPDATE section**

Find (in the `// ── 2. UPDATE` section):
```rust
        let tiles = visible_tiles(&camera);
        tile_manager.request_tiles(&tiles);
        tile_manager.drain_channel(texture_creator);
```

After those 3 lines, add:
```rust
        // Advance physics
        world.update(dt);

        // Update trail render state
        for state in &mut render_states {
            if let Some(ac) = world.aircraft.iter().find(|a| a.id == state.id) {
                state.tick(ac, dt, TRAIL_INTERVAL_S);
            }
        }
```

**Change 6: Add tactical render in the RENDER section**

Find (in the `// ── 3. RENDER` section):
```rust
        // b) Coordinate grid
        draw_grid(&mut canvas, &camera);
```

After that line, add:
```rust
        // c) Aircraft tactical overlay
        draw_aircraft(&mut canvas, texture_creator, &font, &world.aircraft, &render_states, &camera);
```

And adjust the comment on the HUD call:
```rust
        // d) Debug HUD
```

### Step 3: Verify build

```bash
cargo build
```

Fix any compilation errors. Common issues:
- `simulation` module not found — check `mod simulation;` is in main.rs
- `AircraftRenderState` import — check `use ui::tactical::{draw_aircraft, AircraftRenderState};`
- Borrow issues — `world.aircraft` passed as slice `&world.aircraft`

### Step 4: Run all tests

```bash
cargo test
```

Expected: all tests pass (should now be 14 + 6 + 3 + 4 = 27 tests total).

### Step 5: Commit

```bash
git add src/main.rs
git commit -m "feat: wire World and tactical render into game loop"
```

---

## Task 5: Final Integration Check

### Step 1: Run all tests

```bash
cargo test
```

Expected output: 27 tests, 0 failed.

Breakdown:
- `core::aircraft::tests` — 6 tests
- `simulation::world::tests` — 3 tests
- `ui::camera::tests` — 4 tests
- `ui::tactical::tests` — 4 tests
- `ui::tile_manager::tests` — 4 tests
- `core::geo::tests` — 6 tests

### Step 2: Release build

```bash
cargo build --release
```

Expected: succeeds.

### Step 3: Check for dead code warnings

Only one pre-existing dead code warning is allowed: `lat_lon_to_tile` in `core/geo.rs`. New code should produce no new warnings.

If there are new warnings about unused imports or dead code in the new modules, fix them.

### Step 4: Final commit if needed

```bash
git add -A
git commit -m "chore: Phase 2 complete — entities, physics, tactical render"
```

---

## Phase 2 Done — What's Next

Phase 3 will add:
- Ground radar system with the radar range equation (RCS-based detection probability)
- Radar sweep animation (rotating beam)
- Notching logic (Doppler blind spot)
- Aircraft visible only when inside radar range
