/**
 * Terrain type constants and reference data for Overpass API queries
 */

export const TERRAIN_OSM_TAGS = {
  URBAN_METROPOLIS: {
    osmTags: ['landuse=commercial', 'landuse=industrial', 'landuse=residential', 'building=yes'],
    description: 'Dense urban areas with high building concentration',
  },
  URBAN_SUBURBAN: {
    osmTags: ['landuse=residential', 'building=apartments'],
    description: 'Suburban residential areas with moderate density',
  },
  RURAL_AGRICULTURAL: {
    osmTags: ['landuse=farmland', 'landuse=farm', 'landuse=pasture', 'landuse=meadow'],
    description: 'Agricultural and open countryside',
  },
  FOREST_RESERVE: {
    osmTags: ['landuse=forest', 'natural=forest', 'natural=wood'],
    description: 'Forested areas and nature reserves',
  },
  DESERT_BADLANDS: {
    osmTags: ['natural=desert', 'natural=sand', 'landuse=scrub'],
    description: 'Desert, badlands, and scrubland',
  },
  OCEAN_INTERNATIONAL: {
    osmTags: ['natural=water', 'water=sea', 'water=ocean'],
    description: 'Open water and international waters',
  },
  MOUNTAIN_RANGE: {
    osmTags: ['natural=mountain', 'natural=peak', 'natural=hill'],
    description: 'Mountainous terrain and peaks',
  },
} as const;

export const OVERPASS_QUERY_BOUNDS = {
  radiusKm: 2,
  tagQueryLimit: 5,
  cacheTimeMs: 5 * 60 * 1000,
};
