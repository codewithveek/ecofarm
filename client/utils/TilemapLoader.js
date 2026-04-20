/**
 * TilemapLoader.js
 *
 * Creates the Phaser tilemap from farm.json, sets up all layers, and
 * extracts plot positions and decor object positions from the object layers.
 *
 * Usage (inside FarmScene.create):
 *   const loader = new TilemapLoader(this)
 *   const { plotObjects, colliders, decorObjects } = loader.build()
 */

export class TilemapLoader {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene
    this.map   = null
  }

  build() {
    const scene = this.scene

    // ── Create tilemap ───────────────────────────────────────
    this.map = scene.make.tilemap({ key: 'farm-map' })

    // Tilesets — names must match the "name" field in .tsj files
    const terrainTileset = this.map.addTilesetImage('terrain', 'tiles-terrain')
    const decorTileset   = this.map.addTilesetImage('decor',   'tiles-decor')

    // ── Tile layers ──────────────────────────────────────────
    // Depth 0 — base ground (grass + dirt plots)
    const groundLayer = this.map.createLayer('Ground', terrainTileset, 0, 0)
      .setDepth(0)

    // Depth 1 — stone paths over the ground
    const pathsLayer  = this.map.createLayer('Paths', terrainTileset, 0, 0)
      .setDepth(1)

    // Depth 2 — decorative tiles (flowers, rocks) — transparent where 0
    const decorLayer  = this.map.createLayer('Decor', decorTileset, 0, 0)
      .setDepth(2)

    // Set world bounds to exact map dimensions
    const mapW = this.map.widthInPixels
    const mapH = this.map.heightInPixels
    scene.physics.world.setBounds(0, 0, mapW, mapH)
    scene.cameras.main.setBounds(0, 0, mapW, mapH)

    // ── Collision layer objects ───────────────────────────────
    // Invisible rectangles from the Collision object layer
    const collisionObjects = this.map.getObjectLayer('Collision')?.objects ?? []
    const colliders = collisionObjects.map(obj => {
      const body = scene.physics.add.staticImage(
        obj.x + obj.width / 2,
        obj.y + obj.height / 2,
        '__WHITE'                   // invisible 1×1 white pixel Phaser has built-in
      ).setDisplaySize(obj.width, obj.height).setAlpha(0).setDepth(0)
      return body
    })

    // ── Plot object layer ─────────────────────────────────────
    // Each plot object has custom properties: col, row
    const plotObjects = (this.map.getObjectLayer('Plots')?.objects ?? []).map(obj => {
      const col = this._getProp(obj, 'col')
      const row = this._getProp(obj, 'row')
      return {
        id:   obj.name,                       // e.g. "plot_00"
        name: obj.name,
        col,
        row,
        x: obj.x + obj.width  / 2,           // centre pixel x
        y: obj.y + obj.height / 2,            // centre pixel y
        width:  obj.width,
        height: obj.height,
      }
    })

    // ── Decor object layer ────────────────────────────────────
    // Used to position interactive decor (well, scarecrow) in world space
    const decorObjects = (this.map.getObjectLayer('Decor')?.objects ?? []).map(obj => ({
      id:       obj.id,
      name:     obj.name,
      type:     obj.type,
      x:        obj.x + (obj.width  ?? 0) / 2,
      y:        obj.y + (obj.height ?? 0) / 2,
      props:    this._propsMap(obj),
    }))

    return {
      map:          this.map,
      groundLayer,
      pathsLayer,
      decorLayer,
      colliders,
      plotObjects,
      decorObjects,
      mapW,
      mapH,
    }
  }

  // ─── Helpers ───────────────────────────────────────────────

  _getProp(obj, name) {
    return obj.properties?.find(p => p.name === name)?.value ?? null
  }

  _propsMap(obj) {
    if (!obj.properties) return {}
    return Object.fromEntries(obj.properties.map(p => [p.name, p.value]))
  }
}
