import { describe, it, expect, beforeEach } from "vitest";
import { aircraftRegistry } from "../../plugins/AircraftRegistry";
import { missileRegistry } from "../../plugins/MissileRegistry";
import { AircraftSpecification, MissileSpecification } from "../../types/entities";

describe("Extensibility - Registry pattern", () => {
  it("should retrieve all 22 aircraft from registry", () => {
    const aircraftIds = aircraftRegistry.getIds();
    expect(aircraftIds.length).toBe(22);
  });

  it("should retrieve all 12 missiles from registry", () => {
    const missileIds = missileRegistry.getIds();
    expect(missileIds.length).toBe(12);
  });

  it("should retrieve aircraft by ID", () => {
    const f16 = aircraftRegistry.get("F-16C");
    expect(f16).toBeDefined();
    expect(f16?.model).toBe("F-16C Viper");
    expect(f16?.maxSpeedMach).toBe(2.0);
  });

  it("should retrieve missile by ID", () => {
    const aim120 = missileRegistry.get("AIM-120C");
    expect(aim120).toBeDefined();
    expect(aim120?.model).toBe("AIM-120C-5");
    expect(aim120?.rangeMax).toBe(105);
  });

  it("should add custom aircraft at runtime without code changes", () => {
    const customSpec: AircraftSpecification = {
      id: "F-35B",
      model: "F-35B Lightning II (STOVL)",
      role: "Stealth",
      rcsFrontal: 0.0015,
      rcsLateral: 0.015,
      maxSpeedMach: 1.6,
      radarRangeKm: 150,
      fuelCapacityL: 8300,
      fuelConsumptionBase: 75,
      ecmStrength: 0.85,
      flaresCapacity: 24,
      countermeasuresCapacity: 24,
      missileCapacity: { "AIM-120D": 4 },
      gunAmmo: 200,
    };

    aircraftRegistry.addCustomAircraft(customSpec);

    const retrieved = aircraftRegistry.get("F-35B");
    expect(retrieved).toBeDefined();
    expect(retrieved?.model).toBe("F-35B Lightning II (STOVL)");
    expect(retrieved?.fuelConsumptionBase).toBe(75);
  });

  it("should add custom missile at runtime without code changes", () => {
    const customSpec: MissileSpecification = {
      id: "AIM-260",
      model: "AIM-260 JATM",
      type: "LONG_RANGE",
      rangeMax: 240,
      nez: 70,
      speed: 4.5,
      cost: 7000,
      reloadTime: 15,
    };

    missileRegistry.addCustomMissile(customSpec);

    const retrieved = missileRegistry.get("AIM-260");
    expect(retrieved).toBeDefined();
    expect(retrieved?.rangeMax).toBe(240);
    expect(retrieved?.cost).toBe(7000);
  });

  it("should verify aircraft specs are physically reasonable", () => {
    aircraftRegistry.getAll().forEach((spec) => {
      expect(spec.maxSpeedMach).toBeGreaterThan(0);
      expect(spec.fuelCapacityL).toBeGreaterThan(0);
      expect(spec.radarRangeKm).toBeGreaterThan(0);
      expect(spec.rcsFrontal).toBeGreaterThanOrEqual(0);
      expect(spec.ecmStrength).toBeGreaterThanOrEqual(0);
      expect(spec.ecmStrength).toBeLessThanOrEqual(1);
    });
  });

  it("should verify missile specs are physically reasonable", () => {
    missileRegistry.getAll().forEach((spec) => {
      expect(spec.rangeMax).toBeGreaterThan(0);
      expect(spec.speed).toBeGreaterThan(0);
      expect(spec.cost).toBeGreaterThan(0);
      expect(spec.reloadTime).toBeGreaterThan(0);
    });
  });
});
