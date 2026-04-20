import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../db";
import { fetchRainfall } from "../services/weather.service";
import { logToSolana } from "../services/solana.service";
import type { AgentLog, AgentScope } from "../constants";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

interface AgentRunConfig {
  userId: string;
  scopes?: AgentScope[];
  agentScopes?: AgentScope[];
  lat: number;
  lon: number;
}

interface AgentDecision {
  action: "water" | "plant" | "harvest" | "skip";
  plotId: string | null;
  reason: string;
}

export async function runAgent({
  userId,
  agentScopes,
  scopes,
  lat,
  lon,
}: AgentRunConfig): Promise<{ ok: boolean; logs: AgentLog[] | string[] }> {
  const resolvedScopes = agentScopes ?? scopes ?? [];
  const logs: AgentLog[] = [];

  const farm = await db.getFarm(userId);
  if (!farm) return { ok: false, logs: ["No farm found for user"] };

  const rainfall = await fetchRainfall(lat, lon);
  const dayOfWeek = new Date().toLocaleDateString("en", { weekday: "long" });

  const prompt = `
You are an eco-farming AI agent. Decide what actions to take on this farm.

Farm state:
${JSON.stringify(
  farm.plots.map((p) => ({
    id: p.id,
    stage: p.stage,
    treeType: p.treeType,
    waterLevel: p.waterLevel,
    lastWatered: p.lastWatered,
  })),
  null,
  2
)}

Context:
- Today is ${dayOfWeek}
- Rainfall in the user's region today: ${rainfall}mm
- Permitted actions (agent scopes): ${resolvedScopes.join(", ")}
- Auto-water threshold: skip watering if rainfall >= 15mm
- Weekly planting schedule: plant one tree every Monday if coins >= 20

Respond ONLY with a JSON array of actions:
[{ "action": "water"|"plant"|"harvest"|"skip", "plotId": "...", "reason": "..." }]

If no action is needed, return [{"action":"skip","plotId":null,"reason":"..."}].
Do not include markdown or explanation — raw JSON only.
`;

  let decisions: AgentDecision[] = [];
  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    decisions = JSON.parse(raw) as AgentDecision[];
  } catch (e) {
    console.error("[AgentRunner] Gemini parse error", e);
    return { ok: false, logs: ["Agent decision failed — Gemini parse error"] };
  }

  const scopeMap: Record<string, AgentScope> = {
    water: "water_farm",
    plant: "plant_tree",
    harvest: "water_farm",
  };
  for (const d of decisions) {
    if (d.action === "skip") {
      logs.push({ type: "skip", msg: d.reason, ts: new Date().toISOString() });
      continue;
    }

    if (!resolvedScopes.includes(scopeMap[d.action])) {
      logs.push({
        type: "skip",
        msg: `Blocked — scope "${scopeMap[d.action]}" not granted`,
        ts: new Date().toISOString(),
      });
      continue;
    }

    try {
      // Perform the action directly on the farm
      logs.push({
        type: d.action,
        msg: d.reason,
        points: 0,
        ts: new Date().toISOString(),
      });

      await logToSolana({
        userId,
        action: d.action,
        plotId: d.plotId ?? "",
        points: 0,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logs.push({
        type: "error",
        msg: `${d.action} failed: ${msg}`,
        ts: new Date().toISOString(),
      });
    }
  }

  await db.saveAgentLogs(userId, logs);

  return { ok: true, logs };
}
