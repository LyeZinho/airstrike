import { create } from "zustand";

/**
 * UI state hook (mutable).
 * Only contains UI/UX concerns: selections, UI modes, logs, settings.
 * Does NOT contain game simulation state.
 */
interface GameUIStore {
  selectedAircraftId: string | null;
  logs: string[];
  isPaused: boolean;
  buildMode: boolean;
  selectedBuildingType: string | null;
  waypointMode: boolean;
  fccOpen: boolean;
  pendingMapWaypoint: { lat: number; lng: number } | null;

  selectAircraft: (id: string | null) => void;
  addLog: (message: string) => void;
  setPaused: (paused: boolean) => void;
  togglePause: () => void;
  setBuildMode: (enabled: boolean) => void;
  setSelectedBuildingType: (type: string | null) => void;
  clearLogs: () => void;
  setWaypointMode: (enabled: boolean) => void;
  setFccOpen: (open: boolean) => void;
  setPendingMapWaypoint: (wp: { lat: number; lng: number } | null) => void;
}

export const useGameUI = create<GameUIStore>((set) => ({
  selectedAircraftId: null,
  logs: [],
  isPaused: false,
  buildMode: false,
  selectedBuildingType: null,
  waypointMode: false,
  fccOpen: false,
  pendingMapWaypoint: null,

  selectAircraft: (id) => set({ selectedAircraftId: id }),

  addLog: (message) =>
    set((state) => {
      const newLogs = [message, ...state.logs].slice(0, 100);
      return { logs: newLogs };
    }),

  setPaused: (paused) => set({ isPaused: paused }),

  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

  setBuildMode: (enabled) => set({ buildMode: enabled }),

  setSelectedBuildingType: (type) => set({ selectedBuildingType: type }),

  clearLogs: () => set({ logs: [] }),

  setWaypointMode: (enabled) => set({ waypointMode: enabled }),

  setFccOpen: (open) => set({ fccOpen: open }),

  setPendingMapWaypoint: (wp) => set({ pendingMapWaypoint: wp }),
}));
