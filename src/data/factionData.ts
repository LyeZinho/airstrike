/**
 * Phase 16: Faction Data Registry
 * Configuration-driven faction specifications, AI personalities, and terrain multipliers
 */

export interface FactionMarketProfile {
  id: string;
  name: string;
  shortName: string;
  color: string;
  marketProfile: string;
  preferredAircraft: string[];
  loreFlavorText: string;
  stockVolatility: {
    lossImpact: number;
    victoryImpact: number;
  };
}

export const FACTION_SPECS_PHASE16: Record<string, FactionMarketProfile> = {
  EC: {
    id: 'EC',
    name: 'Euro-Consolidada',
    shortName: 'EC',
    color: '#3b82f6',
    marketProfile: 'Conservative, High-Margin',
    preferredAircraft: ['Gripen', 'Eurofighter'],
    loreFlavorText: '"Order through Superior Engineering"',
    stockVolatility: {
      lossImpact: -0.02,
      victoryImpact: 0.03,
    },
  },
  BNS: {
    id: 'BNS',
    name: 'Bloco Neo-Soviético',
    shortName: 'BNS',
    color: '#ef4444',
    marketProfile: 'Volume Player, Accepts Losses',
    preferredAircraft: ['MiG-29', 'Su-27'],
    loreFlavorText: '"Physics Solves All Problems"',
    stockVolatility: {
      lossImpact: -0.08,
      victoryImpact: 0.02,
    },
  },
  PAN: {
    id: 'PAN',
    name: 'Pacífico-Aegis',
    shortName: 'PAN',
    color: '#06b6d4',
    marketProfile: 'Ultra-Long-Range Specialist',
    preferredAircraft: ['F-15EX', 'F-35'],
    loreFlavorText: '"See First, Kill First"',
    stockVolatility: {
      lossImpact: -0.05,
      victoryImpact: 0.04,
    },
  },
  LA: {
    id: 'LA',
    name: 'Liga dos Andes',
    shortName: 'LA',
    color: '#8b5cf6',
    marketProfile: 'Terrain Master',
    preferredAircraft: ['A-10', 'Super Tucano'],
    loreFlavorText: '"The Mountains Are Ours"',
    stockVolatility: {
      lossImpact: -0.06,
      victoryImpact: 0.02,
    },
  },
  SP: {
    id: 'SP',
    name: 'Sindicato Petrolífero',
    shortName: 'SP',
    color: '#f59e0b',
    marketProfile: 'Endurance Specialist',
    preferredAircraft: ['Su-30', 'F-15E'],
    loreFlavorText: '"Fuel Is Our Superweapon"',
    stockVolatility: {
      lossImpact: -0.03,
      victoryImpact: 0.02,
    },
  },
  CE: {
    id: 'CE',
    name: 'Coletivo Escandinavo',
    shortName: 'CE',
    color: '#14b8a6',
    marketProfile: 'EW Specialist',
    preferredAircraft: ['Gripen-E', 'GlobalEye'],
    loreFlavorText: '"The Invisible War"',
    stockVolatility: {
      lossImpact: -0.04,
      victoryImpact: 0.03,
    },
  },
  AD: {
    id: 'AD',
    name: 'Aliança do Dragão',
    shortName: 'AD',
    color: '#ec4899',
    marketProfile: 'Zerg Rush',
    preferredAircraft: ['JF-17', 'PL-15'],
    loreFlavorText: '"Quantity Has Quality of Its Own"',
    stockVolatility: {
      lossImpact: -0.15,
      victoryImpact: 0.05,
    },
  },
  UAT: {
    id: 'UAT',
    name: 'União Africana Tech',
    shortName: 'UAT',
    color: '#f97316',
    marketProfile: 'Drone Swarms',
    preferredAircraft: ['MQ-9 Reaper', 'Loitering Munitions'],
    loreFlavorText: '"The Future Is Autonomous"',
    stockVolatility: {
      lossImpact: -0.1,
      victoryImpact: 0.03,
    },
  },
  MV: {
    id: 'MV',
    name: 'Mercenários Void',
    shortName: 'MV',
    color: '#64748b',
    marketProfile: 'No Fixed Base',
    preferredAircraft: ['Rafale', 'F-18'],
    loreFlavorText: '"Always Hire Mercenaries, Never Trust Them"',
    stockVolatility: {
      lossImpact: -0.07,
      victoryImpact: 0.04,
    },
  },
  CG: {
    id: 'CG',
    name: 'Conselho de Genebra',
    shortName: 'CG',
    color: '#10b981',
    marketProfile: 'Neutral Enforcer',
    preferredAircraft: ['Mirage 2000'],
    loreFlavorText: '"The Rules Must Be Followed"',
    stockVolatility: {
      lossImpact: -0.02,
      victoryImpact: 0.01,
    },
  },
  ZS: {
    id: 'ZS',
    name: 'Zelotes do Solo',
    shortName: 'ZS',
    color: '#991b1b',
    marketProfile: 'Anti-Low-Alt Extremists',
    preferredAircraft: ['SAM Batteries', 'MANPADS'],
    loreFlavorText: '"The Sky Below 500m Is Sacred"',
    stockVolatility: {
      lossImpact: 0,
      victoryImpact: 0,
    },
  },
  HM: {
    id: 'HM',
    name: 'Hanseática Moderna',
    shortName: 'HM',
    color: '#0ea5e9',
    marketProfile: 'Commercial Escort',
    preferredAircraft: ['C-130', 'C-17'],
    loreFlavorText: '"Whoever Pays Gets Safe Passage"',
    stockVolatility: {
      lossImpact: -0.01,
      victoryImpact: 0.02,
    },
  },
  IF: {
    id: 'IF',
    name: 'Indo-Fênix',
    shortName: 'IF',
    color: '#dc2626',
    marketProfile: 'Dogfight Specialists',
    preferredAircraft: ['Su-30MKI', 'Tejas'],
    loreFlavorText: '"Victory Through Maneuver"',
    stockVolatility: {
      lossImpact: -0.08,
      victoryImpact: 0.04,
    },
  },
  CS: {
    id: 'CS',
    name: 'Cartel de Satélites',
    shortName: 'CS',
    color: '#7c3aed',
    marketProfile: 'ISR Monopoly',
    preferredAircraft: ['E-3 AWACS', 'JSTAR'],
    loreFlavorText: '"Information Is Cheaper Than Missiles"',
    stockVolatility: {
      lossImpact: -0.02,
      victoryImpact: 0.02,
    },
  },
  AV: {
    id: 'AV',
    name: 'Aether-Vanguard',
    shortName: 'AV',
    color: '#22c55e',
    marketProfile: 'Balanced, Bureaucratic',
    preferredAircraft: ['F-16C', 'F-15C'],
    loreFlavorText: '"We Fire When We\'re Ready"',
    stockVolatility: {
      lossImpact: -0.04,
      victoryImpact: 0.03,
    },
  },
};

