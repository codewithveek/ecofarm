import { Router, Request, Response } from "express";
import { db } from "../db";
import { runAgent } from "../agents/AgentRunner";
import type { AgentScope } from "../constants";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth.payload.sub as string;
    const config = await db.getAgentConfig(userId);
    const logs = await db.getAgentLogs(userId, 10);
    res.json({ ...config, logs });
  } catch {
    res.status(500).json({ error: "Failed to load agent config" });
  }
});

router.patch("/scopes", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth.payload.sub as string;
    const { scopes } = req.body as { scopes: unknown };
    if (!Array.isArray(scopes)) {
      res.status(400).json({ error: "scopes must be array" });
      return;
    }

    const ALLOWED: AgentScope[] = [
      "water_farm",
      "plant_tree",
      "read_farm",
      "pledge_donate",
    ];
    const filtered = (scopes as string[]).filter((s): s is AgentScope =>
      ALLOWED.includes(s as AgentScope)
    );

    await db.saveAgentScopes(userId, filtered);
    res.json({ ok: true, scopes: filtered });
  } catch {
    res.status(500).json({ error: "Failed to update scopes" });
  }
});

router.post("/run", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth.payload.sub as string;
    const config = await db.getAgentConfig(userId);
    const result = await runAgent({
      userId,
      agentScopes: config.scopes,
      lat: config.lat,
      lon: config.lon,
    });
    res.json(result);
  } catch {
    res.status(500).json({ error: "Agent run failed" });
  }
});

export default router;
