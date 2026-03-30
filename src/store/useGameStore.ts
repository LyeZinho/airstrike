import { create } from "zustand";
import * as turf from "@turf/turf";
import { 
  Aircraft, 
  AircraftStatus, 
  Base, 
  Coordinates, 
  RadarMode, 
  Side,
  Missile,
  PlaneGroup,
  FormationType,
  Mission,
  MissionType,
  MissileType,
  GroundUnit,
  GroundUnitType,
  IFFStatus,
  RWRStatus,
  Building,
  BuildingType,
  PendingBuilding,
  ResourceSpot
} from "../types/game";
import { AIRCRAFT_SPECS, MISSILE_SPECS, GROUND_UNIT_SPECS } from "../constants/specs";
import { 
  getNextPosition, 
  getDistanceKm, 
  getRadarHorizon, 
  calculateAspectAngle, 
  getDynamicRCS, 
  calculateDetectionProbability,
  calculateFuelNeeded
} from "../utils/physics";
import { QTable, createAIState, Rewards, AIAction } from "../utils/qLearning";
import { NewsEvent, getNewsHeadlines } from "../utils/newsSystem";

const BUILDING_COSTS: Record<BuildingType, { cost: number; maintenance: number; effect: string }> = {
  [BuildingType.HANGAR]: { cost: 15000, maintenance: 200, effect: "+2 max aircraft" },
  [BuildingType.RADAR]: { cost: 25000, maintenance: 800, effect: "+200km detection" },
  [BuildingType.SAM_BATTERY]: { cost: 40000, maintenance: 1500, effect: "Auto-engage threats" },
  [BuildingType.FUEL_DEPOT]: { cost: 10000, maintenance: 100, effect: "+50000L storage" },
  [BuildingType.RUNWAY]: { cost: 50000, maintenance: 500, effect: "Parallel takeoffs" },
  [BuildingType.REFINERY]: { cost: 20000, maintenance: 300, effect: "+500 credits/min" },
  [BuildingType.SUPPLY_DEPOT]: { cost: 18000, maintenance: 250, effect: "+400 credits/min" }
};

interface GameState {
  friendlyBase: Base;
  hostileBases: Base[];
  allyBases: Base[];
  neutralBases: Base[];
  aircrafts: Aircraft[];
  groundUnits: GroundUnit[];
  missiles: Missile[];
  selectedAircraftId: string | null;
  logs: string[];
  isPaused: boolean;
  trailDensity: number;
  groups: PlaneGroup[];
  pendingTargetId: string | null;
  pendingBuildings: PendingBuilding[];
  newsEvents: NewsEvent[];
  
  // Actions
  setFriendlyBase: (base: Base) => void;
  expandBaseInner: (upgradeType: 'HANGAR' | 'RADAR' | 'FUEL' | 'DEFENSE') => void;
  expandBaseOuter: (position: Coordinates) => void;
  addAircraft: (aircraft: Aircraft) => void;
  selectAircraft: (id: string | null) => void;
  setTarget: (aircraftId: string, targetId: string | null) => void;
  cancelTarget: (aircraftId: string) => void;
  setPendingTarget: (targetId: string | null) => void;
  confirmTarget: () => void;
  toggleECM: (aircraftId: string) => void;
  addLog: (message: string) => void;
  togglePause: () => void;
  
  // Groups
  createGroup: (leaderId: string, memberIds: string[], type: FormationType, name: string) => void;
  disbandGroup: (groupId: string) => void;
  setGroupMission: (groupId: string, mission: Mission) => void;
  
  // Missions
  assignMission: (aircraftId: string, mission: Mission) => void;
  cancelMission: (aircraftId: string) => void;
  
  // Ground Units
  deployGroundUnit: (model: string, position: Coordinates) => void;
  setGroundUnitTarget: (unitId: string, targetPos: Coordinates) => void;
  
  // Build Mode
  buildMode: boolean;
  outerBaseExpansionMode: boolean;
  selectedBuildingType: BuildingType | null;
  setBuildMode: (enabled: boolean) => void;
  setOuterBaseExpansionMode: (enabled: boolean) => void;
  setSelectedBuildingType: (type: BuildingType | null) => void;
  placeBuilding: (position: Coordinates) => void;
  assignAircraftToBuilding: (buildingId: string, aircraftId: string) => void;
  
  // Game Loop
  tick: (deltaTime: number) => void;
  
  // Commands
  scramble: (model: string, config?: { fuel?: number, fuelL?: number, missiles?: Record<string, number>, gunAmmo?: number, flares?: number, countermeasures?: number }, targetId?: string, status?: AircraftStatus, side?: Side, baseId?: string) => void;
  landAircraft: (aircraftId: string, baseId?: string) => void;
  takeoff: (aircraftId: string) => void;
  launchMissile: (aircraftId: string, targetId: string, missileModel?: string) => void;
  reloadCargo: (aircraftId: string) => void;
}

// Extended Side enum for multiple factions
export enum FactionId {
  FRIENDLY = "FRIENDLY",
  HOSTILE_1 = "HOSTILE_1",
  HOSTILE_2 = "HOSTILE_2", 
  HOSTILE_3 = "HOSTILE_3",
  HOSTILE_4 = "HOSTILE_4",
  HOSTILE_5 = "HOSTILE_5",
  HOSTILE_6 = "HOSTILE_6",
  ALLY_1 = "ALLY_1",
  ALLY_2 = "ALLY_2",
  NEUTRAL_1 = "NEUTRAL_1",
  NEUTRAL_2 = "NEUTRAL_2",
  NEUTRAL_3 = "NEUTRAL_3",
}

export interface FactionConfig {
  id: FactionId;
  name: string;
  side: Side;
  color: string;
  accentColor: string;
  baseCount: number;
  maxAircraft: number;
  radarRange: number;
  region: { lat: [number, number]; lng: [number, number] };
}

const FACTIONS: FactionConfig[] = [
  { id: FactionId.HOSTILE_1, name: "Red Star Empire", side: Side.HOSTILE, color: "#ef4444", accentColor: "#dc2626", baseCount: 3, maxAircraft: 6, radarRange: 280, region: { lat: [45, 55], lng: [100, 130] } },
  { id: FactionId.HOSTILE_2, name: "Iron Guard Coalition", side: Side.HOSTILE, color: "#f97316", accentColor: "#ea580c", baseCount: 3, maxAircraft: 5, radarRange: 250, region: { lat: [35, 45], lng: [50, 80] } },
  { id: FactionId.HOSTILE_3, name: "Crimson Legion", side: Side.HOSTILE, color: "#dc2626", accentColor: "#b91c1c", baseCount: 3, maxAircraft: 6, radarRange: 300, region: { lat: [25, 35], lng: [70, 95] } },
  { id: FactionId.HOSTILE_4, name: "Shadow Syndicate", side: Side.HOSTILE, color: "#7c3aed", accentColor: "#6d28d9", baseCount: 2, maxAircraft: 4, radarRange: 220, region: { lat: [-10, 10], lng: [110, 140] } },
  { id: FactionId.HOSTILE_5, name: "Steel Warlords", side: Side.HOSTILE, color: "#64748b", accentColor: "#475569", baseCount: 2, maxAircraft: 5, radarRange: 260, region: { lat: [50, 60], lng: [-80, -50] } },
  { id: FactionId.HOSTILE_6, name: "Frost Dominion", side: Side.HOSTILE, color: "#06b6d4", accentColor: "#0891b2", baseCount: 2, maxAircraft: 4, radarRange: 240, region: { lat: [60, 70], lng: [30, 60] } },
  { id: FactionId.ALLY_1, name: "Blue Alliance", side: Side.ALLY, color: "#3b82f6", accentColor: "#2563eb", baseCount: 2, maxAircraft: 4, radarRange: 280, region: { lat: [35, 45], lng: [-30, 10] } },
  { id: FactionId.ALLY_2, name: "Golden Shield Pact", side: Side.ALLY, color: "#22c55e", accentColor: "#16a34a", baseCount: 1, maxAircraft: 3, radarRange: 250, region: { lat: [40, 50], lng: [-10, 20] } },
  { id: FactionId.NEUTRAL_1, name: "Gray Wolves", side: Side.NEUTRAL, color: "#6b7280", accentColor: "#4b5563", baseCount: 1, maxAircraft: 2, radarRange: 180, region: { lat: [-25, -15], lng: [25, 45] } },
  { id: FactionId.NEUTRAL_2, name: "Silver Phoenix", side: Side.NEUTRAL, color: "#9ca3af", accentColor: "#9ca3af", baseCount: 1, maxAircraft: 2, radarRange: 180, region: { lat: [15, 25], lng: [-50, -30] } },
  { id: FactionId.NEUTRAL_3, name: "Bronze Federation", side: Side.NEUTRAL, color: "#d97706", accentColor: "#b45309", baseCount: 1, maxAircraft: 2, radarRange: 180, region: { lat: [-35, -25], lng: [140, 160] } },
];

const areEnemies = (a1: { side: Side; factionId?: string }, a2: { side: Side; factionId?: string }): boolean => {
  if (a1.side !== a2.side) return true;
  if (a1.factionId && a2.factionId && a1.factionId !== a2.factionId) return true;
  return false;
};

// Função auxiliar para gerar coordenadas aleatórias no mundo (preferencialmente em terra)
const getRandomPosition = (): Coordinates => {
  const regions = [
    { lat: [30, 50], lng: [-120, -70] },
    { lat: [40, 60], lng: [0, 40] },
    { lat: [-30, -10], lng: [-60, -40] },
    { lat: [20, 40], lng: [100, 120] },
  ];
  const region = regions[Math.floor(Math.random() * regions.length)];
  return {
    lat: region.lat[0] + Math.random() * (region.lat[1] - region.lat[0]),
    lng: region.lng[0] + Math.random() * (region.lng[1] - region.lng[0]),
  };
};