export interface FactionAIPersonalityData {
  factionId: string;
  attackAggressiveness: number;
  evasionCaution: number;
  terrainPreference: string[];
  communicationStyle: 'FORMAL' | 'CHATTER' | 'SILENT' | 'ANONYMOUS';
  riskTolerance: number;
  preferredEjectionZones: string[];
}

export const FACTION_AI_PERSONALITIES: Record<string, FactionAIPersonalityData> = {
  EC: {
    factionId: 'EC',
    attackAggressiveness: 40,
    evasionCaution: 80,
    terrainPreference: ['OCEAN_INTERNATIONAL', 'DESERT_BADLANDS'],
    communicationStyle: 'FORMAL',
    riskTolerance: 20,
    preferredEjectionZones: ['OCEAN', 'DESERT'],
  },
  BNS: {
    factionId: 'BNS',
    attackAggressiveness: 85,
    evasionCaution: 30,
    terrainPreference: ['MOUNTAIN_RANGE', 'FOREST_RESERVE'],
    communicationStyle: 'CHATTER',
    riskTolerance: 70,
    preferredEjectionZones: ['FOREST', 'MOUNTAIN'],
  },
  PAN: {
    factionId: 'PAN',
    attackAggressiveness: 65,
    evasionCaution: 70,
    terrainPreference: ['OCEAN_INTERNATIONAL'],
    communicationStyle: 'FORMAL',
    riskTolerance: 50,
    preferredEjectionZones: ['OCEAN', 'DESERT'],
  },
  LA: {
    factionId: 'LA',
    attackAggressiveness: 55,
    evasionCaution: 60,
    terrainPreference: ['MOUNTAIN_RANGE'],
    communicationStyle: 'FORMAL',
    riskTolerance: 40,
    preferredEjectionZones: ['MOUNTAIN', 'FOREST'],
  },
  SP: {
    factionId: 'SP',
    attackAggressiveness: 50,
    evasionCaution: 50,
    terrainPreference: ['OCEAN_INTERNATIONAL', 'DESERT_BADLANDS'],
    communicationStyle: 'SILENT',
    riskTolerance: 45,
    preferredEjectionZones: ['OCEAN', 'DESERT'],
  },
  CE: {
    factionId: 'CE',
    attackAggressiveness: 35,
    evasionCaution: 85,
    terrainPreference: ['FOREST_RESERVE'],
    communicationStyle: 'SILENT',
    riskTolerance: 30,
    preferredEjectionZones: ['FOREST', 'OCEAN'],
  },
  AD: {
    factionId: 'AD',
    attackAggressiveness: 95,
    evasionCaution: 20,
    terrainPreference: ['URBAN_METROPOLIS', 'URBAN_SUBURBAN'],
    communicationStyle: 'CHATTER',
    riskTolerance: 90,
    preferredEjectionZones: ['ANY'],
  },
  UAT: {
    factionId: 'UAT',
    attackAggressiveness: 80,
    evasionCaution: 25,
    terrainPreference: ['DESERT_BADLANDS'],
    communicationStyle: 'ANONYMOUS',
    riskTolerance: 75,
    preferredEjectionZones: ['DESERT', 'OCEAN'],
  },
  MV: {
    factionId: 'MV',
    attackAggressiveness: 70,
    evasionCaution: 45,
    terrainPreference: ['OCEAN_INTERNATIONAL'],
    communicationStyle: 'ANONYMOUS',
    riskTolerance: 60,
    preferredEjectionZones: ['OCEAN', 'DESERT'],
  },
  CG: {
    factionId: 'CG',
    attackAggressiveness: 20,
    evasionCaution: 90,
    terrainPreference: ['OCEAN_INTERNATIONAL'],
    communicationStyle: 'FORMAL',
    riskTolerance: 10,
    preferredEjectionZones: ['OCEAN'],
  },
  ZS: {
    factionId: 'ZS',
    attackAggressiveness: 50,
    evasionCaution: 0,
    terrainPreference: ['ANY'],
    communicationStyle: 'ANONYMOUS',
    riskTolerance: 100,
    preferredEjectionZones: ['NONE'],
  },
  HM: {
    factionId: 'HM',
    attackAggressiveness: 25,
    evasionCaution: 75,
    terrainPreference: ['OCEAN_INTERNATIONAL'],
    communicationStyle: 'FORMAL',
    riskTolerance: 15,
    preferredEjectionZones: ['OCEAN', 'DESERT'],
  },
  IF: {
    factionId: 'IF',
    attackAggressiveness: 90,
    evasionCaution: 35,
    terrainPreference: ['OCEAN_INTERNATIONAL', 'DESERT_BADLANDS'],
    communicationStyle: 'CHATTER',
    riskTolerance: 65,
    preferredEjectionZones: ['OCEAN', 'DESERT'],
  },
  CS: {
    factionId: 'CS',
    attackAggressiveness: 30,
    evasionCaution: 85,
    terrainPreference: ['OCEAN_INTERNATIONAL'],
    communicationStyle: 'SILENT',
    riskTolerance: 20,
    preferredEjectionZones: ['OCEAN'],
  },
  AV: {
    factionId: 'AV',
    attackAggressiveness: 50,
    evasionCaution: 50,
    terrainPreference: ['DESERT_BADLANDS', 'OCEAN_INTERNATIONAL'],
    communicationStyle: 'FORMAL',
    riskTolerance: 40,
    preferredEjectionZones: ['OCEAN', 'DESERT'],
  },
};

