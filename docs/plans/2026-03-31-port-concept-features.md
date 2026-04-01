# Port concept_base Features to src/ Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port all gameplay features from `concept_base/` into `src/`, preserving `src/`'s dark military visual style (WarRoomDashboard, glass panels, emerald, scanlines) while restoring full game functionality.

**Architecture:** Keep `src/`'s modular architecture (SimulationEngine, separate Zustand stores, plugin registries, EventBus, Systems). Add missing features ON TOP — do not replace with concept_base's monolithic store. The player faction is always `Side.FRIENDLY` with a base that has credits/fuel/missileStock.

**Tech Stack:** React 18, TypeScript, Zustand, Leaflet (react-leaflet), Vite, Tailwind, pnpm

---

## Reference Files (read these before implementing)

- `concept_base/store/useGameStore.ts` — all game actions and tick logic (~1800 lines)
- `concept_base/components/HUD.tsx` — full HUD with all modals (~1800 lines)
- `concept_base/types/game.ts` — all types to port (~339 lines)
- `concept_base/utils/qLearning.ts` — Q-learning AI
- `concept_base/utils/physics.ts` — physics helpers
- `concept_base/utils/legalSystem.ts` — legal resolution
- `concept_base/utils/newsSystem.ts` — news generation
- `concept_base/constants/specs.ts` — aircraft/missile specs
- `src/types/entities.ts` — existing entities (Aircraft, Missile, Base, Side)
- `src/types/geopolitics.ts` — existing geopolitics types
- `src/store/useSimulationState.ts` — existing simulation store
- `src/store/useWarRoomStore.ts` — existing war room store
- `src/store/useGameUI.ts` — existing UI store
- `src/ui/components/WarRoomDashboard.tsx` — main layout to extend
- `src/systems/AIDecisionSystem.ts` — existing AI (extend with Q-learning)

---

## Phase 1 — Types Foundation

### Task 1: Extend Entity Types

**Files:**
- Modify: `src/types/entities.ts`

**Step 1: Add missing types from concept_base/types/game.ts**

Add to `src/types/entities.ts` (after existing types):

```typescript
// ── Ground Units ──────────────────────────────────────────────
export type GroundUnitType =
  | 'SAM_SITE' | 'AAA' | 'RADAR_STATION' | 'COMMAND_POST'
  | 'SUPPLY_DEPOT' | 'AIRFIELD' | 'CARRIER' | 'DESTROYER' | 'FRIGATE';

export interface GroundUnit {
  id: string;
  type: GroundUnitType;
  faction: string;
  lat: number;
  lng: number;
  hp: number;
  maxHp: number;
  radarRange: number; // km
  weaponRange: number; // km
  isActive: boolean;
  lastFiredAt?: number;
}

// ── Formation / Groups ────────────────────────────────────────
export type FormationType = 'VIC' | 'LINE_ABREAST' | 'ECHELON_RIGHT' | 'ECHELON_LEFT' | 'TRAIL';

export interface PlaneGroup {
  id: string;
  name: string;
  aircraftIds: string[];
  formation: FormationType;
  leadAircraftId: string;
  missionId?: string;
}

// ── Q-Learning Brain ──────────────────────────────────────────
export type QAction = 'ENGAGE' | 'NOTCH' | 'CRANK' | 'EVADE' | 'RETREAT' | 'TERRAIN_MASK';

export interface QBrainData {
  table: Record<string, Record<QAction, number>>;
  lastState: string | null;
  lastAction: QAction | null;
  totalReward: number;
  engagements: number;
}

// ── Radar / RWR ───────────────────────────────────────────────
export type RadarMode = 'SEARCH' | 'TRACK' | 'FIRE_CONTROL' | 'SILENT';
export type RWRStatus = 'CLEAR' | 'SEARCH' | 'TRACK' | 'LAUNCH' | 'SPIKE';
export type IFFStatus = 'FRIENDLY' | 'HOSTILE' | 'NEUTRAL' | 'UNKNOWN';

// ── Pending Building ──────────────────────────────────────────
export type BuildingType =
  | 'HANGAR' | 'FUEL_DEPOT' | 'RADAR' | 'SAM_BATTERY'
  | 'COMMAND_CENTER' | 'REPAIR_BAY' | 'ARMOURY';

export interface PendingBuilding {
  id: string;
  type: BuildingType;
  lat: number;
  lng: number;
  cost: number;
  buildTimeMs: number;
  startedAt: number;
  completedAt: number;
}

export interface ResourceSpot {
  id: string;
  lat: number;
  lng: number;
  type: 'FUEL' | 'AMMO' | 'CREDITS';
  amount: number;
  respawnMs: number;
  lastHarvestedAt?: number;
}
```