const createResourceSpot = (level: number = 1): ResourceSpot => ({
  fuelCapacity: 50000 * level,
  fuelAvailable: 30000 * level,
  creditsStorage: 10000 * level,
  lastRestockTime: Date.now()
});

// Helper function to generate resources from a base's resource spot
const generateBaseResources = (
  base: Base,
  aircrafts: Aircraft[],
  deltaTime: number
): { base: Base; generated: { credits: number; fuel: number } } => {
  if (!base.resourceSpot) {
    return { base, generated: { credits: 0, fuel: 0 } };
  }

  const sideFilter = base.side === Side.FRIENDLY ? Side.FRIENDLY :
                      base.side === Side.ALLY ? Side.ALLY : Side.HOSTILE;

  const patrolCredits = aircrafts.filter(a =>
    a.side === sideFilter &&
    a.mission?.type === MissionType.PATROL &&
    getDistanceKm(a.position, base.position) < base.radarRange
  ).length * 0.5 * deltaTime;

  const patrolFuel = aircrafts.filter(a =>
    a.side === sideFilter &&
    a.mission?.type === MissionType.PATROL &&
    getDistanceKm(a.position, base.position) < base.radarRange
  ).length * 10 * deltaTime;

  const timeSinceLastRestock = (Date.now() - base.resourceSpot.lastRestockTime) / 1000;
  const restockRate = timeSinceLastRestock > 60 ? Math.min(1, (timeSinceLastRestock - 60) / 60) : 0;

  const generatedCredits = restockRate * base.resourceSpot.creditsStorage * 0.1 * deltaTime;
  const generatedFuel = restockRate * base.resourceSpot.fuelAvailable * 0.1 * deltaTime;

  // Credits from resource-generating buildings
  const buildingCredits = base.buildings.reduce((sum, b) => {
    if (b.type === BuildingType.REFINERY) return sum + (500 / 60) * deltaTime;
    if (b.type === BuildingType.SUPPLY_DEPOT) return sum + (400 / 60) * deltaTime;
    return sum;
  }, 0);

  return {
    base: {
      ...base,
      credits: base.credits + patrolCredits + generatedCredits + buildingCredits,
      fuelStock: base.fuelStock + patrolFuel + generatedFuel,
      resourceSpot: {
        ...base.resourceSpot,
        lastRestockTime: restockRate > 0 ? Date.now() : base.resourceSpot.lastRestockTime
      }
    },
    generated: { credits: patrolCredits + generatedCredits, fuel: patrolFuel + generatedFuel }
  };
};

const initialFriendlyBase: Base = {
  id: "base-friendly-01",
  name: "Airbase Alpha",
  position: getRandomPosition(),
  side: Side.FRIENDLY,
  credits: 50000,
  fuelStock: 100000,
  missileStock: { "AIM-120C": 24, "Meteor": 12 },
  radarRange: 300,
  radarMode: RadarMode.RWS,
  buildings: [],
  maxAircraft: 4,
  resourceSpot: createResourceSpot(2)
};

