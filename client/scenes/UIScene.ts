import type { FarmData } from "../../server/constants";

interface ToolDef {
  key: string;
  label: string;
  icon: string;
  color: number;
}

export class UIScene extends Phaser.Scene {
  private farmData!: FarmData;
  private coinText!: Phaser.GameObjects.Text;
  private waterText!: Phaser.GameObjects.Text;
  private treeText!: Phaser.GameObjects.Text;
  private rankText!: Phaser.GameObjects.Text;
  private weatherText!: Phaser.GameObjects.Text;
  private agentPill!: Phaser.GameObjects.Text;
  private toolBtns: Record<string, Phaser.GameObjects.Rectangle> = {};

  constructor() {
    super("UIScene");
  }

  init(data: { farmData: FarmData }): void {
    this.farmData = data.farmData;
  }

  create(): void {
    const W = this.scale.width;

    this.add.rectangle(W / 2, 28, W, 56, 0x1a1a1a, 0.85).setDepth(100);

    this.coinText = this._hudStat(20, 28, "🪙", this.farmData.coins);
    this.waterText = this._hudStat(160, 28, "💧", "72%");
    this.treeText = this._hudStat(
      300,
      28,
      "🌳",
      this.farmData.plots.filter((p) => p.stage !== "empty").length
    );
    this.rankText = this._hudStat(430, 28, "🏆", "#4");
    this.weatherText = this.add
      .text(W - 20, 28, "⛅ Lagos · 8mm", {
        fontSize: "13px",
        color: "#a0d8a0",
        fontFamily: "monospace",
      })
      .setOrigin(1, 0.5)
      .setDepth(101);

    this._buildToolbar();

    this.agentPill = this.add
      .text(W - 20, 58, "🤖 Agent ON", {
        fontSize: "11px",
        color: "#9FE1CB",
        backgroundColor: "#085041",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0)
      .setDepth(101)
      .setInteractive({ useHandCursor: true });
    this.agentPill.on("pointerdown", () => this.scene.launch("AgentScene"));

    this.game.events.on(
      "stats-updated",
      (stats: { coins: number; treeCount: number; rank: number }) => {
        this.coinText.setText(String(stats.coins));
        this.treeText.setText(String(stats.treeCount));
        this.rankText.setText("#" + stats.rank);
      }
    );

    this.game.events.on(
      "weather-updated",
      (w: { city: string; rain: number }) => {
        this.weatherText.setText(`⛅ ${w.city} · ${w.rain}mm`);
      }
    );
  }

  private _hudStat(
    x: number,
    y: number,
    icon: string,
    value: string | number
  ): Phaser.GameObjects.Text {
    this.add
      .text(x, y, icon, { fontSize: "16px" })
      .setOrigin(0, 0.5)
      .setDepth(101);
    const val = this.add
      .text(x + 22, y, String(value), {
        fontSize: "14px",
        color: "#ffffff",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5)
      .setDepth(101);
    return val;
  }

  private _buildToolbar(): void {
    const tools: ToolDef[] = [
      { key: "plant", label: "Plant", icon: "🌱", color: 0x27500a },
      { key: "water", label: "Water", icon: "💧", color: 0x185fa5 },
      { key: "harvest", label: "Harvest", icon: "🌾", color: 0x854f0b },
      { key: "leaderboard", label: "Board", icon: "🏆", color: 0x534ab7 },
    ];

    const W = this.scale.width;
    const H = this.scale.height;
    const bW = 100;
    const bH = 64;
    const gap = 12;
    const totalW = tools.length * bW + (tools.length - 1) * gap;
    const startX = (W - totalW) / 2;

    this.add
      .rectangle(W / 2, H - bH / 2 - 8, W, bH + 16, 0x1a1a1a, 0.85)
      .setDepth(100);

    this.toolBtns = {};
    tools.forEach((t, i) => {
      const x = startX + i * (bW + gap) + bW / 2;
      const y = H - bH / 2 - 8;

      const bg = this.add
        .rectangle(x, y, bW, bH, t.color, 0.3)
        .setDepth(101)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(1, 0xffffff, 0.2);

      this.add
        .text(x, y - 10, t.icon, { fontSize: "22px" })
        .setOrigin(0.5)
        .setDepth(102);
      this.add
        .text(x, y + 14, t.label, {
          fontSize: "11px",
          color: "#cccccc",
          fontFamily: "monospace",
        })
        .setOrigin(0.5)
        .setDepth(102);

      bg.on("pointerdown", () => this._selectTool(t.key, bg));
      bg.on("pointerover", () => bg.setAlpha(0.6));
      bg.on("pointerout", () => bg.setAlpha(1));

      this.toolBtns[t.key] = bg;
    });

    this._selectTool("water", this.toolBtns["water"]);
  }

  private _selectTool(key: string, bg: Phaser.GameObjects.Rectangle): void {
    Object.values(this.toolBtns).forEach((b) =>
      b.setStrokeStyle(1, 0xffffff, 0.2)
    );
    bg.setStrokeStyle(2, 0x9fe1cb, 1);

    if (key === "leaderboard") {
      this.scene.launch("LeaderboardScene");
    } else {
      this.game.events.emit("tool-selected", key);
    }
  }
}
