export const GAME_CONFIG = {
  WIDTH: 960,
  HEIGHT: 640,
  TILE_SIZE: 64,
  FARM_COLS: 8,
  FARM_ROWS: 6,
} as const;

export {
  TREE_STAGES,
  POINTS,
  COSTS,
  WEATHER_THRESHOLDS,
} from "../../server/constants";

export const API_URLS = {
  BACKEND: import.meta.env?.VITE_BACKEND_URL || "http://localhost:4000",
  OPEN_METEO: "https://api.open-meteo.com/v1/forecast",
  OPENAQ: "https://api.openaq.org/v3/latest",
} as const;
