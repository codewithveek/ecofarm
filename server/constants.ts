export const TREE_STAGES = {
  EMPTY: "empty",
  SEED: "seed",
  SEEDLING: "seedling",
  SAPLING: "sapling",
  MATURE: "mature",
  HARVESTABLE: "harvestable",
} as const;

export type TreeStage = (typeof TREE_STAGES)[keyof typeof TREE_STAGES];

export const POINTS = {
  PLANT: 50,
  WATER: 5,
  HARVEST: 100,
  DAILY_BONUS: 20,
} as const;

export const COSTS = {
  PLANT: 20,
  WATER: 0,
} as const;

export const WEATHER_THRESHOLDS = {
  RAIN_MM_AUTO_WATER: 15,
  LOW_AQI_PENALTY: 150,
} as const;

export const AGENT_SCOPES = [
  "water_farm",
  "plant_tree",
  "read_farm",
  "pledge_donate",
] as const;

export type AgentScope = (typeof AGENT_SCOPES)[number];

export const TREE_TYPES = [
  "mango",
  "cashew",
  "guava",
  "plantain",
  "coconut",
  "orange",
] as const;

export type TreeType = (typeof TREE_TYPES)[number];

export const GROWTH_HOURS: Record<string, number> = {
  seed: 2,
  seedling: 6,
  sapling: 12,
  mature: 24,
};

export interface PlotData {
  id: string;
  row: number;
  col: number;
  stage: TreeStage;
  treeType: TreeType | null;
  waterLevel: number;
  lastWatered: string | null;
}

export interface FarmData {
  userId?: string;
  plots: PlotData[];
  coins: number;
  score: number;
  weather?: WeatherData;
}

export interface WeatherData {
  rain: number;
  city: string;
  lat?: number;
  lon?: number;
}

export interface AgentConfig {
  active: boolean;
  scopes: AgentScope[];
  actionsTotal: number;
  pointsEarned: number;
  pledged: number;
  lat: number;
  lon: number;
}

export interface AgentLog {
  type: string;
  msg: string;
  points?: number;
  ts: string;
}

export interface AgentConfigWithLogs extends AgentConfig {
  logs: AgentLog[];
}

export interface LeaderboardPlayer {
  userId: string;
  displayName: string;
  avatarUrl: string;
  score: number;
  plotCount: number;
  agentOn: boolean;
  rank: number;
  isMe?: boolean;
}

export interface ActionResult {
  ok: boolean;
  plot: PlotData;
  points: number;
  stats: {
    coins: number;
    score: number;
    treeCount: number;
    rank: number;
  };
}
