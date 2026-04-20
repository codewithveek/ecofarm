import { Router } from "express";
import { db } from "../db.js";
import { runAgent } from "../agents/AgentRunner.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const userId = req.auth.payload.sub;
    const config = await db.getAgentConfig(userId);
    const logs = await db.getAgentLogs(userId, 10);
    res.json({ ...config, logs });
  } catch (e) {
    res.status(500).json({ error: "Failed to load agent config" });
  }
});

router.patch("/scopes", async (req, res) => {
  try {
    const userId = req.auth.payload.sub;
    const { scopes } = req.body;
    if (!Array.isArray(scopes))
      return res.status(400).json({ error: "scopes must be array" });

    // Validate against allowed scopes
    const ALLOWED = ["water_farm", "plant_tree", "read_farm", "pledge_donate"];
    const filtered = scopes.filter((s) => ALLOWED.includes(s));

    await db.saveAgentScopes(userId, filtered);
    res.json({ ok: true, scopes: filtered });
  } catch (e) {
    res.status(500).json({ error: "Failed to update scopes" });
  }
});

// Manual trigger — useful for testing; production uses the cron
router.post("/run", async (req, res) => {
  try {
    const userId = req.auth.payload.sub;
    const config = await db.getAgentConfig(userId);
    const result = await runAgent({ userId, ...config });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: "Agent run failed" });
  }
});

export default router;
