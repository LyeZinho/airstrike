import { Tick } from '../core/SimulationClock';
import { GameEvent } from '../core/EventBus';

export interface AircraftLaunchedEvent extends GameEvent {
  type: 'AIRCRAFT_LAUNCHED';
  data: { aircraftId: string; baseName: string };
}

export interface MissileFireEvent extends GameEvent {
  type: 'MISSILE_FIRED';
  data: { from: string; to: string; missileType: string };
}

export interface CollisionEvent extends GameEvent {
  type: 'COLLISION';
  data: { entity1Id: string; entity2Id: string };
}

export interface ThreatDetectedEvent extends GameEvent {
  type: 'THREAT_DETECTED';
  data: { aircraftId: string; threatType: string };
}

export interface AircraftDestroyedEvent extends GameEvent {
  type: 'AIRCRAFT_DESTROYED';
  data: { aircraftId: string; by: string };
}
