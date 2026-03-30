export type DistanceState = 'NEAR' | 'MEDIUM' | 'FAR';
export type AspectState = 'HEAD_ON' | 'BEAM' | 'TAIL';
export type EnergyState = 'HIGH' | 'LOW';
export type RWRState = 'SILENT' | 'SEARCH' | 'TRACK' | 'MISSILE';

export type AIAction = 'ENGAGE' | 'NOTCH' | 'CRANK' | 'EVADE' | 'RETREAT' | 'TERRAIN_MASK';

export interface AIState {
  distance: DistanceState;
  aspect: AspectState;
  energy: EnergyState;
  rwr: RWRState;
}

export interface FactionPersonalityProfile {
  attackAggressiveness: number;
  evasionCaution: number;
  riskTolerance: number;
}

const LEARNING_RATE = 0.1;
const DISCOUNT_FACTOR = 0.9;
const EXPLORATION_RATE = 0.1;

const REWARD_KILL = 100;
const REWARD_DEATH = -200;
const REWARD_FUEL_OUT = -50;
const REWARD_MISSILE_DODGE = 10;

const DISTANCE_NEAR = 20;
const DISTANCE_FAR = 50;
const SPEED_HIGH = 0.8;

const ACTIONS: AIAction[] = ['ENGAGE', 'NOTCH', 'CRANK', 'EVADE', 'RETREAT', 'TERRAIN_MASK'];

const ACTION_PERSONALITY_WEIGHTS: Record<AIAction, keyof FactionPersonalityProfile> = {
  ENGAGE: 'attackAggressiveness',
  NOTCH: 'evasionCaution',
  CRANK: 'attackAggressiveness',
  EVADE: 'evasionCaution',
  RETREAT: 'evasionCaution',
  TERRAIN_MASK: 'evasionCaution',
};

export class QTable {
  private table: Map<string, number[]>;
  public experience: number;
  public generation: number;
  public personality: FactionPersonalityProfile;

  constructor(personality?: FactionPersonalityProfile) {
    this.table = new Map();
    this.experience = 0;
    this.generation = 1;
    this.personality = personality || {
      attackAggressiveness: 50,
      evasionCaution: 50,
      riskTolerance: 50,
    };
  }

  private stateToKey(state: AIState): string {
    return `${state.distance}-${state.aspect}-${state.energy}-${state.rwr}`;
  }

  private getOrCreateEntry(state: AIState): number[] {
    const key = this.stateToKey(state);
    if (!this.table.has(key)) {
      const entry = Array(ACTIONS.length).fill(0).map(() => Math.random() * 0.1);
      this.table.set(key, entry);
    }
    return this.table.get(key)!;
  }

  getQ(state: AIState, action: AIAction): number {
    const entry = this.getOrCreateEntry(state);
    return entry[ACTIONS.indexOf(action)];
  }

  chooseAction(state: AIState): AIAction {
    if (Math.random() < EXPLORATION_RATE) {
      return ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    }

    const entry = this.getOrCreateEntry(state);
    const adjustedScores = entry.map((q, idx) => {
      const action = ACTIONS[idx];
      const personalityKey = ACTION_PERSONALITY_WEIGHTS[action];
      const personalityInfluence = (this.personality[personalityKey] - 50) / 100;
      return q + personalityInfluence * Math.max(q, 0);
    });

    const bestIndex = adjustedScores.indexOf(Math.max(...adjustedScores));
    return ACTIONS[bestIndex];
  }

  update(state: AIState, action: AIAction, reward: number, nextState: AIState) {
    const key = this.stateToKey(state);
    const entry = this.table.get(key);
    if (!entry) return;

    const actionIdx = ACTIONS.indexOf(action);
    const currentQ = entry[actionIdx];

    const nextEntry = this.getOrCreateEntry(nextState);
    const maxNextQ = Math.max(...nextEntry);

    const personalityKey = ACTION_PERSONALITY_WEIGHTS[action];
    const riskModifier = 1 + (this.personality.riskTolerance - 50) / 200;
    const adjustedReward = reward * riskModifier;

    const newQ = currentQ + LEARNING_RATE * (adjustedReward + DISCOUNT_FACTOR * maxNextQ - currentQ);
    entry[actionIdx] = newQ;

    this.experience++;
  }

  increaseGeneration() {
    this.generation++;
  }

  getLevel(): number {
    return Math.min(50, Math.floor(this.experience / 10) + 1);
  }

  shouldEvade(healthPercent: number, threatsNearby: number): boolean {
    const evasionThreshold = 70 - (this.personality.evasionCaution - 50);
    if (healthPercent < evasionThreshold) return true;

    if (threatsNearby > 0) {
      const cautionProbability = (this.personality.evasionCaution + 50) / 200;
      return Math.random() < cautionProbability;
    }

    return false;
  }

  getEvastionDistance(): number {
    const base = 50;
    const personalityMod = (this.personality.evasionCaution - 50) / 100;
    return base + personalityMod * 30;
  }
}

export function createAIState(
  distanceKm: number,
  targetHeadingDiff: number,
  mySpeed: number,
  rwrStatus: string
): AIState {
  let distance: DistanceState;
  if (distanceKm < DISTANCE_NEAR) distance = 'NEAR';
  else if (distanceKm < DISTANCE_FAR) distance = 'MEDIUM';
  else distance = 'FAR';

  let aspect: AspectState;
  const absDiff = Math.abs(targetHeadingDiff);
  if (absDiff < 30) aspect = 'HEAD_ON';
  else if (absDiff > 150) aspect = 'TAIL';
  else aspect = 'BEAM';

  const energy: EnergyState = mySpeed >= SPEED_HIGH ? 'HIGH' : 'LOW';

  let rwr: RWRState = 'SILENT';
  if (rwrStatus === 'SEARCH') rwr = 'SEARCH';
  else if (rwrStatus === 'TRACK') rwr = 'TRACK';
  else if (rwrStatus === 'MISSILE') rwr = 'MISSILE';

  return { distance, aspect, energy, rwr };
}

export const Rewards = {
  KILL: REWARD_KILL,
  DEATH: REWARD_DEATH,
  FUEL_OUT: REWARD_FUEL_OUT,
  MISSILE_DODGE: REWARD_MISSILE_DODGE,
};
