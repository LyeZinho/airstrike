import { RegistryBase } from "./RegistryBase";
import { AircraftSpecification } from "../types/entities";

/**
 * Registry for all aircraft specifications in the game.
 * Provides centralized, extensible aircraft definitions.
 * 
 * To add a new aircraft:
 * 1. Create a new AircraftSpecification object
 * 2. Call aircraftRegistry.register(id, spec)
 * 3. The aircraft is immediately available in-game without code changes elsewhere
 */
export class AircraftRegistry extends RegistryBase<AircraftSpecification> {
  constructor() {
    super("AircraftRegistry");
    this.registerDefaultAircraft();
  }

  private registerDefaultAircraft(): void {
    // Multi-role Fighters
    this.register("F-16C", {
      id: "F-16C",
      model: "F-16C Viper",
      role: "Multi-role",
      rcsFrontal: 1.0,
      rcsLateral: 5.0,
      maxSpeedMach: 2.0,
      radarRangeKm: 110,
      fuelCapacityL: 3200,
      fuelConsumptionBase: 35,
      ecmStrength: 0.3,
      flaresCapacity: 30,
      countermeasuresCapacity: 30,
      missileCapacity: { "AIM-120C": 6, "AIM-9X": 2 },
      gunAmmo: 500,
    });

    // Interceptors
    this.register("Gripen", {
      id: "Gripen",
      model: "JAS 39 Gripen",
      role: "Interceptor",
      rcsFrontal: 0.1,
      rcsLateral: 1.5,
      maxSpeedMach: 2.0,
      radarRangeKm: 120,
      fuelCapacityL: 2300,
      fuelConsumptionBase: 28,
      ecmStrength: 0.5,
      flaresCapacity: 40,
      countermeasuresCapacity: 40,
      missileCapacity: { "Meteor": 4, "IRIS-T": 2 },
      gunAmmo: 120,
    });

    this.register("MiG-29", {
      id: "MiG-29",
      model: "MiG-29 Fulcrum",
      role: "Interceptor",
      rcsFrontal: 5.0,
      rcsLateral: 12.0,
      maxSpeedMach: 2.25,
      radarRangeKm: 80,
      fuelCapacityL: 3500,
      fuelConsumptionBase: 45,
      ecmStrength: 0.2,
      flaresCapacity: 30,
      countermeasuresCapacity: 30,
      missileCapacity: { "R-77": 2, "R-73": 4 },
      gunAmmo: 150,
    });

    // Air Superiority
    this.register("Su-27", {
      id: "Su-27",
      model: "Su-27 Flanker",
      role: "Superiority",
      rcsFrontal: 15.0,
      rcsLateral: 25.0,
      maxSpeedMach: 2.35,
      radarRangeKm: 150,
      fuelCapacityL: 9400,
      fuelConsumptionBase: 60,
      ecmStrength: 0.2,
      flaresCapacity: 60,
      countermeasuresCapacity: 60,
      missileCapacity: { "R-77": 6, "R-73": 4 },
      gunAmmo: 150,
    });

    // Stealth Fighters
    this.register("F-35A", {
      id: "F-35A",
      model: "F-35A Lightning II",
      role: "Stealth",
      rcsFrontal: 0.001,
      rcsLateral: 0.01,
      maxSpeedMach: 1.6,
      radarRangeKm: 160,
      fuelCapacityL: 8300,
      fuelConsumptionBase: 75,
      ecmStrength: 0.8,
      flaresCapacity: 24,
      countermeasuresCapacity: 24,
      missileCapacity: { "AIM-120D": 4 },
      gunAmmo: 180,
    });

    // Transport Aircraft
    this.register("C-130", {
      id: "C-130",
      model: "C-130 Hercules",
      role: "Transport",
      rcsFrontal: 80.0,
      rcsLateral: 120.0,
      maxSpeedMach: 0.6,
      radarRangeKm: 40,
      fuelCapacityL: 25000,
      fuelConsumptionBase: 50,
      ecmStrength: 0.1,
      flaresCapacity: 120,
      countermeasuresCapacity: 120,
      missileCapacity: {},
      gunAmmo: 0,
    });

    this.register("C-5M", {
      id: "C-5M",
      model: "C-5M Galaxy",
      role: "Strategic Cargo",
      rcsFrontal: 150.0,
      rcsLateral: 300.0,
      maxSpeedMach: 0.79,
      radarRangeKm: 50,
      fuelCapacityL: 190000,
      fuelConsumptionBase: 250,
      ecmStrength: 0.1,
      flaresCapacity: 120,
      countermeasuresCapacity: 120,
      missileCapacity: {},
      gunAmmo: 0,
    });

    this.register("C-17", {
      id: "C-17",
      model: "C-17 Globemaster III",
      role: "Strategic/Tactical Cargo",
      rcsFrontal: 60.0,
      rcsLateral: 120.0,
      maxSpeedMach: 0.77,
      radarRangeKm: 60,
      fuelCapacityL: 100000,
      fuelConsumptionBase: 150,
      ecmStrength: 0.2,
      flaresCapacity: 120,
      countermeasuresCapacity: 120,
      missileCapacity: {},
      gunAmmo: 0,
    });

    this.register("An-124", {
      id: "An-124",
      model: "An-124 Ruslan",
      role: "Heavy Strategic Cargo",
      rcsFrontal: 200.0,
      rcsLateral: 400.0,
      maxSpeedMach: 0.7,
      radarRangeKm: 50,
      fuelCapacityL: 210000,
      fuelConsumptionBase: 300,
      ecmStrength: 0.1,
      flaresCapacity: 120,
      countermeasuresCapacity: 120,
      missileCapacity: {},
      gunAmmo: 0,
    });

    this.register("KC-390", {
      id: "KC-390",
      model: "KC-390 Millennium",
      role: "Tactical Transport",
      rcsFrontal: 30.0,
      rcsLateral: 60.0,
      maxSpeedMach: 0.8,
      radarRangeKm: 70,
      fuelCapacityL: 35000,
      fuelConsumptionBase: 80,
      ecmStrength: 0.3,
      flaresCapacity: 60,
      countermeasuresCapacity: 60,
      missileCapacity: {},
      gunAmmo: 0,
    });

    this.register("A400M", {
      id: "A400M",
      model: "Airbus A400M Atlas",
      role: "Tactical/Strategic Transport",
      rcsFrontal: 40.0,
      rcsLateral: 80.0,
      maxSpeedMach: 0.72,
      radarRangeKm: 70,
      fuelCapacityL: 50000,
      fuelConsumptionBase: 100,
      ecmStrength: 0.3,
      flaresCapacity: 120,
      countermeasuresCapacity: 120,
      missileCapacity: {},
      gunAmmo: 0,
    });

    this.register("Y-20", {
      id: "Y-20",
      model: "Xian Y-20",
      role: "Heavy Transport",
      rcsFrontal: 100.0,
      rcsLateral: 200.0,
      maxSpeedMach: 0.75,
      radarRangeKm: 60,
      fuelCapacityL: 110000,
      fuelConsumptionBase: 160,
      ecmStrength: 0.2,
      flaresCapacity: 120,
      countermeasuresCapacity: 120,
      missileCapacity: {},
      gunAmmo: 0,
    });

    // Stealth Bombers
    this.register("B-2", {
      id: "B-2",
      model: "B-2 Spirit",
      role: "Stealth Bomber",
      rcsFrontal: 0.0001,
      rcsLateral: 0.001,
      maxSpeedMach: 0.95,
      radarRangeKm: 150,
      fuelCapacityL: 75000,
      fuelConsumptionBase: 120,
      ecmStrength: 0.9,
      flaresCapacity: 120,
      countermeasuresCapacity: 120,
      missileCapacity: { "BVR": 16, "Dogfight": 8 },
      gunAmmo: 0,
    });

    this.register("B-21", {
      id: "B-21",
      model: "B-21 Raider",
      role: "Next-Gen Stealth Bomber",
      rcsFrontal: 0.00005,
      rcsLateral: 0.0005,
      maxSpeedMach: 0.9,
      radarRangeKm: 180,
      fuelCapacityL: 70000,
      fuelConsumptionBase: 110,
      ecmStrength: 0.95,
      flaresCapacity: 120,
      countermeasuresCapacity: 120,
      missileCapacity: {},
      gunAmmo: 0,
    });

    this.register("PAK-DA", {
      id: "PAK-DA",
      model: "Tupolev PAK DA",
      role: "Stealth Bomber",
      rcsFrontal: 0.001,
      rcsLateral: 0.01,
      maxSpeedMach: 0.9,
      radarRangeKm: 160,
      fuelCapacityL: 80000,
      fuelConsumptionBase: 130,
      ecmStrength: 0.8,
      flaresCapacity: 120,
      countermeasuresCapacity: 120,
      missileCapacity: {},
      gunAmmo: 0,
    });

    this.register("H-20", {
      id: "H-20",
      model: "Xian H-20",
      role: "Stealth Bomber",
      rcsFrontal: 0.001,
      rcsLateral: 0.01,
      maxSpeedMach: 0.9,
      radarRangeKm: 150,
      fuelCapacityL: 70000,
      fuelConsumptionBase: 120,
      ecmStrength: 0.8,
      flaresCapacity: 120,
      countermeasuresCapacity: 120,
      missileCapacity: {},
      gunAmmo: 0,
    });

    // Conventional Bombers
    this.register("B-1B", {
      id: "B-1B",
      model: "B-1B Lancer",
      role: "Supersonic Bomber",
      rcsFrontal: 1.0,
      rcsLateral: 10.0,
      maxSpeedMach: 1.25,
      radarRangeKm: 120,
      fuelCapacityL: 88000,
      fuelConsumptionBase: 150,
      ecmStrength: 0.4,
      flaresCapacity: 60,
      countermeasuresCapacity: 60,
      missileCapacity: {},
      gunAmmo: 0,
    });

    this.register("B-52H", {
      id: "B-52H",
      model: "B-52H Stratofortress",
      role: "Heavy Bomber",
      rcsFrontal: 100.0,
      rcsLateral: 200.0,
      maxSpeedMach: 0.84,
      radarRangeKm: 100,
      fuelCapacityL: 180000,
      fuelConsumptionBase: 200,
      ecmStrength: 0.3,
      flaresCapacity: 60,
      countermeasuresCapacity: 60,
      missileCapacity: {},
      gunAmmo: 0,
    });

    this.register("Tu-160", {
      id: "Tu-160",
      model: "Tu-160 White Swan",
      role: "Supersonic Bomber",
      rcsFrontal: 15.0,
      rcsLateral: 50.0,
      maxSpeedMach: 2.05,
      radarRangeKm: 140,
      fuelCapacityL: 148000,
      fuelConsumptionBase: 180,
      ecmStrength: 0.3,
      flaresCapacity: 60,
      countermeasuresCapacity: 60,
      missileCapacity: { "BVR": 12, "Dogfight": 4 },
      gunAmmo: 0,
    });

    this.register("Tu-22M3M", {
      id: "Tu-22M3M",
      model: "Tu-22M3M Backfire",
      role: "Long-range Bomber",
      rcsFrontal: 10.0,
      rcsLateral: 40.0,
      maxSpeedMach: 1.88,
      radarRangeKm: 120,
      fuelCapacityL: 54000,
      fuelConsumptionBase: 140,
      ecmStrength: 0.3,
      flaresCapacity: 60,
      countermeasuresCapacity: 60,
      missileCapacity: {},
      gunAmmo: 0,
    });

    this.register("H-6K", {
      id: "H-6K",
      model: "H-6K",
      role: "Strategic Bomber",
      rcsFrontal: 40.0,
      rcsLateral: 80.0,
      maxSpeedMach: 0.85,
      radarRangeKm: 120,
      fuelCapacityL: 40000,
      fuelConsumptionBase: 100,
      ecmStrength: 0.2,
      flaresCapacity: 60,
      countermeasuresCapacity: 60,
      missileCapacity: {},
      gunAmmo: 0,
    });
  }

  /**
   * Add a custom aircraft at runtime.
   * Useful for testing or dynamic content loading.
   * 
   * @param spec The aircraft specification to add
   */
  addCustomAircraft(spec: AircraftSpecification): void {
    this.register(spec.id, spec);
  }
}

// Singleton instance
export const aircraftRegistry = new AircraftRegistry();
