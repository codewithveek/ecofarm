import express           from 'express'
import cors              from 'cors'
import { auth }          from 'express-oauth-jwt-bearer'
import farmRouter        from './routes/farm.js'
import agentRouter       from './routes/agent.js'
import leaderboardRouter from './routes/leaderboard.js'
import pledgeRouter      from './routes/pledge.js'
import { runAgent }      from './agents/AgentRunner.js'
import { db }            from './db.js'

const app  = express()
const PORT = process.env.PORT || 4000

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }))
app.use(express.json())

// Auth0 JWT validation middleware — validates Bearer tokens on all /api routes
const jwtCheck = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  tokenSigningAlg: 'RS256',
})

app.use('/api', jwtCheck)

// ─── Routes ────────────────────────────────────────────────
app.use('/api/farm',        farmRouter)
app.use('/api/agent',       agentRouter)
app.use('/api/leaderboard', leaderboardRouter)
app.use('/api/pledge',      pledgeRouter)

// ─── Agent cron (every 6 hours) ────────────────────────────
async function runAllAgents() {
  console.log('[Cron] Running agents for all active users...')
  const users = await db.getActiveAgentUsers()
  await Promise.allSettled(users.map(u => runAgent(u)))
}

// Simple interval — swap for node-cron in production
setInterval(runAllAgents, 6 * 60 * 60 * 1000)

app.listen(PORT, () => console.log(`EcoFarm server → http://localhost:${PORT}`))
