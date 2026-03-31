import { useEffect, useRef } from "react";
import { simulationEngine } from "../../core/SimulationEngine";
import { useSimulationState } from "../../store/useSimulationState";
import { useWarRoomStore } from "../../store/useWarRoomStore";
import { useGameUI } from "../../store/useGameUI";
import { Aircraft, Missile } from "../../types/entities";

/**
 * Custom hook providing React integration with the simulation engine.
 * Handles lifecycle, tick scheduling, and state subscription.
 */
export function useGameEngine() {
  const gameState = useSimulationState((state) => state.gameState);
  const { paused, togglePause } = useGameUI();
  
  // Also bring in critical WarRoom state for tracking
  const newsArticles = useWarRoomStore((state) => state.newsArticles);
  const objectives = useWarRoomStore((state) => state.objectives);

  const engineRef = useRef<typeof simulationEngine | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    engineRef.current = simulationEngine;
    engineRef.current.initialize();

    const tick = () => {
      // The tick should run even if paused IF we want to allow UI updates,
      // but usually we skip the simulation logic if paused.
      if (!paused) {
        engineRef.current!.tick();
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [paused]);

  return {
    gameState,
    newsArticles,
    objectives,
    
    launchAircraft: (aircraftType: string) =>
      engineRef.current?.launchAircraft(aircraftType),

    fireMissile: (aircraftId: string, targetId: string, missileType: string) =>
      engineRef.current?.fireMissile(aircraftId, targetId, missileType),

    togglePause,
    isPaused: paused,

    reset: () => engineRef.current?.reset(),

    getAircraft: (id: string): Aircraft | undefined =>
      engineRef.current?.getAircraft().get(id),

    getMissile: (id: string): Missile | undefined =>
      engineRef.current?.getMissiles().get(id),
  };
}
