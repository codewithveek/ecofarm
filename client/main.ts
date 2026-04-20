import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { FarmScene } from "./scenes/FarmScene";
import { UIScene } from "./scenes/UIScene";
import { LeaderboardScene } from "./scenes/LeaderboardScene";
import { AgentScene } from "./scenes/AgentScene";
import { AuthScene } from "./scenes/AuthScene";
import { GAME_CONFIG } from "./config/game.config";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_CONFIG.WIDTH,
  height: GAME_CONFIG.HEIGHT,
  parent: "game-container",
  backgroundColor: "#87CEEB",
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
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
};

const game = new Phaser.Game(config);
export default game;
