import { Router, Request, Response } from "express";
import { db } from "../db";
import { POINTS, COSTS, TREE_STAGES } from "../constants";
import type { PlotData } from "../constants";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth.payload.sub as string;
    let farm = await db.getFarm(userId);

    if (!farm) {
      farm = await db.createFarm(userId);
    }

    const weather = (await db.getLastWeather(userId)) ?? {
      rain: 0,
      city: "Unknown",
    };

    res.json({ ...farm, weather });
  } catch (e) {
    console.error("[GET /farm]", e);
    res.status(500).json({ error: "Failed to load farm" });
  }
});

router.post("/plots/:plotId/:action", async (req: Request, res: Response) => {
  const { plotId, action } = req.params;
  const userId = (req as any).auth.payload.sub as string;
  const validActions = ["plant", "water", "harvest"];

  if (!validActions.includes(action)) {
    res.status(400).json({ error: `Invalid action: ${action}` });
    return;
  }

  try {
    const farm = await db.getFarm(userId);
    if (!farm) {
      res.status(404).json({ error: "Farm not found" });
      return;
    }

    const plot = farm.plots.find((p: PlotData) => p.id === plotId);
    if (!plot) {
      res.status(404).json({ error: "Plot not found" });
      return;
    }

    let points = 0;
    let ok = false;

    switch (action) {
      case "plant": {
        if (plot.stage !== TREE_STAGES.EMPTY) {
          res.status(400).json({ error: "Plot not empty" });
          return;
        }
        if (farm.coins < COSTS.PLANT) {
          res.status(400).json({ error: "Not enough coins" });
          return;
        }
        plot.stage = TREE_STAGES.SEED;
        plot.lastWatered = new Date().toISOString();
        plot.waterLevel = 100;
        farm.coins -= COSTS.PLANT;
        points = POINTS.PLANT;
        ok = true;
        break;
      }
      case "water": {
        if (plot.stage === TREE_STAGES.EMPTY) {
          res.status(400).json({ error: "Nothing to water" });
          return;
        }
        plot.waterLevel = Math.min(100, (plot.waterLevel ?? 0) + 25);
        plot.lastWatered = new Date().toISOString();
        if (plot.stage === TREE_STAGES.SEED) plot.stage = TREE_STAGES.SEEDLING;
        points = POINTS.WATER;
        ok = true;
        break;
      }
      case "harvest": {
        if (plot.stage !== TREE_STAGES.HARVESTABLE) {
          res.status(400).json({ error: "Tree not ready" });
          return;
        }
        plot.stage = TREE_STAGES.EMPTY;
        farm.coins += 80;
        points = POINTS.HARVEST;
        ok = true;
        break;
      }
    }

    farm.score = (farm.score ?? 0) + points;
    farm.coins = Math.max(0, farm.coins);

    await db.saveFarm(userId, farm);
    await db.addPoints(userId, points);

    const rank = await db.getUserRank(userId);

    res.json({
      ok,
      plot,
      points,
      stats: {
        coins: farm.coins,
        score: farm.score,
        treeCount: farm.plots.filter(
          (p: PlotData) => p.stage !== TREE_STAGES.EMPTY
        ).length,
        rank,
      },
    });
  } catch (e) {
    console.error(`[POST /farm/plots/${plotId}/${action}]`, e);
    res.status(500).json({ error: "Action failed" });
  }
});

router.post("/save", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth.payload.sub as string;
    await db.saveFarm(userId, req.body);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Save failed" });
  }
});

export default router;
