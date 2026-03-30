import { Coordinates } from '../types/game';
import { getDistanceKm } from './physics';

interface PathNode {
  lat: number;
  lng: number;
  g: number;
  h: number;
  f: number;
  parent?: PathNode;
}

interface SafeZone {
  center: Coordinates;
  radius: number;
  danger: number;
}

function heuristic(from: Coordinates, to: Coordinates): number {
  return getDistanceKm(from, to);
}

function euclideanDistance(a: Coordinates, b: Coordinates): number {
  const latDiff = a.lat - b.lat;
  const lngDiff = a.lng - b.lng;
  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
}

function getNeighbors(node: PathNode, step: number = 0.01): Coordinates[] {
  return [
    { lat: node.lat + step, lng: node.lng },
    { lat: node.lat - step, lng: node.lng },
    { lat: node.lat, lng: node.lng + step },
    { lat: node.lat, lng: node.lng - step },
    { lat: node.lat + step, lng: node.lng + step },
    { lat: node.lat - step, lng: node.lng + step },
    { lat: node.lat + step, lng: node.lng - step },
    { lat: node.lat - step, lng: node.lng - step },
  ];
}

export function findSafePath(
  from: Coordinates,
  safeZones: SafeZone[],
  dangerZones: SafeZone[] = []
): Coordinates | null {
  if (safeZones.length === 0) return null;

  const nearestSafe = safeZones.reduce((closest, zone) => {
    const dist = getDistanceKm(from, zone.center);
    return dist < getDistanceKm(from, closest.center) ? zone : closest;
  });

  const targetZone = nearestSafe;
  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();

  const startNode: PathNode = {
    lat: from.lat,
    lng: from.lng,
    g: 0,
    h: heuristic(from, targetZone.center),
    f: heuristic(from, targetZone.center),
  };

  openSet.push(startNode);

  const maxIterations = 50;
  let iterations = 0;

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;

    let current = openSet[0];
    let currentIndex = 0;

    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < current.f) {
        current = openSet[i];
        currentIndex = i;
      }
    }

    if (getDistanceKm(current, targetZone.center) < 0.5) {
      const path: Coordinates[] = [];
      let node: PathNode | undefined = current;
      while (node) {
        path.unshift({ lat: node.lat, lng: node.lng });
        node = node.parent;
      }
      return path[1] || { lat: current.lat, lng: current.lng };
    }

    openSet.splice(currentIndex, 1);
    const key = `${current.lat.toFixed(4)},${current.lng.toFixed(4)}`;
    closedSet.add(key);

    const neighbors = getNeighbors(current);

    for (const neighbor of neighbors) {
      const nKey = `${neighbor.lat.toFixed(4)},${neighbor.lng.toFixed(4)}`;
      if (closedSet.has(nKey)) continue;

      const inDanger = dangerZones.some(
        z => getDistanceKm(neighbor, z.center) < z.radius
      );
      if (inDanger) continue;

      const g = current.g + euclideanDistance(current, neighbor);
      const h = heuristic(neighbor, targetZone.center);
      const f = g + h;

      const existing = openSet.find(
        n => Math.abs(n.lat - neighbor.lat) < 0.001 && Math.abs(n.lng - neighbor.lng) < 0.001
      );

      if (!existing || g < existing.g) {
        const newNode: PathNode = { lat: neighbor.lat, lng: neighbor.lng, g, h, f, parent: current };
        if (existing) {
          openSet.splice(openSet.indexOf(existing), 1);
        }
        openSet.push(newNode);
      }
    }
  }

  return targetZone.center;
}

export function getEvasonPath(
  currentPos: Coordinates,
  threatPos: Coordinates,
  friendlyBases: Coordinates[],
  evasionDistance: number = 50
): Coordinates {
  const safeZones: SafeZone[] = friendlyBases.map(base => ({
    center: base,
    radius: 100,
    danger: 0,
  }));

  const dangerZones: SafeZone[] = [
    {
      center: threatPos,
      radius: evasionDistance,
      danger: 1,
    },
  ];

  const path = findSafePath(currentPos, safeZones, dangerZones);
  if (path) return path;

  const radians = Math.atan2(currentPos.lng - threatPos.lng, currentPos.lat - threatPos.lat);
  const distance = 2;

  return {
    lat: currentPos.lat + distance * Math.cos(radians),
    lng: currentPos.lng + distance * Math.sin(radians),
  };
}