**Step 2: Verify no TypeScript errors**

Run: `cd /home/pedro/repo/airstrike && npx tsc --noEmit 2>&1 | head -30`
Expected: same errors as before (zero new errors from this change)

**Step 3: Commit**

```bash
git add src/types/entities.ts
git commit -m "feat(types): add GroundUnit, PlaneGroup, QBrainData, BuildingType entity types"
```

---

### Task 2: Extend Geopolitics Types (Legal System)

**Files:**
- Modify: `src/types/geopolitics.ts`

**Step 1: Add legal system types**

Add to `src/types/geopolitics.ts` (after existing exports):

```typescript
// ── Legal System ──────────────────────────────────────────────
export type LawsuitStatus = 'PENDING' | 'CONTESTED' | 'SETTLED' | 'DISMISSED' | 'LOST';
export type LawsuitAction = 'COMPLY' | 'CONTEST' | 'IGNORE';

export interface LawsuitEvidence {
  description: string;
  strength: number; // 0-1
}

export interface Lawsuit {
  id: string;
  filedBy: string; // faction id
  filedAt: number; // timestamp
  charge: string;
  damagesClaimed: number; // credits
  evidence: LawsuitEvidence[];
  status: LawsuitStatus;
  deadline: number; // timestamp — must respond by
  resolvedAt?: number;
  outcome?: string;
}

export interface CasusBelli {
  id: string;
  against: string; // faction id
  reason: string;
  strength: number; // 0-1 — higher = more justified war
  expiresAt: number;
}

// ── Full Incident Report (extends partial in geopolitics.ts) ──
export interface FullIncidentReport {
  id: string;
  timestamp: number;
  aircraftId: string;
  aircraftType: string;
  pilotName: string;
  causeOfCrash: string;
  location: { lat: number; lng: number };
  survivorsCount: number;
  financialDamage: number; // credits
  factionInvolved?: string;
  lawsuitFiled: boolean;
  lawsuitId?: string;
}
```

**Step 2: Verify no new TS errors**

Run: `npx tsc --noEmit 2>&1 | head -30`

**Step 3: Commit**

```bash
git add src/types/geopolitics.ts
git commit -m "feat(types): add Lawsuit, CasusBelli, FullIncidentReport legal system types"
```

---

## Phase 2 — Utilities

### Task 3: Port Q-Learning System

**Files:**
- Create: `src/systems/QLearningSystem.ts`

**Step 1: Port from concept_base/utils/qLearning.ts**

Read `concept_base/utils/qLearning.ts` in full, then create `src/systems/QLearningSystem.ts` with:
- `QTable` class (choose action with ε-greedy, update Q-value)
- `createAIState(aircraft, target)` — encodes situation as string key
- `Rewards` constants object
- `AI_PERSONALITIES` record keyed by faction id (maps to aggression/epsilon)
- Export all types: `QAction`, `AIPersonality`

Keep all logic identical to concept_base. Only change: import `QAction` from `src/types/entities.ts` instead of defining locally.

**Step 2: Verify compiles**

Run: `npx tsc --noEmit 2>&1 | grep QLearning`
Expected: no output (no errors)

**Step 3: Commit**

```bash
git add src/systems/QLearningSystem.ts
git commit -m "feat(systems): port Q-learning AI from concept_base"
```

---

### Task 4: Port Physics Utilities

**Files:**
- Create: `src/utils/physicsUtils.ts`

**Step 1: Port from concept_base/utils/physics.ts**

Read `concept_base/utils/physics.ts` in full, then create `src/utils/physicsUtils.ts` with:
- `getNextPosition(lat, lng, headingDeg, speedKmh, deltaMs)` → `{lat, lng}`
- `getDistanceKm(a, b)` — haversine
- `getRadarHorizon(altFt)` — km
- `calculateAspectAngle(shooter, target)` — degrees
- `getDynamicRCS(aircraft, aspectAngle)` — m²
- `calculateDetectionProbability(rcs, distanceKm, radarPower)` → 0-1
- `calculateFuelNeeded(distanceKm, fuelBurnRate)` → litres

