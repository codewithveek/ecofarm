export interface PlotObject {
  id: string;
  name: string;
  col: number | null;
  row: number | null;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DecorObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  props: Record<string, unknown>;
}

export interface TilemapBuildResult {
  map: Phaser.Tilemaps.Tilemap;
  groundLayer:
    | Phaser.Tilemaps.TilemapLayer
    | Phaser.Tilemaps.TilemapGPULayer
    | null;
  pathsLayer:
    | Phaser.Tilemaps.TilemapLayer
    | Phaser.Tilemaps.TilemapGPULayer
    | null;
  decorLayer:
    | Phaser.Tilemaps.TilemapLayer
    | Phaser.Tilemaps.TilemapGPULayer
    | null;
  colliders: Phaser.Physics.Arcade.Image[];
  plotObjects: PlotObject[];
  decorObjects: DecorObject[];
  mapW: number;
  mapH: number;
}

export class TilemapLoader {
  private scene: Phaser.Scene;
  private map: Phaser.Tilemaps.Tilemap | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  build(): TilemapBuildResult {
    const scene = this.scene;

    this.map = scene.make.tilemap({ key: "farm-map" });

    const terrainTileset = this.map.addTilesetImage(
      "terrain",
      "tiles-terrain"
    )!;
    const decorTileset = this.map.addTilesetImage("decor", "tiles-decor")!;

    const groundLayer =
      this.map.createLayer("Ground", terrainTileset, 0, 0)?.setDepth(0) ?? null;

    const pathsLayer =
      this.map.createLayer("Paths", terrainTileset, 0, 0)?.setDepth(1) ?? null;

    const decorLayer =
      this.map.createLayer("Decor", decorTileset, 0, 0)?.setDepth(2) ?? null;

    const mapW = this.map.widthInPixels;
    const mapH = this.map.heightInPixels;
    scene.physics.world.setBounds(0, 0, mapW, mapH);
    scene.cameras.main.setBounds(0, 0, mapW, mapH);

    const collisionObjects =
      this.map.getObjectLayer("Collision")?.objects ?? [];
    const colliders = collisionObjects.map((obj) => {
      const body = scene.physics.add
        .staticImage(
          obj.x! + obj.width! / 2,
          obj.y! + obj.height! / 2,
          "__WHITE"
        )
        .setDisplaySize(obj.width!, obj.height!)
        .setAlpha(0)
        .setDepth(0);
      return body;
    });

    const plotObjects: PlotObject[] = (
      this.map.getObjectLayer("Plots")?.objects ?? []
    ).map((obj) => {
      const col = this._getProp(obj, "col") as number | null;
      const row = this._getProp(obj, "row") as number | null;
      return {
        id: obj.name,
        name: obj.name,
        col,
        row,
        x: obj.x! + obj.width! / 2,
        y: obj.y! + obj.height! / 2,
        width: obj.width!,
        height: obj.height!,
      };
    });

    const decorObjects: DecorObject[] = (
      this.map.getObjectLayer("Decor")?.objects ?? []
    ).map((obj) => ({
      id: obj.id,
      name: obj.name,
      type: obj.type ?? "",
      x: obj.x! + (obj.width ?? 0) / 2,
      y: obj.y! + (obj.height ?? 0) / 2,
      props: this._propsMap(obj),
    }));

    return {
      map: this.map,
      groundLayer,
      pathsLayer,
      decorLayer,
      colliders,
      plotObjects,
      decorObjects,
      mapW,
      mapH,
    };
  }

  private _getProp(
    obj: Phaser.Types.Tilemaps.TiledObject,
    name: string
  ): unknown {
    return (
      obj.properties?.find(
        (p: { name: string; value: unknown }) => p.name === name
      )?.value ?? null
    );
  }

  private _propsMap(
    obj: Phaser.Types.Tilemaps.TiledObject
  ): Record<string, unknown> {
    if (!obj.properties) return {};
    return Object.fromEntries(
      (obj.properties as Array<{ name: string; value: unknown }>).map((p) => [
        p.name,
        p.value,
      ])
    );
  }
}
