# Stratosphere — Game Design

**Date**: 2026-04-04
**Phase**: Game Implementation (Phases 1–6)
**Platform**: Rust + SDL2 (Windows / Linux)
**Architecture**: Incremental Layering on existing `airstrike-engine` + `stratosphere` workspace

---

## Overview

Stratosphere is a top-down tactical air-superiority RTS. The player manages an entire country's air force from its real airports, dispatching aircraft on missions, managing resources, and defending airspace against AI-driven hostile incursions.

The world is the real world — airports come from OurAirports data, distances are real, radar physics follow real equations. The aesthetic is a military operations room: dark background, green/cyan overlays, NATO symbology, brevity-code radio log.

---

## Architecture Approach

Incremental Layering on the existing solid foundation. No ECS rewrite. Each feature adds one vertical slice:

1. Menu system (scenes)
2. Airport data layer
3. Country selection + world init
4. Aircraft state machine
5. Mission scripting
6. Radar types + datalink
7. Fog of war
8. BVR combat

The engine (`airstrike-engine`) grows with new `core/` modules. Game logic stays in `stratosphere/`.

---

## Section 1 — Menu System

### Scene Stack

```rust
enum Scene {
    MainMenu,
    ModeSelect,
    SandboxSettings,
    InGame,
}
```

Each scene owns render / update / handle_event. Transitions via `self.scene = Scene::Next`.

### Screens

**Main Menu**: Title "STRATOSPHERE v0.1", options: PLAY / SETTINGS / QUIT. Keyboard: ↑↓ navigate, Enter confirm, Esc back.

**Mode Select**: SANDBOX (active) · CAREER (locked) · MULTIPLAYER (locked).

**Sandbox Settings**:
- Country picker: scrollable list of country names (ISO code + full name from airport CSV)
- Starting credits slider
- Difficulty selector
- CONFIRM button → transitions to InGame

**Rendering**: Same SDL2 canvas + TTF. Dark background (`#0f0f19`), green text (`#00ff64`), selection highlight box.

---

## Section 2 — Airport Data Layer

### Data Source

Bundle `stratosphere/assets/airports.csv` from OurAirports (~74k airports, ~5 MB). Loaded once at startup.

OurAirports CSV columns used: `ident` (ICAO), `type`, `name`, `latitude_deg`, `longitude_deg`, `elevation_ft`, `iso_country`.

### New Module: `airstrike-engine/src/core/airport.rs`

```rust
pub enum AirportType { Large, Medium, Small, Other }

pub struct Airport {
    pub icao: String,
    pub name: String,
    pub lat: f64,
    pub lon: f64,
    pub country_iso: String,   // e.g. "PT", "US", "FR"
    pub airport_type: AirportType,
    pub elevation_ft: f32,
}

pub struct AirportDb {
    airports: Vec<Airport>,
}

impl AirportDb {
    pub fn load(csv_bytes: &[u8]) -> Self
    pub fn for_country<'a>(&'a self, iso: &str) -> Vec<&'a Airport>
    pub fn countries(&self) -> Vec<(String, String)>  // (iso, display_name)
    pub fn by_icao(&self, icao: &str) -> Option<&Airport>
}
```

### Rendering

- Zoom < 6: no airport markers (too many, too small)
- Zoom 6–8: dot only, colored by type (large=bright cyan, medium=dim cyan, small=grey)
- Zoom ≥ 9: dot + ICAO label
- Player country airports: cyan. Foreign airports: dark red.
- Click on airport marker: opens Target Intel panel

---

## Section 3 — Country Selection + World Init

### Game Settings

```rust
pub struct GameSettings {
    pub country_iso: String,
    pub starting_credits: u32,
    pub difficulty: Difficulty,
}

pub enum Difficulty { Rookie, Veteran, Ace }
```

### World Init