Do NOT import from concept_base. Keep the math identical.

**Step 2: Verify compiles**

Run: `npx tsc --noEmit 2>&1 | grep physicsUtils`
Expected: no output

**Step 3: Commit**

```bash
git add src/utils/physicsUtils.ts
git commit -m "feat(utils): port physics helpers (haversine, radar horizon, detection probability)"
```

---

### Task 5: Port Legal System Utility

**Files:**
- Create: `src/utils/legalSystem.ts`

**Step 1: Port from concept_base/utils/legalSystem.ts**

Read `concept_base/utils/legalSystem.ts` in full, then create `src/utils/legalSystem.ts` with:
- `resolveContestation(lawsuit, legalInfluence)` → `{ won: boolean; outcome: string; penaltyCredits: number }`
- Import `Lawsuit` from `src/types/geopolitics.ts`

**Step 2: Verify compiles**

Run: `npx tsc --noEmit 2>&1 | grep legalSystem`
Expected: no output

**Step 3: Commit**

```bash
git add src/utils/legalSystem.ts
git commit -m "feat(utils): port legal system resolveContestation utility"
```

---

### Task 6: Port News System Utility

**Files:**
- Create: `src/utils/newsSystem.ts`

**Step 1: Port from concept_base/utils/newsSystem.ts**

Read `concept_base/utils/newsSystem.ts` in full, then create `src/utils/newsSystem.ts` with:
- `NewsEvent` interface (if not already in `src/types/`)
- `getNewsHeadlines(gameState)` → `NewsEvent[]`
- Keep all template strings and logic identical
- Import types from `src/types/` (not concept_base)

**Step 2: Verify compiles**

Run: `npx tsc --noEmit 2>&1 | grep newsSystem`
Expected: no output

**Step 3: Commit**

```bash
git add src/utils/newsSystem.ts
git commit -m "feat(utils): port news headline generation system"
```

---

## Phase 3 — Player Store

### Task 7: Create usePlayerStore

**Files:**
- Create: `src/store/usePlayerStore.ts`

**Step 1: Create the player Zustand store**

This store holds all state that belongs to the player's faction (Side.FRIENDLY):

