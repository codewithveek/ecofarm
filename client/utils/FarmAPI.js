import { API_URLS } from '../config/game.config.js'

export class FarmAPI {
  constructor(registry) {
    this.registry = registry
    this.base     = API_URLS.BACKEND
  }

  async _getToken() {
    const auth0 = this.registry.get('auth0')
    if (!auth0) return null
    return auth0.getTokenSilently()
  }

  async _req(path, opts = {}) {
    const token = await this._getToken()
    const res = await fetch(`${this.base}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers ?? {}),
      },
    })
    if (!res.ok) throw new Error(`API ${path} → ${res.status}`)
    return res.json()
  }

  /** Load full farm state for the authenticated user */
  loadFarm() {
    return this._req('/api/farm')
  }

  /**
   * Perform a plot action (plant / water / harvest)
   * Returns { ok, plot, stats, points }
   */
  performAction(plotId, action) {
    return this._req(`/api/farm/plots/${plotId}/${action}`, { method: 'POST' })
  }

  /** Persist current farm state (called on autosave) */
  saveFarm(plots) {
    return this._req('/api/farm/save', {
      method: 'POST',
      body: JSON.stringify({ plots }),
    })
  }

  /** Fetch leaderboard (top N players) */
  getLeaderboard(limit = 20) {
    return this._req(`/api/leaderboard?limit=${limit}`)
  }

  /** Fetch agent config + activity log for current user */
  getAgentConfig() {
    return this._req('/api/agent')
  }

  /** Update agent permission scopes */
  updateAgentScopes(scopes) {
    return this._req('/api/agent/scopes', {
      method: 'PATCH',
      body: JSON.stringify({ scopes }),
    })
  }

  /** Confirm weekly pledge donation */
  confirmPledge(amount) {
    return this._req('/api/pledge/confirm', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    })
  }
}
