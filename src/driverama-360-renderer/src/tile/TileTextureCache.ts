import * as THREE from '../three'

export class TileTextureCache {
  protected data = new Map<string, THREE.Texture>()

  get(key: string): THREE.Texture | undefined {
    return this.data.get(key)
  }

  set(key: string, texture: THREE.Texture) {
    this.data.set(key, texture)
  }

  destroy() {
    for (const texture of this.data.values()) {
      texture.dispose()
    }

    this.data.clear()
  }
}
