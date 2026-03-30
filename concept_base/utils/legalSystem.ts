import { Lawsuit, LawsuitEvidence } from '../types/game';

export interface ContestationResult {
  won: boolean;
  multiplier: number;
  reason: string;
}

export function calculateContestationOdds(
  lawsuit: Lawsuit,
  legalInfluence: number
): number {
  let baseOdds = 0.5;
  
  if (lawsuit.evidence.vectorOfAttack) {
    baseOdds += 0.15;
  }
  
  if (lawsuit.evidence.terrainMismatch) {
    baseOdds += 0.2;
  }
  
  if (lawsuit.evidence.satelliteImagery) {
    baseOdds += 0.1;
  }
  
  baseOdds += (lawsuit.evidence.witnessReports / 100) * 0.15;
  
  const juryBiasAdjustment = -lawsuit.juryBias * 0.3;
  baseOdds += juryBiasAdjustment;
  
  const influenceBoost = (legalInfluence - 10) * 0.02;
  baseOdds += influenceBoost;
  
  return Math.max(0.1, Math.min(0.9, baseOdds));
}

export function resolveContestation(
  lawsuit: Lawsuit,
  legalInfluence: number
): ContestationResult {
  const oddsOfWinning = calculateContestationOdds(lawsuit, legalInfluence);
  const roll = Math.random();
  const won = roll < oddsOfWinning;
  
  if (won) {
    return {
      won: true,
      multiplier: 0.2,
      reason: 'Tecnicalidades jurídicas reconhecidas. Multa reduzida em 80%.',
    };
  } else {
    return {
      won: false,
      multiplier: 2.0,
      reason: 'Contestação rejeitada. Penalidade por "Má Fé Processual": Multa dobrada.',
    };
  }
}

export function getEvidenceReliability(evidence: LawsuitEvidence): number {
  let score = 0;
  
  if (evidence.vectorOfAttack) score += 25;
  if (evidence.terrainMismatch) score += 30;
  if (evidence.satelliteImagery) score += 25;
  score += (evidence.witnessReports / 100) * 20;
  
  return Math.min(100, score);
}
