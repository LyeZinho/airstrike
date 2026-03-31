import { simulationClock } from "../core/SimulationClock";
import { eventBus } from "../core/EventBus";
import { aircraftRegistry } from "../plugins/AircraftRegistry";
import { missileRegistry } from "../plugins/MissileRegistry";
import { spatialIndex } from "../systems/SpatialIndex";
import { detectionSystem } from "../systems/DetectionSystem";
import { physicsSystem } from "../systems/PhysicsSystem";
import { useSimulationState } from "../store/useSimulationState";
import { useWarRoomStore } from "../store/useWarRoomStore";
import { Aircraft, Missile, GameState } from "../types/entities";
import {
  AircraftLaunchedEvent,
  MissileFireEvent,
  CollisionEvent,
} from "../types/events";
import { factionRegistry } from "../plugins/FactionRegistry";
import { passiveObjectiveSystem } from "../systems/PassiveObjectiveSystem";
import { diplomacySystem } from "../systems/DiplomacySystem";
import { FactionState } from "../types/geopolitics";

/**
 * Central simulation orchestrator.
 * Manages all systems: clock, physics, detection, registries.
 * Called once per tick by React.
 * 
 * Tick flow:
 * 1. Advance clock
 * 2. Update physics (positions, fuel)
 * 3. Update spatial index
 * 4. Detection (radar)
 * 5. Collision detection
 * 6. Update store
 * 7. Emit events
 */
export class SimulationEngine {
  private aircraft: Map<string, Aircraft> = new Map();
  private missiles: Map<string, Missile> = new Map();
  private isInitialized = false;

  /**
   * Initialize the engine with starting aircraft/units.
   */
  initialize(): void {
    if (this.isInitialized) return;

    spatialIndex.clear();
    const f16Spec = aircraftRegistry.get("F-16C");
    if (f16Spec) {
      const f16 = this.createAircraft("F-16C-001", "F-16C", {
        x: 0,
        y: 0,
        altitude: 5000,
      });
      this.aircraft.set(f16.id, f16);
      spatialIndex.updateAircraft(
        f16.id,
        f16.position.x,
        f16.position.y,
        f16.spec.rcsFrontal
      );
    }

    const suSpec = aircraftRegistry.get("Su-27");
    if (suSpec) {
      const su27 = this.createAircraft("Su-27-001", "Su-27", {
        x: 100,
        y: 100,
        altitude: 6000,
      });
      this.aircraft.set(su27.id, su27);
      spatialIndex.updateAircraft(
        su27.id,
        su27.position.x,
        su27.position.y,
        su27.spec.rcsFrontal
      );
    }

    this.isInitialized = true;

    eventBus.emit({
      type: "SimulationInitialized",
      timestamp: Date.now(),
    });

    this.initializeWarRoom();
  }

  private initializeWarRoom(): void {
    const factionSpecs = factionRegistry.getAll();
    const factionStates: FactionState[] = factionSpecs.map((spec) => ({
      id: spec.id,
      specId: spec.id,
      credits: spec.startingCredits,
      fuel: 10000,
      morale: 80,
      posture: 'DEFENSIVE',
      activeAircraft: [],
      activeObjectives: [],
      aiDecisionQueue: [],
      lastTickTime: Date.now(),
    }));

    useWarRoomStore.getState().initializeFactions(factionStates);
    diplomacySystem.initializeRelationships(factionSpecs.map((f) => f.id));
    useWarRoomStore.getState().setRelationships(diplomacySystem.getAllRelationships());
  }

  /**
   * Step the simulation forward by one tick.
   */
  tick(): void {
    const currentTick = simulationClock.advanceTick();
    const deltaTimeMs = currentTick.deltaMs;

    // Phase 1: Update physics
    this.aircraft.forEach((aircraft) => {
      physicsSystem.updateAircraftPosition(aircraft, deltaTimeMs);
    });

    this.missiles.forEach((missile) => {
      physicsSystem.updateMissilePosition(missile, deltaTimeMs);
    });

    // Phase 2: Detection (radar)
    this.aircraft.forEach((radar) => {
      const detected = detectionSystem.detectAircraft(radar, this.aircraft);
      radar.detectedTargets = detected;

      const missileWarning = detectionSystem.detectMissiles(radar, this.missiles);
      radar.incomingMissiles = missileWarning;
    });

    // Phase 3: Collision detection
    this.missiles.forEach((missile) => {
      this.aircraft.forEach((target) => {
        if (physicsSystem.testCollision(missile, target)) {
          eventBus.emit({
            type: "Collision",
            timestamp: Date.now(),
            missileId: missile.id,
            targetId: target.id,
            position: target.position,
          } as CollisionEvent);

          this.missiles.delete(missile.id);
          spatialIndex.removeMissile(missile.id);

          target.health -= 50;
          if (target.health <= 0) {
            this.aircraft.delete(target.id);
            spatialIndex.removeAircraft(target.id);
          }
        }
      });
    });

    // Phase 4: Remove expired missiles
    this.missiles.forEach((missile) => {
      if (missile.fuelRemaining <= 0) {
        this.missiles.delete(missile.id);
        spatialIndex.removeMissile(missile.id);
      }
    });

    // Phase 5: Update store
    this.updateStore();
    this.updateWarRoomStore();
  }

