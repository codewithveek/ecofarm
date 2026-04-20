export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload(): void {
    const { width, height } = this.scale;
    const bar = this.add.graphics();
    const box = this.add.graphics();

    box.fillStyle(0x222222).fillRect(width / 2 - 160, height / 2 - 14, 320, 28);

    this.load.on("progress", (v: number) => {
      bar
        .clear()
        .fillStyle(0x4a9e4a)
        .fillRect(width / 2 - 158, height / 2 - 12, 316 * v, 24);
    });

    this.load.on("complete", () => {
      bar.destroy();
      box.destroy();
    });

    // Tilemaps
    this.load.tilemapTiledJSON("farm-map", "assets/tilemaps/farm.json");
    this.load.image("tiles-terrain", "assets/tilemaps/terrain.png");
    this.load.image("tiles-decor", "assets/tilemaps/decor.png");

    // Spritesheets
    this.load.spritesheet("trees", "assets/sprites/trees.png", {
      frameWidth: 64,
      frameHeight: 128,
    });
    this.load.spritesheet("farmer", "assets/sprites/farmer.png", {
      frameWidth: 48,
      frameHeight: 64,
    });
    this.load.spritesheet("water-splash", "assets/sprites/water-splash.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("coin", "assets/sprites/coin.png", {
      frameWidth: 24,
      frameHeight: 24,
    });
    this.load.image("rain-overlay", "assets/sprites/rain.png");
    this.load.image("sun-ray", "assets/sprites/sun-ray.png");
    this.load.image("agent-icon", "assets/sprites/agent-icon.png");
    this.load.image("ui-panel", "assets/sprites/ui-panel.png");

    // Audio
    this.load.audio("plant-sfx", "assets/audio/plant.mp3");
    this.load.audio("water-sfx", "assets/audio/water.mp3");
    this.load.audio("harvest-sfx", "assets/audio/harvest.mp3");
    this.load.audio("ambient", "assets/audio/farm-ambient.mp3");
    this.load.audio("coin-sfx", "assets/audio/coin.mp3");

    // Fonts
    this.load.bitmapFont(
      "farm-font",
      "assets/fonts/farm-font.png",
      "assets/fonts/farm-font.xml"
    );
  }

  create(): void {
    this._createAnims();
    this.scene.start("AuthScene");
  }

  private _createAnims(): void {
    const dirs = ["down", "up", "left", "right"] as const;
    dirs.forEach((dir, i) => {
      this.anims.create({
        key: `farmer-walk-${dir}`,
        frames: this.anims.generateFrameNumbers("farmer", {
          start: i * 4,
          end: i * 4 + 3,
        }),
        frameRate: 8,
        repeat: -1,
      });
    });
    this.anims.create({
      key: "farmer-idle",
      frames: [{ key: "farmer", frame: 0 }],
      frameRate: 1,
    });

    this.anims.create({
      key: "water-splash",
      frames: this.anims.generateFrameNumbers("water-splash", {
        start: 0,
        end: 7,
      }),
      frameRate: 12,
      repeat: 0,
    });

    this.anims.create({
      key: "coin-spin",
      frames: this.anims.generateFrameNumbers("coin", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });
  }
}