```typescript
import { create } from 'zustand';
import { BuildingType, PendingBuilding, GroundUnit, PlaneGroup } from '../types/entities';
import { Lawsuit, CasusBelli, FullIncidentReport } from '../types/geopolitics';

interface PlayerBase {
  id: string;
  name: string;
  lat: number;
  lng: number;
  credits: number;
  fuel: number;        // litres
  missileStock: number;
  maxAircraft: number;
  innerLevel: number;  // 0-5 upgrade tier
  outerRadius: number; // km — base territory
  buildings: PendingBuilding[];
}

interface PlayerState {
  base: PlayerBase;
  groundUnits: GroundUnit[];
  groups: PlaneGroup[];
  lawsuits: Lawsuit[];
  casusBelli: CasusBelli[];
  legalInfluence: number; // 0-100
  crashHistory: FullIncidentReport[];
  missionLog: string[];

  // Actions
  spendCredits: (amount: number) => void;
  earnCredits: (amount: number) => void;
  spendFuel: (amount: number) => void;
  addFuel: (amount: number) => void;
  spendMissile: () => void;
  restockMissile: (count: number) => void;
  addLawsuit: (lawsuit: Lawsuit) => void;
  updateLawsuit: (id: string, patch: Partial<Lawsuit>) => void;
  addCasusBelli: (cb: CasusBelli) => void;
  removeCasusBelli: (id: string) => void;
  increaseLegalInfluence: (cost: number) => void;
  recordCrash: (report: FullIncidentReport) => void;
  addMissionLog: (entry: string) => void;
  upgradeInner: () => void;
  expandOuter: () => void;
  startBuilding: (building: PendingBuilding) => void;
  completeBuilding: (id: string) => void;
}

const INITIAL_BASE: PlayerBase = {
  id: 'base-alpha',
  name: 'Airbase Alpha',
  lat: 38.7,
  lng: -9.1,
  credits: 50000,
  fuel: 100000,
  missileStock: 24,
  maxAircraft: 8,
  innerLevel: 1,
  outerRadius: 50,
  buildings: [],
};

export const usePlayerStore = create<PlayerState>((set) => ({
  base: INITIAL_BASE,
  groundUnits: [],
  groups: [],
  lawsuits: [],
  casusBelli: [],
  legalInfluence: 10,
  crashHistory: [],
  missionLog: [],

  spendCredits: (amount) =>
    set((s) => ({ base: { ...s.base, credits: Math.max(0, s.base.credits - amount) } })),
  earnCredits: (amount) =>
    set((s) => ({ base: { ...s.base, credits: s.base.credits + amount } })),
  spendFuel: (amount) =>
    set((s) => ({ base: { ...s.base, fuel: Math.max(0, s.base.fuel - amount) } })),
  addFuel: (amount) =>
    set((s) => ({ base: { ...s.base, fuel: s.base.fuel + amount } })),
  spendMissile: () =>
    set((s) => ({ base: { ...s.base, missileStock: Math.max(0, s.base.missileStock - 1) } })),
  restockMissile: (count) =>
    set((s) => ({ base: { ...s.base, missileStock: s.base.missileStock + count } })),
  addLawsuit: (lawsuit) =>
    set((s) => ({ lawsuits: [...s.lawsuits, lawsuit] })),
  updateLawsuit: (id, patch) =>
    set((s) => ({ lawsuits: s.lawsuits.map((l) => l.id === id ? { ...l, ...patch } : l) })),
  addCasusBelli: (cb) =>
    set((s) => ({ casusBelli: [...s.casusBelli, cb] })),
  removeCasusBelli: (id) =>
    set((s) => ({ casusBelli: s.casusBelli.filter((c) => c.id !== id) })),
  increaseLegalInfluence: (cost) =>
    set((s) => ({
      legalInfluence: Math.min(100, s.legalInfluence + 5),
      base: { ...s.base, credits: Math.max(0, s.base.credits - cost) },
    })),
  recordCrash: (report) =>
    set((s) => ({ crashHistory: [report, ...s.crashHistory].slice(0, 50) })),
  addMissionLog: (entry) =>
    set((s) => ({ missionLog: [entry, ...s.missionLog].slice(0, 100) })),
  upgradeInner: () =>
    set((s) => ({
      base: {
        ...s.base,
        innerLevel: Math.min(5, s.base.innerLevel + 1),
        credits: s.base.credits - 15000,
      },
    })),
  expandOuter: () =>
    set((s) => ({
      base: {
        ...s.base,
        outerRadius: s.base.outerRadius + 20,
        credits: s.base.credits - 10000,
      },
    })),
  startBuilding: (building) =>
    set((s) => ({ base: { ...s.base, buildings: [...s.base.buildings, building] } })),
  completeBuilding: (id) =>
    set((s) => ({
      base: {
        ...s.base,
        buildings: s.base.buildings.filter((b) => b.id !== id),
      },
    })),
}));
```

**Step 2: Verify compiles**

Run: `npx tsc --noEmit 2>&1 | grep usePlayerStore`
Expected: no output

**Step 3: Commit**

```bash
git add src/store/usePlayerStore.ts
git commit -m "feat(store): add usePlayerStore with credits/fuel/missiles/legal/buildings state"
```

---

## Phase 4 — Game Loop Integration

### Task 8: Extend SimulationEngine with Q-Learning AI and Combat

**Files:**
- Modify: `src/systems/AIDecisionSystem.ts`
- Modify: `src/core/SimulationEngine.ts`

**Step 1: Extend AIDecisionSystem with Q-learning**

Read `src/systems/AIDecisionSystem.ts` and `src/systems/QLearningSystem.ts` in full.

In `AIDecisionSystem.ts`, import `QTable`, `createAIState` from `QLearningSystem.ts`. For each hostile aircraft, if it has a target in range:
- Call `createAIState(aircraft, target)` → state string
- Call `qTable.chooseAction(state)` → `QAction`
- Map action to heading/speed adjustment:
  - `ENGAGE` → turn toward target, increase speed
  - `NOTCH` → turn 90° to target aspect (notch radar)
  - `CRANK` → turn 45° off (crank shot)
  - `EVADE` → hard turn away + chaff
  - `RETREAT` → turn to base heading, max speed
  - `TERRAIN_MASK` → descend (reduce alt), turn to nearest terrain

