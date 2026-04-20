# 🌱 EcoFarm

> Grow trees. Earn points. Heal the planet.
> A gamified 2D farm where every action is backed by real-world weather data,
> AI agents, and on-chain proof of care.

Built for the **DEV Weekend Challenge: Earth Day Edition 2026**.

---

## Tech stack

| Layer | Tech |
|---|---|
| Game engine | Phaser.js v4 |
| Auth + agent identity | Auth0 for Agents |
| AI agent | Google Gemini 2.0 Flash |
| Backend | Node.js + Express |
| Database | Neon Postgres (free tier) |
| Weather data | Open-Meteo (free, no key) |
| Air quality | OpenAQ (free) |
| On-chain logs | Solana (devnet) |

---

## Quick start

### 1. Clone & install

```bash
git clone https://github.com/you/ecofarm
cd ecofarm
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Fill in your Auth0, Neon, and Gemini credentials
```

### 3. Run the database migration

```bash
psql $DATABASE_URL -f server/migrations/001_init.sql
```

### 4. Start everything

```bash
npm run dev:all
# Game:   http://localhost:3000
# Server: http://localhost:4000
```

---

## Project structure

```
ecofarm/
├── index.html
├── vite.config.js
├── .env.example
│
├── src/                        # Phaser v4 client
│   ├── main.js                 # Game bootstrap
│   ├── config/
│   │   └── game.config.js      # Constants, API URLs, stage defs
│   ├── scenes/
│   │   ├── BootScene.js        # Auth0 initialisation
│   │   ├── PreloadScene.js     # Asset loading + animation defs
│   │   ├── AuthScene.js        # Login screen
│   │   ├── FarmScene.js        # Main 2D farm (tilemap + farmer)
│   │   ├── UIScene.js          # HUD overlay (runs parallel)
│   │   ├── LeaderboardScene.js # Global leaderboard overlay
│   │   └── AgentScene.js       # Agent panel overlay
│   ├── systems/
│   │   ├── PlotManager.js      # All farm plots + tree growth
│   │   └── WeatherSystem.js    # Open-Meteo fetch + visual effects
│   ├── agents/                 # (future) client-side agent UI helpers
│   └── utils/
│       └── FarmAPI.js          # All backend HTTP calls
│
├── server/                     # Node.js backend
│   ├── index.js                # Express app + cron scheduler
│   ├── db.js                   # Neon Postgres abstraction
│   ├── routes/
│   │   ├── farm.js             # GET /api/farm, POST /api/farm/plots/:id/:action
│   │   └── combined.js         # /api/agent, /api/leaderboard, /api/pledge
│   ├── agents/
│   │   └── AgentRunner.js      # Gemini-powered agent (runs every 6h)
│   ├── services/
│   │   ├── weather.service.js  # Open-Meteo + OpenAQ wrappers
│   │   └── solana.service.js   # Memo transaction logger
│   └── migrations/
│       └── 001_init.sql        # Postgres schema
│
├── shared/
│   └── constants.js            # Shared between client + server
│
└── public/
    └── assets/
        ├── tilemaps/           # farm.json (Tiled), terrain.png, decor.png
        ├── sprites/            # trees.png, farmer.png, water-splash.png, etc.
        ├── audio/              # plant.mp3, water.mp3, harvest.mp3, ambient.mp3
        └── fonts/              # farm-font.png + farm-font.xml (bitmap font)
```

---

## How the agent works

1. User opens **Agent panel** → toggles permission scopes (Auth0 for Agents issues scoped tokens)
2. Server cron fires every 6 hours per active-agent user
3. `AgentRunner` fetches farm state + Open-Meteo rainfall for the user's location
4. Sends context to **Gemini 2.0 Flash** → receives a JSON decision array
5. Agent executes only actions within the user's granted scopes
6. Each action is logged as a **Solana memo transaction** (verifiable proof)
7. User gets a notification: *"Your agent watered 7 trees — Lagos had 8mm rain today"*

---

## Prize categories targeted

- ✅ **Best use of Auth0 for Agents** — agent scope delegation + token issuance
- ✅ **Best use of Google Gemini** — farm decision AI
- ✅ **Best use of Solana** — on-chain action proof + optional NFT farm plots
- ✅ **Best use of GitHub Copilot** — used throughout development

---

## Assets needed (create or source)

| File | Description |
|---|---|
| `assets/tilemaps/farm.json` | Tiled map — 8×6 grid, Ground + Paths + Decor layers |
| `assets/tilemaps/terrain.png` | Grass, dirt, path tiles (64×64) |
| `assets/sprites/trees.png` | 6 columns × N rows spritesheet (stage × tree type) |
| `assets/sprites/farmer.png` | 4-direction walk cycle, 48×64 frames |
| `assets/sprites/water-splash.png` | 8-frame splash animation, 32×32 |
| `assets/audio/ambient.mp3` | Looping farm background sound |

Free sources: [OpenGameArt](https://opengameart.org), [itch.io free assets](https://itch.io/game-assets/free), [Kenney.nl](https://kenney.nl/assets)
