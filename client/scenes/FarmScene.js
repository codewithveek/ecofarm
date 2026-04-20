import { PlotManager }    from '../systems/PlotManager.js'
import { WeatherSystem }  from '../systems/WeatherSystem.js'
import { FarmAPI }        from '../utils/FarmAPI.js'
import { GAME_CONFIG, TREE_STAGES, POINTS, COSTS } from '../config/game.config.js'

export class FarmScene extends Phaser.Scene {
  constructor() { super('FarmScene') }

  async create() {
    this.api      = new FarmAPI(this.registry)
    this.farmData = await this.api.loadFarm()   // { plots[], coins, weather }

    this._buildTilemap()
    this._buildFarmer()

    this.plotManager   = new PlotManager(this, this.farmData.plots)
    this.weatherSystem = new WeatherSystem(this, this.farmData.weather)

    // Camera follows farmer, clamped to map
    this.cameras.main.startFollow(this.farmer, true, 0.1, 0.1)
    this.cameras.main.setBounds(0, 0,
      GAME_CONFIG.FARM_COLS * GAME_CONFIG.TILE_SIZE,
      GAME_CONFIG.FARM_ROWS * GAME_CONFIG.TILE_SIZE
    )

    // Input cursors + WASD
    this.cursors = this.input.keyboard.createCursorKeys()
    this.wasd    = this.input.keyboard.addKeys('W,A,S,D')

    // Listen to UIScene tool selections
    this.game.events.on('tool-selected', tool => { this.activeTool = tool })
    this.game.events.on('plot-action',   data => this._handlePlotAction(data))

    // Launch HUD scene in parallel
    this.scene.launch('UIScene', { farmData: this.farmData })

    // Periodic save
    this.time.addEvent({ delay: 30_000, callback: this._autosave, callbackScope: this, loop: true })

    // Ambient audio
    this.sound.play('ambient', { loop: true, volume: 0.3 })

    this.activeTool = 'water'
  }

  update(time, delta) {
    this._moveFarmer()
    this.weatherSystem.update(time, delta)
  }

  // ─── Private ───────────────────────────────────────────────

  _buildTilemap() {
    const map = this.make.tilemap({ key: 'farm-map' })
    map.addTilesetImage('terrain', 'tiles-terrain')
    map.addTilesetImage('decor',   'tiles-decor')
    map.createLayer('Ground',   'terrain', 0, 0)
    map.createLayer('Paths',    'terrain', 0, 0)
    map.createLayer('Decor',    'decor',   0, 0)
    this.farmMap = map
  }

  _buildFarmer() {
    const startX = 3 * GAME_CONFIG.TILE_SIZE
    const startY = 3 * GAME_CONFIG.TILE_SIZE
    this.farmer = this.physics.add.sprite(startX, startY, 'farmer')
    this.farmer.setCollideWorldBounds(true)
    this.farmer.play('farmer-idle')
    this.farmer.setDepth(10)
  }

  _moveFarmer() {
    const speed = 160
    const { left, right, up, down } = this.cursors
    const { A, D, W, S } = this.wasd
    const body = this.farmer.body

    body.setVelocity(0)

    if (left.isDown  || A.isDown) { body.setVelocityX(-speed); this.farmer.play('farmer-walk-left',  true) }
    else if (right.isDown || D.isDown) { body.setVelocityX(speed);  this.farmer.play('farmer-walk-right', true) }
    else if (up.isDown    || W.isDown) { body.setVelocityY(-speed); this.farmer.play('farmer-walk-up',    true) }
    else if (down.isDown  || S.isDown) { body.setVelocityY(speed);  this.farmer.play('farmer-walk-down',  true) }
    else { this.farmer.play('farmer-idle', true) }
  }

  async _handlePlotAction({ plotId, action }) {
    const result = await this.api.performAction(plotId, action)
    if (!result.ok) return

    this.plotManager.updatePlot(plotId, result.plot)
    this.sound.play(`${action}-sfx`, { volume: 0.6 })

    // Emit updated stats to UIScene
    this.game.events.emit('stats-updated', result.stats)

    // Floating point reward text
    this._floatText(`+${result.points} pts`, this.farmer.x, this.farmer.y - 40, '#4a9e4a')
  }

  _floatText(text, x, y, color = '#ffffff') {
    const t = this.add.text(x, y, text, { fontSize: '18px', color, fontFamily: 'monospace' })
      .setDepth(50).setOrigin(0.5)
    this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 1200,
      onComplete: () => t.destroy() })
  }

  _autosave() {
    this.api.saveFarm(this.plotManager.getState())
  }
}
