import { FactionAction, FactionSpecification, FactionState } from '../types/geopolitics';
import { nanoid } from 'nanoid';
import { QTable, createAIState, AIState } from './QLearningSystem';
import { getDistanceKm, calculateAspectAngle } from '../utils/physicsUtils';
import { Aircraft, QAction, Side } from '../types/entities';

export type BehaviorTreePosture = 'DEFENSIVE' | 'AGGRESSIVE' | 'WARTIME' | 'DIPLOMATIC' | 'COLLAPSED';

// Q-learning tables for hostile aircraft (one per aircraft ID)
const qTables = new Map<string, QTable>();

interface ActionScore {
  actionType: FactionAction['type'];
  score: number;
  confidence: number;
}

export class AIDecisionSystem {
  determineBehaviorPosture(
    factionState: FactionState,
    threatLevel: number,
    allyCount: number,
    hostileCount: number
  ): BehaviorTreePosture {
    if (factionState.morale < 20) return 'COLLAPSED';

    if (threatLevel > 70 && hostileCount > allyCount) return 'WARTIME';

    if (factionState.morale > 75 && allyCount > hostileCount) return 'DIPLOMATIC';

    if (factionState.credits > 30000 && threatLevel < 50) return 'AGGRESSIVE';

    return 'DEFENSIVE';
  }

  scoreAction(
    actionType: FactionAction['type'],
    posture: BehaviorTreePosture,
    factionState: FactionState,
    threatLevel: number
  ): ActionScore {
    let score = 50;
    let confidence = 0.5;

    switch (posture) {
      case 'DEFENSIVE':
        if (actionType === 'ACTIVATE_DEFENSE') {
          score += 40;
          confidence = 0.9;
        } else if (actionType === 'LAUNCH_CAP') {
          score += 20;
          confidence = 0.7;
        } else if (actionType === 'DIPLOMATIC_OVERTURE') {
          score += 10;
          confidence = 0.4;
        }
        break;

      case 'AGGRESSIVE':
        if (actionType === 'LAUNCH_STRIKE') {
          score += 50;
          confidence = 0.85;
        } else if (actionType === 'LAUNCH_ELINT') {
          score += 30;
          confidence = 0.8;
        } else if (actionType === 'LAUNCH_CAP') {
          score += 15;
          confidence = 0.6;
        }
        break;

      case 'WARTIME':
        if (actionType === 'LAUNCH_STRIKE') {
          score += 60;
          confidence = 0.95;
        } else if (actionType === 'ACTIVATE_DEFENSE') {
          score += 35;
          confidence = 0.85;
        } else if (actionType === 'LAUNCH_CAP') {
          score += 25;
          confidence = 0.8;
        }
        break;

      case 'DIPLOMATIC':
        if (actionType === 'DIPLOMATIC_OVERTURE') {
          score += 50;
          confidence = 0.9;
        } else if (actionType === 'ESCORT_CIVILIAN') {
          score += 30;
          confidence = 0.75;
        } else if (actionType === 'LAUNCH_ELINT') {
          score += 10;
          confidence = 0.3;
        }
        break;

      case 'COLLAPSED':
        score = 0;
        confidence = 0;
        break;
    }

    if (factionState.credits < 10000) {
      if (actionType === 'LAUNCH_STRIKE') score -= 20;
      if (actionType === 'LAUNCH_ELINT') score -= 15;
    }

    if (factionState.fuel < 1000) {
      if (actionType === 'LAUNCH_CAP') score -= 30;
      if (actionType === 'LAUNCH_STRIKE') score -= 40;
    }

    if (threatLevel > 80) {
      if (actionType === 'ACTIVATE_DEFENSE') score += 30;
      if (actionType === 'LAUNCH_STRIKE') score += 20;
    }

    if (factionState.morale < 30) {
      score *= 0.7;
    }

    return {
      actionType,
      score: Math.max(0, Math.min(100, score)),
      confidence: Math.max(0, Math.min(1, confidence)),
    };
  }

