# Workspace Split: airstrike-engine + stratosphere

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the single-crate project into a Cargo workspace with two crates: `airstrike-engine` (reusable lib) and `stratosphere` (the game binary).

**Architecture:** Cargo workspace at repo root. Engine exposes all current `core/` and `ui/` modules as a public library. Game crate depends on engine and owns `simulation/` + `main.rs`. Zero gameplay logic in the engine.

**Tech Stack:** Rust stable, Cargo workspaces, same deps as today (no new crates needed)

---

## Current File Map

```
airstrike/
├── Cargo.toml                   ← single-crate package (will become workspace root)
├── src/
│   ├── main.rs                  ← game loop
│   ├── core/
│   │   ├── mod.rs
│   │   ├── geo.rs
│   │   ├── aircraft.rs
│   │   └── radar.rs
│   ├── simulation/
│   │   ├── mod.rs
│   │   └── world.rs
│   └── ui/
│       ├── camera.rs
│       ├── grid.rs
│       ├── tactical.rs
│       └── tile_manager.rs
└── assets/
    └── fonts/JetBrainsMonoNL-Regular.ttf
```

## Target File Map

```
airstrike/
├── Cargo.toml                   ← [workspace] only
├── airstrike-engine/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs               ← pub mod core; pub mod ui;
│       ├── core/
│       │   ├── mod.rs
│       │   ├── geo.rs
│       │   ├── aircraft.rs
│       │   └── radar.rs
│       └── ui/
│           ├── mod.rs
│           ├── camera.rs
│           ├── grid.rs
│           ├── tactical.rs
│           └── tile_manager.rs
└── stratosphere/
    ├── Cargo.toml               ← depends on airstrike-engine
    ├── assets/                  ← symlink or copy from root
    │   └── fonts/JetBrainsMonoNL-Regular.ttf
    └── src/
        ├── main.rs
        └── simulation/
            ├── mod.rs
            └── world.rs
```

---

## Task 1: Create workspace root `Cargo.toml`

**Files:**
- Modify: `Cargo.toml` (replace entire content)

### Step 1: Replace root Cargo.toml

```toml
[workspace]
resolver = "2"
members = [
    "airstrike-engine",
    "stratosphere",
]

[workspace.dependencies]
sdl2        = { version = "0.37", features = ["image", "ttf"] }
glam        = "0.24"
ureq        = "2"
image       = { version = "0.25", default-features = false, features = ["png"] }
serde       = { version = "1", features = ["derive"] }
serde_json  = "1"
dirs        = "5"
```

### Step 2: Verify workspace file is valid

```bash
cargo metadata --format-version 1 --no-deps 2>&1 | head -5
```

