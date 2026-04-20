/**
 * AgentRunner — server-side (Node.js)
 *
 * Runs on a cron schedule (every 6 hours) or when triggered by a weather event.
 * Uses Gemini to decide what to do, then calls the farm DB directly with
 * the user's Auth0-issued agent token.
 *
 * Called by: server/routes/agent.js (POST /api/agent/run)
 *            server/cron.js (setInterval / node-cron)
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { db }                 from '../db.js'
import { fetchRainfall }      from '../services/weather.service.js'
import { logToSolana }        from '../services/solana.service.js'

const genAI  = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model  = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

/**
 * Run the agent for a single user.
 * @param {{ userId, agentScopes, lat, lon }} config
 */
export async function runAgent({ userId, agentScopes, lat, lon }) {
  const logs = []

  // 1. Gather context ──────────────────────────────────────────
  const farm       = await db.getFarm(userId)
  const rainfall   = await fetchRainfall(lat, lon)   // mm today via Open-Meteo
  const dayOfWeek  = new Date().toLocaleDateString('en', { weekday: 'long' })

  // 2. Build prompt for Gemini ─────────────────────────────────
  const prompt = `
You are an eco-farming AI agent. Decide what actions to take on this farm.

Farm state:
${JSON.stringify(farm.plots.map(p => ({
  id: p.id, stage: p.stage, treeType: p.treeType,
  waterLevel: p.waterLevel, lastWatered: p.lastWatered,
})), null, 2)}

Context:
- Today is ${dayOfWeek}
- Rainfall in the user's region today: ${rainfall}mm
- Permitted actions (agent scopes): ${agentScopes.join(', ')}
- Auto-water threshold: skip watering if rainfall >= 15mm
- Weekly planting schedule: plant one tree every Monday if coins >= 20

Respond ONLY with a JSON array of actions:
[{ "action": "water"|"plant"|"harvest"|"skip", "plotId": "...", "reason": "..." }]

If no action is needed, return [{"action":"skip","plotId":null,"reason":"..."}].
Do not include markdown or explanation — raw JSON only.
`

  // 3. Get Gemini decision ─────────────────────────────────────
  let decisions = []
  try {
    const result = await model.generateContent(prompt)
    const raw    = result.response.text().trim()
    decisions    = JSON.parse(raw)
  } catch (e) {
    console.error('[AgentRunner] Gemini parse error', e)
    return { ok: false, logs: ['Agent decision failed — Gemini parse error'] }
  }

  // 4. Execute each decision ───────────────────────────────────
  for (const d of decisions) {
    if (d.action === 'skip') {
      logs.push({ type: 'skip', msg: d.reason, ts: new Date().toISOString() })
      continue
    }

    // Scope check — never act beyond what user authorised
    const scopeMap = { water: 'water_farm', plant: 'plant_tree', harvest: 'water_farm' }
    if (!agentScopes.includes(scopeMap[d.action])) {
      logs.push({ type: 'skip', msg: `Blocked — scope "${scopeMap[d.action]}" not granted`, ts: new Date().toISOString() })
      continue
    }

    try {
      const result = await db.performAction(userId, d.plotId, d.action)
      logs.push({ type: d.action, msg: d.reason, points: result.points, ts: new Date().toISOString() })

      // Log action hash to Solana for verifiable proof
      await logToSolana({ userId, action: d.action, plotId: d.plotId, points: result.points })
    } catch (e) {
      logs.push({ type: 'error', msg: `${d.action} failed: ${e.message}`, ts: new Date().toISOString() })
    }
  }

  // 5. Persist logs & notify user ──────────────────────────────
  await db.saveAgentLogs(userId, logs)
  // Push notification would fire here via web-push or socket.io

  return { ok: true, logs }
}