export interface TerrainMultiplierData {
  multiplier: number;
  pilotSurvival: number;
  costDescription: string;
}

export const TERRAIN_DAMAGE_MULTIPLIERS: Record<string, TerrainMultiplierData> = {
  URBAN_METROPOLIS: { multiplier: 15.0, pilotSurvival: 0.1, costDescription: 'Max' },
  URBAN_SUBURBAN: { multiplier: 8.0, pilotSurvival: 0.2, costDescription: 'High' },
  RURAL_AGRICULTURAL: { multiplier: 3.5, pilotSurvival: 0.4, costDescription: 'Medium' },
  FOREST_RESERVE: { multiplier: 5.0, pilotSurvival: 0.3, costDescription: 'High' },
  DESERT_BADLANDS: { multiplier: 0.5, pilotSurvival: 0.65, costDescription: 'Low' },
  OCEAN_INTERNATIONAL: { multiplier: 0.0, pilotSurvival: 0.5, costDescription: 'Zero' },
  MOUNTAIN_RANGE: { multiplier: 2.0, pilotSurvival: 0.35, costDescription: 'Medium' },
  MILITARY_BASE_ENEMY: { multiplier: 0.2, pilotSurvival: 0.05, costDescription: 'Combat' },
  MILITARY_BASE_FRIENDLY: { multiplier: 1.0, pilotSurvival: 0.8, costDescription: 'Protocol' },
  UNKNOWN: { multiplier: 1.0, pilotSurvival: 0.5, costDescription: 'Standard' },
};
