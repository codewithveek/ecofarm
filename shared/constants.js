// shared/constants.js
// Imported by both src/ (client) and server/ — keep this pure JS, no imports

export const TREE_STAGES = {
  EMPTY:       'empty',
  SEED:        'seed',
  SEEDLING:    'seedling',
  SAPLING:     'sapling',
  MATURE:      'mature',
  HARVESTABLE: 'harvestable',
}

export const POINTS = {
  PLANT:       50,
  WATER:        5,
  HARVEST:    100,
  DAILY_BONUS:  20,
}

export const COSTS = {
  PLANT: 20,
  WATER:  0,
}

export const WEATHER_THRESHOLDS = {
  RAIN_MM_AUTO_WATER: 15,
  LOW_AQI_PENALTY:   150,
}

export const AGENT_SCOPES = [
  'water_farm',
  'plant_tree',
  'read_farm',
  'pledge_donate',
]

export const TREE_TYPES = [
  'mango', 'cashew', 'guava', 'plantain', 'coconut', 'orange',
]

// Growth time per stage in hours (under ideal watering)
export const GROWTH_HOURS = {
  seed:     2,
  seedling: 6,
  sapling:  12,
  mature:   24,
}
