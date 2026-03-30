import { FactionRelationship } from '../types/geopolitics';

export class DiplomacySystem {
  private relationships: Map<string, FactionRelationship> = new Map();

  initializeRelationships(factionIds: string[]): void {
    for (let i = 0; i < factionIds.length; i++) {
      for (let j = i + 1; j < factionIds.length; j++) {
        const key1 = `${factionIds[i]}-${factionIds[j]}`;
        const key2 = `${factionIds[j]}-${factionIds[i]}`;

        const rel: FactionRelationship = {
          factionAId: factionIds[i],
          factionBId: factionIds[j],
          trust: 50,
          fear: 50,
          alignment: 0,
          incidentCount: 0,
        };

        this.relationships.set(key1, rel);
        this.relationships.set(key2, rel);
      }
    }
  }

  getRelationship(factionAId: string, factionBId: string): FactionRelationship | undefined {
    const key = `${factionAId}-${factionBId}`;
    return this.relationships.get(key);
  }

  recordIncident(
    factionAId: string,
    factionBId: string,
    severity: number
  ): void {
    const rel = this.getRelationship(factionAId, factionBId);
    if (!rel) return;

    rel.incidentCount++;
    rel.lastIncident = Date.now();

    rel.fear = Math.min(100, rel.fear + severity * 0.5);
    rel.trust = Math.max(0, rel.trust - severity * 0.3);

    if (severity > 50) {
      rel.alignment = Math.max(-100, rel.alignment - severity * 0.2);
    }
  }

  updateTrust(factionAId: string, factionBId: string, delta: number): void {
    const rel = this.getRelationship(factionAId, factionBId);
    if (!rel) return;

    rel.trust = Math.max(0, Math.min(100, rel.trust + delta));
  }

  updateFear(factionAId: string, factionBId: string, delta: number): void {
    const rel = this.getRelationship(factionAId, factionBId);
    if (!rel) return;

    rel.fear = Math.max(0, Math.min(100, rel.fear + delta));
  }

  updateAlignment(factionAId: string, factionBId: string, delta: number): void {
    const rel = this.getRelationship(factionAId, factionBId);
    if (!rel) return;

    rel.alignment = Math.max(-100, Math.min(100, rel.alignment + delta));
  }

  establishTreaty(
    factionAId: string,
    factionBId: string,
    type: 'PEACE' | 'MILITARY_ALLIANCE' | 'TRADE' | 'MUTUAL_DEFENSE'
  ): void {
    const rel = this.getRelationship(factionAId, factionBId);
    if (!rel) return;

    rel.treaty = type;

    if (type === 'PEACE') {
      rel.fear = Math.max(0, rel.fear - 15);
    } else if (type === 'MILITARY_ALLIANCE') {
      rel.trust = Math.min(100, rel.trust + 20);
      rel.alignment = Math.min(100, rel.alignment + 10);
    } else if (type === 'TRADE') {
      rel.trust = Math.min(100, rel.trust + 10);
    }
  }

  getAllRelationships(): FactionRelationship[] {
    return Array.from(this.relationships.values()).filter(
      (rel, idx, arr) =>
        arr.findIndex((r) => r.factionAId === rel.factionBId && r.factionBId === rel.factionAId) === idx
    );
  }

  getRelationshipQuality(factionAId: string, factionBId: string): number {
    const rel = this.getRelationship(factionAId, factionBId);
    if (!rel) return 0;

    return rel.trust - rel.fear + rel.alignment * 0.5;
  }

  areAllies(factionAId: string, factionBId: string): boolean {
    const quality = this.getRelationshipQuality(factionAId, factionBId);
    return quality > 30;
  }

  areHostile(factionAId: string, factionBId: string): boolean {
    const quality = this.getRelationshipQuality(factionAId, factionBId);
    return quality < -30;
  }
}

export const diplomacySystem = new DiplomacySystem();
