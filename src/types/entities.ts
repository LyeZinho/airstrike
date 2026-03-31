import { Tick } from '../core/SimulationClock';
import { FactionState, FactionRelationship, PassiveObjective, IncidentReport, StockMarket } from './geopolitics';

export type Coordinates = { lat: number; lng: number };

export enum Side {
  FRIENDLY = 'FRIENDLY',
  ALLY = 'ALLY',
  HOSTILE = 'HOSTILE',
  NEUTRAL = 'NEUTRAL'
}

export enum AircraftStatus {
  HANGAR = 'HANGAR',
  STARTUP = 'STARTUP',
  TAXI = 'TAXI',
  TAKEOFF = 'TAKEOFF',
  CLIMB = 'CLIMB',
  CRUISE = 'CRUISE',
  COMBAT = 'COMBAT',
  DAMAGED = 'DAMAGED',
  RTB = 'RTB',
  LANDING = 'LANDING',
  DESTROYED = 'DESTROYED',
  REST_IN_ACTION = 'REST_IN_ACTION'
}

export enum MissionType {
  PATROL = 'PATROL',
  INTERCEPT = 'INTERCEPT',
  STRIKE = 'STRIKE',
  CARGO = 'CARGO',
  DEFENSE = 'DEFENSE',
  LOITER = 'LOITER',
  RECON = 'RECON',
  SEAD = 'SEAD'
}

export enum MissileType {
  SHORT_RANGE = 'SHORT_RANGE',
  MEDIUM_RANGE = 'MEDIUM_RANGE',
  LONG_RANGE = 'LONG_RANGE',
  SEAD = 'SEAD',
  GROUND_ATTACK = 'GROUND_ATTACK'
}

export type SeekerType = 'IR' | 'RADAR_ACTIVE' | 'PASSIVE_RADAR' | 'LASER' | 'TV_IR' | 'NONE';

export enum BuildingType {
  HANGAR = 'HANGAR',
  RADAR = 'RADAR',
  SAM_BATTERY = 'SAM_BATTERY',
  FUEL_DEPOT = 'FUEL_DEPOT',
  RUNWAY = 'RUNWAY',
  REFINERY = 'REFINERY',
  SUPPLY_DEPOT = 'SUPPLY_DEPOT',
  INFRASTRUCTURE = 'INFRASTRUCTURE'
}

export interface InfrastructureSpecification {
  id: string;
  name: string;
  category: 'Radar' | 'Defence' | 'Communications' | 'Logistics' | 'Command';
  costCredits: number;
  buildTimeSeconds: number;
  maintenanceCostPerHour: number;
  healthPoints: number;
  bonusEffect: {
    radarRangeMultiplier?: number;
    detectionRateBonus?: number;
    jammerStrength?: number;
    refuelSpeed?: number;
    commandCenterRange?: number;
  };
  requiredTechs?: string[];
  description: string;
}

export interface BaseSpecification {
  id: string;
  model: string;
  manufacturer?: string;
  role: 'Fighter' | 'Bomber' | 'Transport' | 'AWACS' | 'Recon' | 'Ground' | 'Multi-role' | 'Interceptor' | 'Superiority' | 'Strike' | 'UAV';
  maxSpeedMach: number;
  radarRangeKm: number;
  fuelCapacityL: number;
  fuelConsumptionBase: number;
  maxAltitudeFt?: number;
  missileCapacity: Record<string, number>;
  gunAmmo: number;
  flaresCapacity: number;
  countermeasuresCapacity: number;
  rcsFrontal?: number;
  rcsLateral?: number;
  rcsFrontalAlternate?: number;
  stealthFactor?: number;
  ecmStrength?: number;
}

export type AircraftSpecification = BaseSpecification;

export interface Aircraft {
  id: string;
  specId: string;
  side: Side;
  status: AircraftStatus;
  position: Coordinates;
  altitude: number;
  heading: number;
  speed: number;
  throttle: number; // added for physics control
  fuel: number;
  health: number;
  targetId?: string;
  missiles: Record<string, number>;
  gunAmmo: number;
  flares: number;
  countermeasures: number;
  ecmActive: boolean;
  isDamaged: boolean;
  trail: Coordinates[];
  lastDetected?: Tick;
  mission?: Mission;
  patrolTarget?: Coordinates;
}

export interface Mission {
  type: MissionType;
  targetId?: string;
  targetPos?: Coordinates;
  startTime: Tick;
}

export interface Missile {
  id: string;
  specId: string;
  side: Side;
  position: Coordinates;
  altitude: number;
  heading: number;
  speed: number;
  targetId: string;
  fuel: number;
  trail: Coordinates[];
  launcherId: string;
  type: MissileType;
}

export interface MissileSpec {
  id: string;
  model: string;
  role: 'Air-to-Air' | 'Air-to-Ground' | 'Anti-Radiation' | 'Anti-Ship';
  seeker: SeekerType;
  rangeKm: number;
  maxG?: number;
  warheadKg?: number;
  speedMach?: number;
  costCredits: number;
}

export interface Base {
  id: string;
  name: string;
  position: Coordinates;
  side: Side;
  factionId: string;
  factionColor: string;
  credits: number;
  fuelStock: number;
  missileStock: Record<string, number>;
  radarRange: number;
  radarMode: 'ActiveScan' | 'PassiveSearch' | 'Silent';
  maxAircraft: number;
  buildings: Building[];
}

export interface Building {
  id: string;
  type: BuildingType;
  position: Coordinates;
  health: number;
  isBuilt: boolean;
  buildProgress: number; // 0-100
}

export interface GameState {
  aircrafts: Aircraft[];
  missiles: Missile[];
  aircraft?: Map<string, Aircraft>; // legacy map support
  missileMap?: Map<string, Missile>; // legacy map support
  friendlyBase: Base;
  hostileBases: Base[];
  allyBases: Base[];
  neutralBases: Base[];
  groundUnits: any[];
  selectedAircraftId: string | null;
  tick: Tick;
  isPaused: boolean;
  elapsedSeconds: number;
  logs: string[];
  trailDensity: number;
  groups: any[];
  pendingTargetId: string | null;
  pendingBuildings: any[];
  buildMode: boolean;
  outerBaseExpansionMode: boolean;
  selectedBuildingType: string | null;
  factions: FactionState[];
  relationships: FactionRelationship[];
  activeObjectives: PassiveObjective[];
  crashHistory: any[];
}
