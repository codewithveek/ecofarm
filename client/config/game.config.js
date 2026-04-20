export const GAME_CONFIG = {
  WIDTH:  960,
  HEIGHT: 640,
  TILE_SIZE: 64,
  FARM_COLS: 8,
  FARM_ROWS: 6,
}

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

export const API_URLS = {
  BACKEND:    import.meta.env?.VITE_BACKEND_URL || 'http://localhost:4000',
  OPEN_METEO: 'https://api.open-meteo.com/v1/forecast',
  OPENAQ:     'https://api.openaq.org/v2/latest',
}
