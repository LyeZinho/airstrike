// src/types/geopolitics.ts

/**
 * Faction specification - registry entry for faction definitions
 */
export interface FactionSpecification {
  id: string;
  name: string;
  allegiance: 'PLAYER' | 'BLUE' | 'RED' | 'NEUTRAL' | 'UNALIGNED';
  startingCredits: number;
  startingAircraft: string[]; // aircraft registry IDs
  homeBase: { x: number; y: number; radius: number };
  personality: {
    aggressiveness: number; // 0-100
    diplomaticPreference: number; // 0-100
    techLevel: 'LEGACY' | 'MODERN' | 'ADVANCED';
  };
  ideology: string; // for news bias
}

/**
 * Runtime faction state - live state during simulation
 */
export interface FactionState {
  id: string;
  specId: string; // reference to FactionSpecification
  credits: number;
  fuel: number;
  morale: number; // 0-100
  posture: 'DEFENSIVE' | 'AGGRESSIVE' | 'WARTIME' | 'DIPLOMATIC' | 'COLLAPSED';
  activeAircraft: string[]; // aircraft instance IDs
  activeObjectives: string[]; // passive objective IDs
  aiDecisionQueue: FactionAction[]; // pending AI actions
  lastTickTime: number;
}

/**
 * Bilateral relationship between two factions
 */
export interface FactionRelationship {
  factionAId: string;
  factionBId: string;
  trust: number; // 0-100 (trust level)
  fear: number; // 0-100 (perceived threat)
  alignment: number; // -100 to +100 (ideological alignment)
  incidentCount: number; // historical incidents
  lastIncident?: number; // timestamp
  treaty?: 'PEACE' | 'MILITARY_ALLIANCE' | 'TRADE' | 'MUTUAL_DEFENSE';
}

/**
 * AI faction action - decision to execute
 */
export interface FactionAction {
  id: string;
  factionId: string;
  type: 'LAUNCH_CAP' | 'LAUNCH_STRIKE' | 'LAUNCH_ELINT' | 'ESCORT_CIVILIAN' | 'ACTIVATE_DEFENSE' | 'DIPLOMATIC_OVERTURE';
  targetId?: string;
  priority: number; // 1-10
  timestamp: number;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
}

/**
 * Passive objective - revenue generation mission
 */
export interface PassiveObjective {
  id: string;
  factionId: string;
  type: 'CAP_PATROL' | 'ELINT_MISSION' | 'CIVILIAN_ESCORT' | 'SOVEREIGNTY_ZONE' | 'INTELLIGENCE_SALE' | 'RESOURCE_HARVEST';
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  location: { x: number; y: number; radius: number };
  assignedAircraft: string[]; // aircraft instance IDs
  revenuePerTick: number; // credits per simulation tick
  infrastructureMultiplier: number; // from friendly infrastructure
  startTime: number;
  estimatedCompletion: number;
  progress: number; // 0-100
}

/**
 * News article - faction-biased headline
 */
export interface NewsArticle {
  id: string;
  timestamp: number;
  factionId: string; // faction whose perspective this is
  category: 'MILITARY' | 'DIPLOMATIC' | 'ECONOMIC' | 'INCIDENT' | 'VICTORY' | 'SETBACK';
  headline: string;
  body: string;
  bias: 'PATRIOTIC' | 'NEUTRAL' | 'HOSTILE'; // how faction reports this event
  sourceEvent: string; // reference to simulation event that triggered this
  importance: number; // 1-10
}

/**
 * Technology level for faction capabilities
 */
export type TechLevel = 'LEGACY' | 'MODERN' | 'ADVANCED';

/**
 * Terrain type classification from OSM data
 */
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

/**
 * Terrain damage metadata
 */
export interface TerrainDamageProfile {
  multiplier: number; // crash damage multiplier
  pilotSurvival: number; // 0-1 survival probability
  costDescription: string; // 'Max', 'High', 'Medium', 'Low', 'Zero', 'Combat', 'Protocol'
}

/**
 * Crash incident report - financial breakdown of aircraft loss
 */
export interface IncidentReport {
  id: string;
  timestamp: number;
  aircraftId: string;
  aircraftModel: string;
  factionId: string;
  location: { lat: number; lng: number };
  terrainType: TerrainType;
  baseDamage: number; // aircraft acquisition cost
  terrainMultiplier: number;
  totalDamage: number; // baseDamage * terrainMultiplier
  pilotStatus: 'EJECTED' | 'CAPTURED' | 'KIA' | 'UNKNOWN';
  causeOfLoss: 'ENEMY_FIRE' | 'SAM' | 'AAA' | 'COLLISION' | 'MECHANICAL' | 'FUEL';
  factionResponsible?: string; // if known
  newsHeadline: string;
  financialImpact: {
    aircraftLoss: number;
    pilotRescueCost?: number;
    diplomaticCost?: number;
    stockPriceImpact: number; // percentage
  };
}

/**
 * Faction AI personality profile - weights for behavior decisions
 */
export interface FactionAIPersonality {
  factionId: string;
  attackAggressiveness: number; // 0-100
  evasionCaution: number; // 0-100
  terrainPreference: TerrainType[]; // preferred terrain types for evasion
  communicationStyle: 'FORMAL' | 'CHATTER' | 'SILENT' | 'ANONYMOUS';
  riskTolerance: number; // 0-100
  preferredEjectionZones: TerrainType[]; // terrain to eject toward
}

/**
 * Stock market tick - price history for one faction
 */
export interface StockMarketTick {
  factionId: string;
  timestamp: number;
  price: number;
  priceChange: number; // delta from previous
  volume: number; // shares traded
  volatility: number; // 0-1 (market volatility)
}

/**
 * Real-time stock market state
 */
export interface StockMarket {
  activeFactions: string[]; // faction IDs in market
  currentPrices: Record<string, number>; // factionId -> current price
  priceHistory: Record<string, StockMarketTick[]>; // factionId -> history
  lastUpdateTick: number; // simulation tick of last update
}

/**
 * Posture state machine
 */
export type FactionPosture = 'DEFENSIVE' | 'AGGRESSIVE' | 'WARTIME' | 'DIPLOMATIC' | 'COLLAPSED';

/**
 * Objective type with revenue baseline
 */
export interface ObjectiveTypeDefinition {
  type: PassiveObjective['type'];
  baseRevenue: number;
  infrastructureMultiplier: number;
  estimatedDuration: number; // ticks
  riskLevel: number; // 0-100
}

// ── Legal System ──────────────────────────────────────────────
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
