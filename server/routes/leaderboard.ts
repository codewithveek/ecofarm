import { Router, Request, Response } from "express";
import { db } from "../db";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const userId = (req as any).auth.payload.sub as string;
    const players = await db.getLeaderboard(limit);
    res.json({
      players: players.map((p) => ({ ...p, isMe: p.userId === userId })),
    });
  } catch {
    res.status(500).json({ error: "Failed to load leaderboard" });
  }
});

export default router;
