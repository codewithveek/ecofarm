import "dotenv/config";
import express from "express";
import cors from "cors";
import { auth } from "express-oauth2-jwt-bearer";
import farmRouter from "./routes/farm";
import agentRouter from "./routes/agent";
import leaderboardRouter from "./routes/leaderboard";
import pledgeRouter from "./routes/pledge";
import { runAgent } from "./agents/AgentRunner";
import { db } from "./db";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());

const jwtCheck = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  tokenSigningAlg: "RS256",
});

app.use("/api", jwtCheck);

app.use("/api/farm", farmRouter);
app.use("/api/agent", agentRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/pledge", pledgeRouter);

async function runAllAgents(): Promise<void> {
  console.log("[Cron] Running agents for all active users...");
  const users = await db.getActiveAgentUsers();
  await Promise.allSettled(users.map((u) => runAgent(u)));
}

setInterval(runAllAgents, 6 * 60 * 60 * 1000);

app.listen(PORT, () =>
  console.log(`EcoFarm server → http://localhost:${PORT}`)
);
