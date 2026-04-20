import { Router }   from 'express'
import { db }        from '../db.js'
import { POINTS, COSTS, TREE_STAGES } from '../../shared/constants.js'

const router = Router()

// GET /api/farm — load current user's farm
router.get('/', async (req, res) => {
  try {
    const userId = req.auth.payload.sub
    let farm = await db.getFarm(userId)

    if (!farm) {
      // First-time user: create a blank farm
      farm = await db.createFarm(userId)
    }

    // Fetch current weather for the user's location
    const weather = await db.getLastWeather(userId) ?? { rain: 0, city: 'Unknown' }

    res.json({ ...farm, weather })
  } catch (e) {
    console.error('[GET /farm]', e)
    res.status(500).json({ error: 'Failed to load farm' })
  }
})

// POST /api/farm/plots/:plotId/:action — perform plant / water / harvest
router.post('/plots/:plotId/:action', async (req, res) => {
  const { plotId, action } = req.params
  const userId = req.auth.payload.sub
  const validActions = ['plant', 'water', 'harvest']

  if (!validActions.includes(action)) {
    return res.status(400).json({ error: `Invalid action: ${action}` })
  }

  try {
    const farm = await db.getFarm(userId)
    const plot = farm.plots.find(p => p.id === plotId)
    if (!plot) return res.status(404).json({ error: 'Plot not found' })

    let points = 0
    let ok     = false

    switch (action) {
      case 'plant': {
        if (plot.stage !== TREE_STAGES.EMPTY)         return res.status(400).json({ error: 'Plot not empty' })
        if (farm.coins < COSTS.PLANT)                 return res.status(400).json({ error: 'Not enough coins' })
        plot.stage       = TREE_STAGES.SEED
        plot.lastWatered = new Date().toISOString()
        plot.waterLevel  = 100
        farm.coins      -= COSTS.PLANT
        points           = POINTS.PLANT
        ok               = true
        break
      }
      case 'water': {
        if (plot.stage === TREE_STAGES.EMPTY) return res.status(400).json({ error: 'Nothing to water' })
        plot.waterLevel  = Math.min(100, (plot.waterLevel ?? 0) + 25)
        plot.lastWatered = new Date().toISOString()
        // Promote seedling → sapling when watered enough times
        if (plot.stage === TREE_STAGES.SEED)     plot.stage = TREE_STAGES.SEEDLING
        points = POINTS.WATER
        ok     = true
        break
      }
      case 'harvest': {
        if (plot.stage !== TREE_STAGES.HARVESTABLE) return res.status(400).json({ error: 'Tree not ready' })
        plot.stage   = TREE_STAGES.EMPTY
        farm.coins  += 80   // harvest reward
        points       = POINTS.HARVEST
        ok           = true
        break
      }
    }

    farm.score  = (farm.score ?? 0) + points
    farm.coins  = Math.max(0, farm.coins)

    await db.saveFarm(userId, farm)
    await db.addPoints(userId, points)

    const rank = await db.getUserRank(userId)

    res.json({
      ok,
      plot,
      points,
      stats: { coins: farm.coins, score: farm.score, treeCount: farm.plots.filter(p => p.stage !== TREE_STAGES.EMPTY).length, rank },
    })
  } catch (e) {
    console.error(`[POST /farm/plots/${plotId}/${action}]`, e)
    res.status(500).json({ error: 'Action failed' })
  }
})

// POST /api/farm/save — autosave full farm state
router.post('/save', async (req, res) => {
  try {
    const userId = req.auth.payload.sub
    await db.saveFarm(userId, req.body)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Save failed' })
  }
})

export default router