`World::new_from_settings(settings: &GameSettings, db: &AirportDb) -> World`:
1. Filter airports for `country_iso` → player airports
2. Spawn player aircraft: one F-16C per `Large` airport, one Gripen per `Medium` airport
3. All aircraft start in `ColdDark` phase at their home airport
4. Spawn hostile aircraft from 1–3 neighbouring countries (random at startup, difficulty-scaled)
5. Camera centers on country centroid at zoom 6

All player airports available from turn 1 (sandbox — no progression lock).

---

## Section 4 — Aircraft State Machine

### New: `FlightPhase` enum in `airstrike-engine/src/core/aircraft.rs`

```rust
pub enum FlightPhase {
    ColdDark,
    Preflight  { elapsed_s: f32, required_s: f32 },    // checklist timer (60s)
    Taxiing    { target_lat: f64, target_lon: f64 },    // slow ground movement
    TakeoffRoll{ speed_knots: f32 },                    // accelerating down runway
    Climbing   { target_alt_ft: f32 },                  // climbing to cruise
    EnRoute,                                            // following mission waypoints
    OnStation,                                          // CAP orbit / loiter
    Rtb,                                               // returning to base
    Landing    { airport_lat: f64, airport_lon: f64 },
    Landed,
    Maintenance { elapsed_s: f32, required_s: f32 },    // refuel/rearm timer
}
```

`Aircraft` gains: `pub phase: FlightPhase`, `pub home_airport_icao: String`, `pub mission: Option<MissionPlan>`.

### Phase Transitions

| From | Trigger | To |
|---|---|---|
| ColdDark | player dispatches mission | Preflight |
| Preflight (timer done) | auto | Taxiing |
| Taxiing (at runway) | auto | TakeoffRoll |
| TakeoffRoll (speed > Vr) | auto | Climbing |
| Climbing (at cruise alt) | auto | EnRoute |
| EnRoute (final waypoint) | auto | OnStation or Rtb |
| Rtb (at base) | auto | Landing |
| Landing (touched down) | auto | Landed |
| Landed | auto | Maintenance |
| Maintenance (timer done) | auto | ColdDark |

### Visual Changes Per Phase

- ColdDark / Maintenance: grey icon, no trail, at airport dot
- Preflight: pulsing icon outline
- Taxiing: slow movement along ground (no trail)
- TakeoffRoll: fast ground movement with exhaust effect
- Climbing → EnRoute → OnStation → Rtb: full tactical icon + trail
- Landing: icon moves toward runway end, trail fades

---

## Section 5 — Mission Scripting

### New Module: `airstrike-engine/src/core/mission.rs`

```rust
pub enum WaypointAction {
    FlyOver,
    OrbitCAP { radius_km: f32, duration_s: f32 },
    AttackTarget { target_id: u32 },
    Rtb,
}

pub struct Waypoint {
    pub lat: f64,
    pub lon: f64,
    pub altitude_ft: f32,
    pub speed_knots: f32,
    pub action: WaypointAction,
}

pub enum Roe { WeaponsFree, ReturnFireOnly, HoldFire }

pub struct WeaponSlot {
    pub weapon_id: String,   // e.g. "AIM-120C", "AIM-9X"
    pub count: u8,
}

pub struct MissionPlan {
    pub waypoints: Vec<Waypoint>,
    pub loadout: Vec<WeaponSlot>,
    pub roe: Roe,
    pub fuel_reserve_pct: f32,   // RTB threshold (default 0.15 = 15%)
}
```

Aircraft follow waypoints sequentially. When `action = AttackTarget`, aircraft enters engagement mode and fires from loadout per ROE.

---

## Section 6 — Radar Types + Datalink

### `RadarType` enum

```rust
pub enum RadarType { Mechanical, PESA, AESA, AEWandC }
```

| Type | Scan period | TWS slots | Lock quality | Used by |
|---|---|---|---|---|
| Mechanical | 2.0s | 1 | 0.7 | Old F-16A, early Su-27 |
| PESA | 1.0s | 4 | 0.85 | Su-30/35 |
| AESA | 0.5s | 8 | 1.0 | F-35A, Gripen E, F-16V |
| AEWandC | 4.0s (360°) | 30 | 0.6 | E-3 Sentry |

