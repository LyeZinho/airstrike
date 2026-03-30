import { Aircraft, IFFStatus, IFFData, Coordinates, Side, Tick } from '../types/entities';
import { SpatialIndex } from './SpatialIndex';

export class IFFSystem {
  private iffDatabase: Map<string, IFFData> = new Map();
  private readonly BOGEY_CONFIDENCE_THRESHOLD = 0.4;
  private readonly BANDIT_CONFIDENCE_THRESHOLD = 0.75;
  private readonly IDENTIFICATION_DECAY_RATE = 0.02;

  /**
   * Update IFF status for all detected aircraft.
   * Transitions: Unknown → Bogey → Bandit → Confirmed Target
   */
  updateIFFStatus(
    detectedAircraft: Aircraft[],
    friendlyBases: { position: Coordinates; side: Side }[],
    deltaSeconds: number
  ): Map<string, IFFData> {
    for (const aircraft of detectedAircraft) {
      this.updateAircraftIFFStatus(aircraft, friendlyBases, deltaSeconds);
    }
    return this.iffDatabase;
  }

  private updateAircraftIFFStatus(
    aircraft: Aircraft,
    friendlyBases: { position: Coordinates; side: Side }[],
    deltaSeconds: number
  ): void {
    let iffData = this.iffDatabase.get(aircraft.id);

    if (!iffData) {
      iffData = {
        aircraftId: aircraft.id,
        status: IFFStatus.UNKNOWN,
        confidence: 0,
        detectionTime: 0 as Tick,
        lastConfirmedTime: 0 as Tick,
        transponderActive: false,
        radarSignatureMatch: 0,
      };
    }

    const isWithinRangeOfFriendly = this.isNearFriendlyBase(aircraft.position, friendlyBases);
    const transponderStrength = this.analyzeTransponder(aircraft.side);

    iffData.transponderActive = transponderStrength > 0.5;
    iffData.radarSignatureMatch = this.calculateSignatureMatch(aircraft.side);

    const confidenceGain = this.calculateConfidenceGain(
      aircraft.side,
      isWithinRangeOfFriendly,
      transponderStrength
    );

    iffData.confidence = Math.min(1, iffData.confidence + confidenceGain * deltaSeconds);
    iffData.confidence = Math.max(0, iffData.confidence - this.IDENTIFICATION_DECAY_RATE * deltaSeconds);

    const previousStatus = iffData.status;
    iffData.status = this.determineIFFStatus(aircraft.side, iffData.confidence, isWithinRangeOfFriendly);

    if (iffData.status !== IFFStatus.UNKNOWN && previousStatus === IFFStatus.UNKNOWN) {
      iffData.detectionTime = performance.now() as Tick;
    }

    if (iffData.status === IFFStatus.CONFIRMED_TARGET) {
      iffData.lastConfirmedTime = performance.now() as Tick;
    }

    this.iffDatabase.set(aircraft.id, iffData);
  }

  private isNearFriendlyBase(position: Coordinates, friendlyBases: any[]): boolean {
    const FRIENDLY_ZONE_KM = 50;
    const FRIENDLY_ZONE_DEGREES = FRIENDLY_ZONE_KM / 111;

    return friendlyBases.some(base => {
      const latDiff = Math.abs(position.lat - base.position.lat);
      const lngDiff = Math.abs(position.lng - base.position.lng);
      return latDiff < FRIENDLY_ZONE_DEGREES && lngDiff < FRIENDLY_ZONE_DEGREES;
    });
  }

  private analyzeTransponder(side: Side): number {
    if (side === 'FRIENDLY' || side === 'ALLY') return 0.9;
    if (side === 'NEUTRAL') return 0.5;
    return 0;
  }

  private calculateSignatureMatch(side: Side): number {
    if (side === 'FRIENDLY' || side === 'ALLY') return 0.95;
    if (side === 'NEUTRAL') return 0.4;
    return 0;
  }

  private calculateConfidenceGain(
    side: Side,
    isNearFriendly: boolean,
    transponderStrength: number
  ): number {
    let gain = 0.1;

    if (side === 'FRIENDLY') {
      gain = 0.5;
      if (isNearFriendly) gain += 0.3;
      if (transponderStrength > 0.7) gain += 0.2;
    } else if (side === 'ALLY') {
      gain = 0.3;
      if (isNearFriendly) gain += 0.2;
    } else if (side === 'HOSTILE') {
      gain = 0.15;
    } else if (side === 'NEUTRAL') {
      gain = 0.05;
      if (isNearFriendly) gain += 0.1;
    }

    return gain;
  }

  private determineIFFStatus(
    side: Side,
    confidence: number,
    isNearFriendly: boolean
  ): IFFStatus {
    if (side === 'FRIENDLY') {
      return confidence > 0.8 ? IFFStatus.FRIENDLY : IFFStatus.BOGEY;
    } else if (side === 'ALLY') {
      return confidence > 0.85 ? IFFStatus.ALLIED : IFFStatus.BOGEY;
    } else if (side === 'NEUTRAL') {
      return IFFStatus.NEUTRAL;
    } else if (side === 'HOSTILE') {
      if (confidence >= this.BANDIT_CONFIDENCE_THRESHOLD) {
        return IFFStatus.CONFIRMED_TARGET;
      } else if (confidence >= this.BOGEY_CONFIDENCE_THRESHOLD) {
        return IFFStatus.BANDIT;
      }
      return IFFStatus.BOGEY;
    }

    return IFFStatus.UNKNOWN;
  }

  getIFFStatus(aircraftId: string): IFFStatus {
    return this.iffDatabase.get(aircraftId)?.status ?? IFFStatus.UNKNOWN;
  }

  getIFFData(aircraftId: string): IFFData | undefined {
    return this.iffDatabase.get(aircraftId);
  }

  getAllIFFData(): IFFData[] {
    return Array.from(this.iffDatabase.values());
  }

  resetIFF(aircraftId: string): void {
    this.iffDatabase.delete(aircraftId);
  }

  clearAllIFF(): void {
    this.iffDatabase.clear();
  }
}

export const iffSystem = new IFFSystem();
