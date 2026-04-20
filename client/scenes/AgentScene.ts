import { FarmAPI } from "../utils/FarmAPI";
import type {
  AgentConfigWithLogs,
  AgentLog,
  AgentScope,
} from "../../server/constants";

interface PermDef {
  scope: AgentScope;
  label: string;
  sub: string;
}

export class AgentScene extends Phaser.Scene {
  private agentData!: AgentConfigWithLogs;
  private api!: FarmAPI;
  private toggleStates: Record<string, boolean> = {};

  constructor() {
    super("AgentScene");
  }

  async create(): Promise<void> {
    this.api = new FarmAPI(this.registry);
    const data = (await this.api.getAgentConfig()) as AgentConfigWithLogs;
    const { width, height } = this.scale;

    this.agentData = data;

    this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.75)
      .setInteractive();

    this._buildPanel(width, height, data);
  }

  private _buildPanel(W: number, H: number, data: AgentConfigWithLogs): void {
    const PW = 480,
      PH = 520;
    const PX = W / 2,
      PY = H / 2;

    this.add.rectangle(PX, PY, PW, PH, 0x0d1f0d).setStrokeStyle(1, 0x4a9e4a);

    this.add.text(PX - PW / 2 + 20, PY - PH / 2 + 20, "🤖 EcoFarm Agent", {
      fontSize: "16px",
      color: "#9FE1CB",
      fontFamily: "monospace",
      fontStyle: "bold",
    });

    const statusColor = data.active ? "#4a9e4a" : "#888780";
    const statusLabel = data.active ? "● Active" : "○ Inactive";
    this.add
      .text(PX + PW / 2 - 20, PY - PH / 2 + 26, statusLabel, {
        fontSize: "12px",
        color: statusColor,
        fontFamily: "monospace",
      })
      .setOrigin(1, 0);

    this._statBox(PX - 140, PY - PH / 2 + 68, data.actionsTotal, "Actions");
    this._statBox(PX, PY - PH / 2 + 68, data.pointsEarned, "Points");
    this._statBox(
      PX + 140,
      PY - PH / 2 + 68,
      `$${data.pledged.toFixed(2)}`,
      "Pledged"
    );

    this.add.line(
      PX,
      PY - PH / 2 + 104,
      -PW / 2 + 20,
      0,
      PW / 2 - 20,
      0,
      0x2a3e2a
    );

    this.add.text(PX - PW / 2 + 20, PY - PH / 2 + 116, "Permissions", {
      fontSize: "11px",
      color: "#639922",
      fontFamily: "monospace",
    });

    const perms: PermDef[] = [
      {
        scope: "water_farm",
        label: "Auto-water when rain < 15mm",
        sub: "Open-Meteo triggered",
      },
      {
        scope: "plant_tree",
        label: "Plant one tree every Monday",
        sub: "Costs 20 coins",
      },
      {
        scope: "read_farm",
        label: "Gemini farming advice daily",
        sub: "AI tip each morning",
      },
      {
        scope: "pledge_donate",
        label: "Auto-confirm weekly pledge",
        sub: "Needs your approval",
      },
    ];

    this.toggleStates = {};
    perms.forEach((p, i) => {
      const y = PY - PH / 2 + 140 + i * 44;
      this.toggleStates[p.scope] = data.scopes.includes(p.scope);
      this._permRow(PX, PW, y, p);
    });

    this.add.line(
      PX,
      PY - PH / 2 + 326,
      -PW / 2 + 20,
      0,
      PW / 2 - 20,
      0,
      0x2a3e2a
    );
    this.add.text(PX - PW / 2 + 20, PY - PH / 2 + 338, "Recent activity", {
      fontSize: "11px",
      color: "#639922",
      fontFamily: "monospace",
    });

    const logs: AgentLog[] = data.logs ?? [];
    logs.slice(0, 4).forEach((log, i) => {
      const y = PY - PH / 2 + 360 + i * 32;
      const dot =
        log.type === "water"
          ? "💧"
          : log.type === "plant"
          ? "🌱"
          : log.type === "skip"
          ? "—"
          : "⚠️";
      const col = log.type === "skip" ? "#666" : "#cccccc";
      this.add.text(PX - PW / 2 + 20, y, `${dot} ${log.msg}`, {
        fontSize: "11px",
        color: col,
        fontFamily: "monospace",
        wordWrap: { width: PW - 100 },
      });
      const ago = this._timeAgo(log.ts);
      this.add
        .text(PX + PW / 2 - 20, y, ago, {
          fontSize: "11px",
          color: "#555",
          fontFamily: "monospace",
        })
        .setOrigin(1, 0);
    });

    const closeBtn = this.add
      .text(PX + PW / 2 - 16, PY - PH / 2 + 16, "✕", {
        fontSize: "16px",
        color: "#666",
        fontFamily: "monospace",
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    closeBtn.on("pointerover", () => closeBtn.setColor("#fff"));
    closeBtn.on("pointerout", () => closeBtn.setColor("#666"));
    closeBtn.on("pointerdown", () => this.scene.stop());
  }

  private _statBox(
    x: number,
    y: number,
    value: string | number,
    label: string
  ): void {
    this.add.rectangle(x, y, 110, 40, 0x1a2e1a).setStrokeStyle(0.5, 0x2a4e2a);
    this.add
      .text(x, y - 6, String(value), {
        fontSize: "16px",
        color: "#9FE1CB",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(x, y + 10, label, {
        fontSize: "10px",
        color: "#639922",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);
  }

  private _permRow(PX: number, PW: number, y: number, perm: PermDef): void {
    const isOn = this.toggleStates[perm.scope];

    const rowBg = this.add.rectangle(PX, y + 14, PW - 40, 38, 0x1a2e1a, 0);
    rowBg.setInteractive({ useHandCursor: true });

    this.add.text(PX - PW / 2 + 20, y + 6, perm.label, {
      fontSize: "12px",
      color: "#cccccc",
      fontFamily: "monospace",
    });
    this.add.text(PX - PW / 2 + 20, y + 22, perm.sub, {
      fontSize: "10px",
      color: "#556655",
      fontFamily: "monospace",
    });

    this.add.text(PX + 60, y + 8, perm.scope, {
      fontSize: "9px",
      color: "#7F77DD",
      backgroundColor: "#26215C",
      padding: { x: 5, y: 2 },
      fontFamily: "monospace",
    });

    const trackX = PX + PW / 2 - 50;
    const track = this.add
      .rectangle(trackX, y + 14, 32, 16, isOn ? 0x27500a : 0x333333)
      .setStrokeStyle(0.5, isOn ? 0x639922 : 0x555555);
    const knob = this.add.circle(
      isOn ? trackX + 8 : trackX - 8,
      y + 14,
      6,
      0xffffff
    );

    rowBg.on("pointerdown", () =>
      this._togglePerm(perm.scope, track, knob, trackX)
    );
    rowBg.on("pointerover", () => rowBg.setFillStyle(0x1a3e1a, 0.5));
    rowBg.on("pointerout", () => rowBg.setFillStyle(0x1a2e1a, 0));
  }

  private _togglePerm(
    scope: string,
    track: Phaser.GameObjects.Rectangle,
    knob: Phaser.GameObjects.Arc,
    trackX: number
  ): void {
    this.toggleStates[scope] = !this.toggleStates[scope];
    const on = this.toggleStates[scope];

    track.setFillStyle(on ? 0x27500a : 0x333333);
    track.setStrokeStyle(0.5, on ? 0x639922 : 0x555555);

    this.tweens.add({
      targets: knob,
      x: on ? trackX + 8 : trackX - 8,
      duration: 150,
      ease: "Sine.easeOut",
    });

    const activeScopes = Object.entries(this.toggleStates)
      .filter(([, v]) => v)
      .map(([k]) => k);
    this.api.updateAgentScopes(activeScopes).catch(console.warn);
  }

  private _timeAgo(isoString: string): string {
    const diff = Date.now() - new Date(isoString).getTime();
    const h = Math.floor(diff / 3_600_000);
    const d = Math.floor(diff / 86_400_000);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    return "just now";
  }
}
