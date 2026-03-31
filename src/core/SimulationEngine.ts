import { simulationClock } from "../core/SimulationClock";
import { eventBus } from "../core/EventBus";
import { aircraftRegistry } from "../plugins/AircraftRegistry";
import { missileRegistry } from "../plugins/MissileRegistry";
import { spatialIndex } from "../systems/SpatialIndex";
import { detectionSystem } from "../systems/DetectionSystem";
import { physicsSystem } from "../systems/PhysicsSystem";
import { useSimulationState } from "../store/useSimulationState";
import { useWarRoomStore } from "../store/useWarRoomStore";
import { Aircraft, Missile, GameState, Base, Side } from "../types/entities";
import {
  AircraftLaunchedEvent,
  MissileFireEvent,
  CollisionEvent,
} from "../types/events";
import { factionRegistry } from "../plugins/FactionRegistry";
import { passiveObjectiveSystem } from "../systems/PassiveObjectiveSystem";
import { diplomacySystem } from "../systems/DiplomacySystem";
import { FactionState, NewsArticle, PassiveObjective } from "../types/geopolitics";

/**
 * Coordinate Mapping: Transforms 2D grid coords (0-1000) to Latitude/Longitude (Black Sea Region approx)
 */
const mapToLatLng = (x: number, y: number) => ({
  lat: 44.0 + (y - 500) / 100,
  lng: 34.0 + (x - 500) / 100,
});

export class SimulationEngine {
  private aircraft: Map<string, Aircraft> = new Map();
  private missiles: Map<string, Missile> = new Map();
  private bases: Map<string, Base> = new Map();
  private isInitialized = false;

  initialize(): void {
    if (this.isInitialized) return;

    spatialIndex.clear();
    this.aircraft.clear();
    this.missiles.clear();
    this.bases.clear();

    const factions = factionRegistry.getAll();
    factions.forEach((f) => {
      const pos = mapToLatLng(f.homeBase.x, f.homeBase.y);
      const side = f.id === 'PLAYER' ? Side.FRIENDLY : 
                   f.allegiance === 'BLUE' ? Side.ALLY :
                   f.allegiance === 'RED' ? Side.HOSTILE : Side.NEUTRAL;
      
      const base: Base = {
        id: `BASE_${f.id}`,
        name: f.name,
        position: pos,
        side: side,
        factionId: f.id,
        factionColor: side === Side.FRIENDLY ? '#10b981' : side === Side.HOSTILE ? '#ef4444' : '#3b82f6',
        credits: f.startingCredits,
        fuelStock: 100000,
        missileStock: { 'AIM-120C': 50, 'AIM-9X': 50, 'R-77': 50 },
        radarRange: f.homeBase.radius || 150,
        radarMode: 'ActiveScan',
        maxAircraft: 24,
        buildings: [],
      };
      this.bases.set(base.id, base);
    });

    const f16 = this.createAircraft("F-16C-001", "F-16C", {
      ...mapToLatLng(512, 512),
      altitude: 5000,
    });
    this.aircraft.set(f16.id, f16);

    const su27 = this.createAircraft("Su-27-001", "Su-27", {
      ...mapToLatLng(700, 700),
      altitude: 6000,
    });
    this.aircraft.set(su27.id, su27);

    this.isInitialized = true;
    this.initializeWarRoom();
    
    // Trigger initial store update
    this.updateStore();
  }

  private initializeWarRoom(): void {
    const factionSpecs = factionRegistry.getAll();
    const warRoomStore = useWarRoomStore.getState();

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

    warRoomStore.initializeFactions(factionStates);
    diplomacySystem.initializeRelationships(factionSpecs.map((f) => f.id));
    warRoomStore.setRelationships(diplomacySystem.getAllRelationships());

    // Add Initial Intel stream items
    const initialNews: NewsArticle[] = [
      { id: '1', headline: 'COMMAND CENTER ONLINE: GLOBAL MONITOR ACTIVE', timestamp: Date.now(), category: 'INFO', importance: 5, bias: 'NEUTRAL' },
      { id: '2', headline: 'BLUE ALLIANCE MOBILIZING IN SOUTH QUADRANT', timestamp: Date.now() - 5000, category: 'MILITARY', importance: 7, bias: 'NEUTRAL' },
      { id: '3', headline: 'ENERGY MARKETS FLUCTUATE AMID TENSION', timestamp: Date.now() - 15000, category: 'ECONOMY', importance: 3, bias: 'PATRIOTIC' },
    ];
    warRoomStore.addNewsArticle(initialNews[0]);
    warRoomStore.addNewsArticle(initialNews[1]);
    warRoomStore.addNewsArticle(initialNews[2]);

    // Add Initial Objectives for Player
    const playerObjectives: PassiveObjective[] = [
      { id: 'OBJ_1', factionId: 'PLAYER', title: 'AIR SUPERIORITY', description: 'Maintain clear skies over Odesa.', status: 'ACTIVE', progress: 15, importance: 8, rewardCredits: 5000, revenuePerTick: 10, assignedAircraft: [], type: 'STRATEGIC' },
      { id: 'OBJ_2', factionId: 'PLAYER', title: 'RADAR EXPANSION', description: 'Extend coverage into Neutral zones.', status: 'ACTIVE', progress: 45, importance: 4, rewardCredits: 2000, revenuePerTick: 5, assignedAircraft: [], type: 'INFRASTRUCTURE' },
    ];
    playerObjectives.forEach(obj => warRoomStore.addObjective(obj));

    // Select Player by default
    warRoomStore.setSelectedFaction('PLAYER');
  }

