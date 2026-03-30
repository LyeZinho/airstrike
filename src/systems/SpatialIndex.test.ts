import { describe, it, expect, beforeEach } from "vitest";
import { SpatialIndex } from "../../systems/SpatialIndex";

describe("SpatialIndex - O(1) collision detection", () => {
  let index: SpatialIndex;

  beforeEach(() => {
    index = new SpatialIndex(100);
  });

  it("should track aircraft in correct cells", () => {
    const aircraftId = "F-16C-001";
    index.updateAircraft(aircraftId, 50, 50, 10);

    const nearby = index.getNearbyAircraft(50, 50, 20);
    expect(nearby).toContain(aircraftId);
  });

  it("should find nearby aircraft efficiently", () => {
    const startTime = performance.now();

    for (let i = 0; i < 100; i++) {
      index.updateAircraft(`aircraft-${i}`, Math.random() * 1000, Math.random() * 1000, 5);
    }

    const endTime = performance.now();
    const insertionTime = endTime - startTime;

    expect(insertionTime).toBeLessThan(50);
  });

  it("should detect collisions in nearby cells", () => {
    index.updateAircraft("target", 0, 0, 20);
    index.updateMissile("missile-1", 5, 5);

    const nearby = index.getNearbyMissiles(0, 0, 20);
    expect(nearby).toContain("missile-1");
  });

  it("should handle aircraft removal", () => {
    index.updateAircraft("F-16C-001", 50, 50, 10);
    index.removeAircraft("F-16C-001");

    const nearby = index.getNearbyAircraft(50, 50, 20);
    expect(nearby).not.toContain("F-16C-001");
  });

  it("should scale to 1000 aircraft without degradation", () => {
    for (let i = 0; i < 1000; i++) {
      index.updateAircraft(
        `aircraft-${i}`,
        (i % 100) * 10,
        Math.floor(i / 100) * 10,
        5
      );
    }

    const startTime = performance.now();
    const nearby = index.getNearbyAircraft(450, 450, 100);
    const endTime = performance.now();

    const queryTime = endTime - startTime;

    expect(queryTime).toBeLessThan(5);
    expect(nearby.length).toBeGreaterThan(0);
  });
});