`Aircraft` gains: `pub radar_type: Option<RadarType>`. `RadarSystem` gains `radar_type` and applies scan-period gating (detection only updates every N seconds per radar type).

### Datalink: `airstrike-engine/src/core/datalink.rs`

```rust
pub struct Contact {
    pub aircraft_id: u32,
    pub lat: f64,
    pub lon: f64,
    pub altitude_ft: f32,
    pub heading_deg: f32,
    pub iff: IffStatus,
    pub last_updated_s: f32,
}

pub enum IffStatus { Unknown, Friendly, Hostile }

pub struct ContactPicture {
    pub contacts: HashMap<u32, Contact>,
}
```

`World::compute_shared_picture()` merges detections from all friendly radars (aircraft + ground station) within 200km datalink range.

---

## Section 7 — Fog of War

Hostile aircraft are invisible by default. Visibility computed each frame from `ContactPicture`.

**Visibility rules**:
- Detected by any friendly radar covering that position → visible
- Friendly aircraft within 10km visual range → visible regardless of radar
- Not detected → not rendered

**IFF Progression**:

| State | Condition | Symbol | Color |
|---|---|---|---|
| Unknown (Bogey) | Detected, not yet identified | ◆ | Grey |
| Suspect | 5s continuous track, RCS profile analyzed | ◆ | Yellow |
| Hostile | Failed IFF OR entered exclusion zone OR fired | ◆ | Red |
| Friendly | Valid IFF response | ○ | Cyan |

`Aircraft` gains: `pub iff: IffStatus`, `pub iff_confidence_s: f32`.

---

## Section 8 — BVR Combat

### New Module: `stratosphere/src/simulation/missile.rs`

```rust
pub struct Missile {
    pub id: u32,
    pub launcher_id: u32,
    pub target_id: u32,
    pub lat: f64,
    pub lon: f64,
    pub altitude_ft: f32,
    pub speed_knots: f32,
    pub phase: MissilePhase,
    pub fuel_s_remaining: f32,
    pub weapon_spec: WeaponSpec,
}

pub enum MissilePhase {
    Midcourse,   // Guided via datalink, target RWR hears search ping
    Pitbull,     // Own seeker active — RWR alert escalates
    Terminal,    // <5km, max maneuverability
    Detonated,
    Missed,
}
```

### New Module: `airstrike-engine/src/core/weapon.rs`

```rust
pub struct WeaponSpec {
    pub id: &'static str,         // "AIM-120C"
    pub display_name: &'static str,
    pub range_km: f32,
    pub nez_km: f32,              // No Escape Zone radius
    pub pitbull_range_km: f32,
    pub speed_knots: f32,
    pub pk_base: f32,             // 0.0–1.0 probability of kill
    pub seeker: SeekerType,
}

pub enum SeekerType { ActiveRadar, SemiActive, Ir }
```

Weapon catalog: AIM-120C-5, AIM-120D, MBDA Meteor, R-77, R-77-1, AIM-9X, PL-15.

### Hit Resolution

```
Pk = weapon.pk_base
   * rcs_factor(target.rcs, weapon.seeker)   // stealth reduces Pk
   * aspect_factor(aspect_angle)              // tail-on increases Pk
   * chaff_factor(target.deployed_chaff)
```

Hit → target `FlightPhase` = `Destroyed`, brief explosion visual. Miss → missile despawns.

**Rendering**:
- Midcourse: small white triangle + 3-dot trail
- Pitbull: yellow triangle
- Terminal: red triangle, fast movement
- Explosion: expanding circle, fades over 1.5s

---

## New Module Layout