  tick(): void {
    const currentTick = simulationClock.advanceTick();
    const deltaTimeMs = currentTick.deltaMs;

    // Movement: Update Aircraft positions
    this.aircraft.forEach((ac) => {
      const headingRad = (ac.heading || 0) * Math.PI / 180;
      const speed = (ac.speed || 100);
      const throttle = (ac.throttle ?? 0.5);
      const step = (speed * throttle * deltaTimeMs) / 1000000;

      ac.position.lat += Math.cos(headingRad) * step;
      ac.position.lng += Math.sin(headingRad) * step;

      // Wrap-around or bound check if needed, but for now simple increment
      if (isNaN(ac.position.lat)) ac.position.lat = 44.0;
      if (isNaN(ac.position.lng)) ac.position.lng = 34.0;
    });

    // Update Missiles
    this.missiles.forEach((m) => {
      const headingRad = (m.heading || 0) * Math.PI / 180;
      const step = ((m.speed || 500) * deltaTimeMs) / 1000000;
      m.position.lat += Math.cos(headingRad) * step;
      m.position.lng += Math.sin(headingRad) * step;
    });

    this.updateStore();
    this.updateWarRoomStore();
  }

  private updateWarRoomStore(): void {
    const warRoomStore = useWarRoomStore.getState();
    const currentTick = simulationClock.getCurrentTick();
    warRoomStore.setGameTime(currentTick.count * 100);
    
    // In a real simulation, we would periodically add new articles or update objectives here
  }

  private updateStore(): void {
    const allBases = Array.from(this.bases.values());
    const gameState: GameState = {
      aircraft: this.aircraft,
      missileMap: this.missiles,
      aircrafts: Array.from(this.aircraft.values()),
      missiles: Array.from(this.missiles.values()),
      friendlyBase: allBases.find(b => b.side === Side.FRIENDLY)!,
      hostileBases: allBases.filter(b => b.side === Side.HOSTILE),
      allyBases: allBases.filter(b => b.side === Side.ALLY),
      neutralBases: allBases.filter(b => b.side === Side.NEUTRAL),
      tick: simulationClock.getCurrentTick().count,
      isPaused: false,
      elapsedSeconds: simulationClock.getCurrentTick().count / 60,
      groundUnits: [],
      selectedAircraftId: useSimulationState.getState().gameState.selectedAircraftId,
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

  private createAircraft(
    id: string,
    aircraftType: string,
    position: { lat: number; lng: number; altitude: number }
  ): Aircraft {
    const spec = aircraftRegistry.get(aircraftType)!;
    return {
      id,
      specId: aircraftType,
      side: id.includes('Su') ? Side.HOSTILE : Side.FRIENDLY,
      status: 'CRUISE' as 'CRUISE',
      position: { ...position },
      altitude: position.altitude,
      heading: id.includes('Su') ? 180 : 0,
      speed: 100,
      throttle: 0.5,
      fuel: spec.fuelCapacityL * 0.8,
      health: 100,
      missiles: {},
      gunAmmo: 500,
      flares: 30,
      countermeasures: 30,
      ecmActive: false,
      isDamaged: false,
      trail: [],
    } as any;
  }

  launchAircraft(aircraftType: string): string {
    const base = Array.from(this.bases.values()).find(b => b.side === Side.FRIENDLY);
    if (!base) return "";
    const id = `${aircraftType}-${Date.now()}`;
    const ac = this.createAircraft(id, aircraftType, { ...base.position, altitude: 0 });
    this.aircraft.set(id, ac);
    return id;
  }

  fireMissile(aircraftId: string, targetId: string, missileType: string): void { }
  getAircraft(): Map<string, Aircraft> { return new Map(this.aircraft); }
  getMissiles(): Map<string, Missile> { return new Map(this.missiles); }
  reset(): void { this.isInitialized = false; this.initialize(); }
}

export const simulationEngine = new SimulationEngine();