**Step 2: Add combat resolution in SimulationEngine.tick()**

Read `src/core/SimulationEngine.ts` in full.

In the tick loop (after physics update), add:
- For each active missile: check if distance to target < 0.5 km → hit. Mark aircraft as crashed. Call `playerStore.recordCrash(...)` if friendly. Award credits for hostile kills. Remove missile.
- For each hostile aircraft in weapon range of a friendly: 10% chance per second to fire missile (if ammo > 0)
- For each friendly aircraft: passive revenue tick (+10 credits/sec per aircraft on patrol)

**Step 3: Verify compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: no new errors

**Step 4: Commit**

```bash
git add src/systems/AIDecisionSystem.ts src/core/SimulationEngine.ts
git commit -m "feat(engine): integrate Q-learning AI and basic combat resolution in tick loop"
```

---

## Phase 5 — HUD Action Bar

### Task 9: Add HUD Resource Bar to WarRoomDashboard

**Files:**
- Modify: `src/ui/components/WarRoomDashboard.tsx`

**Step 1: Read WarRoomDashboard**

Read `src/ui/components/WarRoomDashboard.tsx` in full. Also read `concept_base/components/HUD.tsx` lines 1-200 (top bar section).

**Step 2: Add resource bar**

Inside the header (after the STRATOSFEAR title), add a resource status row showing:
- 💰 Credits (from `usePlayerStore`)
- ⛽ Fuel (formatted in kL)
- 🚀 Missiles

Use existing `glass-panel` CSS class and `text-emerald-400` color. Numbers should update reactively.

Example JSX to add inside the header div:
```tsx
const { base } = usePlayerStore();
// ...
<div className="flex gap-6 text-xs font-mono">
  <span className="text-emerald-400">
    💰 {base.credits.toLocaleString()}
  </span>
  <span className="text-blue-400">
    ⛽ {(base.fuel / 1000).toFixed(1)}kL
  </span>
  <span className="text-red-400">
    🚀 ×{base.missileStock}
  </span>
</div>
```

**Step 3: Add action buttons row**

Below the resource bar, add a row of action buttons:
`SCRAMBLE` | `MISSION CONTROL` | `INTEL` | `NEWS` | `MARKETS` | `LEGAL` | `INCIDENTS` | `BUILD`

Each button calls `setModal(name)` from a local `useState`. Use `button` with class `hud-btn` (define in index.css: `border border-emerald-700/50 bg-emerald-900/20 text-emerald-400 px-3 py-1 text-xs font-mono hover:bg-emerald-700/30 transition-colors`).

**Step 4: Wire modal state**

Add `const [activeModal, setActiveModal] = useState<string | null>(null)` to `WarRoomDashboard`. Render the appropriate modal component (to be created in Phase 6) based on `activeModal`.

**Step 5: Verify no TS errors**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 6: Commit**

```bash
git add src/ui/components/WarRoomDashboard.tsx src/index.css
git commit -m "feat(hud): add resource bar and action button row to WarRoomDashboard"
```

---

## Phase 6 — Modals

### Task 10: WelcomeTerminal Modal

**Files:**
- Create: `src/ui/components/WelcomeTerminal.tsx`
- Modify: `src/ui/components/WarRoomDashboard.tsx`

**Step 1: Port WelcomeTerminal from concept_base**

Read `concept_base/components/WelcomeTerminal.tsx` in full.

Create `src/ui/components/WelcomeTerminal.tsx` keeping all text/lore but restyling to match `src/` aesthetic:
- Background: `bg-slate-950/95`
- Border: `border border-emerald-700/50`
- Title: `text-emerald-400 font-mono text-xl`
- Body: `text-slate-300 font-mono text-sm`
- Close button: `bg-emerald-700 hover:bg-emerald-600 text-white`
- Add `glass-panel` class to the container

**Step 2: Show on first load**

