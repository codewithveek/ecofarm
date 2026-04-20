import { Router } from "express";
import { db } from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const userId = req.auth.payload.sub;
    const players = await db.getLeaderboard(limit);
    res.json({
      players: players.map((p) => ({ ...p, isMe: p.userId === userId })),
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to load leaderboard" });
  }
});

export default router;
