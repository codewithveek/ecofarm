/**
 * server/db.js
 * Thin abstraction over Neon Postgres (or any pg-compatible driver).
 * Swap the internals for any DB without touching routes.
 *
 * Setup:
 *   npm install @neondatabase/serverless
 *   Set DATABASE_URL in .env → get it from https://neon.tech (free tier)
 */

import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

// ─── Schema (run once via migration or psql) ────────────────
// See server/migrations/001_init.sql

export const db = {

  // ── Farm ──────────────────────────────────────────────────

  async getFarm(userId) {
    const rows = await sql`SELECT * FROM farms WHERE user_id = ${userId} LIMIT 1`
    if (!rows[0]) return null
    const farm = rows[0]
    farm.plots = typeof farm.plots === 'string' ? JSON.parse(farm.plots) : farm.plots
    return farm
  },

  async createFarm(userId) {
    // Generate a blank 8×6 grid of empty plots
    const plots = []
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 8; c++) {
        plots.push({
          id:          `${r}${c}`,
          row: r, col: c,
          stage:       'empty',
          treeType:    null,
          waterLevel:  100,
          lastWatered: null,
        })
      }
    }
    const farm = { userId, plots, coins: 100, score: 0 }
    await sql`
      INSERT INTO farms (user_id, plots, coins, score)
      VALUES (${userId}, ${JSON.stringify(plots)}, 100, 0)
    `
    return farm
  },

  async saveFarm(userId, farm) {
    await sql`
      UPDATE farms
      SET plots = ${JSON.stringify(farm.plots)},
          coins = ${farm.coins},
          score = ${farm.score},
          updated_at = NOW()
      WHERE user_id = ${userId}
    `
  },

  // ── Scores / Leaderboard ──────────────────────────────────

  async addPoints(userId, points) {
    await sql`
      UPDATE farms SET score = score + ${points} WHERE user_id = ${userId}
    `
  },

  async getUserRank(userId) {
    const rows = await sql`
      SELECT rank FROM (
        SELECT user_id, RANK() OVER (ORDER BY score DESC) AS rank FROM farms
      ) ranked WHERE user_id = ${userId}
    `
    return rows[0]?.rank ?? null
  },

  async getLeaderboard(limit = 20) {
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
    `
  },

  // ── Agent ─────────────────────────────────────────────────

  async getAgentConfig(userId) {
    const rows = await sql`
      SELECT * FROM agent_configs WHERE user_id = ${userId} LIMIT 1
    `
    if (!rows[0]) return { active: false, scopes: [], actionsTotal: 0, pointsEarned: 0, pledged: 0, lat: 6.5244, lon: 3.3792 }
    const row = rows[0]
    row.scopes = typeof row.scopes === 'string' ? JSON.parse(row.scopes) : row.scopes
    return row
  },

  async saveAgentScopes(userId, scopes) {
    await sql`
      INSERT INTO agent_configs (user_id, scopes, active)
      VALUES (${userId}, ${JSON.stringify(scopes)}, true)
      ON CONFLICT (user_id) DO UPDATE SET scopes = ${JSON.stringify(scopes)}, active = true
    `
  },

  async getActiveAgentUsers() {
    return sql`
      SELECT a.user_id as "userId", a.scopes, a.lat, a.lon
      FROM agent_configs a WHERE a.active = true
    `
  },

  async saveAgentLogs(userId, logs) {
    for (const log of logs) {
      await sql`
        INSERT INTO agent_logs (user_id, type, msg, points, ts)
        VALUES (${userId}, ${log.type}, ${log.msg}, ${log.points ?? 0}, ${log.ts})
      `
    }
  },

  async getAgentLogs(userId, limit = 10) {
    return sql`
      SELECT type, msg, points, ts FROM agent_logs
      WHERE user_id = ${userId}
      ORDER BY ts DESC LIMIT ${limit}
    `
  },

  // ── Pledges ───────────────────────────────────────────────

  async recordPledge(userId, amount) {
    await sql`
      INSERT INTO pledges (user_id, amount, confirmed_at)
      VALUES (${userId}, ${amount}, NOW())
    `
    // Update running total on agent config
    await sql`
      UPDATE agent_configs SET pledged = pledged + ${amount} WHERE user_id = ${userId}
    `
  },

  // ── Weather cache ─────────────────────────────────────────

  async getLastWeather(userId) {
    const rows = await sql`
      SELECT * FROM weather_cache WHERE user_id = ${userId}
      ORDER BY fetched_at DESC LIMIT 1
    `
    return rows[0] ?? null
  },

  async saveWeather(userId, data) {
    await sql`
      INSERT INTO weather_cache (user_id, rain, city, lat, lon, fetched_at)
      VALUES (${userId}, ${data.rain}, ${data.city}, ${data.lat}, ${data.lon}, NOW())
    `
  },
}