  private updateWarRoomStore(): void {
    const warRoomStore = useWarRoomStore.getState();
    const factions = warRoomStore.factions;

    factions.forEach((factionState) => {
      const objectives = warRoomStore.getActiveFactionObjectives(factionState.id);
      const revenue = passiveObjectiveSystem.calculateFactionRevenue(objectives, 1.2);
      warRoomStore.updateFactionState(factionState.id, {
        credits: factionState.credits + revenue,
      });
    });

    const currentTick = simulationClock.getCurrentTick();
    warRoomStore.setGameTime(currentTick * 100);
  }

  /**
   * Fire a missile from an aircraft at a target.
   */
  fireMissile(aircraftId: string, targetId: string, missileType: string): void {
    const aircraft = this.aircraft.get(aircraftId);
    const target = this.aircraft.get(targetId);

    if (!aircraft || !target) return;

    const missileSpec = missileRegistry.get(missileType);
    if (!missileSpec) return;

    const missile = this.createMissile(missileType, {
      x: aircraft.position.x,
      y: aircraft.position.y,
      altitude: aircraft.position.altitude,
    });

    missile.targetId = targetId;
    this.missiles.set(missile.id, missile);

    spatialIndex.updateMissile(
      missile.id,
      missile.position.x,
      missile.position.y
    );

    eventBus.emit({
      type: "MissileFire",
      timestamp: Date.now(),
      aircraftId,
      missileId: missile.id,
      targetId,
    } as MissileFireEvent);
  }

  /**
   * Launch an aircraft from base.
   */
  launchAircraft(aircraftType: string): string {
    const spec = aircraftRegistry.get(aircraftType);
    if (!spec) return "";

    const id = `${aircraftType}-${Date.now()}`;
    const aircraft = this.createAircraft(id, aircraftType, {
      x: 0,
      y: 0,
      altitude: 0,
    });

    this.aircraft.set(id, aircraft);
    spatialIndex.updateAircraft(
      id,
      aircraft.position.x,
      aircraft.position.y,
      aircraft.spec.rcsFrontal
    );

    eventBus.emit({
      type: "AircraftLaunched",
      timestamp: Date.now(),
      aircraftId: id,
      aircraftType,
    } as AircraftLaunchedEvent);

    return id;
  }

  /**
   * Create an aircraft entity from spec.
   */
  private createAircraft(
    id: string,
    aircraftType: string,
    position: { x: number; y: number; altitude: number }
  ): Aircraft {
    const spec = aircraftRegistry.get(aircraftType)!;

    return {
      id,
      spec,
      position: { ...position },
      targetAltitude: position.altitude,
      heading: 0,
      currentSpeed: 50,
      throttle: 50,
      fuelRemaining: spec.fuelCapacityL * 0.8,
      health: 100,
      status: "Active",
      detectedTargets: [],
      incomingMissiles: [],
    };
  }

  /**
   * Create a missile entity from spec.
   */
  private createMissile(
    missileType: string,
    position: { x: number; y: number; altitude: number }
  ): Missile {
    const spec = missileRegistry.get(missileType)!;

    return {
      id: `${missileType}-${Date.now()}`,
      spec,
      position: { ...position },
      targetAltitude: position.altitude,
      heading: 0,
      launchX: position.x,
      launchY: position.y,
      fuelRemaining: spec.rangeMax,
      targetId: null,
    };
  }

  /**
   * Update the Zustand store with current game state.
   */
  private updateStore(): void {
    const gameState: GameState = {
      // Maps for performance
      aircraft: this.aircraft,
      missileMap: this.missiles,
      
      // Arrays for UI compatibility
      aircrafts: Array.from(this.aircraft.values()),
      missiles: Array.from(this.missiles.values()),
      
      // Required state fields
      tick: simulationClock.getCurrentTick().count,
      isPaused: false,
      elapsedSeconds: simulationClock.getCurrentTick().count / 60,
      
      // Defaults for remaining GameState fields to prevent undefined errors
      friendlyBase: {} as any,
      hostileBases: [],
      allyBases: [],
      neutralBases: [],
      groundUnits: [],
      selectedAircraftId: null,
      logs: [],
      trailDensity: 1.0,
      groups: [],
      pendingTargetId: null,
      pendingBuildings: [],
      buildMode: false,
      outerBaseExpansionMode: false,
      selectedBuildingType: null,
      factions: [],
      relationships: [],
      activeObjectives: [],
      crashHistory: [],
    };

    useSimulationState.getState().updateGameState(gameState);
  }

  /**
   * Get current aircraft map.
   */
  getAircraft(): Map<string, Aircraft> {
    return new Map(this.aircraft);
  }

  /**
   * Get current missiles map.
   */
  getMissiles(): Map<string, Missile> {
    return new Map(this.missiles);
  }

  /**
   * Pause/resume simulation.
   */
  setPaused(paused: boolean): void {
    simulationClock.setPaused(paused);
  }

  /**
   * Reset simulation to initial state.
   */
  reset(): void {
    this.aircraft.clear();
    this.missiles.clear();
    spatialIndex.clear();
    simulationClock.reset();
    this.isInitialized = false;
    this.initialize();
  }
}

export const simulationEngine = new SimulationEngine();
