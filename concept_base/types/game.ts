export enum AircraftStatus {
  HANGAR = "HANGAR",
  TAXI = "TAXI",
  TAKEOFF = "TAKEOFF",
  CLIMB = "CLIMB",
  CRUISE = "CRUISE",
  COMBAT = "COMBAT",
  RTB = "RTB", // Return to Base
  LANDING = "LANDING",
  DAMAGED = "DAMAGED",
  DESTROYED = "DESTROYED",
  REST_IN_ACTION = "REST_IN_ACTION" // On base but ready for immediate scramble
}

export enum Side {
  FRIENDLY = "FRIENDLY",
  HOSTILE = "HOSTILE",
  ALLY = "ALLY",
  NEUTRAL = "NEUTRAL",
  UNKNOWN = "UNKNOWN"
}

export enum RadarMode {
  RWS = "RWS", // Range While Search
  TWS = "TWS", // Track While Scan
  STT = "STT"  // Single Target Track (Lock)
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export enum MissileType {
  SHORT_RANGE = "SHORT_RANGE", // Dogfight/Heatseeking
  MEDIUM_RANGE = "MEDIUM_RANGE", // BVR
  LONG_RANGE = "LONG_RANGE" // Long Range Intercept
}

export interface AircraftSpec {
  model: string;
  role: string;
  rcsFrontal: number;
  rcsLateral: number;
  maxSpeedMach: number;
  radarRangeKm: number;
  fuelCapacityL: number;
  fuelConsumptionBase: number; // L/min em cruzeiro
  ecmStrength?: number; // 0 to 1
  flaresCapacity: number;
  countermeasuresCapacity: number;
  missileCapacity: Record<string, number>;
  gunAmmo: number;
}

export enum FormationType {
  VIC = "VIC",
  LINE = "LINE",
  ECHELON = "ECHELON"
}

export enum MissionType {
  PATROL = "PATROL",
  INTERCEPT = "INTERCEPT",
  LOITER = "LOITER", // "Camp" in a certain point
  STRIKE = "STRIKE",  // Targeting bases
  CARGO = "CARGO",
  DEFENSE = "DEFENSE",
  ATTACK = "ATTACK"
}

export interface Mission {
  type: MissionType;
  targetId?: string;
  targetPos?: Coordinates;
  startTime?: number;
}

export interface PlaneGroup {
  id: string;
  leaderId: string;
  memberIds: string[];
  type: FormationType;
  name: string;
  mission?: Mission;
}

export enum IFFStatus {
  UNKNOWN = "UNKNOWN",      // Just detected, type unknown
  IDENTIFYING = "IDENTIFYING", // Analyzing signature
  IDENTIFIED = "IDENTIFIED",   // Type known, intent unknown
  HOSTILE = "HOSTILE",         // Confirmed enemy
  FRIENDLY = "FRIENDLY",      // Confirmed ally
  NEUTRAL = "NEUTRAL"         // Confirmed neutral
}

export enum RWRStatus {
  SILENT = "SILENT",       // Not being tracked
  SEARCH = "SEARCH",       // Being detected by radar
  TRACK = "TRACK",         // Being tracked (lock)
  MISSILE = "MISSILE"      // Missile inbound
}

export interface Aircraft {
  id: string;
  spec: AircraftSpec;
  side: Side;
  factionId?: string;
  status: AircraftStatus;
  position: Coordinates;
  altitude: number; // em pés
  heading: number; // em graus
  speed: number; // em Mach
  fuel: number; // em Litros
  health: number; // 0 to 100
  isDamaged: boolean;
  ecmActive: boolean;
  targetId?: string;
  patrolTarget?: Coordinates;
  trail: Coordinates[];
  lastDetected?: number;
  missiles: Record<string, number>;
  gunAmmo: number;
  flares: number;
  countermeasures: number;
  mission?: Mission;
  lastMissileLaunchTime?: number;
  reloadTimeRemaining?: number;
  iffStatus?: IFFStatus;
  iffIdentifiedAt?: number;
  rwrStatus?: RWRStatus;
  trackingBy?: string[];
  qBrain?: QBrainData;
  hasCargo?: boolean;
  cargoReloadTime?: number;
}

export interface QBrainData {
  experience: number;
  generation: number;
  level: number;
}

export interface Missile {
  id: string;
  model: string;
  type: MissileType;
  side: Side;
  position: Coordinates;
  altitude: number;
  heading: number;
  speed: number;
  targetId: string;
  fuel: number;
  isPitbull: boolean;
  rangeKm: number;
  trail: Coordinates[];
  launcherId: string;
}

export enum GroundUnitType {
  SAM_BATTERY = "SAM_BATTERY",
  RADAR_STATION = "RADAR_STATION",
  TANK = "TANK",
  ARTILLERY = "ARTILLERY",
  APC = "APC",
  INFANTRY = "INFANTRY",
  RECON = "RECON",
  AAA = "AAA"
}

export interface GroundUnit {
  id: string;
  model: string;
  type: GroundUnitType;
  side: Side;
  position: Coordinates;
  targetPosition?: Coordinates; // For movement/guard
  radarRangeKm: number;
  missiles: Record<string, number>;
  health: number;
  status: "IDLE" | "MOVING" | "GUARD" | "DESTROYED";
  lastLaunchTime?: number;
}

export enum BuildingType {
  HANGAR = "HANGAR",
  RADAR = "RADAR",
  SAM_BATTERY = "SAM_BATTERY",
  FUEL_DEPOT = "FUEL_DEPOT",
  RUNWAY = "RUNWAY",
  REFINERY = "REFINERY",
  SUPPLY_DEPOT = "SUPPLY_DEPOT"
}

export interface Building {
  id: string;
  type: BuildingType;
  position: Coordinates;
  builtAt: number;
}

export interface PendingBuilding {
  id: string;
  type: BuildingType;
  position: Coordinates;
  assignedAircraftId: string | null;
  status: 'PENDING' | 'IN_TRANSIT' | 'CONSTRUCTING' | 'COMPLETED';
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
  radarMode: RadarMode;
  buildings: Building[];
  maxAircraft: number;
  resourceSpot?: ResourceSpot;
}

export interface ResourceSpot {
  fuelCapacity: number;
  fuelAvailable: number;
  creditsStorage: number;
  lastRestockTime: number;
}

// ===== PHASE 16: STRATOSFEAR EXPANSION =====

export type TerrainType =
  | 'URBAN_METROPOLIS'
  | 'URBAN_SUBURBAN'
  | 'RURAL_AGRICULTURAL'
  | 'FOREST_RESERVE'
  | 'DESERT_BADLANDS'
  | 'OCEAN_INTERNATIONAL'
  | 'MOUNTAIN_RANGE'
  | 'MILITARY_BASE_ENEMY'
  | 'MILITARY_BASE_FRIENDLY'
  | 'UNKNOWN';

export interface TerrainDamageProfile {
  multiplier: number; // crash damage multiplier
  pilotSurvival: number; // 0-1 survival probability
  costDescription: string; // 'Max', 'High', 'Medium', 'Low', 'Zero', 'Combat', 'Protocol'
}

export interface IncidentReport {
  id: string;
  timestamp: number;
  aircraftId: string;
  aircraftModel: string;
  factionId?: string;
  location: Coordinates;
  terrainType: TerrainType;
  baseDamage: number; // aircraft acquisition cost
  terrainMultiplier: number;
  totalDamage: number; // baseDamage * terrainMultiplier
  pilotStatus: 'EJECTED' | 'CAPTURED' | 'KIA' | 'UNKNOWN';
  causeOfLoss: 'ENEMY_FIRE' | 'SAM' | 'AAA' | 'COLLISION' | 'MECHANICAL' | 'FUEL';
  factionResponsible?: string;
  newsHeadline: string;
  financialImpact: {
    aircraftLoss: number;
    pilotRescueCost?: number;
    diplomaticCost?: number;
    stockPriceImpact: number; // percentage
  };
  lawsuitId?: string; // reference to auto-generated lawsuit
}

export interface StockMarketTick {
  timestamp: number;
  factionId: string;
  price: number;
  volume: number;
  change: number; // percentage
  trigger?: string; // event that caused the move
}

export interface StockMarket {
  factionPrices: Record<string, number>; // factionId -> current price
  history: StockMarketTick[]; // last 100 ticks
  volatilityIndex: Record<string, number>; // factionId -> volatility %
}

export interface FactionAIPersonality {
  factionId: string;
  aggressiveness: number; // 0-100: how willing to engage
  defensiveness: number; // 0-100: prioritize base protection
  economyFocus: number; // 0-100: prioritize revenue over combat
  diplomacy: number; // 0-100: prefer treaties over conflict
  terrainMastery: number; // 0-100: use terrain for advantage
  riskTolerance: number; // 0-100: accept losses for gains
  evasionThreshold: number; // health % before RTB
}

// ===== TRIBUNAL DE ESTRATOSFERA: LEGAL SYSTEM =====

export type LawsuitStatus = 'PENDING' | 'CONTESTED' | 'PAID' | 'WON' | 'LOST' | 'IGNORED';
export type LawsuitAction = 'COMPLY' | 'CONTEST' | 'IGNORE';

export interface LawsuitEvidence {
  vectorOfAttack: boolean; // enemy was on attack vector
  terrainMismatch: boolean; // claimed terrain ≠ actual terrain
  witnessReports: number; // 0-100: reliability score
  satelliteImagery: boolean; // have satellite proof
}

export interface Lawsuit {
  id: string;
  incidentReportId: string;
  claimantFactionId: string; // who sued us
  defendantFactionId: string; // us (player)
  createdAt: number;
  deadlineAt: number; // createdAt + 48 game hours
  claimAmount: number; // total damage claimed
  status: LawsuitStatus;
  evidence: LawsuitEvidence;
  lastAction?: LawsuitAction;
  lastActionAt?: number;
  contestionCost?: number; // legal fees if contested
  juryBias: number; // 0-1: how biased jury is toward claimant (0=fair, 1=completely against us)
}

export interface CasusBelli {
  factionId: string; // who declared it
  reason: 'LAWSUIT_IGNORED' | 'LAWSUIT_LOST_WITH_BAD_FAITH' | 'REPEATED_VIOLATIONS';
  declaredAt: number;
  expiresAt: number; // 1 week of game time
  hostilityLevel: number; // 0-100: how aggressive they can be
}
