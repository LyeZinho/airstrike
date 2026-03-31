/**
 * Physics utilities for geospatial calculations, radar detection, and fuel planning.
 * Ported from concept_base/utils/physics.ts with standalone implementations.
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Calculate next position given current lat/lng, heading, speed, and time delta.
 * Uses simple great circle navigation.
 * 
 * @param lat - Current latitude in degrees
 * @param lng - Current longitude in degrees
 * @param headingDeg - Heading in degrees (0 = north, 90 = east)
 * @param speedKmh - Speed in kilometers per hour
 * @param deltaMs - Time delta in milliseconds
 * @returns New position {lat, lng}
 */
export function getNextPosition(
  lat: number,
  lng: number,
  headingDeg: number,
  speedKmh: number,
  deltaMs: number
): { lat: number; lng: number } {
  const deltaHours = deltaMs / (1000 * 60 * 60);
  const distanceKm = speedKmh * deltaHours;
  
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const headingRad = (headingDeg * Math.PI) / 180;
  const angularDistance = distanceKm / EARTH_RADIUS_KM;
  
  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) +
    Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(headingRad)
  );
  
  const newLngRad = lngRad + Math.atan2(
    Math.sin(headingRad) * Math.sin(angularDistance) * Math.cos(latRad),
    Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(newLatRad)
  );
  
  return {
    lat: (newLatRad * 180) / Math.PI,
    lng: (newLngRad * 180) / Math.PI
  };
}

/**
 * Calculate haversine distance between two geographic coordinates.
 * 
 * @param a - First position {lat, lng}
 * @param b - Second position {lat, lng}
 * @returns Distance in kilometers
 */
export function getDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const lat1Rad = (a.lat * Math.PI) / 180;
  const lat2Rad = (b.lat * Math.PI) / 180;
  const deltaLat = ((b.lat - a.lat) * Math.PI) / 180;
  const deltaLng = ((b.lng - a.lng) * Math.PI) / 180;
  
  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  
  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  
  return EARTH_RADIUS_KM * centralAngle;
}

/**
 * Calculate radar horizon range based on altitude.
 * Uses formula: Dmax ≈ 4.12 * sqrt(h) where h is in meters.
 * Assumes target at ground level (h_target = 0).
 * 
 * @param altFt - Altitude in feet
 * @returns Radar horizon range in kilometers
 */
export function getRadarHorizon(altFt: number): number {
  const altMeters = altFt * 0.3048;
  return 4.12 * Math.sqrt(altMeters);
}

/**
 * Calculate aspect angle between shooter and target.
 * Aspect angle: 0° = head-on, 90° = beam, 180° = tail-on.
 * 
 * @param shooter - Shooter position and heading {lat, lng, heading}
 * @param target - Target position and heading {lat, lng, heading}
 * @returns Aspect angle in degrees (0-180)
 */
export function calculateAspectAngle(
  shooter: { lat: number; lng: number; heading: number },
  target: { lat: number; lng: number; heading: number }
): number {
  const lat1 = (target.lat * Math.PI) / 180;
  const lat2 = (shooter.lat * Math.PI) / 180;
  const deltaLng = ((shooter.lng - target.lng) * Math.PI) / 180;
  
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  
  const bearingToShooter = (Math.atan2(y, x) * 180) / Math.PI;
  
  let diff = Math.abs(target.heading - bearingToShooter);
  if (diff > 180) diff = 360 - diff;
  
  return diff;
}

/**
 * Calculate dynamic RCS based on aircraft base RCS and aspect angle.
 * RCS varies with aspect: minimal head-on, maximum from side.
 * 
 * @param aircraft - Aircraft with base RCS {rcs: number}
 * @param aspectAngle - Aspect angle in degrees (0-180)
 * @returns Effective RCS in square meters
 */
export function getDynamicRCS(
  aircraft: { rcs: number },
  aspectAngle: number
): number {
  const rad = (aspectAngle * Math.PI) / 180;
  
  const frontRCS = aircraft.rcs;
  const sideRCS = aircraft.rcs * 2.5;
  
  const rcs = Math.abs(frontRCS * Math.cos(rad)) + Math.abs(sideRCS * Math.sin(rad));
  return rcs;
}

/**
 * Calculate radar detection probability using simplified radar equation.
 * Based on: P ~ RCS / R^4.
 * 
 * @param rcs - Radar cross-section in square meters
 * @param distanceKm - Distance to target in kilometers
 * @param radarPower - Radar power factor (normalized, 1.0 = standard)
 * @returns Detection probability (0.0 to 1.0)
 */
export function calculateDetectionProbability(
  rcs: number,
  distanceKm: number,
  radarPower: number
): number {
  const maxRange = 150 * radarPower;
  
  if (distanceKm > maxRange) return 0;
  
  const baseProb = (rcs * Math.pow(maxRange / distanceKm, 4));
  
  return Math.min(1, Math.max(0, baseProb));
}

/**
 * Calculate fuel needed to travel a distance at a given fuel burn rate.
 * 
 * @param distanceKm - Distance to travel in kilometers
 * @param fuelBurnRate - Fuel consumption rate in liters per hour
 * @returns Fuel needed in liters
 */
export function calculateFuelNeeded(
  distanceKm: number,
  fuelBurnRate: number
): number {
  const speedKmh = 900;
  const timeHours = distanceKm / speedKmh;
  const fuelNeeded = fuelBurnRate * timeHours;
  
  return fuelNeeded;
}
