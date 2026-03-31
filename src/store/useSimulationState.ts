import { create } from "zustand";
import { Aircraft, Missile, GameState } from "../types/entities";

/**
 * Read-only simulation state hook.
 * Provides access to current game state without mutations.
 * Updated by SimulationEngine every tick.
 */
interface SimulationStateStore {
  gameState: GameState;
  updateGameState: (state: GameState) => void;
}

export const useSimulationState = create<SimulationStateStore>((set) => ({
  gameState: {
    aircrafts: [],
    missiles: [],
    friendlyBase: {} as any,
    hostileBases: [],
    allyBases: [],
    neutralBases: [],
    groundUnits: [],
    selectedAircraftId: null,
    tick: 0,
    isPaused: false,
    elapsedSeconds: 0,
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
  },

  updateGameState: (state: GameState) => set({ gameState: state }),
}));

export const getGameState = (): GameState => {
  return useSimulationState.getState().gameState;
};
