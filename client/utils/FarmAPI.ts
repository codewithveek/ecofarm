import { API_URLS } from "../config/game.config";
import type {
  FarmData,
  ActionResult,
  AgentConfigWithLogs,
} from "../../server/constants";

export class FarmAPI {
  private registry: Phaser.Data.DataManager;
  private base: string;

  constructor(registry: Phaser.Data.DataManager) {
    this.registry = registry;
    this.base = API_URLS.BACKEND;
  }

  private async _getToken(): Promise<string | null> {
    const auth0 = this.registry.get("auth0") as {
      getTokenSilently: () => Promise<string>;
    } | null;
    if (!auth0) return null;
    return auth0.getTokenSilently();
  }

  private async _req<T>(path: string, opts: RequestInit = {}): Promise<T> {
    const token = await this._getToken();
    const res = await fetch(`${this.base}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...((opts.headers as Record<string, string>) ?? {}),
      },
    });
    if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
    return res.json() as Promise<T>;
  }

  loadFarm(): Promise<FarmData> {
    return this._req<FarmData>("/api/farm");
  }

  performAction(plotId: string, action: string): Promise<ActionResult> {
    return this._req<ActionResult>(
      `/api/farm/plots/${encodeURIComponent(plotId)}/${encodeURIComponent(
        action
      )}`,
      { method: "POST" }
    );
  }

  saveFarm(plots: FarmData["plots"]): Promise<{ ok: boolean }> {
    return this._req<{ ok: boolean }>("/api/farm/save", {
      method: "POST",
      body: JSON.stringify({ plots }),
    });
  }

  getLeaderboard(limit: number = 20): Promise<{ players: unknown[] }> {
    return this._req<{ players: unknown[] }>(`/api/leaderboard?limit=${limit}`);
  }

  getAgentConfig(): Promise<AgentConfigWithLogs> {
    return this._req<AgentConfigWithLogs>("/api/agent");
  }

  updateAgentScopes(
    scopes: string[]
  ): Promise<{ ok: boolean; scopes: string[] }> {
    return this._req<{ ok: boolean; scopes: string[] }>("/api/agent/scopes", {
      method: "PATCH",
      body: JSON.stringify({ scopes }),
    });
  }

  confirmPledge(
    amount: number
  ): Promise<{ ok: boolean; amount: number; message: string }> {
    return this._req<{ ok: boolean; amount: number; message: string }>(
      "/api/pledge/confirm",
      {
        method: "POST",
        body: JSON.stringify({ amount }),
      }
    );
  }
}
