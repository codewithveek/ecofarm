import { TREE_STAGES, GAME_CONFIG } from '../config/game.config.js'

// Tree type definitions: each entry maps to a row in trees.png spritesheet
const TREE_TYPES = ['mango', 'cashew', 'guava', 'plantain', 'coconut', 'orange']

// Stage → spritesheet column (0-indexed, must match your artists' layout)
const STAGE_FRAME = {
  [TREE_STAGES.EMPTY]:       0,
  [TREE_STAGES.SEED]:        1,
  [TREE_STAGES.SEEDLING]:    2,
  [TREE_STAGES.SAPLING]:     3,
  [TREE_STAGES.MATURE]:      4,
  [TREE_STAGES.HARVESTABLE]: 5,
}

export class PlotManager {
  /**
   * @param {Phaser.Scene} scene
   * @param {Array<{id,col,row,stage,treeType,waterLevel,lastWatered}>} plots
   */
  constructor(scene, plots) {
    this.scene   = scene
    this.plots   = {}   // id → { data, sprite, waterBar }
    this.group   = scene.add.group()

    plots.forEach(p => this._createPlot(p))

    // Grow timer: every 60s check if any plot should advance stage
    scene.time.addEvent({
      delay: 60_000,
      callback: this._tickGrowth,
      callbackScope: this,
      loop: true,
    })
  }

  // ─── Public API ────────────────────────────────────────────

  updatePlot(id, newData) {
    const entry = this.plots[id]
    if (!entry) return
    entry.data = newData
    this._refreshSprite(entry)
    this._refreshWaterBar(entry)
  }

  getState() {
    return Object.values(this.plots).map(e => e.data)
  }

  // ─── Private ───────────────────────────────────────────────

  _createPlot(data) {
    const x = data.col * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2
    const y = data.row * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2

    // Dirt patch background
    const dirt = this.scene.add.rectangle(x, y, 56, 56, 0x8B6914, 0.4)
      .setDepth(1)

    // Tree sprite: frame = typeRow * 6 + stageCol
    const typeIdx  = TREE_TYPES.indexOf(data.treeType ?? 'mango')
    const typeRow  = Math.max(0, typeIdx)
    const frame    = typeRow * 6 + (STAGE_FRAME[data.stage] ?? 0)

    const sprite = this.scene.add.sprite(x, y - 16, 'trees', frame)
      .setDepth(5).setInteractive({ useHandCursor: true })

    sprite.on('pointerdown', () => {
      this.scene.game.events.emit('plot-action', {
        plotId: data.id,
        action: this.scene.activeTool,
      })
    })

    sprite.on('pointerover', () => {
      this.scene.game.events.emit('plot-hover', data)
      sprite.setTint(0xeeffee)
    })
    sprite.on('pointerout', () => sprite.clearTint())

    // Water level indicator bar (small bar below sprite)
    const waterBar = this._makeWaterBar(x, y + 28, data.waterLevel ?? 100)

    this.plots[data.id] = { data, sprite, dirt, waterBar }
    this.group.addMultiple([dirt, sprite])
  }

  _makeWaterBar(x, y, level) {
    const bg  = this.scene.add.rectangle(x, y, 40, 4, 0x333333).setDepth(6)
    const bar = this.scene.add.rectangle(x - 20 + (40 * level / 100) / 2, y, 40 * level / 100, 4, 0x378ADD).setDepth(7)
    return { bg, bar }
  }

  _refreshSprite(entry) {
    const { data, sprite } = entry
    const typeIdx = TREE_TYPES.indexOf(data.treeType ?? 'mango')
    const typeRow = Math.max(0, typeIdx)
    const frame   = typeRow * 6 + (STAGE_FRAME[data.stage] ?? 0)
    sprite.setFrame(frame)
  }

  _refreshWaterBar(entry) {
    const { data, waterBar } = entry
    const level = data.waterLevel ?? 100
    const w = 40 * level / 100
    waterBar.bar.setSize(w, 4)
    waterBar.bar.setX(entry.sprite.x - 20 + w / 2)
  }

  _tickGrowth() {
    const now = Date.now()
    Object.values(this.plots).forEach(entry => {
      const { data } = entry
      if (data.stage === TREE_STAGES.EMPTY || data.stage === TREE_STAGES.HARVESTABLE) return

      const hoursSinceWatered = (now - new Date(data.lastWatered).getTime()) / 3_600_000
      const waterOk = data.waterLevel > 20 && hoursSinceWatered < 24

      if (!waterOk) return   // dry tree doesn't grow

      const stageOrder = [
        TREE_STAGES.SEED, TREE_STAGES.SEEDLING,
        TREE_STAGES.SAPLING, TREE_STAGES.MATURE, TREE_STAGES.HARVESTABLE,
      ]
      const idx = stageOrder.indexOf(data.stage)
      if (idx < stageOrder.length - 1) {
        data.stage = stageOrder[idx + 1]
        this._refreshSprite(entry)
      }
    })
  }
}
