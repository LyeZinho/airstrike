# Execution Checklist - Air Strike Refactoring

## Pre-Execution Verification

- [x] Code analysis complete (`concept_base/` archived)
- [x] Performance bottlenecks identified (audit complete)
- [x] Architecture designed (modular, plugin-based)
- [x] Implementation plan documented (953 lines, 34 tasks)
- [x] Risk assessment done (LOW)
- [x] Rollback strategy defined
- [x] Git history preserved

## File Structure Changes

### BEFORE (Current)
```
src/                                  (monolithic)
├── components/                       (13 files)
│   ├── TacticalMap.tsx (540 lines)  ← FAT
│   ├── HUD.tsx
│   └── ...
├── constants/
│   ├── specs.ts (407 lines)         ← HARDCODED specs
│   ├── missiles.ts (130 lines)
│   └── economy.ts (107 lines)
├── store/
│   └── useGameStore.ts (1,204 lines) ← GOD OBJECT
├── utils/
│   ├── physics.ts (111 lines)
│   ├── qLearning.ts
│   └── ...
└── types/
    └── game.ts                       ← MIXED types
```

### AFTER (New)
```
src/                                  (modular)
├── core/                             (NEW)
│   ├── SimulationClock.ts           ← Time source
│   ├── SimulationEngine.ts          ← Orchestrator
│   └── EventBus.ts                  ← Events
├── systems/                          (NEW)
│   ├── PhysicsSystem.ts             ← Calculations
│   ├── DetectionSystem.ts           ← Radar
│   ├── AISystem.ts                  ← Enemy AI
│   └── SpatialIndex.ts              ← O(1) queries
├── entities/                         (NEW)
│   ├── Aircraft.ts
│   ├── Missile.ts
│   └── Base.ts
├── plugins/                          (NEW)
│   ├── RegistryBase.ts              ← Abstract
│   ├── AircraftRegistry.ts          ← Aircraft specs
│   ├── MissileRegistry.ts           ← Missile specs
│   ├── builtin-aircraft.ts          ← Config
│   └── builtin-missiles.ts
├── store/                            (REFACTORED)
│   ├── useGameUI.ts                 ← UI only
│   └── useSimulationState.ts        ← Snapshot
├── ui/                               (NEW - components)
│   ├── components/
│   │   ├── TacticalMap.tsx          ← Simplified
│   │   ├── HUD.tsx
│   │   └── ...
│   └── hooks/
│       └── useGameEngine.ts         ← NEW
├── types/                            (CONSOLIDATED)
│   ├── index.ts
│   ├── entities.ts                  ← Game objects
│   └── events.ts                    ← Event types
├── workers/                          (OPTIMIZED)
│   ├── physics.worker.ts
│   └── ai.worker.ts
└── lib/
    └── utils.ts
```

### ARCHIVE
```
concept_base/                         (REFERENCE)
├── components/
├── constants/
├── store/
├── types/
├── utils/
└── workers/
```

## Task Breakdown

### Phase 1: Foundation (1 hour, 6 files)
```
[ ] 1.1: Project structure bootstrap
      mkdir -p src/core src/systems src/entities src/plugins ...
      
[ ] 1.2: SimulationClock.ts
      - Tick-based time system
      - Independent of React rendering
      
[ ] 1.2: EventBus.ts
      - Event emission and subscription
      - Decoupled communication
      
[ ] 1.3: Consolidated types
      - entities.ts (Aircraft, Missile, Base, etc.)
      - events.ts (GameEvent types)
      - index.ts (exports)
```

### Phase 2: Registry System (1 hour, 3 files)
```
[ ] 2.1: RegistryBase.ts
      - Generic registry pattern
      - get(), has(), register(), getAll()
      
[ ] 2.1: AircraftRegistry.ts
      - Extends RegistryBase
      - Registers 7 aircraft specs
      
[ ] 2.1: MissileRegistry.ts
      - Extends RegistryBase
      - Registers 8 missile specs
```

### Phase 3: Physics Optimization (1.5 hours, 3 files)
```
[ ] 3.1: SpatialIndex.ts
      - Grid-based spatial partitioning
      - O(1) nearby queries
      
[ ] 3.1: DetectionSystem.ts
      - Radar horizon calculations
      - Uses SpatialIndex for speed
      
[ ] 3.2: PhysicsSystem.ts
      - Position updates (delta only)
      - Altitude, fuel, heading changes
      - Batch update support
```