In `WarRoomDashboard.tsx`, add:
```tsx
const [showWelcome, setShowWelcome] = useState(() => {
  return !localStorage.getItem('airstrike_welcomed');
});
```
When closed: `localStorage.setItem('airstrike_welcomed', '1')`.

**Step 3: Commit**

```bash
git add src/ui/components/WelcomeTerminal.tsx src/ui/components/WarRoomDashboard.tsx
git commit -m "feat(ui): add WelcomeTerminal intro modal shown on first load"
```

---

### Task 11: ScrambleModal

**Files:**
- Create: `src/ui/components/ScrambleModal.tsx`

**Step 1: Port from concept_base HUD**

Read `concept_base/components/HUD.tsx` and find the ScrambleModal section (~lines 400-600).

Create `src/ui/components/ScrambleModal.tsx` with:
- Aircraft type dropdown (populate from `AircraftRegistry`)
- Fuel slider (100L to `base.fuel` max)
- Missile count selector (0 to 4, up to `base.missileStock`)
- Base selector (always "Airbase Alpha" for now)
- LAUNCH button → dispatches `scramble` action (adds aircraft to `useSimulationState`)
- Cancel button
- Restyle with `glass-panel`, emerald colors, font-mono

**Step 2: Wire SCRAMBLE button**

In `WarRoomDashboard.tsx`, add `{activeModal === 'scramble' && <ScrambleModal onClose={() => setActiveModal(null)} />}`.

**Step 3: Commit**

```bash
git add src/ui/components/ScrambleModal.tsx src/ui/components/WarRoomDashboard.tsx
git commit -m "feat(ui): add ScrambleModal for launching aircraft from player base"
```

---

### Task 12: MissionControlModal

**Files:**
- Create: `src/ui/components/MissionControlModal.tsx`

**Step 1: Port from concept_base HUD**

Read `concept_base/components/HUD.tsx` mission control section.

Create `src/ui/components/MissionControlModal.tsx` with:
- List of friendly aircraft (from `useSimulationState`)
- Per-aircraft: current status, fuel remaining, missile count, LAND button, ECM toggle
- Mission assignment: select aircraft → select mission type (PATROL / CAP / STRIKE / ESCORT) → ASSIGN
- Restyle with `glass-panel`, emerald colors

**Step 2: Wire MISSION CONTROL button**

In `WarRoomDashboard.tsx`, add `{activeModal === 'missionControl' && <MissionControlModal onClose={() => setActiveModal(null)} />}`.

**Step 3: Commit**

```bash
git add src/ui/components/MissionControlModal.tsx src/ui/components/WarRoomDashboard.tsx
git commit -m "feat(ui): add MissionControlModal for aircraft management"
```

---

### Task 13: NewsModal

**Files:**
- Create: `src/ui/components/NewsModal.tsx`

**Step 1: Port from concept_base**

Read `concept_base/components/NewsModal.tsx` in full.

Create `src/ui/components/NewsModal.tsx` showing:
- List of `NewsEvent[]` from `useWarRoomStore`
- Each item: timestamp, headline, body, severity badge
- Severity colors: CRITICAL=red, HIGH=orange, MEDIUM=yellow, LOW=emerald
- Scrollable list with `glass-panel` container

**Step 2: Wire NEWS button**

**Step 3: Commit**

```bash
git add src/ui/components/NewsModal.tsx src/ui/components/WarRoomDashboard.tsx
git commit -m "feat(ui): add NewsModal for news briefing"
```

---

### Task 14: LegalDesk Modal

**Files:**
- Create: `src/ui/components/LegalDesk.tsx`

**Step 1: Port from concept_base**

Read `concept_base/components/LegalDesk.tsx` in full.

Create `src/ui/components/LegalDesk.tsx` with:
- Pending lawsuits list (from `usePlayerStore`)
- Per-lawsuit: charge, filed-by faction, damages claimed, deadline, three buttons: COMPLY / CONTEST / IGNORE
- COMPLY → call `updateLawsuit(id, {status:'SETTLED'})` + `spendCredits(damagesClaimed)`
- CONTEST → call `resolveContestation(lawsuit, legalInfluence)` from `legalSystem.ts`, apply outcome
- IGNORE → call `updateLawsuit(id, {status:'DISMISSED'})` (but increases hostile relations)
- Casus Belli section: list active casus belli
- Buy Legal Influence button (cost 5000 credits → +5 influence)

