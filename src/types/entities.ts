import { Tick } from '../core/SimulationClock';

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
  RECON = 'RECON'
}

export enum MissileType {
  SHORT_RANGE = 'SHORT_RANGE',
  MEDIUM_RANGE = 'MEDIUM_RANGE',
  LONG_RANGE = 'LONG_RANGE'
}

export enum BuildingType {
  HANGAR = 'HANGAR',
  RADAR = 'RADAR',
  SAM_BATTERY = 'SAM_BATTERY',
  FUEL_DEPOT = 'FUEL_DEPOT',
  RUNWAY = 'RUNWAY',
  REFINERY = 'REFINERY',
  SUPPLY_DEPOT = 'SUPPLY_DEPOT'
}

export interface BaseSpecification {
  model: string;
  manufacturer: string;
  role: 'Fighter' | 'Bomber' | 'Transport' | 'AWACS' | 'Recon' | 'Ground';
  maxSpeedMach: number;
  radarRangeKm: number;
  fuelCapacityL: number;
  fuelConsumptionBase: number;
  maxAltitudeFt: number;
  missileCapacity: Record<string, number>;
  gunAmmo: number;
  flaresCapacity: number;
  countermeasuresCapacity: number;
  rcsFortal: number;
  rcsSide: number;
  stealthFactor: number;
}

export interface Aircraft {
  id: string;
  specId: string;
  side: Side;
  status: AircraftStatus;
  position: Coordinates;
  altitude: number;
  heading: number;
  speed: number;
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
  model: string;
  type: MissileType;
  speed: number;
  rangeMax: number;
  reloadTime: number;
}

export interface Building {
  id: string;
  type: BuildingType;
  position: Coordinates;
  builtAt: Tick;
  health: number;
}

export interface Base {
  id: string;
  name: string;
  position: Coordinates;
  side: Side;
  factionId?: string;
  factionColor?: string;
  credits: number;
  fuelStock: number;
  missileStock: Record<string, number>;
  radarRange: number;
  radarMode: string;
  maxAircraft: number;
  buildings: Building[];
  resourceSpot?: ResourceSpot;
}

export interface ResourceSpot {
  fuelCapacity: number;
  fuelAvailable: number;
  creditsStorage: number;
  lastRestockTime: Tick;
}

export interface GroundUnit {
  id: string;
  model: string;
  type: GroundUnitType;
  side: Side;
  position: Coordinates;
  radarRangeKm: number;
  missiles: Record<string, number>;
  health: number;
  status: string;
  targetPosition?: Coordinates;
  lastLaunchTime?: number;
}

export enum GroundUnitType {
  SAM_BATTERY = 'SAM_BATTERY',
  RADAR = 'RADAR',
  TROOPS = 'TROOPS'
}

export enum IFFStatus {
  FRIENDLY = 'FRIENDLY',
  HOSTILE = 'HOSTILE',
  UNKNOWN = 'UNKNOWN',
  NEUTRAL = 'NEUTRAL'
}

export enum RWRStatus {
  SILENT = 'SILENT',
  TRACKED = 'TRACKED',
  LOCKED = 'LOCKED'
}

export enum FormationType {
  VIC = 'VIC',
  LINE = 'LINE',
  ECHELON = 'ECHELON'
}

export interface PlaneGroup {
  id: string;
  leaderId: string;
  memberIds: string[];
  type: FormationType;
  name: string;
  mission?: Mission;
}

export interface PendingBuilding {
  id: string;
  type: BuildingType;
  position: Coordinates;
  assignedAircraftId?: string | null;
  status: 'PENDING' | 'IN_TRANSIT' | 'CONSTRUCTING' | 'COMPLETED';
}

export interface GameState {
  friendlyBase: Base;
  hostileBases: Base[];
  allyBases: Base[];
  neutralBases: Base[];
  aircrafts: Aircraft[];
  missiles: Missile[];
  groundUnits: GroundUnit[];
  selectedAircraftId: string | null;
  logs: string[];
  isPaused: boolean;
  trailDensity: number;
  groups: PlaneGroup[];
  pendingTargetId: string | null;
  pendingBuildings: PendingBuilding[];
  buildMode: boolean;
  outerBaseExpansionMode: boolean;
  selectedBuildingType: BuildingType | null;
}