const generateFactionBases = (friendlyBase: Base, allExistingBases: Base[] = []): Base[] => {
  const bases: Base[] = [];
  const allBases = [friendlyBase, ...allExistingBases];
  
  for (const faction of FACTIONS) {
    if (faction.side === Side.FRIENDLY) continue;
    
    for (let i = 0; i < faction.baseCount; i++) {
      let attempts = 0;
      let pos: Coordinates;
      
      while (attempts < 100) {
        pos = {
          lat: faction.region.lat[0] + Math.random() * (faction.region.lat[1] - faction.region.lat[0]),
          lng: faction.region.lng[0] + Math.random() * (faction.region.lng[1] - faction.region.lng[0]),
        };
        
        const minDist = faction.radarRange + 50;
        const overlaps = allBases.some(b => getDistanceKm(pos!, b.position) < minDist);
        if (!overlaps) break;
        attempts++;
      }
      
      if (!pos) continue;
      
      const newBase: Base = {
        id: `base-${faction.id.toLowerCase()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        name: i === 0 ? faction.name : `${faction.name} Outpost ${i}`,
        position: pos,
        side: faction.side,
        factionId: faction.id,
        factionColor: faction.color,
        credits: faction.side === Side.ALLY ? 20000 : 5000,
        fuelStock: 100000,
        missileStock: faction.side === Side.HOSTILE ? { "R-77": 24, "R-73": 24 } : { "AIM-120C": 12, "AIM-9X": 12 },
        radarRange: faction.radarRange,
        radarMode: RadarMode.RWS,
        buildings: [],
        maxAircraft: faction.maxAircraft,
        resourceSpot: createResourceSpot(faction.side === Side.HOSTILE ? 1 : 2)
      };
      bases.push(newBase);
      allBases.push(newBase);
    }
  }
  return bases;
};

const allGeneratedBases = generateFactionBases(initialFriendlyBase);
const initialHostileBases = allGeneratedBases.filter(b => b.side === Side.HOSTILE);
const initialAllyBases = allGeneratedBases.filter(b => b.side === Side.ALLY);
const initialNeutralBases = allGeneratedBases.filter(b => b.side === Side.NEUTRAL);

export const useGameStore = create<GameState>((set, get) => ({
  friendlyBase: initialFriendlyBase,
  hostileBases: initialHostileBases,
  allyBases: initialAllyBases,
  neutralBases: initialNeutralBases,
  aircrafts: [],
  groundUnits: [],
  missiles: [],
  selectedAircraftId: null,
  logs: ["Sistemas de defesa aérea online. Aguardando contatos."],
  isPaused: false,
  trailDensity: 0.05,
  groups: [],
  pendingTargetId: null,
    buildMode: false,
    outerBaseExpansionMode: false,
    selectedBuildingType: null,
  pendingBuildings: [],
  newsEvents: [
    { id: 'init-1', timestamp: Date.now() - 3600000, type: 'political', title: 'Tensions Escalating', description: 'Border incidents increasing. Military on heightened alert.', severity: 'medium' as const },
    { id: 'init-2', timestamp: Date.now() - 1800000, type: 'military', title: 'Enemy Buildup Detected', description: 'Satellite imagery shows increased activity at forward bases.', severity: 'high' as const },
    { id: 'init-3', timestamp: Date.now() - 600000, type: 'threat', title: 'Immediate Threat', description: 'Hostile aircraft have crossed into contested airspace.', severity: 'critical' as const },
  ],

  setFriendlyBase: (base) => set({ friendlyBase: base }),
  
  expandBaseInner: (upgradeType: 'HANGAR' | 'RADAR' | 'FUEL' | 'DEFENSE') => {
    const { friendlyBase, addLog } = get();
    const costs = {
      HANGAR: { credits: 20000, fuel: 0, effect: () => set((state) => ({ friendlyBase: { ...state.friendlyBase, maxAircraft: (state.friendlyBase.maxAircraft || 6) + 2 } })) },
      RADAR: { credits: 30000, fuel: 0, effect: () => set((state) => ({ friendlyBase: { ...state.friendlyBase, radarRange: (state.friendlyBase.radarRange || 200) + 100 } })) },
      FUEL: { credits: 15000, fuel: 0, effect: () => set((state) => ({ friendlyBase: { ...state.friendlyBase, fuelStock: (state.friendlyBase.fuelStock || 100000) + 50000 } })) },
      DEFENSE: { credits: 50000, fuel: 0, effect: () => set((state) => ({ friendlyBase: { ...state.friendlyBase, buildings: [...state.friendlyBase.buildings, { id: `sam-${Date.now()}`, type: BuildingType.SAM_BATTERY, position: state.friendlyBase.position, builtAt: Date.now() }] } })) },
    };
    const upgrade = costs[upgradeType];
    if (friendlyBase.credits < upgrade.credits) {
      addLog(`ERRO: Credits insuficientes para upgrade ${upgradeType}. Necessário: ${upgrade.credits}`);
      return;
    }
    upgrade.effect();
    set((state) => ({ friendlyBase: { ...state.friendlyBase, credits: state.friendlyBase.credits - upgrade.credits } }));
    addLog(`BASE UPGRADED: ${upgradeType} - Custo: ${upgrade.credits}Cr`);
  },

  expandBaseOuter: (position: Coordinates) => {
    const { friendlyBase, aircrafts, allyBases, addLog } = get();
    const COST = 75000;
    const FUEL_COST = 30000;
    
    if (friendlyBase.credits < COST) {
      addLog(`ERRO: Credits insuficientes para base externa. Necessário: ${COST}Cr`);
      return;
    }
    if (friendlyBase.fuelStock < FUEL_COST) {
      addLog(`ERRO: Combustivel insuficiente. Necessário: ${FUEL_COST}L`);
      return;
    }
    
    const cargoPlane = aircrafts.find(a => 
      a.side === Side.FRIENDLY && 
      a.spec.role === 'Transport' && 
      a.status === AircraftStatus.HANGAR &&
      a.hasCargo === true
    );
    
    if (!cargoPlane) {
      addLog(`ERRO: Nenhum cargueiro disponível. Necesita um C-130 ou similar no hangar.`);
      return;
    }
    
    const newBaseId = `forward-base-${Date.now()}`;
    const newBase: Base = {
      id: newBaseId,
      name: `Forward Operating Base ${allyBases.length + 1}`,
      position,
      side: Side.FRIENDLY,
      factionId: 'FRIENDLY',
      credits: 5000,
      fuelStock: 20000,
      missileStock: { 'AIM-120C': 8 },
      radarRange: 150,
      radarMode: 'PASSIVE' as RadarMode,
      buildings: [],
      maxAircraft: 4,
      resourceSpot: createResourceSpot(1)
    };
    
    set((state) => ({
      friendlyBase: { ...state.friendlyBase, credits: state.friendlyBase.credits - COST, fuelStock: state.friendlyBase.fuelStock - FUEL_COST },
      allyBases: [...state.allyBases, newBase],
      aircrafts: state.aircrafts.map(a => a.id === cargoPlane.id ? { 
        ...a, 
        status: AircraftStatus.TAKEOFF as AircraftStatus,
        hasCargo: true,
        mission: { type: MissionType.CARGO, targetId: newBaseId, targetPos: position, startTime: Date.now() }
      } : a)
    }));
    
    addLog(`FORWARD BASE: Construção iniciada em coordenadas ${position.lat.toFixed(2)}, ${position.lng.toFixed(2)}. Cargueiro a caminho!`);
  },

  addAircraft: (aircraft) => set((state) => ({ 
    aircrafts: [...state.aircrafts, aircraft] 
  })),
  selectAircraft: (id) => set({ selectedAircraftId: id, pendingTargetId: null }),
  setTarget: (aircraftId, targetId) => set((state) => ({
    aircrafts: state.aircrafts.map(ac => ac.id === aircraftId ? { ...ac, targetId: targetId || undefined } : ac),
    pendingTargetId: null
  })),
  cancelTarget: (aircraftId) => set((state) => ({
    aircrafts: state.aircrafts.map(ac => ac.id === aircraftId ? { ...ac, targetId: undefined, status: AircraftStatus.CRUISE } : ac)
  })),
  cancelMission: (aircraftId) => set((state) => ({
    aircrafts: state.aircrafts.map(ac => ac.id === aircraftId ? { ...ac, mission: undefined, patrolTarget: undefined } : ac)
  })),
  setPendingTarget: (targetId) => set({ pendingTargetId: targetId }),
  confirmTarget: () => {
    const { selectedAircraftId, pendingTargetId, setTarget, groups, aircrafts } = get();
    if (selectedAircraftId && pendingTargetId) {
      const group = groups.find(g => g.leaderId === selectedAircraftId || g.memberIds.includes(selectedAircraftId));
      if (group) {
        set((state) => ({
          aircrafts: state.aircrafts.map(ac => 
            (ac.id === group.leaderId || group.memberIds.includes(ac.id)) 
              ? { ...ac, targetId: pendingTargetId, status: AircraftStatus.COMBAT } 
              : ac
          ),
          pendingTargetId: null
        }));
      } else {
        setTarget(selectedAircraftId, pendingTargetId);
        set((state) => ({
          aircrafts: state.aircrafts.map(ac => ac.id === selectedAircraftId ? { ...ac, status: AircraftStatus.COMBAT } : ac)
        }));
      }
    }
  },
  toggleECM: (aircraftId) => {
    const { aircrafts, addLog } = get();
    const ac = aircrafts.find(a => a.id === aircraftId);
    if (!ac) return;

    set(state => ({
      aircrafts: state.aircrafts.map(a => 
        a.id === aircraftId ? { ...a, ecmActive: !a.ecmActive } : a
      )
    }));
    
    addLog(`${ac.spec.model} (${ac.id}) ECM: ${!ac.ecmActive ? 'LIGADO' : 'DESLIGADO'}`);
  },
  addLog: (message) => set((state) => ({ 
    logs: [`[${new Date().toLocaleTimeString()}] ${message}`, ...state.logs].slice(0, 50) 
  })),
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

  createGroup: (leaderId, memberIds, type, name) => set((state) => ({
    groups: [...state.groups, { id: `group-${Math.random().toString(36).substr(2, 9)}`, leaderId, memberIds, type, name }]
  })),
  disbandGroup: (groupId) => set((state) => ({
    groups: state.groups.filter(g => g.id !== groupId)
  })),
  setGroupMission: (groupId, mission) => set((state) => ({
    groups: state.groups.map(g => g.id === groupId ? { ...g, mission } : g),
    aircrafts: state.aircrafts.map(ac => {
      const group = state.groups.find(gr => gr.id === groupId);
      if (group && (ac.id === group.leaderId || group.memberIds.includes(ac.id))) {
        return { ...ac, mission };
      }
      return ac;
    })
  })),
  assignMission: (aircraftId, mission) => set((state) => ({
    aircrafts: state.aircrafts.map(ac => ac.id === aircraftId ? { ...ac, mission } : ac)
  })),
  
  deployGroundUnit: (model, position) => {
    const spec = GROUND_UNIT_SPECS[model as keyof typeof GROUND_UNIT_SPECS];
    if (!spec) return;
    
    const newUnit: GroundUnit = {
      id: `ground-${Math.random().toString(36).substr(2, 9)}`,
      model: model,
      type: spec.type,
      side: Side.FRIENDLY,
      position,
      radarRangeKm: spec.radarRangeKm,
      missiles: { ...spec.missileCapacity },
      health: spec.health,
      status: "IDLE"
    };
    
    set(state => ({ groundUnits: [...state.groundUnits, newUnit] }));
    get().addLog(`GROUND: ${spec.model} implantado em posição.`);
  },
  
  setGroundUnitTarget: (unitId, targetPos) => set(state => ({
    groundUnits: state.groundUnits.map(u => u.id === unitId ? { ...u, targetPosition: targetPos, status: "MOVING" } : u)
  })),

  setBuildMode: (enabled) => set({ buildMode: enabled, selectedBuildingType: enabled ? null : null, outerBaseExpansionMode: false }),
  setOuterBaseExpansionMode: (enabled) => set({ outerBaseExpansionMode: enabled, buildMode: false, selectedBuildingType: null }),
  setSelectedBuildingType: (type) => set({ selectedBuildingType: type }),
  
  placeBuilding: (position) => {
    const { friendlyBase, selectedBuildingType, buildMode, pendingBuildings, addLog } = get();
    if (!buildMode || !selectedBuildingType) return;
    
    const buildingInfo = BUILDING_COSTS[selectedBuildingType];
    if (friendlyBase.credits < buildingInfo.cost) {
      addLog(`ERRO: Credits insuficientes. Necessário: ${buildingInfo.cost}`);
      return;
    }
    
    const newPendingBuilding: PendingBuilding = {
      id: `pending-${selectedBuildingType.toLowerCase()}-${Date.now()}`,
      type: selectedBuildingType,
      position,
      assignedAircraftId: null,
      status: 'PENDING'
    };
    
    set({ 
      pendingBuildings: [...pendingBuildings, newPendingBuilding],
      friendlyBase: { ...friendlyBase, credits: friendlyBase.credits - buildingInfo.cost },
      buildMode: false, 
      selectedBuildingType: null 
    });
    addLog(`CONSTRUÇÃO: ${selectedBuildingType} marcado. Envie C-130 para completar.`);
  },

  assignAircraftToBuilding: (buildingId, aircraftId) => {
    const { pendingBuildings, aircrafts, addLog } = get();
    const building = pendingBuildings.find(b => b.id === buildingId);
    const aircraft = aircrafts.find(a => a.id === aircraftId);
    
    if (!building) {
      addLog(`ERRO: Construção não encontrada.`);
      return;
    }
    
    if (!aircraft) {
      addLog(`ERRO: Aeronave não encontrada.`);
      return;
    }
    
    if (building.status !== 'PENDING') {
      addLog(`ERRO: Esta construção já está em andamento.`);
      return;
    }
    
    set(state => ({
      pendingBuildings: state.pendingBuildings.map(b => 
        b.id === buildingId 
          ? { ...b, assignedAircraftId: aircraftId, status: 'IN_TRANSIT' as const }
          : b
      ),
      aircrafts: state.aircrafts.map(a => 
        a.id === aircraftId 
          ? { 
              ...a, 
              mission: { 
                type: MissionType.CARGO, 
                targetId: buildingId,
                targetPos: building.position
              } as Mission
            } 
          : a
      )
    }));
    
    addLog(`CONSTRUÇÃO: ${aircraft.spec.model} designado para construir ${building.type} em ${building.position.lat.toFixed(2)}, ${building.position.lng.toFixed(2)}.`);
  },

  scramble: (model, config, targetId, status = AircraftStatus.TAKEOFF, side = Side.FRIENDLY, baseId?: string) => {
    const { friendlyBase, allyBases, neutralBases, hostileBases, addLog, addAircraft } = get();
    const spec = AIRCRAFT_SPECS[model];
    if (!spec) return;

    let base: Base | undefined;
    if (baseId) {
      base = [...allyBases, friendlyBase, ...neutralBases, ...hostileBases].find(b => b.id === baseId);
    }
    if (!base) {
      base = side === Side.FRIENDLY ? friendlyBase : (allyBases.find(b => b.side === Side.ALLY) || friendlyBase);
    }
    const fuelL = config?.fuel ?? config?.fuelL ?? spec.fuelCapacityL;
    const missiles = config?.missiles ?? { ...spec.missileCapacity };

    if (base.fuelStock < fuelL) {
      addLog(`ERRO: Combustível insuficiente na base para ${model}.`);
      return;
    }

    const newAircraft: Aircraft = {
      id: `${side.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`,
      spec,
      side: side,
      status,
      position: { ...base.position },
      altitude: 0,
      heading: 0,
      speed: 0,
      fuel: fuelL,
      health: 100,
      isDamaged: false,
      ecmActive: false,
      targetId,
      trail: [{ ...base.position }],
      missiles,
      gunAmmo: config?.gunAmmo ?? spec.gunAmmo,
      flares: config?.flares ?? spec.flaresCapacity,
      countermeasures: config?.countermeasures ?? spec.countermeasuresCapacity,
      iffStatus: side === Side.FRIENDLY ? IFFStatus.FRIENDLY : IFFStatus.UNKNOWN,
      rwrStatus: RWRStatus.SILENT,
      trackingBy: []
    };

    addAircraft(newAircraft);
    addLog(`SCRAMBLE: ${spec.model} (${side}) decolando de ${base.name} com ${fuelL}L de combustível.`);
    
    if (side === Side.FRIENDLY) {
      set((state) => ({
        friendlyBase: {
          ...state.friendlyBase,
          fuelStock: state.friendlyBase.fuelStock - fuelL
        }
      }));
    } else if (side === Side.ALLY) {
      set((state) => ({
        allyBases: state.allyBases.map(b => b.id === base.id ? { ...b, fuelStock: b.fuelStock - fuelL } : b)
      }));
    }
  },

  landAircraft: (aircraftId, baseId) => set((state) => {
    // Find the specified base or default to the nearest friendly/ally base
    let targetBaseId = baseId;
    if (!targetBaseId) {
      const ac = state.aircrafts.find(a => a.id === aircraftId);
      if (ac?.side === Side.FRIENDLY) {
        targetBaseId = state.friendlyBase.id;
      } else if (ac?.side === Side.ALLY) {
        const nearestAlly = state.allyBases.sort((a, b) => 
          getDistanceKm(ac.position, a.position) - getDistanceKm(ac.position, b.position)
        )[0];
        targetBaseId = nearestAlly?.id || state.friendlyBase.id;
      }
    }
    return {
      aircrafts: state.aircrafts.map(ac => ac.id === aircraftId ? { ...ac, status: AircraftStatus.RTB, targetId: targetBaseId, mission: undefined } : ac)
    };
  }),

  takeoff: (aircraftId) => set((state) => ({
    aircrafts: state.aircrafts.map(ac => ac.id === aircraftId ? { ...ac, status: AircraftStatus.TAKEOFF, altitude: 0 } : ac)
  })),

  reloadCargo: (aircraftId) => {
    const { aircrafts, addLog } = get();
    const ac = aircrafts.find(a => a.id === aircraftId);
    if (!ac) return;
    if (ac.spec.role !== 'Transport') {
      addLog(`ERRO: ${ac.spec.model} não é um cargueiro!`);
      return;
    }
    if (ac.status !== AircraftStatus.HANGAR) {
      addLog(`ERRO: ${ac.spec.model} precisa estar no hangar para recarregar!`);
      return;
    }
    if (ac.hasCargo) {
      addLog(`${ac.spec.model} já tem carga carregada!`);
      return;
    }
    if (ac.cargoReloadTime && ac.cargoReloadTime > 0) {
      addLog(`${ac.spec.model} já está a recarregar!`);
      return;
    }
    addLog(`${ac.spec.model} a carregar carga...`);
    set((state) => ({
      aircrafts: state.aircrafts.map(a => a.id === aircraftId ? { ...a, cargoReloadTime: 5 } : a)
    }));
  },

  launchMissile: (aircraftId, targetId, missileModel) => {
    const { aircrafts, groundUnits, hostileBases, friendlyBase, addLog } = get();
    const ac = aircrafts.find(a => a.id === aircraftId);
    const gu = groundUnits.find(u => u.id === aircraftId);
    
    if (!ac && !gu) return;

    const target = aircrafts.find(a => a.id === targetId) || hostileBases.find(b => b.id === targetId) || (friendlyBase.id === targetId ? friendlyBase : null);
    if (!target) return;

    const unit = ac || gu;
    if (!unit) return;

    const model = missileModel || Object.keys(unit.missiles).find(m => unit.missiles[m] > 0);
    if (!model || unit.missiles[model] <= 0) {
      addLog(`ERRO: ${ac ? ac.spec.model : (gu as any).model} sem mísseis compatíveis!`);
      return;
    }

    const spec = MISSILE_SPECS[model as keyof typeof MISSILE_SPECS];
    const now = Date.now();
    
    if (ac) {
      const timeSinceLastLaunch = ac.lastMissileLaunchTime ? (now - ac.lastMissileLaunchTime) / 1000 : Infinity;
      const reloadTime = spec.reloadTime || 10;
      if (ac.lastMissileLaunchTime && timeSinceLastLaunch < reloadTime) {
        addLog(`AGUARDE: ${ac.spec.model} recarregando míssil (${Math.ceil(reloadTime - timeSinceLastLaunch)}s)...`);
        return;
      }
    }

    const newMissile: Missile = {
      id: `missile-${Math.random().toString(36).substr(2, 9)}`,
      model,
      type: spec.type,
      side: unit.side,
      position: { ...unit.position },
      altitude: ac ? ac.altitude : 0,
      heading: ac ? ac.heading : 0,
      speed: spec.speed,
      targetId,
      fuel: spec.rangeMax / (spec.speed * 0.343),
      isPitbull: spec.type !== MissileType.LONG_RANGE,
      rangeKm: spec.rangeMax,
      trail: [{ ...unit.position }],
      launcherId: unit.id
    };

    const reloadTime = spec.reloadTime || 10;

    set(state => ({
      missiles: [...state.missiles, newMissile],
      aircrafts: ac ? state.aircrafts.map(a => 
        a.id === aircraftId 
          ? { 
              ...a, 
              missiles: { ...a.missiles, [model]: a.missiles[model] - 1 },
              lastMissileLaunchTime: now,
              reloadTimeRemaining: reloadTime
            } 
          : a
      ) : state.aircrafts,
      groundUnits: gu ? state.groundUnits.map(u => 
        u.id === aircraftId 
          ? { 
              ...u, 
              missiles: { ...u.missiles, [model]: u.missiles[model] - 1 },
              lastLaunchTime: now
            } 
          : u
      ) : state.groundUnits
    }));

    addLog(`FOX: ${ac ? ac.spec.model : (gu as any).model} lançou ${model} contra alvo.`);
  },

  tick: (deltaTime) => {
    const { isPaused, aircrafts, groundUnits, friendlyBase, hostileBases, allyBases, missiles, trailDensity, groups, addLog, launchMissile, pendingBuildings, setFriendlyBase, newsEvents } = get();
    if (isPaused) return;
    
    const updatedNews = getNewsHeadlines(aircrafts, hostileBases, friendlyBase, newsEvents);

    // 1. Update Ground Units
    const updatedGroundUnits = groundUnits.map(u => {
      if (u.status === "DESTROYED") return u;
      
      let newPos = u.position;
      let newStatus = u.status;
      let newTargetPosition = u.targetPosition;
      
      // Ground unit AI: Decide whether to patrol or engage
      if (u.status === "GUARD" && Math.random() < 0.02) {
        const enemyAircraft = aircrafts.filter(a => 
          a.side !== u.side && 
          getDistanceKm(u.position, a.position) < 80
        );
        
        const base = [friendlyBase, ...allyBases, ...hostileBases].find(b => 
          getDistanceKm(u.position, b.position) < 5
        );
        
        if (enemyAircraft.length > 0 && u.type !== GroundUnitType.SAM_BATTERY) {
          const avgEnemyPos = enemyAircraft.reduce((acc, a) => ({
            lat: acc.lat + a.position.lat / enemyAircraft.length,
            lng: acc.lng + a.position.lng / enemyAircraft.length
          }), { lat: 0, lng: 0 });
          newTargetPosition = avgEnemyPos;
          newStatus = "MOVING";
        } else if (base && Math.random() < 0.3) {
          const patrolOffset = {
            lat: base.position.lat + (Math.random() - 0.5) * 0.15,
            lng: base.position.lng + (Math.random() - 0.5) * 0.15
          };
          newTargetPosition = patrolOffset;
          newStatus = "MOVING";
        }
      }
      
      if (newStatus === "MOVING" && newTargetPosition) {
        const dist = getDistanceKm(u.position, newTargetPosition);
        if (dist < 0.1) {
          newStatus = "GUARD";
        } else {
          const from = turf.point([u.position.lng, u.position.lat]);
          const to = turf.point([newTargetPosition.lng, newTargetPosition.lat]);
          const heading = turf.bearing(from, to);
           const spec = (GROUND_UNIT_SPECS as any)[u.model];
           const speedKmPerTick = (spec?.speedKmH || 60) / 3600 * deltaTime;
          newPos = getNextPosition(u.position, heading, speedKmPerTick / 0.343, 1);
        }
      }
      
      // Auto-firing for SAM
      if (u.type === GroundUnitType.SAM_BATTERY && u.health > 0) {
        const enemies = aircrafts.filter(e => e.side !== u.side && e.status !== AircraftStatus.DESTROYED);
        const target = enemies.find(e => getDistanceKm(u.position, e.position) < u.radarRangeKm);
        if (target && Math.random() > 0.98) {
          const hasMissiles = Object.values(u.missiles).some(count => count > 0);
          if (hasMissiles) {
            launchMissile(u.id, target.id);
          }
        }
      }
      
      return { ...u, position: newPos, status: newStatus, targetPosition: newTargetPosition };
    });

    // 2. Update Aircrafts
    const updatedAircrafts = aircrafts.map((ac) => {
      if (ac.status === AircraftStatus.DESTROYED) return ac;

      // Rest in Action logic: Scramble if enemy in radar
      if (ac.status === AircraftStatus.REST_IN_ACTION) {
        const enemyInRadar = aircrafts.some(enemy => 
          enemy.side !== ac.side && 
          getDistanceKm(ac.position, enemy.position) < friendlyBase.radarRange
        );
        if (enemyInRadar) {
          const nearestEnemy = aircrafts
            .filter(enemy => enemy.side !== ac.side && enemy.status !== AircraftStatus.DESTROYED)
            .sort((a, b) => getDistanceKm(ac.position, a.position) - getDistanceKm(ac.position, b.position))[0];
          
          return { ...ac, status: AircraftStatus.TAKEOFF, targetId: nearestEnemy?.id };
        }
        return ac;
      }

      // Movement Logic
      let newAltitude = ac.altitude;
      let newSpeed = ac.speed;
      let newStatus: AircraftStatus = ac.status;
      let newHeading = ac.heading;
      let newPatrolTarget = ac.patrolTarget;
      let newTargetId = ac.targetId;
      let newMission = ac.mission;

      const performanceFactor = ac.isDamaged ? 0.6 : 1.0;

      if (ac.status === AircraftStatus.TAKEOFF) {
        newSpeed = 0.3;
        newAltitude += 500 * deltaTime * performanceFactor;
        if (newAltitude >= 5000) newStatus = AircraftStatus.CLIMB;
      } else if (ac.status === AircraftStatus.CLIMB) {
        newSpeed = 0.8 * performanceFactor;
        newAltitude += 1000 * deltaTime * performanceFactor;
        if (newAltitude >= 30000) newStatus = AircraftStatus.CRUISE;
      } else if (ac.status === AircraftStatus.CRUISE || ac.status === AircraftStatus.DAMAGED || ac.status === AircraftStatus.RTB || ac.status === AircraftStatus.COMBAT) {
        newSpeed = ac.spec.maxSpeedMach * 0.8 * performanceFactor;
        
        // RTB Logic (Fuel & Damage) - use targetId if explicitly set via landAircraft
        let base;
        if (ac.targetId && (ac.status === AircraftStatus.RTB || ac.status === AircraftStatus.COMBAT)) {
          base = [friendlyBase, ...allyBases].find(b => b.id === ac.targetId) || friendlyBase;
        } else {
          base = ac.side === Side.FRIENDLY ? friendlyBase : hostileBases[0];
          if (ac.side === Side.ALLY) {
            base = allyBases.sort((a, b) => getDistanceKm(ac.position, a.position) - getDistanceKm(ac.position, b.position))[0] || friendlyBase;
          }
        }
        
        const distToBase = getDistanceKm(ac.position, base.position);
        const fuelNeededToReturn = calculateFuelNeeded(distToBase, 0.8, ac.spec.fuelConsumptionBase);
        const safetyMargin = 1.1; // 10% safety margin

        // Warning Algorithm: if fuel required to return > current fuel, prompt immediate return
        if ((ac.isDamaged || ac.fuel < fuelNeededToReturn * safetyMargin) && ac.status !== AircraftStatus.RTB) {
          newStatus = AircraftStatus.RTB;
          newTargetId = undefined;
          newMission = undefined;
          addLog(`${ac.spec.model} (${ac.id}) bingo fuel/damaged. Returning to base ASAP.`);
        }

        // Detailed Targeting AI
        // Hostile AI: Use Q-Learning for target selection
        if (ac.side === Side.HOSTILE && !newTargetId) {
          const qTable = (ac as any)._qTable as QTable | undefined;
          const potentialTargets = aircrafts.filter(a => 
            a.side !== Side.HOSTILE && 
            a.status !== AircraftStatus.DESTROYED &&
            getDistanceKm(ac.position, a.position) < 200
          );
          
          if (potentialTargets.length > 0) {
            let bestTarget = potentialTargets[0];
            let bestScore = -Infinity;
            
            for (const target of potentialTargets) {
              const dist = getDistanceKm(ac.position, target.position);
              const headingDiff = Math.abs(((target.heading - ac.heading + 180) % 360) - 180);
              const state = createAIState(dist, headingDiff, target.speed / target.spec.maxSpeedMach, target.rwrStatus);
              
              let score = 0;
              if (qTable) {
                const bestAction = qTable.chooseAction(state);
                score = qTable.getQ(state, bestAction);
              } else {
                score = -dist + (target.status === AircraftStatus.COMBAT ? -20 : 0);
              }
              
              if (score > bestScore) {
                bestScore = score;
                bestTarget = target;
              }
            }
            
            newTargetId = bestTarget.id;
            newStatus = AircraftStatus.COMBAT;
          } else {
            const patrolAngle = Math.random() * 360;
            const patrolDist = 30 + Math.random() * 30;
            const from = turf.point([friendlyBase.position.lng, friendlyBase.position.lat]);
            const destination = turf.destination(from, patrolDist, patrolAngle, { units: "kilometers" });
            newPatrolTarget = { lat: destination.geometry.coordinates[1], lng: destination.geometry.coordinates[0] };
          }
        } else if (!newTargetId && ac.status !== AircraftStatus.RTB) {
          const enemies = aircrafts.filter(e => areEnemies(ac, e) && e.status !== AircraftStatus.DESTROYED);
          const radarRange = ac.spec.radarRangeKm; 
          const visibleEnemies = enemies.filter(e => getDistanceKm(ac.position, e.position) < radarRange);
          
          if (visibleEnemies.length > 0) {
            // Patrol planes focus on nearest plane within radar radius
            const nearest = visibleEnemies.sort((a, b) => getDistanceKm(ac.position, a.position) - getDistanceKm(ac.position, b.position))[0];
            newTargetId = nearest.id;
            newStatus = AircraftStatus.COMBAT;
          }
        }

        // Direction Logic
        let targetPos = base.position;
        if (newStatus === AircraftStatus.RTB) {
          targetPos = base.position;
          if (distToBase < 5) {
            newStatus = AircraftStatus.LANDING;
          }
        } else if (newTargetId) {
          const target = aircrafts.find(a => a.id === newTargetId) || hostileBases.find(b => b.id === newTargetId) || (friendlyBase.id === newTargetId ? friendlyBase : null);
          if (target) {
            targetPos = target.position;
            const distToTarget = getDistanceKm(ac.position, target.position);
            
            // Combat Logic
            if (distToTarget < 80) newStatus = AircraftStatus.COMBAT;
            
            // Q-Learning Tactical Decisions for Hostile Aircraft
            if (ac.side === Side.HOSTILE && newStatus === AircraftStatus.COMBAT && target) {
              const qTable = (ac as any)._qTable as QTable | undefined;
              if (qTable) {
                const headingDiff = ((turf.bearing(turf.point([ac.position.lng, ac.position.lat]), turf.point([target.position.lng, target.position.lat])) - ac.heading + 180) % 360) - 180;
                const currentState = createAIState(distToTarget, Math.abs(headingDiff), ac.speed / ac.spec.maxSpeedMach, ac.rwrStatus);
                const action = qTable.chooseAction(currentState);
                
                switch (action) {
                  case 'NOTCH':
                    newHeading += 90;
                    newSpeed = ac.spec.maxSpeedMach * 0.6;
                    break;
                  case 'CRANK':
                    newHeading += 45;
                    newSpeed = ac.spec.maxSpeedMach * 0.7;
                    break;
                  case 'EVADE':
                    newHeading += Math.random() > 0.5 ? 135 : -135;
                    newSpeed = ac.spec.maxSpeedMach * 0.9;
                    break;
                  case 'RETREAT':
                    newStatus = AircraftStatus.RTB;
                    newTargetId = undefined;
                    addLog(`${ac.spec.model} recuando strategicamente!`);
                    break;
                  case 'TERRAIN_MASK':
                    newAltitude = Math.max(1000, newAltitude - 5000 * deltaTime);
                    newSpeed = ac.spec.maxSpeedMach * 0.5;
                    break;
                  case 'ENGAGE':
                  default:
                    break;
                }
                
                (ac as any)._lastAIState = currentState;
                (ac as any)._lastAIAction = action;
              }
            }
            
            // Dogfight / Retreat Logic
            if (distToTarget < 5 && (ac.health < 40 || ac.fuel < fuelNeededToReturn * 1.5)) {
              if (Math.random() < 0.02) {
                newStatus = AircraftStatus.RTB;
                newTargetId = undefined;
                newMission = undefined;
                addLog(`${ac.spec.model} recuando do combate!`);
              }
            }
          } else {
            newTargetId = undefined;
          }
        } else if (ac.mission?.type === MissionType.PATROL) {
          // Patrol logic: fly to a specific point or follow a dynamic path
          if (!ac.patrolTarget || getDistanceKm(ac.position, ac.patrolTarget) < 5) {
            const angle = Math.random() * 360;
            const dist = 50 + Math.random() * 100;
            const from = turf.point([base.position.lng, base.position.lat]);
            const destination = turf.destination(from, dist, angle, { units: "kilometers" });
            ac.patrolTarget = { lat: destination.geometry.coordinates[1], lng: destination.geometry.coordinates[0] };
          }
          targetPos = ac.patrolTarget;
        } else if (ac.mission?.type === MissionType.LOITER && ac.mission.targetPos) {
          // Loiter logic: circle around targetPos
          const time = Date.now() / 10000;
          targetPos = {
            lat: ac.mission.targetPos.lat + Math.sin(time) * 0.05,
            lng: ac.mission.targetPos.lng + Math.cos(time) * 0.05
          };
          // Check if fuel is enough for loitering
          if (ac.fuel < fuelNeededToReturn + 500) { // Extra 500L buffer for loitering
             newStatus = AircraftStatus.RTB;
             newMission = undefined;
             addLog(`${ac.spec.model} encerrando loiter por combustível baixo.`);
          }
        } else if (ac.mission?.type === MissionType.STRIKE && ac.mission.targetId) {
          const target = hostileBases.find(b => b.id === ac.mission?.targetId) || friendlyBase;
          targetPos = target.position;
          if (getDistanceKm(ac.position, target.position) < 10) {
            // Strike successful?
            addLog(`${ac.spec.model} atingiu objetivo da missão de ataque!`);
            newStatus = AircraftStatus.RTB;
            newMission = undefined;
          }
        } else if (ac.mission?.type === MissionType.CARGO && ac.mission.targetId) {
          const target = [friendlyBase, ...allyBases].find(b => b.id === ac.mission?.targetId);
          if (target) {
            targetPos = target.position;
            if (getDistanceKm(ac.position, target.position) < 5) {
              addLog(`${ac.spec.model} entregou carga em ${target.name}!`);
              newStatus = AircraftStatus.LANDING;
              newMission = undefined;
              return { ...ac, hasCargo: false };
            }
          }
        } else if (ac.mission?.type === MissionType.DEFENSE && ac.mission.targetId) {
          const targetBase = [friendlyBase, ...allyBases].find(b => b.id === ac.mission?.targetId);
          if (targetBase) {
            targetPos = targetBase.position;
            const enemies = aircrafts.filter(e => e.side === Side.HOSTILE && e.status !== AircraftStatus.DESTROYED);
            const threat = enemies.find(e => getDistanceKm(e.position, targetBase.position) < 100);
            if (threat) {
              newTargetId = threat.id;
              newStatus = AircraftStatus.COMBAT;
            }
          }
        } else if (ac.mission?.type === MissionType.ATTACK && ac.mission.targetId) {
          const targetBase = hostileBases.find(b => b.id === ac.mission?.targetId);
          if (targetBase) {
            targetPos = targetBase.position;
            if (getDistanceKm(ac.position, targetBase.position) < 20) {
              addLog(`${ac.spec.model} iniciando bombardeio em ${targetBase.name}!`);
              newStatus = AircraftStatus.RTB;
              newMission = undefined;
            }
          }
        } else {
          // Group / Formation logic
          const group = groups.find(g => g.memberIds.includes(ac.id));
          if (group && group.leaderId !== ac.id) {
            const leader = aircrafts.find(a => a.id === group.leaderId);
            if (leader && leader.status !== AircraftStatus.DESTROYED) {
              const index = group.memberIds.indexOf(ac.id);
              let offsetLat = 0; let offsetLng = 0;
              if (group.type === FormationType.VIC) {
                const side = index % 2 === 0 ? 1 : -1;
                const depth = Math.floor(index / 2) + 1;
                offsetLat = -0.01 * depth; offsetLng = 0.01 * depth * side;
              } else if (group.type === FormationType.LINE) {
                const side = index % 2 === 0 ? 1 : -1;
                const depth = Math.floor(index / 2) + 1;
                offsetLng = 0.02 * depth * side;
              } else if (group.type === FormationType.ECHELON) {
                const depth = index + 1;
                offsetLat = -0.01 * depth; offsetLng = -0.01 * depth;
              }
              targetPos = { lat: leader.position.lat + offsetLat, lng: leader.position.lng + offsetLng };
              
              // Follow leader's target if any
              if (leader.targetId && !newTargetId) {
                newTargetId = leader.targetId;
                newStatus = AircraftStatus.COMBAT;
              }
            }
          } else {
            // Dynamic Patrol
            if (!newPatrolTarget || getDistanceKm(ac.position, newPatrolTarget) < 5) {
              const angle = Math.random() * 360;
              const dist = 50 + Math.random() * 50;
              const from = turf.point([base.position.lng, base.position.lat]);
              const destination = turf.destination(from, dist, angle, { units: "kilometers" });
              newPatrolTarget = { lat: destination.geometry.coordinates[1], lng: destination.geometry.coordinates[0] };
            }
            targetPos = newPatrolTarget;
          }
        }

        const from = turf.point([ac.position.lng, ac.position.lat]);
        const to = turf.point([targetPos.lng, targetPos.lat]);
        const targetHeading = turf.bearing(from, to);

        const turnRate = 30 * deltaTime;
        const diff = ((targetHeading - ac.heading + 180) % 360) - 180;
        newHeading += Math.abs(diff) < turnRate ? diff : Math.sign(diff) * turnRate;

        // Evasive maneuvers & Flares
        const incomingMissiles = missiles.filter(m => m.targetId === ac.id);
        if (incomingMissiles.length > 0) {
          newHeading += Math.sin(Date.now() / 500) * 45;
          newSpeed = ac.spec.maxSpeedMach * performanceFactor;
          
          // Deploy flares
          if (ac.flares > 0 && Math.random() > 0.95) {
            ac.flares -= 1;
            // Logic to distract missile is in missile update
          }
        }
      } else if ((ac.status as any) === AircraftStatus.RTB) {
        // Move towards base
        const base = ac.side === Side.FRIENDLY ? friendlyBase : (allyBases.find(b => b.side === Side.ALLY) || friendlyBase);
        const targetPos = base.position;
        if (getDistanceKm(ac.position, targetPos) < 5) {
          newStatus = AircraftStatus.HANGAR;
          newSpeed = 0;
          addLog(`${ac.spec.model} pousou em ${base.name}.`);
        } else {
          newSpeed = ac.spec.maxSpeedMach * 0.5;
        }
      } else if (ac.status === AircraftStatus.LANDING) {
        newSpeed = 0.2;
        newAltitude -= 1000 * deltaTime;
        if (newAltitude <= 0) {
          newAltitude = 0;
          newSpeed = 0;
          newStatus = AircraftStatus.HANGAR;
          addLog(`${ac.spec.model} pousou e está reabastecendo.`);
        }
      } else if (ac.status === AircraftStatus.HANGAR) {
        let newReloadTime = ac.reloadTimeRemaining ? Math.max(0, ac.reloadTimeRemaining - deltaTime) : 0;
        if (newReloadTime === 0) newReloadTime = undefined;
        
        // Handle cargo reload
        let newCargoReloadTime = ac.cargoReloadTime ? Math.max(0, ac.cargoReloadTime - deltaTime) : 0;
        let newHasCargo = ac.hasCargo;
        if (ac.cargoReloadTime && ac.cargoReloadTime > 0 && newCargoReloadTime === 0) {
          newHasCargo = true;
          addLog(`${ac.spec.model} carga carregada e pronta para missão!`);
        }
        if (newCargoReloadTime === 0) newCargoReloadTime = undefined;
        
        let newMissiles = ac.missiles;
        const missilesToReload = ac.spec.missileCapacity;
        let needsReload = false;
        for (const [missileType, maxCount] of Object.entries(missilesToReload)) {
          if (ac.missiles[missileType] < maxCount) {
            needsReload = true;
            const reloadRate = 1 * deltaTime;
            newMissiles = {
              ...newMissiles,
              [missileType]: Math.min(maxCount, (newMissiles[missileType] || 0) + reloadRate)
            };
          }
        }
        if (needsReload) {
          newMissiles = Object.fromEntries(
            Object.entries(newMissiles).map(([k, v]) => [k, Math.round(v)])
          );
        }
        
        const isReloadingCargo = ac.cargoReloadTime && ac.cargoReloadTime > 0;
        const needsRefuel = ac.fuel < ac.spec.fuelCapacityL * 0.9;
        
        if (needsRefuel || needsReload || isReloadingCargo) {
          const refuelRate = 500 * deltaTime;
          const acFuel = Math.min(ac.spec.fuelCapacityL, ac.fuel + refuelRate);
          return { 
            ...ac, 
            fuel: acFuel, 
            missiles: newMissiles, 
            reloadTimeRemaining: newReloadTime,
            cargoReloadTime: newCargoReloadTime,
            hasCargo: newHasCargo
          };
        } else {
          if (needsReload) {
            return { ...ac, missiles: newMissiles, reloadTimeRemaining: newReloadTime };
          }
          newStatus = AircraftStatus.REST_IN_ACTION;
        }
      }

      const newPos = getNextPosition(ac.position, newHeading, newSpeed * (ac.isDamaged ? 0.7 : 1.0), deltaTime);
      const fuelBurnFactor = ac.isDamaged ? 1.5 : 1.0;
      const fuelBurn = (ac.spec.fuelConsumptionBase / 60) * deltaTime * (newSpeed / 0.8) * fuelBurnFactor;
      const newFuel = Math.max(0, ac.fuel - fuelBurn);

      if (newFuel <= 0 && ac.status !== AircraftStatus.HANGAR) {
        addLog(`ALERTA: ${ac.spec.model} (${ac.id}) sem combustível!`);
        newStatus = AircraftStatus.DESTROYED;
      }

      const newTrail = [...ac.trail];
      if (Math.random() < trailDensity) {
        newTrail.push({ ...newPos });
        if (newTrail.length > 50) newTrail.shift();
      }

      const newReloadTime = ac.reloadTimeRemaining 
        ? Math.max(0, ac.reloadTimeRemaining - deltaTime) 
        : undefined;
      
      return {
        ...ac,
        position: newPos,
        altitude: newAltitude,
        speed: newSpeed,
        status: newStatus,
        fuel: newFuel,
        trail: newTrail,
        heading: newHeading,
        patrolTarget: newPatrolTarget,
        targetId: newTargetId,
        mission: newMission,
        reloadTimeRemaining: newReloadTime
      };
    });

    // 2. Missile Updates & Combat Resolution
    const updatedMissiles = missiles.map(m => {
      const target = updatedAircrafts.find(a => a.id === m.targetId) || hostileBases.find(b => b.id === m.targetId) || (friendlyBase.id === m.targetId ? friendlyBase : null);
      if (!target) return { ...m, fuel: 0 };

      // Missile distraction by flares
      const targetAc = updatedAircrafts.find(a => a.id === m.targetId);
      let effectiveTargetPos = target.position;
      if (targetAc && Math.random() < 0.05) { // 5% chance per tick to be distracted if flares were deployed? 
        // Simplified: if target is aircraft, it has a chance to distract
        effectiveTargetPos = {
          lat: target.position.lat + (Math.random() - 0.5) * 0.1,
          lng: target.position.lng + (Math.random() - 0.5) * 0.1
        };
      }

      const from = turf.point([m.position.lng, m.position.lat]);
      const to = turf.point([effectiveTargetPos.lng, effectiveTargetPos.lat]);
      const targetHeading = turf.bearing(from, to);
      
      const turnRate = 60 * deltaTime;
      const diff = ((targetHeading - m.heading + 180) % 360) - 180;
      const newHeading = m.heading + (Math.abs(diff) < turnRate ? diff : Math.sign(diff) * turnRate);
      const newPos = getNextPosition(m.position, newHeading, m.speed, deltaTime);
      
      const dist = getDistanceKm(newPos, target.position);
      if (dist < 0.5) {
        // Impact!
        addLog(`IMPACTO: Míssil atingiu alvo!`);
        return { ...m, fuel: 0, impact: true };
      }

      const newTrail = [...m.trail];
      if (Math.random() < trailDensity) {
        newTrail.push({ ...newPos });
        if (newTrail.length > 20) newTrail.shift();
      }

      return { ...m, position: newPos, heading: newHeading, fuel: m.fuel - deltaTime, trail: newTrail };
    }).filter(m => m.fuel > 0);

    // Apply Damage from Missiles and Guns
    const finalAircrafts = updatedAircrafts.map(ac => {
      let health = ac.health;
      
      // Missile damage
      const impacts = missiles.filter(m => m.targetId === ac.id && (m as any).impact);
      if (impacts.length > 0) {
        health -= 60 * impacts.length;
      }

      // Ground unit damage
      const groundImpacts = missiles.filter(m => m.targetId === ac.id && (m as any).impact);
      // Already covered by missiles filter above
      const attackers = updatedAircrafts.filter(enemy => 
        enemy.side !== ac.side && 
        enemy.status === AircraftStatus.COMBAT && 
        enemy.targetId === ac.id && 
        getDistanceKm(enemy.position, ac.position) < 2
      );
      if (attackers.length > 0) {
        health -= 10 * deltaTime * attackers.length;
      }

      if (health <= 0) {
        const wasDestroyed = ac.health > 0;
        const killer = missiles.find(m => m.targetId === ac.id && (m as any).impact);
        
        if (wasDestroyed && killer) {
          const killerAircraft = updatedAircrafts.find(a => a.id === killer.launcherId);
          if (killerAircraft && killerAircraft.side === Side.HOSTILE) {
            const qTable = (killerAircraft as any)._qTable as QTable | undefined;
            if (qTable) {
              const dist = getDistanceKm(killerAircraft.position, ac.position);
              const headingDiff = 0;
              const state = createAIState(dist, headingDiff, killerAircraft.speed / killerAircraft.spec.maxSpeedMach, killerAircraft.rwrStatus);
              const action = qTable.chooseAction(state);
              qTable.update(state, action, Rewards.KILL, state);
            }
          }
          
          if (ac.side === Side.HOSTILE) {
            const qTable = (ac as any)._qTable as QTable | undefined;
            if (qTable) {
              const lastState = (ac as any)._lastAIState;
              const lastAction = (ac as any)._lastAIAction;
              if (lastState && lastAction) {
                qTable.update(lastState, lastAction, Rewards.DEATH, lastState);
              }
              qTable.increaseGeneration();
            }
          }
        }
        
        return { ...ac, health: 0, status: AircraftStatus.DESTROYED };
      }
      return { ...ac, health, isDamaged: health < 50 };
    });

    // 3. Hostile AI
    hostileBases.forEach(base => {
      const activeEnemies = finalAircrafts.filter(a => a.side === Side.HOSTILE && getDistanceKm(a.position, base.position) < 250 && a.status !== AircraftStatus.RTB).length;
      const enemyInRadar = finalAircrafts.some(a => a.side !== Side.HOSTILE && getDistanceKm(base.position, a.position) < base.radarRange);
      const friendlyTargets = finalAircrafts.filter(a => a.side === Side.FRIENDLY || a.side === Side.ALLY);

      if (activeEnemies < (base.maxAircraft || 6) && (enemyInRadar || Math.random() > 0.7)) {
        const models = ["Su-27", "MiG-29", "Su-34", "MiG-31"];
        const model = models[Math.floor(Math.random() * models.length)];
        const enemySpec = AIRCRAFT_SPECS[model];
        
        if (!enemySpec) {
          addLog(`ERRO: Modelo hostil ${model} não encontrado em specs`);
          return;
        }
        
        const enemyQTable = new QTable();
        
        let mission: Mission | undefined;
        const rand = Math.random();
        
        if (friendlyTargets.length > 0 && rand > 0.4) {
          const target = friendlyTargets.sort((a, b) => 
            getDistanceKm(base.position, a.position) - getDistanceKm(base.position, b.position)
          )[0];
          mission = {
            type: MissionType.ATTACK,
            targetId: target.id,
            targetPos: target.position,
            startTime: Date.now(),
          };
        } else if (rand > 0.2) {
          mission = {
            type: MissionType.STRIKE,
            targetId: friendlyBase.id,
            targetPos: friendlyBase.position,
            startTime: Date.now(),
          };
        } else {
          mission = {
            type: MissionType.PATROL,
            targetPos: { lat: friendlyBase.position.lat + (Math.random() - 0.5) * 2, lng: friendlyBase.position.lng + (Math.random() - 0.5) * 2 },
            startTime: Date.now(),
          };
        }

        const newEnemy: Aircraft = {
          id: `hostile-${Math.random().toString(36).substr(2, 9)}`,
          spec: enemySpec,
          side: Side.HOSTILE,
          factionId: base.factionId,
          status: AircraftStatus.TAKEOFF,
          position: { ...base.position },
          altitude: 0,
          heading: Math.random() * 360,
          speed: 0,
          fuel: enemySpec.fuelCapacityL,
          health: 100,
          isDamaged: false,
          ecmActive: false,
          trail: [],
          missiles: { ...enemySpec.missileCapacity },
          gunAmmo: enemySpec.gunAmmo,
          flares: enemySpec.flaresCapacity,
          countermeasures: enemySpec.countermeasuresCapacity,
          targetId: mission.targetId,
          iffStatus: IFFStatus.UNKNOWN,
          rwrStatus: RWRStatus.SILENT,
          trackingBy: [],
          mission,
          qBrain: {
            experience: enemyQTable.experience,
            generation: enemyQTable.generation,
            level: enemyQTable.getLevel()
          }
        };
        (newEnemy as any)._qTable = enemyQTable;
        finalAircrafts.push(newEnemy);
        addLog(`ALERTA: Contato hostil decolando de ${base.name} para ${mission?.type}!`);
      }
    });

    // Ally AI (Enhanced)
    allyBases.forEach(base => {
      const activeAllies = finalAircrafts.filter(a => a.side === Side.ALLY && getDistanceKm(a.position, base.position) < 200).length;
      const enemyInRadar = finalAircrafts.some(a => a.side !== Side.ALLY && a.side !== Side.FRIENDLY && getDistanceKm(base.position, a.position) < base.radarRange);
      const friendlyInTrouble = finalAircrafts.some(a => a.side === Side.FRIENDLY && missiles.some(m => m.targetId === a.id));

      if ((enemyInRadar || friendlyInTrouble) && activeAllies < (base.maxAircraft || 4) && Math.random() > 0.98) {
        const models = ["Gripen", "F-16C"];
        const model = models[Math.floor(Math.random() * models.length)];
        const spec = AIRCRAFT_SPECS[model];
        
        if (!spec) {
          addLog(`ERRO: Modelo aliado ${model} não encontrado em specs`);
          return;
        }
        
        let mission: Mission | undefined;
        const threats = finalAircrafts.filter(a => a.side === Side.HOSTILE && a.status !== AircraftStatus.DESTROYED);
        
        if (threats.length > 0 && Math.random() > 0.4) {
          const target = threats.sort((a, b) => 
            getDistanceKm(base.position, a.position) - getDistanceKm(base.position, b.position)
          )[0];
          mission = {
            type: MissionType.INTERCEPT,
            targetId: target.id,
            targetPos: target.position,
            startTime: Date.now(),
          };
        } else if (Math.random() > 0.5) {
          mission = {
            type: MissionType.PATROL,
            targetPos: { lat: friendlyBase.position.lat + (Math.random() - 0.5) * 3, lng: friendlyBase.position.lng + (Math.random() - 0.5) * 3 },
            startTime: Date.now(),
          };
        } else {
          mission = {
            type: MissionType.LOITER,
            targetPos: base.position,
            startTime: Date.now(),
          };
        }
        
        const newAlly: Aircraft = {
          id: `ally-${Math.random().toString(36).substr(2, 9)}`,
          spec: spec,
          side: Side.ALLY,
          factionId: base.factionId,
          status: AircraftStatus.TAKEOFF,
          position: { ...base.position },
          altitude: 0,
          heading: Math.random() * 360,
          speed: 0,
          fuel: spec.fuelCapacityL,
          health: 100,
          isDamaged: false,
          ecmActive: false,
          trail: [],
          missiles: { ...spec.missileCapacity },
          gunAmmo: spec.gunAmmo,
          flares: spec.flaresCapacity,
          countermeasures: spec.countermeasuresCapacity,
          targetId: mission.targetId,
          iffStatus: IFFStatus.FRIENDLY,
          rwrStatus: RWRStatus.SILENT,
          trackingBy: [],
          mission
        };
        finalAircrafts.push(newAlly);
        addLog(`INFO: Aliado decolando de ${base.name} para ${mission.type}.`);
      }
    });

    // Ally Defense Logic: Ally planes defend nearby friendly aircraft
    finalAircrafts.forEach(ac => {
      if (ac.side === Side.ALLY && !ac.targetId && ac.status !== AircraftStatus.RTB) {
        const nearbyFriendly = finalAircrafts.find(f => 
          (f.side === Side.FRIENDLY || f.side === Side.ALLY) && 
          getDistanceKm(ac.position, f.position) < 50 &&
          finalAircrafts.some(e => areEnemies(e, f) && e.targetId === f.id)
        );
        if (nearbyFriendly) {
          const threat = finalAircrafts.find(e => areEnemies(e, nearbyFriendly) && e.targetId === nearbyFriendly.id);
          if (threat) {
            ac.targetId = threat.id;
            ac.status = AircraftStatus.COMBAT;
          }
        }
      }
    });

    // Ground Unit AI & Damage
    const finalGroundUnits = updatedGroundUnits.map(u => {
      if (u.status === "DESTROYED") return u;
      
      let health = u.health;
      const impacts = missiles.filter(m => m.targetId === u.id && (m as any).impact);
      if (impacts.length > 0) {
        health -= 50 * impacts.length;
      }
      if (health <= 0) return { ...u, health: 0, status: "DESTROYED" as const };
      return { ...u, health };
    });

    // Hostile Missile Launch (More aggressive)
    finalAircrafts.forEach(ac => {
      if (ac.side === Side.HOSTILE && ac.status === AircraftStatus.COMBAT && ac.targetId) {
        const target = finalAircrafts.find(a => a.id === ac.targetId) || (friendlyBase.id === ac.targetId ? friendlyBase : null);
        if (target && getDistanceKm(ac.position, target.position) < 50 && Math.random() > 0.95) {
          launchMissile(ac.id, ac.targetId);
        }
      }
    });

    // Friendly Missile Launch (Auto)
    finalAircrafts.forEach(ac => {
      if (ac.side === Side.FRIENDLY && ac.status === AircraftStatus.COMBAT && ac.targetId) {
        const target = finalAircrafts.find(a => a.id === ac.targetId) || hostileBases.find(b => b.id === ac.targetId);
        if (target && getDistanceKm(ac.position, target.position) < 60 && Math.random() > 0.99) {
          launchMissile(ac.id, ac.targetId);
        }
      }
    });

    // IFF and RWR Update
    const processedAircrafts = finalAircrafts.map(ac => {
      const trackingUnits: string[] = [];
      
      finalAircrafts.forEach(other => {
        if (other.id !== ac.id && other.targetId === ac.id) {
          trackingUnits.push(other.id);
        }
      });
      
      finalGroundUnits.forEach(gu => {
        if (gu.targetPosition && getDistanceKm(gu.position, ac.position) < gu.radarRangeKm) {
          trackingUnits.push(gu.id);
        }
      });
      
      let newRwrStatus = RWRStatus.SILENT;
      if (trackingUnits.length > 0) {
        const hasIncomingMissile = updatedMissiles.some(m => m.targetId === ac.id && !m.isPitbull);
        if (hasIncomingMissile) {
          newRwrStatus = RWRStatus.MISSILE;
        } else if (trackingUnits.some(t => {
          const tracker = finalAircrafts.find(a => a.id === t);
          return tracker && getDistanceKm(tracker.position, ac.position) < 30;
        })) {
          newRwrStatus = RWRStatus.TRACK;
        } else {
          newRwrStatus = RWRStatus.SEARCH;
        }
      }
      
      let newIffStatus = ac.iffStatus || IFFStatus.UNKNOWN;
      if (ac.side === Side.FRIENDLY || ac.side === Side.ALLY) {
        newIffStatus = IFFStatus.FRIENDLY;
      } else if (ac.side === Side.HOSTILE) {
        if (ac.iffStatus === IFFStatus.UNKNOWN) {
          const friendlyTracking = trackingUnits.some(t => {
            const tracker = finalAircrafts.find(a => a.id === t);
            return tracker && (tracker.side === Side.FRIENDLY || tracker.side === Side.ALLY);
          });
          if (friendlyTracking && Math.random() < 0.01) {
            newIffStatus = IFFStatus.IDENTIFIED;
          }
        }
      }
      
      return {
        ...ac,
        rwrStatus: newRwrStatus,
        iffStatus: newIffStatus,
        trackingBy: trackingUnits
      };
    });

    let updatedFriendlyBase = { ...friendlyBase };
    
    if (friendlyBase.buildings.length > 0) {
      const maintenancePerTick = friendlyBase.buildings.reduce((sum, b) => {
        return sum + (BUILDING_COSTS[b.type].maintenance / 3600) * deltaTime;
      }, 0);
      
      updatedFriendlyBase = {
        ...friendlyBase,
        credits: Math.max(0, friendlyBase.credits - maintenancePerTick)
      };
      
      friendlyBase.buildings.forEach(b => {
        if (b.type === BuildingType.SAM_BATTERY) {
          const enemies = processedAircrafts.filter(e => 
            e.side === Side.HOSTILE && 
            e.status !== AircraftStatus.DESTROYED &&
            getDistanceKm(b.position, e.position) < 150
          );
          
          if (enemies.length > 0 && Math.random() > 0.98) {
            const target = enemies[0];
            const existingSAMs = finalGroundUnits.filter(g => 
              g.type === GroundUnitType.SAM_BATTERY && 
              getDistanceKm(g.position, b.position) < 1
            );
            
            if (existingSAMs.length === 0) {
              const newSAM: GroundUnit = {
                id: `sam-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                model: "SAM Battery",
                type: GroundUnitType.SAM_BATTERY,
                side: Side.FRIENDLY,
                position: b.position,
                radarRangeKm: 150,
                missiles: { "SAM": 8 },
                health: 100,
                status: "GUARD"
              };
              finalGroundUnits.push(newSAM);
            }
          }
        }
      });
    }

    const buildingsToComplete: string[] = [];
    const aircraftWithCompletedMissions = processedAircrafts.map(ac => {
      if (ac.mission?.type === MissionType.CARGO && ac.mission.targetId) {
        const building = pendingBuildings.find(b => b.id === ac.mission.targetId && b.status === 'IN_TRANSIT');
        if (building && getDistanceKm(ac.position, building.position) < 3) {
          buildingsToComplete.push(building.id);
          addLog(`CONSTRUÇÃO: ${building.type} concluído em ${building.position.lat.toFixed(2)}, ${building.position.lng.toFixed(2)}!`);
          return { ...ac, mission: undefined, status: AircraftStatus.RTB };
        }
      }
      return ac;
    });

    let finalFriendlyBase = updatedFriendlyBase;
    
    const friendlyResult = generateBaseResources(updatedFriendlyBase, processedAircrafts, deltaTime);
    finalFriendlyBase = friendlyResult.base;

    const finalAllyBases = allyBases.map(base => generateBaseResources(base, processedAircrafts, deltaTime).base);
     const finalHostileBases = hostileBases.map(base => generateBaseResources(base, processedAircrafts, deltaTime).base);
     
    if (buildingsToComplete.length > 0) {
      const completedBuildings = pendingBuildings
        .filter(b => buildingsToComplete.includes(b.id))
        .map(b => ({
          id: `building-${b.type.toLowerCase()}-${Date.now()}`,
          type: b.type,
          position: b.position,
          builtAt: Date.now()
        } as Building));
      
      finalFriendlyBase = {
        ...updatedFriendlyBase,
        buildings: [...updatedFriendlyBase.buildings, ...completedBuildings]
      };
    }

    const totalAllyFuel = finalAllyBases.reduce((sum, b) => sum + b.fuelStock, 0);
    const totalAllyCap = finalAllyBases.reduce((sum, b) => sum + (b.resourceSpot?.fuelCapacity || 100000), 0);
    const friendlyFuel = finalFriendlyBase.fuelStock;
    const friendlyCap = finalFriendlyBase.resourceSpot?.fuelCapacity || 100000;
    
    if ((friendlyFuel / friendlyCap > 0.9 || totalAllyFuel / totalAllyCap > 0.9) && Math.random() > 0.95) {
      addLog(`ALERTA: Combustível crítico! Tanques cheios detectados.`);
    }

     set({ 
       aircrafts: aircraftWithCompletedMissions, 
       groundUnits: finalGroundUnits,
      missiles: updatedMissiles, 
      friendlyBase: finalFriendlyBase,
      allyBases: finalAllyBases,
      hostileBases: finalHostileBases,
      pendingBuildings: pendingBuildings.filter(b => !buildingsToComplete.includes(b.id)),
      newsEvents: updatedNews
    });
  }
}));