**Step 2: Wire LEGAL button**

**Step 3: Commit**

```bash
git add src/ui/components/LegalDesk.tsx src/ui/components/WarRoomDashboard.tsx
git commit -m "feat(ui): add LegalDesk modal for lawsuit and casus belli management"
```

---

### Task 15: WarLedger + PriceChart + DetailedMarketView

**Files:**
- Create: `src/ui/components/WarLedger.tsx`
- Create: `src/ui/components/PriceChart.tsx`
- Create: `src/ui/components/DetailedMarketView.tsx`

**Step 1: Port PriceChart**

Read `concept_base/components/PriceChart.tsx` in full.
Create `src/ui/components/PriceChart.tsx` — SVG line chart for stock history ticks. Props: `ticks: StockMarketTick[]`, `color: string`. Keep SVG math identical.

**Step 2: Port WarLedger**

Read `concept_base/components/WarLedger.tsx` in full.
Create `src/ui/components/WarLedger.tsx` with:
- Faction list with current stock price, 24h change %, `PriceChart` sparkline
- Compact / Full mode toggle

**Step 3: Port DetailedMarketView**

Read `concept_base/components/DetailedMarketView.tsx` in full.
Create `src/ui/components/DetailedMarketView.tsx` with full market analysis panel.

**Step 4: Wire MARKETS button**

**Step 5: Commit**

```bash
git add src/ui/components/WarLedger.tsx src/ui/components/PriceChart.tsx src/ui/components/DetailedMarketView.tsx src/ui/components/WarRoomDashboard.tsx
git commit -m "feat(ui): add WarLedger, PriceChart, DetailedMarketView market modals"
```

---

### Task 16: IncidentReportModal

**Files:**
- Create: `src/ui/components/IncidentReportModal.tsx`

**Step 1: Port from concept_base**

Read `concept_base/components/IncidentReportModal.tsx` in full.

Create `src/ui/components/IncidentReportModal.tsx` with:
- List of `crashHistory` from `usePlayerStore`
- Per-crash: aircraft type, pilot name, cause, location, financial damage, whether lawsuit was filed
- Sort by most recent first

**Step 2: Wire INCIDENTS button**

**Step 3: Commit**

```bash
git add src/ui/components/IncidentReportModal.tsx src/ui/components/WarRoomDashboard.tsx
git commit -m "feat(ui): add IncidentReportModal showing crash history and financial impact"
```

---

### Task 17: BuildMenu

**Files:**
- Create: `src/ui/components/BuildMenu.tsx`
- Modify: `src/store/useGameUI.ts`

**Step 1: Add buildMode to useGameUI**

In `src/store/useGameUI.ts`, add:
- `buildMode: boolean`
- `pendingBuildType: BuildingType | null`
- `setBuildMode(active: boolean): void`
- `setPendingBuildType(type: BuildingType | null): void`

**Step 2: Create BuildMenu**

`src/ui/components/BuildMenu.tsx` with:
- Inner upgrades section: HANGAR (+1 max aircraft, 15k credits), RADAR (+range, 10k), FUEL DEPOT (+50kL capacity, 8k), DEFENSE (+SAM battery, 20k). Each shows cost and current level. UPGRADE button calls `upgradeInner()`.
- Outer expansion: EXPAND TERRITORY (+20km radius, 10k credits) button calls `expandOuter()`.
- Place Structure: grid of `BuildingType` buttons. Clicking one sets `setPendingBuildType(type)` and `setBuildMode(true)` — then the user clicks on the map to place.

**Step 3: Wire BUILD button**

**Step 4: Commit**

```bash
git add src/ui/components/BuildMenu.tsx src/store/useGameUI.ts src/ui/components/WarRoomDashboard.tsx
git commit -m "feat(ui): add BuildMenu with inner upgrades, territory expansion, and structure placement"
```

---

## Phase 7 — Left Drawer Enhancement

### Task 18: Aircraft List with Per-Aircraft Controls

**Files:**
- Modify: `src/ui/components/WarRoomDashboard.tsx`

**Step 1: Find current left drawer content**

Read `src/ui/components/WarRoomDashboard.tsx`. Find where the left drawer renders aircraft.

**Step 2: Enhance with controls**

