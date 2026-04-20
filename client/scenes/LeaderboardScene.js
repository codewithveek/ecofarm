// LeaderboardScene — slides in over FarmScene
export class LeaderboardScene extends Phaser.Scene {
  constructor() { super('LeaderboardScene') }

  async create() {
    const api  = new (await import('../utils/FarmAPI.js')).FarmAPI(this.registry)
    const data = await api.getLeaderboard(20)
    const { width, height } = this.scale

    // Dark overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setInteractive()   // blocks clicks to farm below

    // Panel
    const panel = this.add.rectangle(width / 2, height / 2, 440, 480, 0x1a2e1a)
      .setStrokeStyle(1, 0x4a9e4a)

    this.add.text(width / 2, height / 2 - 210, '🌍 Leaderboard', {
      fontSize: '20px', color: '#9FE1CB', fontFamily: 'monospace',
    }).setOrigin(0.5)

    data.players.forEach((p, i) => {
      const y = height / 2 - 160 + i * 36
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
      this.add.text(width / 2 - 190, y, `${medal} ${p.displayName}`, {
        fontSize: '13px', color: p.isMe ? '#9FE1CB' : '#cccccc', fontFamily: 'monospace',
      })
      this.add.text(width / 2 + 190, y, String(p.score), {
        fontSize: '13px', color: '#EF9F27', fontFamily: 'monospace',
      }).setOrigin(1, 0)
    })

    // Close button
    const close = this.add.text(width / 2 + 190, height / 2 - 220, '✕', {
      fontSize: '18px', color: '#888', fontFamily: 'monospace',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true })
    close.on('pointerdown', () => this.scene.stop())
  }
}
