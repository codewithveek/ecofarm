-- server/migrations/001_init.sql
-- Run once against your Neon Postgres database:
--   psql $DATABASE_URL -f server/migrations/001_init.sql

-- ── Users ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,          -- Auth0 sub (e.g. "auth0|abc123")
  display_name TEXT        NOT NULL,
  avatar_url   TEXT,
  email        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Farms ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS farms (
  user_id    TEXT        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plots      JSONB       NOT NULL DEFAULT '[]',
  coins      INTEGER     NOT NULL DEFAULT 100,
  score      INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS farms_score_idx ON farms (score DESC);

-- ── Agent configs ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_configs (
  user_id        TEXT        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  active         BOOLEAN     NOT NULL DEFAULT false,
  scopes         JSONB       NOT NULL DEFAULT '[]',
  lat            NUMERIC(9,6) DEFAULT 6.5244,   -- default: Lagos
  lon            NUMERIC(9,6) DEFAULT 3.3792,
  actions_total  INTEGER     NOT NULL DEFAULT 0,
  points_earned  INTEGER     NOT NULL DEFAULT 0,
  pledged        NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Agent logs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_logs (
  id      BIGSERIAL   PRIMARY KEY,
  user_id TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type    TEXT        NOT NULL,   -- 'water' | 'plant' | 'harvest' | 'skip' | 'error'
  msg     TEXT        NOT NULL,
  points  INTEGER     NOT NULL DEFAULT 0,
  ts      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_logs_user_ts ON agent_logs (user_id, ts DESC);

-- ── Pledges ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pledges (
  id           BIGSERIAL   PRIMARY KEY,
  user_id      TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount       NUMERIC(10,2) NOT NULL,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tx_hash      TEXT                          -- Solana transaction hash (optional)
);

-- ── Weather cache ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weather_cache (
  id         BIGSERIAL   PRIMARY KEY,
  user_id    TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rain       NUMERIC(6,2) NOT NULL DEFAULT 0,  -- mm today
  city       TEXT,
  lat        NUMERIC(9,6),
  lon        NUMERIC(9,6),
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS weather_user_time ON weather_cache (user_id, fetched_at DESC);
