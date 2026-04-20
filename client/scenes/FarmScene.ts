import { PlotManager } from "../systems/PlotManager";
import { WeatherSystem } from "../systems/WeatherSystem";
import { FarmAPI } from "../utils/FarmAPI";
import { GAME_CONFIG } from "../config/game.config";
import type { FarmData, PlotData, ActionResult } from "../../server/constants";

export class FarmScene extends Phaser.Scene {
  private api!: FarmAPI;
  private farmData!: FarmData;
  private plotManager!: PlotManager;
  private weatherSystem!: WeatherSystem;
  private farmer!: Phaser.Physics.Arcade.Sprite;
  private farmMap!: Phaser.Tilemaps.Tilemap;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private activeTool: string = "water";

  constructor() {
    super("FarmScene");
  }

  async create(): Promise<void> {
    this.api = new FarmAPI(this.registry);
    this.farmData = await this.api.loadFarm();

    this._buildTilemap();
    this._buildFarmer();

    this.plotManager = new PlotManager(this, this.farmData.plots);
    this.weatherSystem = new WeatherSystem(
      this,
      this.farmData.weather ?? { rain: 0, city: "Unknown" }
    );

    this.cameras.main.startFollow(this.farmer, true, 0.1, 0.1);
    this.cameras.main.setBounds(
      0,
      0,
      GAME_CONFIG.FARM_COLS * GAME_CONFIG.TILE_SIZE,
      GAME_CONFIG.FARM_ROWS * GAME_CONFIG.TILE_SIZE
    );

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as Record<
      "W" | "A" | "S" | "D",
      Phaser.Input.Keyboard.Key
    >;

    this.game.events.on("tool-selected", (tool: string) => {
      this.activeTool = tool;
    });
    this.game.events.on(
      "plot-action",
      (data: { plotId: string; action: string }) => this._handlePlotAction(data)
    );

    this.scene.launch("UIScene", { farmData: this.farmData });

    this.time.addEvent({
      delay: 30_000,
      callback: this._autosave,
      callbackScope: this,
      loop: true,
    });

    this.sound.play("ambient", { loop: true, volume: 0.3 });

    this.activeTool = "water";
  }

  update(time: number, delta: number): void {
    this._moveFarmer();
    this.weatherSystem.update(time, delta);
  }

  private _buildTilemap(): void {
    const map = this.make.tilemap({ key: "farm-map" });
    map.addTilesetImage("terrain", "tiles-terrain");
    map.addTilesetImage("decor", "tiles-decor");
    map.createLayer("Ground", "terrain", 0, 0);
    map.createLayer("Paths", "terrain", 0, 0);
    map.createLayer("Decor", "decor", 0, 0);
    this.farmMap = map;
  }

  private _buildFarmer(): void {
    const startX = 3 * GAME_CONFIG.TILE_SIZE;
    const startY = 3 * GAME_CONFIG.TILE_SIZE;
    this.farmer = this.physics.add.sprite(startX, startY, "farmer");
    this.farmer.setCollideWorldBounds(true);
    this.farmer.play("farmer-idle");
    this.farmer.setDepth(10);
  }

  private _moveFarmer(): void {
    const speed = 160;
    const { left, right, up, down } = this.cursors;
    const { A, D, W, S } = this.wasd;
    const body = this.farmer.body as Phaser.Physics.Arcade.Body;

    body.setVelocity(0);

    if (left.isDown || A.isDown) {
      body.setVelocityX(-speed);
      this.farmer.play("farmer-walk-left", true);
    } else if (right.isDown || D.isDown) {
      body.setVelocityX(speed);
      this.farmer.play("farmer-walk-right", true);
    } else if (up.isDown || W.isDown) {
      body.setVelocityY(-speed);
      this.farmer.play("farmer-walk-up", true);
    } else if (down.isDown || S.isDown) {
      body.setVelocityY(speed);
      this.farmer.play("farmer-walk-down", true);
    } else {
      this.farmer.play("farmer-idle", true);
    }
  }

  private async _handlePlotAction({
    plotId,
    action,
  }: {
    plotId: string;
    action: string;
  }): Promise<void> {
    const result: ActionResult = await this.api.performAction(plotId, action);
    if (!result.ok) return;

    this.plotManager.updatePlot(plotId, result.plot);
    this.sound.play(`${action}-sfx`, { volume: 0.6 });

    this.game.events.emit("stats-updated", result.stats);

    this._floatText(
      `+${result.points} pts`,
      this.farmer.x,
      this.farmer.y - 40,
      "#4a9e4a"
    );
  }

  private _floatText(
    text: string,
    x: number,
    y: number,
    color: string = "#ffffff"
  ): void {
    const t = this.add
      .text(x, y, text, { fontSize: "18px", color, fontFamily: "monospace" })
      .setDepth(50)
      .setOrigin(0.5);
    this.tweens.add({
      targets: t,
      y: y - 60,
      alpha: 0,
      duration: 1200,
      onComplete: () => t.destroy(),
    });
  }

  private _autosave(): void {
    this.api.saveFarm(this.plotManager.getState());
  }
}
