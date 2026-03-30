import { PassiveObjective, ObjectiveTypeDefinition } from '../types/geopolitics';
import { nanoid } from 'nanoid';

export class PassiveObjectiveSystem {
  private objectiveDefinitions: Map<PassiveObjective['type'], ObjectiveTypeDefinition>;

  constructor() {
    this.objectiveDefinitions = new Map([
      [
        'CAP_PATROL',
        {
          type: 'CAP_PATROL',
          baseRevenue: 50,
          infrastructureMultiplier: 1.2,
          estimatedDuration: 300,
          riskLevel: 30,
        },
      ],
      [
        'ELINT_MISSION',
        {
          type: 'ELINT_MISSION',
          baseRevenue: 75,
          infrastructureMultiplier: 1.5,
          estimatedDuration: 250,
          riskLevel: 45,
        },
      ],
      [
        'CIVILIAN_ESCORT',
        {
          type: 'CIVILIAN_ESCORT',
          baseRevenue: 100,
          infrastructureMultiplier: 1.3,
          estimatedDuration: 200,
          riskLevel: 55,
        },
      ],
      [
        'SOVEREIGNTY_ZONE',
        {
          type: 'SOVEREIGNTY_ZONE',
          baseRevenue: 25,
          infrastructureMultiplier: 1.1,
          estimatedDuration: 500,
          riskLevel: 20,
        },
      ],
      [
        'INTELLIGENCE_SALE',
        {
          type: 'INTELLIGENCE_SALE',
          baseRevenue: 200,
          infrastructureMultiplier: 2.0,
          estimatedDuration: 400,
          riskLevel: 70,
        },
      ],
      [
        'RESOURCE_HARVEST',
        {
          type: 'RESOURCE_HARVEST',
          baseRevenue: 60,
          infrastructureMultiplier: 1.4,
          estimatedDuration: 350,
          riskLevel: 40,
        },
      ],
    ]);
  }

  createObjective(
    factionId: string,
    type: PassiveObjective['type'],
    location: { x: number; y: number; radius: number },
    assignedAircraft: string[] = []
  ): PassiveObjective {
    const def = this.objectiveDefinitions.get(type);
    if (!def) throw new Error(`Unknown objective type: ${type}`);

    return {
      id: nanoid(),
      factionId,
      type,
      status: 'ACTIVE',
      location,
      assignedAircraft,
      revenuePerTick: def.baseRevenue,
      infrastructureMultiplier: def.infrastructureMultiplier,
      startTime: Date.now(),
      estimatedCompletion: Date.now() + def.estimatedDuration * 100,
      progress: 0,
    };
  }

  calculateFactionRevenue(
    objectives: PassiveObjective[],
    infrastructureMultiplier: number = 1.0
  ): number {
    return objectives
      .filter((obj) => obj.status === 'ACTIVE')
      .reduce((total, obj) => {
        const baseRevenue = obj.revenuePerTick;
        const infraBonus = infrastructureMultiplier * obj.infrastructureMultiplier;
        return total + Math.floor(baseRevenue * infraBonus);
      }, 0);
  }

  updateObjectiveProgress(objective: PassiveObjective, deltaTime: number): void {
    if (objective.status !== 'ACTIVE') return;

    const elapsed = Date.now() - objective.startTime;
    const totalDuration = objective.estimatedCompletion - objective.startTime;
    objective.progress = Math.min(100, (elapsed / totalDuration) * 100);

    if (objective.progress >= 100) {
      objective.status = 'COMPLETED';
    }
  }

  isObjectiveInRange(
    objective: PassiveObjective,
    factionHomeBase: { x: number; y: number; radius: number }
  ): boolean {
    const distance = Math.hypot(
      objective.location.x - factionHomeBase.x,
      objective.location.y - factionHomeBase.y
    );
    return distance <= factionHomeBase.radius + objective.location.radius + 200;
  }

  getObjectiveDefinition(type: PassiveObjective['type']): ObjectiveTypeDefinition | undefined {
    return this.objectiveDefinitions.get(type);
  }

  getAllObjectiveTypes(): PassiveObjective['type'][] {
    return Array.from(this.objectiveDefinitions.keys());
  }
}

export const passiveObjectiveSystem = new PassiveObjectiveSystem();