  generateDecision(
    factionState: FactionState,
    factionSpec: FactionSpecification,
    threatLevel: number,
    allyCount: number,
    hostileCount: number
  ): FactionAction | null {
    const posture = this.determineBehaviorPosture(factionState, threatLevel, allyCount, hostileCount);

    const actions: FactionAction['type'][] = [
      'LAUNCH_CAP',
      'LAUNCH_STRIKE',
      'LAUNCH_ELINT',
      'ESCORT_CIVILIAN',
      'ACTIVATE_DEFENSE',
      'DIPLOMATIC_OVERTURE',
    ];

    const scores = actions.map((actionType) =>
      this.scoreAction(actionType, posture, factionState, threatLevel)
    );

    const bestAction = scores.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    if (bestAction.score < 40 || bestAction.confidence < 0.3) {
      return null;
    }

    return {
      id: nanoid(),
      factionId: factionState.id,
      type: bestAction.actionType,
      priority: Math.round(bestAction.score / 10),
      timestamp: Date.now(),
      status: 'PENDING',
    };
  }

  rankActions(
    factionState: FactionState,
    factionSpec: FactionSpecification,
    threatLevel: number,
    allyCount: number,
    hostileCount: number
  ): ActionScore[] {
    const posture = this.determineBehaviorPosture(factionState, threatLevel, allyCount, hostileCount);
    const actions: FactionAction['type'][] = [
      'LAUNCH_CAP',
      'LAUNCH_STRIKE',
      'LAUNCH_ELINT',
      'ESCORT_CIVILIAN',
      'ACTIVATE_DEFENSE',
      'DIPLOMATIC_OVERTURE',
    ];

    return actions
      .map((actionType) => this.scoreAction(actionType, posture, factionState, threatLevel))
      .sort((a, b) => b.score - a.score);
  }

  applyQLearningAction(aircraft: Aircraft, nearestEnemy: Aircraft | null): void {
    if (!nearestEnemy) return;

    let qTable = qTables.get(aircraft.id);
    if (!qTable) {
      qTable = new QTable();
      qTables.set(aircraft.id, qTable);
    }

    const distanceKm = getDistanceKm(aircraft.position, nearestEnemy.position);
    const aspectAngle = calculateAspectAngle(
      { lat: aircraft.position.lat, lng: aircraft.position.lng, heading: aircraft.heading },
      { lat: nearestEnemy.position.lat, lng: nearestEnemy.position.lng, heading: nearestEnemy.heading }
    );
    const speedNormalized = (aircraft.speed || 0) / 900;
    const rwrStatus = 'SILENT';

    const state = createAIState(distanceKm, aspectAngle, speedNormalized, rwrStatus);
    const action: QAction = qTable.chooseAction(state);

    this.executeAction(aircraft, action, nearestEnemy);
  }

  private executeAction(aircraft: Aircraft, action: QAction, target: Aircraft): void {
    const targetBearing = this.calculateBearing(aircraft.position, target.position);

    switch (action) {
      case 'ENGAGE':
        aircraft.heading = targetBearing;
        aircraft.throttle = 0.8;
        break;

      case 'NOTCH':
        aircraft.heading = (targetBearing + 90) % 360;
        aircraft.throttle = 0.7;
        break;

      case 'CRANK':
        aircraft.heading = (targetBearing + 45) % 360;
        aircraft.throttle = 0.75;
        break;

      case 'EVADE':
        aircraft.heading = (targetBearing + 180) % 360;
        aircraft.throttle = 0.95;
        break;

      case 'RETREAT':
        aircraft.heading = (targetBearing + 180) % 360;
        aircraft.throttle = 1.0;
        break;

      case 'TERRAIN_MASK':
        if (aircraft.altitude && aircraft.altitude > 1000) {
          aircraft.altitude = Math.max(500, aircraft.altitude - 500);
        }
        aircraft.throttle = 0.85;
        break;
    }
  }

  private calculateBearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
    const lat1 = (from.lat * Math.PI) / 180;
    const lat2 = (to.lat * Math.PI) / 180;
    const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;

    const y = Math.sin(deltaLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
    const bearing = Math.atan2(y, x);

    return ((bearing * 180) / Math.PI + 360) % 360;
  }
}

export const aiDecisionSystem = new AIDecisionSystem();
