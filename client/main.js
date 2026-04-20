import Phaser from 'phaser'
import { BootScene }        from './scenes/BootScene.js'
import { PreloadScene }     from './scenes/PreloadScene.js'
import { FarmScene }        from './scenes/FarmScene.js'
import { UIScene }          from './scenes/UIScene.js'
import { LeaderboardScene } from './scenes/LeaderboardScene.js'
import { AgentScene }       from './scenes/AgentScene.js'
import { AuthScene }        from './scenes/AuthScene.js'
import { GAME_CONFIG }      from './config/game.config.js'

const config = {
  type: Phaser.AUTO,
  width:  GAME_CONFIG.WIDTH,
  height: GAME_CONFIG.HEIGHT,
  parent: 'game-container',
  backgroundColor: '#87CEEB',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [
    BootScene,
    PreloadScene,
    AuthScene,
    FarmScene,
    UIScene,
    LeaderboardScene,
    AgentScene,
  ],
}

const game = new Phaser.Game(config)
export default game