For each friendly aircraft in the left drawer list, add:
- LAND button → removes aircraft, adds fuel back to base, logs mission
- ECM TOGGLE button → sets `aircraft.ecmActive = !aircraft.ecmActive`
- FIRE MISSILE button (if `missileStock > 0` and target selected) → creates missile entity, calls `spendMissile()`

Use compact styling: small `text-xs font-mono` buttons in `text-red-400`, `text-yellow-400`, `text-emerald-400` colors.

**Step 3: Commit**

```bash
git add src/ui/components/WarRoomDashboard.tsx
git commit -m "feat(ui): add per-aircraft LAND/ECM/FIRE controls in left drawer"
```

---

## Phase 8 — Build Mode Map Integration

### Task 19: Wire Build Mode Click Handler to TacticalMap

**Files:**
- Modify: `src/ui/components/TacticalMap.tsx`

**Step 1: Read TacticalMap**

Read `src/ui/components/TacticalMap.tsx` in full.

**Step 2: Add build placement click handler**

In TacticalMap, use `useGameUI` to check `buildMode` and `pendingBuildType`. If buildMode is active:
- Add a Leaflet `useMapEvents` click handler
- On click: call `playerStore.startBuilding({ id: uuid(), type: pendingBuildType, lat, lng, cost, buildTimeMs: 30000, startedAt: Date.now(), completedAt: Date.now() + 30000 })`
- Clear `setPendingBuildType(null)` and `setBuildMode(false)` after placement
- Render placed buildings as `CircleMarker` on the map with appropriate icons/colors

**Step 3: Commit**

```bash
git add src/ui/components/TacticalMap.tsx
git commit -m "feat(map): wire build mode click handler to place buildings on TacticalMap"
```

---

## Phase 9 — Final Polish & Verification

### Task 20: ErrorBoundary

**Files:**
- Create: `src/ui/components/ErrorBoundary.tsx`
- Modify: `src/App.tsx`

**Step 1: Port ErrorBoundary from concept_base**

Read `concept_base/components/ErrorBoundary.tsx`. Port it verbatim, just change styles to match `src/` (dark bg, emerald text).

**Step 2: Wrap App**

In `src/App.tsx`, wrap `<WarRoomDashboard />` with `<ErrorBoundary>`.

**Step 3: Commit**

```bash
git add src/ui/components/ErrorBoundary.tsx src/App.tsx
git commit -m "feat(ui): add ErrorBoundary to prevent full-page crashes"
```

---

### Task 21: Full Build Verification

**Step 1: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1
```
Expected: 0 errors (or same pre-existing errors as before, none new)

**Step 2: Run dev server**

```bash
pnpm dev
```
Expected: server starts on port 5173 with no console errors

**Step 3: Smoke test in browser**

Manual checks:
- [ ] STRATOSFEAR header visible
- [ ] Credits / Fuel / Missiles resource bar visible
- [ ] All 8 HUD buttons visible (SCRAMBLE, MISSION CONTROL, INTEL, NEWS, MARKETS, LEGAL, INCIDENTS, BUILD)
- [ ] WelcomeTerminal appears on first load, dismissed with button
- [ ] SCRAMBLE button opens ScrambleModal
- [ ] Launching aircraft adds it to TacticalMap
- [ ] NEWS button opens NewsModal
- [ ] LEGAL button opens LegalDesk
- [ ] MARKETS button opens WarLedger
- [ ] INCIDENTS button opens IncidentReportModal
- [ ] BUILD button opens BuildMenu
- [ ] Left drawer shows aircraft with LAND/ECM/FIRE buttons
- [ ] Simulation ticks (aircraft move on map)
- [ ] No uncaught console errors

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete port of concept_base features into src/ frontend"
```

---

## Execution Notes

- Do NOT replace src/ architecture with concept_base monolithic store
- Do NOT use `as any`, `@ts-ignore`, or `@ts-expect-error`
- Keep all visual styles: `bg-slate-950`, `text-emerald-400`, `glass-panel` class, `font-mono`, scanlines
- All modals should be absolute/fixed positioned overlays with `z-50` or higher
- When in doubt about styling, reference `src/index.css` and existing components
- Prefer `usePlayerStore` for all player-specific state, `useWarRoomStore` for faction-level state