```
airstrike-engine/src/core/
├── airport.rs      ← NEW
├── mission.rs      ← NEW
├── weapon.rs       ← NEW
├── datalink.rs     ← NEW
├── aircraft.rs     ← EXTEND (FlightPhase, RadarType, IffStatus)
└── radar.rs        ← EXTEND (RadarType-aware detection gating)

stratosphere/src/
├── scenes/
│   ├── mod.rs           ← NEW
│   ├── main_menu.rs     ← NEW
│   ├── mode_select.rs   ← NEW
│   └── sandbox_settings.rs ← NEW
├── simulation/
│   ├── world.rs         ← EXTEND (country init, airport layer, shared picture)
│   └── missile.rs       ← NEW
├── ui/
│   ├── airport_layer.rs ← NEW (renders airports on map)
│   └── hud_panels.rs    ← NEW (asset list, brevity log, target intel)
└── main.rs              ← EXTEND (Scene dispatch)

stratosphere/assets/
└── airports.csv         ← NEW (OurAirports bundle ~5MB)
```

---

## Rendering Layers (draw order)

1. OSM tiles (background)
2. Grid overlay
3. Radar sweep cone (ground station)
4. Airport markers
5. No-fly zone polygons (future)
6. Missile trails
7. Missile icons
8. Aircraft trails
9. Aircraft icons + IFF boxes + labels
10. Explosion effects
11. HUD panels (top bar, left panel, right panel, brevity log)

---

## Data Tables

### Aircraft RCS (from planning.txt)

| Model | RCS Frontal (m²) | RCS Lateral (m²) | Max Speed | Radar Range (km) | Endurance (min) |
|---|---|---|---|---|---|
| F-16C | 1.0 | 5.0 | Mach 2.0 | 110 | 90 |
| JAS 39 Gripen | 0.1 | 1.5 | Mach 2.0 | 120 | 80 |
| Su-27 | 15.0 | 25.0 | Mach 2.35 | 150 | 150 |
| F-35A | 0.001 | 0.01 | Mach 1.6 | 160 | 110 |
| Rafale | 0.1 | 2.0 | Mach 1.8 | 140 | 100 |
| C-130 | 80.0 | 120.0 | Mach 0.6 | 40 | 480 |
| Eurofighter | 0.5 | 3.0 | Mach 2.0 | 150 | 95 |

### Weapon Catalog

| Missile | Range (km) | NEZ (km) | Pitbull (km) | Base Pk | Seeker |
|---|---|---|---|---|---|
| AIM-120C-5 | 105 | 25 | 20 | 0.85 | Active Radar |
| AIM-120D | 160 | 35 | 25 | 0.88 | Active Radar + GPS |
| MBDA Meteor | 200 | 60 | 30 | 0.92 | Active Radar (Ramjet) |
| R-77 | 80 | 15 | 15 | 0.78 | Active Radar |
| R-77-1 | 110 | 22 | 18 | 0.82 | Active Radar |
| AIM-9X | 35 | 8 | 2 | 0.90 | Infrared |
| PL-15 | 200 | 50 | 25 | 0.87 | AESA Active |

---

## Success Criteria

- [ ] Main menu renders and navigates correctly
- [ ] Sandbox settings: country list populates from CSV, selection persists
- [ ] Map centers on chosen country at game start
- [ ] Player airports render as markers; type/color correct at all zoom levels
- [ ] Player aircraft spawn at correct airports in ColdDark state
- [ ] Dispatching aircraft triggers full state machine (Preflight → ... → Landed)
- [ ] MissionPlan waypoints followed by aircraft autopilot
- [ ] Datalink merges multi-source detections into single ContactPicture
- [ ] Hostile aircraft invisible until in radar coverage
- [ ] IFF progresses: Unknown → Suspect → Hostile over time
- [ ] Missile launch creates Missile entity; animates toward target
- [ ] Hit/miss resolves correctly with Pk formula
- [ ] Explosion visual plays on hit
- [ ] Brevity log shows Fox 3 / Splash / Bingo / etc.
- [ ] All 54 existing tests still pass; new unit tests for each new module
