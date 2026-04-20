import { Router } from "express";
import { db } from "../db.js";

const router = Router();

router.post("/confirm", async (req, res) => {
  try {
    const userId = req.auth.payload.sub;
    const { amount } = req.body;
    if (!amount || amount <= 0)
      return res.status(400).json({ error: "Invalid amount" });

    // In production: call One Tree Planted API or initiate Stripe/Solana payment
    // For hackathon: record the pledge and return a confirmation
    await db.recordPledge(userId, amount);

    res.json({
      ok: true,
      amount,
      message: `$${amount.toFixed(2)} pledged to One Tree Planted 🌳`,
    });
  } catch (e) {
    res.status(500).json({ error: "Pledge failed" });
  }
});

export default router;
