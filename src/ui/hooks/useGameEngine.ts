import { useEffect, useRef } from "react";
import { simulationEngine } from "../../core/SimulationEngine";
import { simulationClock } from "../../core/SimulationClock";
import { useSimulationState } from "../../store/useSimulationState";
import { useGameUI } from "../../store/useGameUI";
import { Aircraft, Missile } from "../../types/entities";

/**
 * Custom hook providing React integration with the simulation engine.
 * Handles lifecycle, tick scheduling, and state subscription.
 * 
 * Usage:
 *   const gameEngine = useGameEngine();
 *   gameEngine.launchAircraft("F-16C");
 *   gameEngine.fireMissile(aircraftId, targetId, "AIM-120C");
 */
export function useGameEngine() {
  const gameState = useSimulationState((state) => state.gameState);
  const updateGameState = useSimulationState((state) => state.updateGameState);
  const { isPaused, togglePause } = useGameUI();

  const engineRef = useRef<typeof simulationEngine | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    engineRef.current = simulationEngine;
    engineRef.current.initialize();

    const tick = () => {
      if (!isPaused) {
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
  }, [isPaused]);

  return {
    gameState,
    aircraft: (gameState as any).aircraft || gameState.aircrafts || new Map(),
    missiles: gameState.missiles || new Map(),

    launchAircraft: (aircraftType: string) =>
      engineRef.current?.launchAircraft(aircraftType),

    fireMissile: (aircraftId: string, targetId: string, missileType: string) =>
      engineRef.current?.fireMissile(aircraftId, targetId, missileType),

    togglePause,

    reset: () => engineRef.current?.reset(),

    getAircraft: (id: string): Aircraft | undefined =>
      engineRef.current?.getAircraft().get(id),

    getMissile: (id: string): Missile | undefined =>
      engineRef.current?.getMissiles().get(id),
  };
}
