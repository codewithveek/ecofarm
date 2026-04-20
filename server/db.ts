import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import type { PlotData, AgentConfig, AgentLog, AgentScope } from "./constants";

const sql: NeonQueryFunction<false, false> = neon(process.env.DATABASE_URL!);

export interface Farm {
  userId: string;
  plots: PlotData[];
  coins: number;
  score: number;
}

export interface LeaderboardRow {
  userId: string;
  displayName: string;
  avatarUrl: string;
  score: number;
  plotCount: number;
  agentOn: boolean;
  rank: number;
}

export interface AgentConfigRow extends AgentConfig {
  userId?: string;
}

export interface WeatherCacheRow {
  rain: number;
  city: string;
  lat: number;
  lon: number;
  fetched_at: string;
}

export interface ActiveAgentUser {
  userId: string;
  scopes: AgentScope[];
  lat: number;
  lon: number;
}

export const db = {
  async getFarm(userId: string): Promise<Farm | null> {
    const rows =
      await sql`SELECT * FROM farms WHERE user_id = ${userId} LIMIT 1`;
    if (!rows[0]) return null;
    const farm = rows[0] as Record<string, unknown>;
    farm.plots =
      typeof farm.plots === "string"
        ? JSON.parse(farm.plots as string)
        : farm.plots;
    return farm as unknown as Farm;
  },

  async createFarm(userId: string): Promise<Farm> {
    const plots: PlotData[] = [];
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 8; c++) {
        plots.push({
          id: `${r}${c}`,
          row: r,
          col: c,
          stage: "empty",
          treeType: null,
          waterLevel: 100,
          lastWatered: null,
        });
      }
    }
    const farm: Farm = { userId, plots, coins: 100, score: 0 };
    await sql`
      INSERT INTO farms (user_id, plots, coins, score)
      VALUES (${userId}, ${JSON.stringify(plots)}, 100, 0)
    `;
    return farm;
  },

  async saveFarm(
    userId: string,
    farm: { plots: PlotData[]; coins: number; score: number }
  ): Promise<void> {
    await sql`
      UPDATE farms
      SET plots = ${JSON.stringify(farm.plots)},
          coins = ${farm.coins},
          score = ${farm.score},
          updated_at = NOW()
      WHERE user_id = ${userId}
    `;
  },

  async addPoints(userId: string, points: number): Promise<void> {
    await sql`
      UPDATE farms SET score = score + ${points} WHERE user_id = ${userId}
    `;
  },

  async getUserRank(userId: string): Promise<number | null> {
    const rows = await sql`
      SELECT rank FROM (
        SELECT user_id, RANK() OVER (ORDER BY score DESC) AS rank FROM farms
      ) ranked WHERE user_id = ${userId}
    `;
    return ((rows[0] as Record<string, unknown>)?.rank as number) ?? null;
  },

  async getLeaderboard(limit: number = 20): Promise<LeaderboardRow[]> {
    return sql`
      SELECT f.user_id as "userId",
             u.display_name as "displayName",
             u.avatar_url   as "avatarUrl",
             f.score,
             jsonb_array_length(f.plots::jsonb) as "plotCount",
             a.active as "agentOn",
             RANK() OVER (ORDER BY f.score DESC) as rank
      FROM farms f
      JOIN users u ON u.id = f.user_id
      LEFT JOIN agent_configs a ON a.user_id = f.user_id
      ORDER BY f.score DESC
      LIMIT ${limit}
    ` as unknown as LeaderboardRow[];
  },

  async getAgentConfig(userId: string): Promise<AgentConfig> {
    const rows = await sql`
      SELECT * FROM agent_configs WHERE user_id = ${userId} LIMIT 1
    `;
    if (!rows[0])
      return {
        active: false,
        scopes: [] as AgentScope[],
        actionsTotal: 0,
        pointsEarned: 0,
        pledged: 0,
        lat: 6.5244,
        lon: 3.3792,
      };
    const row = rows[0] as Record<string, unknown>;
    row.scopes =
      typeof row.scopes === "string"
        ? JSON.parse(row.scopes as string)
        : row.scopes;
    return row as unknown as AgentConfig;
  },

  async saveAgentScopes(userId: string, scopes: string[]): Promise<void> {
    await sql`
      INSERT INTO agent_configs (user_id, scopes, active)
      VALUES (${userId}, ${JSON.stringify(scopes)}, true)
      ON CONFLICT (user_id) DO UPDATE SET scopes = ${JSON.stringify(
        scopes
      )}, active = true
    `;
  },

  async getActiveAgentUsers(): Promise<ActiveAgentUser[]> {
    return sql`
      SELECT a.user_id as "userId", a.scopes, a.lat, a.lon
      FROM agent_configs a WHERE a.active = true
    ` as unknown as ActiveAgentUser[];
  },

  async saveAgentLogs(userId: string, logs: AgentLog[]): Promise<void> {
    for (const log of logs) {
      await sql`
        INSERT INTO agent_logs (user_id, type, msg, points, ts)
        VALUES (${userId}, ${log.type}, ${log.msg}, ${log.points ?? 0}, ${
        log.ts
      })
      `;
    }
  },

  async getAgentLogs(userId: string, limit: number = 10): Promise<AgentLog[]> {
    return sql`
      SELECT type, msg, points, ts FROM agent_logs
      WHERE user_id = ${userId}
      ORDER BY ts DESC LIMIT ${limit}
    ` as unknown as AgentLog[];
  },

  async recordPledge(userId: string, amount: number): Promise<void> {
    await sql`
      INSERT INTO pledges (user_id, amount, confirmed_at)
      VALUES (${userId}, ${amount}, NOW())
    `;
    await sql`
      UPDATE agent_configs SET pledged = pledged + ${amount} WHERE user_id = ${userId}
    `;
  },

  async getLastWeather(userId: string): Promise<WeatherCacheRow | null> {
    const rows = await sql`
      SELECT * FROM weather_cache WHERE user_id = ${userId}
      ORDER BY fetched_at DESC LIMIT 1
    `;
    return (rows[0] as unknown as WeatherCacheRow) ?? null;
  },

  async saveWeather(
    userId: string,
    data: { rain: number; city: string; lat: number; lon: number }
  ): Promise<void> {
    await sql`
      INSERT INTO weather_cache (user_id, rain, city, lat, lon, fetched_at)
      VALUES (${userId}, ${data.rain}, ${data.city}, ${data.lat}, ${data.lon}, NOW())
    `;
  },
};
