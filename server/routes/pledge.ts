import { Router, Request, Response } from "express";
import { db } from "../db";

const router = Router();

router.post("/confirm", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth.payload.sub as string;
    const { amount } = req.body as { amount: number };
    if (!amount || amount <= 0) {
      res.status(400).json({ error: "Invalid amount" });
      return;
    }

    await db.recordPledge(userId, amount);

    res.json({
      ok: true,
      amount,
      message: `$${amount.toFixed(2)} pledged to One Tree Planted 🌳`,
    });
  } catch {
    res.status(500).json({ error: "Pledge failed" });
  }
});

export default router;
