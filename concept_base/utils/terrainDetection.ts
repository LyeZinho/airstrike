import { TerrainType } from '../types/game';

interface OverpassNode {
  type: string;
  tags: Record<string, string>;
}

interface OverpassResult {
  elements: OverpassNode[];
}

const OSM_TAG_MAPPINGS: Record<string, TerrainType> = {
  'building': 'URBAN_METROPOLIS',
  'building=yes': 'URBAN_METROPOLIS',
  'landuse=residential': 'URBAN_SUBURBAN',
  'landuse=commercial': 'URBAN_METROPOLIS',
  'landuse=industrial': 'URBAN_METROPOLIS',
  'highway=residential': 'URBAN_SUBURBAN',
  'highway=tertiary': 'URBAN_SUBURBAN',
  'landuse=allotments': 'URBAN_SUBURBAN',
  'building=garage': 'URBAN_SUBURBAN',
  'building=house': 'URBAN_SUBURBAN',
  'highway=living_street': 'URBAN_SUBURBAN',
  'landuse=farmland': 'RURAL_AGRICULTURAL',
  'landuse=farm': 'RURAL_AGRICULTURAL',
  'landuse=pasture': 'RURAL_AGRICULTURAL',
  'landuse=grass': 'RURAL_AGRICULTURAL',
  'landuse=meadow': 'RURAL_AGRICULTURAL',
  'man_made=fence': 'RURAL_AGRICULTURAL',
  'landuse=forest': 'FOREST_RESERVE',
  'natural=forest': 'FOREST_RESERVE',
  'natural=wood': 'FOREST_RESERVE',
  'landuse=sand': 'DESERT_BADLANDS',
  'natural=sand': 'DESERT_BADLANDS',
  'natural=desert': 'DESERT_BADLANDS',
  'natural=scrub': 'DESERT_BADLANDS',
  'natural=peak': 'MOUNTAIN_RANGE',
  'natural=cliff': 'MOUNTAIN_RANGE',
  'natural=scree': 'MOUNTAIN_RANGE',
  'landuse=alpine_pastures': 'MOUNTAIN_RANGE',
  'natural=water': 'OCEAN_INTERNATIONAL',
  'landuse=water': 'OCEAN_INTERNATIONAL',
  'water=lake': 'OCEAN_INTERNATIONAL',
  'waterway=river': 'OCEAN_INTERNATIONAL',
};

export async function fetchTerrainFromOverpass(lat: number, lng: number): Promise<TerrainType> {
  try {
    const radiusMeters = 200;
    const query = `
      [bbox:${lat - 0.002},${lng - 0.002},${lat + 0.002},${lng + 0.002}];
      (
        node[building](${lat - 0.002},${lng - 0.002},${lat + 0.002},${lng + 0.002});
        node[landuse](${lat - 0.002},${lng - 0.002},${lat + 0.002},${lng + 0.002});
        node[natural](${lat - 0.002},${lng - 0.002},${lat + 0.002},${lng + 0.002});
        way[building](${lat - 0.002},${lng - 0.002},${lat + 0.002},${lng + 0.002});
        way[landuse](${lat - 0.002},${lng - 0.002},${lat + 0.002},${lng + 0.002});
        way[natural](${lat - 0.002},${lng - 0.002},${lat + 0.002},${lng + 0.002});
      );
      out center;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 5000,
    });

    if (!response.ok) return 'UNKNOWN';

    const data: OverpassResult = await response.json();
    if (!data.elements || data.elements.length === 0) return 'UNKNOWN';

    const terrainScores: Record<TerrainType, number> = {
      URBAN_METROPOLIS: 0,
      URBAN_SUBURBAN: 0,
      RURAL_AGRICULTURAL: 0,
      FOREST_RESERVE: 0,
      DESERT_BADLANDS: 0,
      MOUNTAIN_RANGE: 0,
      OCEAN_INTERNATIONAL: 0,
      MILITARY_BASE_ENEMY: 0,
      MILITARY_BASE_FRIENDLY: 0,
      UNKNOWN: 0,
    };

    data.elements.forEach(elem => {
      const tags = elem.tags || {};
      Object.entries(tags).forEach(([key, value]) => {
        const fullTag = `${key}=${value}`;
        const terrain = OSM_TAG_MAPPINGS[fullTag] || OSM_TAG_MAPPINGS[key];
        if (terrain) {
          terrainScores[terrain]++;
        }
      });
    });

    const sorted = Object.entries(terrainScores)
      .filter(([, score]) => score > 0)
      .sort((a, b) => b[1] - a[1]);

    return sorted.length > 0 ? (sorted[0][0] as TerrainType) : 'UNKNOWN';
  } catch (error) {
    console.error('Overpass API error:', error);
    return 'UNKNOWN';
  }
}

export function getTerrainPriority(terrain: TerrainType): number {
  const priority: Record<TerrainType, number> = {
    URBAN_METROPOLIS: 10,
    URBAN_SUBURBAN: 8,
    FOREST_RESERVE: 7,
    MOUNTAIN_RANGE: 6,
    RURAL_AGRICULTURAL: 4,
    DESERT_BADLANDS: 3,
    OCEAN_INTERNATIONAL: 2,
    MILITARY_BASE_ENEMY: 9,
    MILITARY_BASE_FRIENDLY: 9,
    UNKNOWN: 1,
  };
  return priority[terrain];
}