### Phase 4: Store Refactoring (1 hour, 2 files)
```
[ ] 4.1: useGameUI.ts
      - selectedEntityId
      - pendingTargetId
      - buildMode
      - logs (UI only)
      
[ ] 4.1: useSimulationState.ts
      - Read-only snapshot from engine
      - No mutations
      - Memoized selectors
```

### Phase 5: Engine & Orchestration (1.5 hours, 1 file)
```
[ ] 5.1: SimulationEngine.ts
      - Coordinates all systems
      - Orchestrates physics → detection → AI
      - Manages state transitions
      - Emits events for UI
```

### Phase 6: UI Components (1 hour, 5 files)
```
[ ] 6.1: useGameEngine.ts (hook)
      - Connects React to SimulationEngine
      - Exposes game commands (scramble, fire, etc.)
      
[ ] 6.1: TacticalMap.tsx (rewritten)
      - Simplified (read-only props)
      - Memoized rendering
      - No more store subscriptions
      
[ ] 6.1: Other UI components
      - HUD.tsx, Comms.tsx, etc.
      - Same refactoring pattern
```

### Phase 7: Migration (1.5 hours, 10 files)
```
[ ] 7.1: Migrate aircraft specs
      - F-22, Su-57, F-15E, etc.
      - Register in AircraftRegistry
      
[ ] 7.1: Migrate missile specs
      - AIM-120C, R-77, Meteor, etc.
      - Register in MissileRegistry
      
[ ] 7.1: Migrate utility functions
      - Move physics.ts → PhysicsSystem.ts
      - Move detection logic → DetectionSystem.ts
      
[ ] 7.1: Update imports everywhere
      - src/ui/components → use new paths
      - All references point to registries
```

### Phase 8: Testing & Validation (1.5 hours, 0 files)
```
[ ] 8.1: Performance benchmarks
      - Before: 30ms/frame at 100 aircraft
      - After: <5ms/frame target
      
[ ] 8.1: Functional testing
      - Aircraft spawning works
      - Combat logic works
      - UI updates correctly
      
[ ] 8.1: Memory profiling
      - Garbage allocation reduced
      - No memory leaks
      
[ ] 8.1: Extensibility test
      - Add F-35 aircraft (1 registry line)
      - Verify it works immediately
```

## Key Metrics to Track

### Before
```
Detection time (100 aircraft):   15ms  ← O(n²)
Memory allocation/sec:          60MB  ← State cloning
TacticalMap render time:         7ms   ← Every frame
Physics on main thread:          Yes   ← Blocks rendering
Component re-renders/sec:        60    ← Every frame
```

### After
```
Detection time (100 aircraft):   0.2ms ← O(1)
Memory allocation/sec:          1MB   ← Delta updates only
TacticalMap render time:         0.5ms ← Only on change
Physics on main thread:          No    ← Web Worker
Component re-renders/sec:        ~10   ← When needed
```

## Extensibility Test Case

After refactoring, verify this works **without any core code changes**:

```typescript
// Add to src/plugins/builtin-aircraft.ts

aircraftRegistry.register('F-35', {
  model: 'F-35 Lightning II',
  manufacturer: 'Lockheed Martin',
  role: 'Fighter',
  maxSpeedMach: 1.6,
  radarRangeKm: 185,
  fuelCapacityL: 35000,
  fuelConsumptionBase: 110,
  maxAltitudeFt: 50000,
  missileCapacity: { 'AIM-120C': 4, 'AIM-9X': 2 },
  gunAmmo: 25000,
  flaresCapacity: 60,
  countermeasuresCapacity: 120,
  rcsFromal: 0.005,
  rcsSide: 0.1,
  stealthFactor: 0.8
});
```

**Expected**: F-35 immediately available in game, all systems work, no crashes, no testing needed

---

## Rollback Plan

If execution encounters critical issues:

```bash
# 1. Revert to last working state
git reset --hard ec54068

# 2. Delete broken src/
rm -rf src/

# 3. Restore from concept_base (if needed)
cp -r concept_base/src ./src

# 4. Continue with backup plan
```

---

## Sign-Off Checklist

- [x] Plan documented
- [x] Architecture validated
- [x] Risk assessed (LOW)
- [x] Rollback strategy ready
- [ ] Ready for execution (awaiting approval)

---

**Status**: Ready for Execution
**Execution Method**: superpowers:executing-plans (separate session)
**Estimated Time**: 8-10 hours
**Estimated File
