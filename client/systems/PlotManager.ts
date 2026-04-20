import { TREE_STAGES, GAME_CONFIG } from "../config/game.config";
import type { PlotData, TreeStage } from "../../server/constants";

const TREE_TYPES = [
  "mango",
  "cashew",
  "guava",
  "plantain",
  "coconut",
  "orange",
] as const;

const STAGE_FRAME: Record<TreeStage, number> = {
  [TREE_STAGES.EMPTY]: 0,
  [TREE_STAGES.SEED]: 1,
  [TREE_STAGES.SEEDLING]: 2,
  [TREE_STAGES.SAPLING]: 3,
  [TREE_STAGES.MATURE]: 4,
  [TREE_STAGES.HARVESTABLE]: 5,
};

interface PlotEntry {
  data: PlotData;
  sprite: Phaser.GameObjects.Sprite;
  dirt: Phaser.GameObjects.Rectangle;
  waterBar: {
    bg: Phaser.GameObjects.Rectangle;
    bar: Phaser.GameObjects.Rectangle;
  };
}

export class PlotManager {
  private scene: Phaser.Scene;
  private plots: Record<string, PlotEntry> = {};
  private group: Phaser.GameObjects.Group;

  constructor(scene: Phaser.Scene, plots: PlotData[]) {
    this.scene = scene;
    this.group = scene.add.group();

    plots.forEach((p) => this._createPlot(p));

    scene.time.addEvent({
      delay: 60_000,
      callback: this._tickGrowth,
      callbackScope: this,
      loop: true,
    });
  }

  updatePlot(id: string, newData: PlotData): void {
    const entry = this.plots[id];
    if (!entry) return;
    entry.data = newData;
    this._refreshSprite(entry);
    this._refreshWaterBar(entry);
  }

  getState(): PlotData[] {
    return Object.values(this.plots).map((e) => e.data);
  }

  private _createPlot(data: PlotData): void {
    const x = data.col * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
    const y = data.row * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;

    const dirt = this.scene.add
      .rectangle(x, y, 56, 56, 0x8b6914, 0.4)
      .setDepth(1);

    const typeIdx = TREE_TYPES.indexOf(
      (data.treeType ?? "mango") as (typeof TREE_TYPES)[number]
    );
    const typeRow = Math.max(0, typeIdx);
    const frame = typeRow * 6 + (STAGE_FRAME[data.stage] ?? 0);

    const sprite = this.scene.add
      .sprite(x, y - 16, "trees", frame)
      .setDepth(5)
      .setInteractive({ useHandCursor: true });

    sprite.on("pointerdown", () => {
      this.scene.game.events.emit("plot-action", {
        plotId: data.id,
        action: (this.scene as unknown as { activeTool: string }).activeTool,
      });
    });

    sprite.on("pointerover", () => {
      this.scene.game.events.emit("plot-hover", data);
      sprite.setTint(0xeeffee);
    });
    sprite.on("pointerout", () => sprite.clearTint());

    const waterBar = this._makeWaterBar(x, y + 28, data.waterLevel ?? 100);

    this.plots[data.id] = { data, sprite, dirt, waterBar };
    this.group.addMultiple([dirt, sprite]);
  }

  private _makeWaterBar(
    x: number,
    y: number,
    level: number
  ): { bg: Phaser.GameObjects.Rectangle; bar: Phaser.GameObjects.Rectangle } {
    const bg = this.scene.add.rectangle(x, y, 40, 4, 0x333333).setDepth(6);
    const bar = this.scene.add
      .rectangle(
        x - 20 + (40 * level) / 100 / 2,
        y,
        (40 * level) / 100,
        4,
        0x378add
      )
      .setDepth(7);
    return { bg, bar };
  }

  private _refreshSprite(entry: PlotEntry): void {
    const { data, sprite } = entry;
    const typeIdx = TREE_TYPES.indexOf(
      (data.treeType ?? "mango") as (typeof TREE_TYPES)[number]
    );
    const typeRow = Math.max(0, typeIdx);
    const frame = typeRow * 6 + (STAGE_FRAME[data.stage] ?? 0);
    sprite.setFrame(frame);
  }

  private _refreshWaterBar(entry: PlotEntry): void {
    const { data, waterBar } = entry;
    const level = data.waterLevel ?? 100;
    const w = (40 * level) / 100;
    waterBar.bar.setSize(w, 4);
    waterBar.bar.setX(entry.sprite.x - 20 + w / 2);
  }

  private _tickGrowth(): void {
    const now = Date.now();
    Object.values(this.plots).forEach((entry) => {
      const { data } = entry;
      if (
        data.stage === TREE_STAGES.EMPTY ||
        data.stage === TREE_STAGES.HARVESTABLE
      )
        return;

      const hoursSinceWatered =
        (now - new Date(data.lastWatered!).getTime()) / 3_600_000;
      const waterOk = data.waterLevel > 20 && hoursSinceWatered < 24;

      if (!waterOk) return;

      const stageOrder: TreeStage[] = [
        TREE_STAGES.SEED,
        TREE_STAGES.SEEDLING,
        TREE_STAGES.SAPLING,
        TREE_STAGES.MATURE,
        TREE_STAGES.HARVESTABLE,
      ];
      const idx = stageOrder.indexOf(data.stage);
      if (idx < stageOrder.length - 1) {
        data.stage = stageOrder[idx + 1];
        this._refreshSprite(entry);
      }
    });
  }
}
