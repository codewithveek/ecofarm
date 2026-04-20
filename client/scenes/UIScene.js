// UIScene runs in parallel with FarmScene as a persistent HUD layer.
// Communicates with FarmScene via this.game.events (the global event bus).

export class UIScene extends Phaser.Scene {
  constructor() { super('UIScene') }

  init(data) {
    this.farmData = data.farmData
  }

  create() {
    const W = this.scale.width

    // ── HUD bar (top) ────────────────────────────────────────
    this.add.rectangle(W / 2, 28, W, 56, 0x1a1a1a, 0.85).setDepth(100)

    this.coinText    = this._hudStat(20,  28, '🪙', this.farmData.coins)
    this.waterText   = this._hudStat(160, 28, '💧', '72%')
    this.treeText    = this._hudStat(300, 28, '🌳', this.farmData.plots.filter(p => p.stage !== 'empty').length)
    this.rankText    = this._hudStat(430, 28, '🏆', '#4')
    this.weatherText = this.add.text(W - 20, 28, '⛅ Lagos · 8mm', {
      fontSize: '13px', color: '#a0d8a0', fontFamily: 'monospace'
    }).setOrigin(1, 0.5).setDepth(101)

    // ── Tool bar (bottom) ────────────────────────────────────
    this._buildToolbar()

    // ── Agent status pill (top-right) ────────────────────────
    this.agentPill = this.add.text(W - 20, 58, '🤖 Agent ON', {
      fontSize: '11px', color: '#9FE1CB',
      backgroundColor: '#085041', padding: { x: 8, y: 4 },
    }).setOrigin(1, 0).setDepth(101).setInteractive({ useHandCursor: true })
    this.agentPill.on('pointerdown', () => this.scene.launch('AgentScene'))

    // ── Listen for farm events ───────────────────────────────
    this.game.events.on('stats-updated', stats => {
      this.coinText.setText(stats.coins)
      this.treeText.setText(stats.treeCount)
      this.rankText.setText('#' + stats.rank)
    })

    this.game.events.on('weather-updated', w => {
      this.weatherText.setText(`⛅ ${w.city} · ${w.rain}mm`)
    })
  }

  // ─── Private ───────────────────────────────────────────────

  _hudStat(x, y, icon, value) {
    this.add.text(x, y, icon, { fontSize: '16px' }).setOrigin(0, 0.5).setDepth(101)
    const val = this.add.text(x + 22, y, String(value), {
      fontSize: '14px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(101)
    return val
  }

  _buildToolbar() {
    const tools = [
      { key: 'plant',     label: 'Plant',     icon: '🌱', color: 0x27500A },
      { key: 'water',     label: 'Water',     icon: '💧', color: 0x185FA5 },
      { key: 'harvest',   label: 'Harvest',   icon: '🌾', color: 0x854F0B },
      { key: 'leaderboard', label: 'Board',   icon: '🏆', color: 0x534AB7 },
    ]

    const W   = this.scale.width
    const H   = this.scale.height
    const bW  = 100
    const bH  = 64
    const gap = 12
    const totalW = tools.length * bW + (tools.length - 1) * gap
    const startX = (W - totalW) / 2

    this.add.rectangle(W / 2, H - bH / 2 - 8, W, bH + 16, 0x1a1a1a, 0.85).setDepth(100)

    this.toolBtns = {}
    tools.forEach((t, i) => {
      const x = startX + i * (bW + gap) + bW / 2
      const y = H - bH / 2 - 8

      const bg = this.add.rectangle(x, y, bW, bH, t.color, 0.3)
        .setDepth(101).setInteractive({ useHandCursor: true })
        .setStrokeStyle(1, 0xffffff, 0.2)

      this.add.text(x, y - 10, t.icon, { fontSize: '22px' })
        .setOrigin(0.5).setDepth(102)
      this.add.text(x, y + 14, t.label, { fontSize: '11px', color: '#cccccc', fontFamily: 'monospace' })
        .setOrigin(0.5).setDepth(102)

      bg.on('pointerdown', () => this._selectTool(t.key, bg))
      bg.on('pointerover',  () => bg.setAlpha(0.6))
      bg.on('pointerout',   () => bg.setAlpha(1))

      this.toolBtns[t.key] = bg
    })

    this._selectTool('water', this.toolBtns['water'])
  }

  _selectTool(key, bg) {
    // Reset all
    Object.values(this.toolBtns).forEach(b => b.setStrokeStyle(1, 0xffffff, 0.2))
    // Highlight selected
    bg.setStrokeStyle(2, 0x9FE1CB, 1)

    if (key === 'leaderboard') {
      this.scene.launch('LeaderboardScene')
    } else {
      this.game.events.emit('tool-selected', key)
    }
  }
}
