export class AuthScene extends Phaser.Scene {
  constructor() {
    super("AuthScene");
  }

  async create(): Promise<void> {
    const isAuth = this.registry.get("isAuthenticated") as boolean;
    if (isAuth) {
      this.scene.start("FarmScene");
      return;
    }

    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a2e1a);
    this.add
      .text(width / 2, height / 2 - 60, "🌱 EcoFarm", {
        fontSize: "48px",
        color: "#9FE1CB",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height / 2,
        "Grow trees. Earn points. Heal the planet.",
        {
          fontSize: "16px",
          color: "#a0d8a0",
          fontFamily: "monospace",
        }
      )
      .setOrigin(0.5);

    const btn = this.add
      .rectangle(width / 2, height / 2 + 80, 200, 48, 0x27500a)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2, height / 2 + 80, "Login to farm →", {
        fontSize: "15px",
        color: "#ffffff",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    btn.on("pointerdown", async () => {
      const auth0 = this.registry.get("auth0") as {
        loginWithRedirect: () => Promise<void>;
      };
      await auth0.loginWithRedirect();
    });
  }
}
