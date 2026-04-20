import { API_URLS, WEATHER_THRESHOLDS } from "../config/game.config";
import type { WeatherData } from "../../server/constants";

export class WeatherSystem {
  private scene: Phaser.Scene;
  private weather: WeatherData;
  private rain: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private sunRays: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, initialWeather: WeatherData) {
    this.scene = scene;
    this.weather = initialWeather;

    this._applyVisuals(initialWeather);

    scene.time.addEvent({
      delay: 600_000,
      callback: this._fetchWeather,
      callbackScope: this,
      loop: true,
    });
  }

  update(time: number, _delta: number): void {
    this.sunRays.forEach((ray, i) => {
      ray.alpha = 0.06 + 0.04 * Math.sin(time / 3000 + i);
    });
  }

  private async _fetchWeather(): Promise<void> {
    const { lat, lon } = await this._getCoords();
    try {
      const url =
        `${API_URLS.OPEN_METEO}?latitude=${lat}&longitude=${lon}` +
        `&daily=precipitation_sum&timezone=auto&forecast_days=1`;
      const res = await fetch(url);
      const data = await res.json();
      const rain = data.daily?.precipitation_sum?.[0] ?? 0;

      this.weather = { ...this.weather, rain, lat, lon };
      this._applyVisuals(this.weather);
      this.scene.game.events.emit("weather-updated", this.weather);
    } catch (e) {
      console.warn("[WeatherSystem] fetch failed", e);
    }
  }

  private _applyVisuals(w: WeatherData): void {
    const isRainy = w.rain >= WEATHER_THRESHOLDS.RAIN_MM_AUTO_WATER;

    this.rain?.stop();
    this.sunRays.forEach((r) => r.destroy());
    this.sunRays = [];

    if (isRainy) {
      this._startRain();
    } else {
      this._startSun();
    }

    this.scene.cameras.main.setBackgroundColor(isRainy ? "#5a7a99" : "#87CEEB");
  }

  private _startRain(): void {
    if (!this.scene.textures.exists("rain-overlay")) return;
    this.rain = this.scene.add
      .particles(0, 0, "rain-overlay", {
        x: { min: 0, max: this.scene.scale.width },
        y: -10,
        speedY: { min: 200, max: 350 },
        speedX: { min: -30, max: -10 },
        lifespan: 1200,
        scale: { start: 0.4, end: 0.1 },
        alpha: { start: 0.6, end: 0 },
        quantity: 4,
        frequency: 40,
      })
      .setDepth(50);
  }

  private _startSun(): void {
    if (!this.scene.textures.exists("sun-ray")) return;
    for (let i = 0; i < 5; i++) {
      const ray = this.scene.add
        .image(
          Phaser.Math.Between(0, this.scene.scale.width),
          Phaser.Math.Between(0, 200),
          "sun-ray"
        )
        .setAlpha(0.06)
        .setDepth(0)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.sunRays.push(ray);
    }
  }

  private async _getCoords(): Promise<{ lat: number; lon: number }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: 6.5244, lon: 3.3792 });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve({ lat: 6.5244, lon: 3.3792 }),
        { timeout: 4000 }
      );
    });
  }
}