Expected: JSON output without errors. (Will fail "members not found" — that's fine, next tasks create them.)

### Step 3: Commit

```bash
git add Cargo.toml
git commit -m "chore: convert root Cargo.toml to workspace definition"
```

---

## Task 2: Scaffold `airstrike-engine` crate

**Files:**
- Create: `airstrike-engine/Cargo.toml`
- Create: `airstrike-engine/src/lib.rs`
- Create: `airstrike-engine/src/core/mod.rs`
- Create: `airstrike-engine/src/ui/mod.rs`

### Step 1: Create directory structure

```bash
mkdir -p airstrike-engine/src/core
mkdir -p airstrike-engine/src/ui
```

### Step 2: Write `airstrike-engine/Cargo.toml`

```toml
[package]
name    = "airstrike-engine"
version = "0.1.0"
edition = "2021"

[dependencies]
sdl2       = { workspace = true }
glam       = { workspace = true }
ureq       = { workspace = true }
image      = { workspace = true }
serde      = { workspace = true }
serde_json = { workspace = true }
dirs       = { workspace = true }
```

### Step 3: Write `airstrike-engine/src/lib.rs`

```rust
pub mod core;
pub mod ui;
```

### Step 4: Write `airstrike-engine/src/core/mod.rs`

```rust
pub mod aircraft;
pub mod geo;
pub mod radar;
```

### Step 5: Write `airstrike-engine/src/ui/mod.rs`

```rust
pub mod camera;
pub mod grid;
pub mod tactical;
pub mod tile_manager;
```

### Step 6: Verify it compiles (empty modules)

```bash
cargo build -p airstrike-engine 2>&1 | head -20
```

Expected: compiles (no source files yet, modules exist but are empty — will have warnings/errors until Task 3).

---

## Task 3: Move engine source files

**Files:**
- Copy/move: `src/core/geo.rs`      → `airstrike-engine/src/core/geo.rs`
- Copy/move: `src/core/aircraft.rs` → `airstrike-engine/src/core/aircraft.rs`
- Copy/move: `src/core/radar.rs`    → `airstrike-engine/src/core/radar.rs`
- Copy/move: `src/ui/camera.rs`     → `airstrike-engine/src/ui/camera.rs`
- Copy/move: `src/ui/grid.rs`       → `airstrike-engine/src/ui/grid.rs`
- Copy/move: `src/ui/tactical.rs`   → `airstrike-engine/src/ui/tactical.rs`
- Copy/move: `src/ui/tile_manager.rs` → `airstrike-engine/src/ui/tile_manager.rs`

**NOTE on import paths:** These files currently use `crate::core::geo` and `crate::ui::camera`.
After the move they still use `crate::` which now refers to `airstrike_engine` — paths stay correct.
No path changes needed.

### Step 1: Copy files

```bash
cp src/core/geo.rs        airstrike-engine/src/core/geo.rs
cp src/core/aircraft.rs   airstrike-engine/src/core/aircraft.rs
cp src/core/radar.rs      airstrike-engine/src/core/radar.rs
cp src/ui/camera.rs       airstrike-engine/src/ui/camera.rs
cp src/ui/grid.rs         airstrike-engine/src/ui/grid.rs
cp src/ui/tactical.rs     airstrike-engine/src/ui/tactical.rs
cp src/ui/tile_manager.rs airstrike-engine/src/ui/tile_manager.rs
```

### Step 2: Build engine and run its tests

```bash
cargo test -p airstrike-engine 2>&1
```

Expected: All 54 tests pass (same tests, now in the engine crate).

### Step 3: Commit

```bash
git add airstrike-engine/
git commit -m "feat: add airstrike-engine crate with all core and ui modules"
```

---

## Task 4: Scaffold `stratosphere` crate

**Files:**
- Create: `stratosphere/Cargo.toml`
- Create: `stratosphere/src/main.rs` (stub)
- Create: `stratosphere/src/simulation/mod.rs`

### Step 1: Create directory structure

```bash
mkdir -p stratosphere/src/simulation
```

### Step 2: Write `stratosphere/Cargo.toml`

```toml
[package]
name    = "stratosphere"
version = "0.1.0"
edition = "2021"

[[bin]]
name = "stratosphere"
path = "src/main.rs"

[dependencies]
airstrike-engine = { path = "../airstrike-engine" }
sdl2             = { workspace = true }
```

### Step 3: Write stub `stratosphere/src/main.rs`

```rust
fn main() {
    println!("Stratosphere starting...");
}
```

### Step 4: Build to verify linkage

```bash
cargo build -p stratosphere 2>&1 | head -20
```

Expected: compiles cleanly.

### Step 5: Commit

```bash
git add stratosphere/
git commit -m "feat: add stratosphere game crate (stub)"
```

---

## Task 5: Move game source files to `stratosphere`

**Files:**
- Copy: `src/simulation/mod.rs`    → `stratosphere/src/simulation/mod.rs`
- Copy: `src/simulation/world.rs`  → `stratosphere/src/simulation/world.rs`
- Copy: `src/main.rs`              → `stratosphere/src/main.rs`

**CRITICAL — import path changes in `world.rs`:**
- Before: `use crate::core::aircraft::{...}` and `use crate::core::radar::{...}`
- After:  `use airstrike_engine::core::aircraft::{...}` and `use airstrike_engine::core::radar::{...}`

**CRITICAL — import path changes in `main.rs`:**
- Before: `mod core; mod simulation; mod ui;` and `use simulation::...`, `use ui::...`
- After: remove `mod core; mod ui;`, keep `mod simulation;`
  - `use airstrike_engine::ui::camera::Camera;`
  - `use airstrike_engine::ui::grid::draw_grid;`
  - `use airstrike_engine::ui::tactical::{draw_aircraft, draw_radar_sweep, AircraftRenderState};`
  - `use airstrike_engine::ui::tile_manager::{visible_tiles, TileManager};`
  - `use simulation::world::World;`

### Step 1: Copy simulation files

```bash
cp src/simulation/mod.rs   stratosphere/src/simulation/mod.rs
cp src/simulation/world.rs stratosphere/src/simulation/world.rs
```

### Step 2: Update imports in `stratosphere/src/simulation/world.rs`

Find and replace:
- `use crate::core::aircraft::` → `use airstrike_engine::core::aircraft::`
- `use crate::core::radar::`    → `use airstrike_engine::core::radar::`

### Step 3: Copy and rewrite `stratosphere/src/main.rs`

Write the full corrected `main.rs` (see below — same logic, updated imports):

```rust
mod simulation;

use std::time::{Duration, Instant};

use sdl2::event::Event;
use sdl2::keyboard::Keycode;
use sdl2::mouse::MouseButton;
use sdl2::pixels::Color;
use sdl2::rect::Rect;

use airstrike_engine::ui::camera::Camera;
use airstrike_engine::ui::grid::draw_grid;
use airstrike_engine::ui::tactical::{draw_aircraft, draw_radar_sweep, AircraftRenderState};
use airstrike_engine::ui::tile_manager::{visible_tiles, TileManager};
use simulation::world::World;

const WINDOW_W: u32 = 1280;
const WINDOW_H: u32 = 720;
const TARGET_FPS: u64 = 60;
const FRAME_DURATION: Duration = Duration::from_millis(1000 / TARGET_FPS);
const TRAIL_INTERVAL_S: f32 = 2.0;

const DEFAULT_LAT: f64 = 38.716;
const DEFAULT_LON: f64 = -9.142;
const DEFAULT_ZOOM: u32 = 7;

struct HudCache<'tc> {
    last_lines: [String; 4],
    textures: Option<Vec<sdl2::render::Texture<'tc>>>,
    sizes: [(u32, u32); 4],
}

impl<'tc> HudCache<'tc> {
    fn new() -> Self {
        HudCache {
            last_lines: [String::new(), String::new(), String::new(), String::new()],
            textures: None,
            sizes: [(0, 0); 4],
        }
    }
}

fn main() -> Result<(), String> {
    let sdl_context = sdl2::init()?;
    let video = sdl_context.video()?;
    let ttf = sdl2::ttf::init().map_err(|e| e.to_string())?;
    let _image = sdl2::image::init(sdl2::image::InitFlag::PNG)?;

    let window = video
        .window("STRATOSPHERE v0.1", WINDOW_W, WINDOW_H)
        .position_centered()
        .resizable()
        .build()
        .map_err(|e| e.to_string())?;

    let mut canvas = window
        .into_canvas()
        .accelerated()
        .present_vsync()
        .build()
        .map_err(|e| e.to_string())?;

    let texture_creator = Box::new(canvas.texture_creator());
    let texture_creator: &'static _ = Box::leak(texture_creator);

    let font = ttf.load_font("assets/fonts/JetBrainsMonoNL-Regular.ttf", 14)?;

    let mut camera = Camera::new(DEFAULT_LAT, DEFAULT_LON, DEFAULT_ZOOM, WINDOW_W as f32, WINDOW_H as f32);
    let mut tile_manager = TileManager::new();
    let mut event_pump = sdl_context.event_pump()?;

    let mut mouse_down = false;
    let mut last_mouse: (i32, i32) = (0, 0);
    let mut current_mouse: (i32, i32) = (0, 0);

    let mut fps_timer = Instant::now();
    let mut frame_count = 0u32;
    let mut fps_display = 0u32;
    let mut hud_cache = HudCache::new();

    let mut world = World::new();
    world.spawn_demo();
    let mut render_states: Vec<AircraftRenderState> = world
        .aircraft
        .iter()
        .map(|ac| AircraftRenderState::new(ac.id))
        .collect();

    let mut sweep_angle: f32 = 0.0;

    'running: loop {
        let frame_start = Instant::now();

        for event in event_pump.poll_iter() {
            match event {
                Event::Quit { .. } | Event::KeyDown { keycode: Some(Keycode::Escape), .. } => {
                    break 'running;
                }
                Event::MouseButtonDown { mouse_btn: MouseButton::Left, x, y, .. } => {
                    mouse_down = true;
                    last_mouse = (x, y);
                    current_mouse = (x, y);
                }
                Event::MouseButtonUp { mouse_btn: MouseButton::Left, .. } => {
                    mouse_down = false;
                }
                Event::MouseMotion { x, y, .. } => {
                    current_mouse = (x, y);
                    if mouse_down {
                        let dx = (x - last_mouse.0) as f32;
                        let dy = (y - last_mouse.1) as f32;
                        camera.pan(dx, dy);
                        last_mouse = (x, y);
                    }
                }
                Event::MouseWheel { y, .. } => {
                    let mx = current_mouse.0 as f32;
                    let my = current_mouse.1 as f32;
                    camera.zoom_at(if y > 0 { 1 } else { -1 }, mx, my);
                }
                Event::Window { win_event: sdl2::event::WindowEvent::Resized(w, h), .. } => {
                    camera.window_w = w as f32;
                    camera.window_h = h as f32;
                }
                _ => {}
            }
        }

        let tiles = visible_tiles(&camera);
        tile_manager.request_tiles(&tiles);
        tile_manager.drain_channel(texture_creator);

        let dt = frame_start.elapsed().as_secs_f32().min(0.1);
        world.update(dt);
        for state in &mut render_states {
            if let Some(ac) = world.aircraft.iter().find(|a| a.id == state.id) {
                state.tick(ac, dt, TRAIL_INTERVAL_S);
            }
        }

        frame_count += 1;
        if fps_timer.elapsed() >= Duration::from_secs(1) {
            fps_display = frame_count;
            frame_count = 0;
            fps_timer = Instant::now();
        }

        canvas.set_draw_color(Color::RGB(15, 15, 25));
        canvas.clear();

        tile_manager.render_placeholders(&mut canvas, &camera);
        tile_manager.render(&mut canvas, &camera);
        draw_grid(&mut canvas, &camera);

        sweep_angle = (sweep_angle + 3.0 * dt) % 360.0;
        draw_radar_sweep(&mut canvas, DEFAULT_LAT, DEFAULT_LON, 400.0, sweep_angle, &camera);

        draw_aircraft(&mut canvas, texture_creator, &font, &world.aircraft, &render_states, &camera);

        let tracked_count = world.aircraft.iter().filter(|a| a.is_detected).count();
        render_hud(
            &mut canvas, texture_creator, &font, &camera,
            fps_display, tile_manager.loaded, tile_manager.pending,
            "RWS", tracked_count, &mut hud_cache,
        )?;

        canvas.present();

        let elapsed = frame_start.elapsed();
        if elapsed < FRAME_DURATION {
            std::thread::sleep(FRAME_DURATION - elapsed);
        }
    }

    Ok(())
}

fn render_hud<'tc>(
    canvas: &mut sdl2::render::Canvas<sdl2::video::Window>,
    texture_creator: &'tc sdl2::render::TextureCreator<sdl2::video::WindowContext>,
    font: &sdl2::ttf::Font,
    camera: &Camera,
    fps: u32,
    loaded: usize,
    pending: usize,
    radar_mode: &str,
    tracked_count: usize,
    cache: &mut HudCache<'tc>,
) -> Result<(), String> {
    let (lat, lon) = camera.center_lat_lon();
    let new_lines = [
        format!("ZOOM: {:2}   FPS: {}", camera.zoom, fps),
        format!("LAT: {:+.4}°  LON: {:+.4}°", lat, lon),
        format!("TILES: {} loaded / {} pending", loaded, pending),
        format!("RADAR: {} | TRACKED: {}", radar_mode, tracked_count),
    ];

    if cache.textures.is_none() || new_lines != cache.last_lines {
        let mut textures = Vec::with_capacity(4);
        let mut sizes = [(0u32, 0u32); 4];
        for (i, line) in new_lines.iter().enumerate() {
            let surface = font
                .render(line)
                .blended(Color::RGB(0, 255, 100))
                .map_err(|e| e.to_string())?;
            let texture = texture_creator
                .create_texture_from_surface(&surface)
                .map_err(|e| e.to_string())?;
            let sdl2::render::TextureQuery { width, height, .. } = texture.query();
            sizes[i] = (width, height);
            textures.push(texture);
        }
        cache.textures = None;
        cache.textures = Some(textures);
        cache.last_lines = new_lines;
        cache.sizes = sizes;
    }

    let line_h = 18i32;
    let padding = 8i32;

    canvas.set_draw_color(Color::RGBA(0, 0, 0, 180));
    let bg = Rect::new(8, 8, 280, (4 * line_h + padding * 2) as u32);
    canvas.fill_rect(bg)?;

    if let Some(textures) = &cache.textures {
        for (i, texture) in textures.iter().enumerate() {
            let (w, h) = cache.sizes[i];
            let dst = Rect::new(padding + 8, padding + 8 + i as i32 * line_h, w, h);
            canvas.copy(texture, None, Some(dst))?;
        }
    }

    Ok(())
}
```

### Step 4: Build and test stratosphere

```bash
cargo build -p stratosphere 2>&1
```

Expected: compiles cleanly.

```bash
cargo test -p stratosphere 2>&1
```

Expected: 0 game tests (all tests are in the engine).

### Step 5: Run full workspace test suite

```bash
cargo test 2>&1
```

Expected: 54 tests pass (all in airstrike-engine).

### Step 6: Commit

```bash
git add stratosphere/
git commit -m "feat: add stratosphere game crate wired to airstrike-engine"
```

---

## Task 6: Copy assets to stratosphere and clean up old src/

**Files:**
- Create: `stratosphere/assets/fonts/` (copy font file)
- Delete: `src/` directory (old single-crate source)

**NOTE:** The font is loaded at runtime via a relative path `"assets/fonts/JetBrainsMonoNL-Regular.ttf"`.
With the new structure, the binary runs from the workspace root or the `stratosphere/` directory.
We'll keep assets under `stratosphere/assets/` and update the run script.

### Step 1: Create assets directory in stratosphere

```bash
mkdir -p stratosphere/assets/fonts
cp assets/fonts/JetBrainsMonoNL-Regular.ttf stratosphere/assets/fonts/
```

### Step 2: Update font path in main.rs

The font load call in `stratosphere/src/main.rs` uses a relative path. When `cargo run -p stratosphere` is invoked from the workspace root, the working directory is the workspace root. So the path should be:

```rust
let font = ttf.load_font("stratosphere/assets/fonts/JetBrainsMonoNL-Regular.ttf", 14)?;
```

Edit `stratosphere/src/main.rs` line (the `load_font` call):
- Before: `"assets/fonts/JetBrainsMonoNL-Regular.ttf"`
- After:  `"stratosphere/assets/fonts/JetBrainsMonoNL-Regular.ttf"`

### Step 3: Remove the old src/ directory

```bash
git rm -r src/
```

### Step 4: Build to verify nothing broke

```bash
cargo test 2>&1
```

Expected: 54 tests pass, workspace builds cleanly.

### Step 5: Update run.sh (if it exists)

If `run.sh` exists, update it to:
```bash
#!/usr/bin/env bash
cargo build --release -p stratosphere && ./target/release/stratosphere
```

### Step 6: Final commit

```bash
git add -A
git commit -m "chore: finalize workspace split — remove old src/, move assets to stratosphere"
```

---

## Success Criteria

- [ ] `cargo test` → 54 tests pass (all in `airstrike-engine`)
- [ ] `cargo build -p airstrike-engine` → compiles cleanly
- [ ] `cargo build -p stratosphere` → compiles cleanly
- [ ] `cargo build --release -p stratosphere` → release binary builds
- [ ] `src/` directory no longer exists
- [ ] All modules under `airstrike-engine/src/` (geo, aircraft, radar, camera, grid, tactical, tile_manager)
- [ ] All game logic under `stratosphere/src/` (simulation, main)
- [ ] No gameplay logic in engine crate (no World, no spawn_demo)
