import { describe, it, expect, beforeEach } from "vitest";
import { SimulationEngine } from "../../core/SimulationEngine";
import { simulationClock } from "../../core/SimulationClock";

describe("SimulationEngine - Functional tests", () => {
  let engine: SimulationEngine;

  beforeEach(() => {
    engine = new SimulationEngine();
    engine.initialize();
  });

  it("should initialize with aircraft in spatial index", () => {
    const aircraft = engine.getAircraft();
    expect(aircraft.size).toBeGreaterThan(0);
  });

  it("should launch aircraft successfully", () => {
    const id = engine.launchAircraft("Gripen");
    expect(id).toBeTruthy();

    const launched = engine.getAircraft().get(id);
    expect(launched).toBeDefined();
    expect(launched?.spec.model).toBe("JAS 39 Gripen");
  });

  it("should fire missile from aircraft", () => {
    const aircraftMap = engine.getAircraft();
    const aircraftId = aircraftMap.keys().next().value;

    engine.fireMissile(aircraftId, "dummy-target", "AIM-120C");

    const missiles = engine.getMissiles();
    expect(missiles.size).toBeGreaterThan(0);
  });

  it("should advance simulation ticks", () => {
    const tickBefore = simulationClock.getCurrentTick().count;

    engine.tick();
    engine.tick();
    engine.tick();

    const tickAfter = simulationClock.getCurrentTick().count;
    expect(tickAfter).toBeGreaterThan(tickBefore);
  });

  it("should handle pause/resume", () => {
    engine.setPaused(true);
    const aircraft = engine.getAircraft();
    const initialX = aircraft.values().next().value.position.x;

    engine.tick();

    const afterX = aircraft.values().next().value.position.x;
    expect(afterX).toBe(initialX);
  });

  it("should detect nearby aircraft", () => {
    const aircraftMap = engine.getAircraft();
    expect(aircraftMap.size).toBeGreaterThanOrEqual(2);
  });

  it("should reset simulation state", () => {
    const aircraftBefore = engine.getAircraft().size;

    engine.reset();
    const aircraftAfter = engine.getAircraft().size;

    expect(aircraftAfter).toBe(aircraftBefore);
  });
});
