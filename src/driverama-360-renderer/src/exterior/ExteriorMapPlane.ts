import * as THREE from '../three'
import { OrthographicTileMesh } from '../tile/TileMesh'
import { ExteriorTilePanorama } from '../types'
import { TileLoader } from '../tile/TileLoader'

export class ExteriorMapPlane extends THREE.Group {
  constructor(
    tileLoader: TileLoader,
    tileSize: number,
    angle: number,
    protected data: ExteriorTilePanorama,
    baseUrl: string
  ) {
    super()

    const idBaseUrl = `${baseUrl}/exterior/${data.id}`
    const minWidth = data.width / Math.pow(2, data.maxZoom)
    const minHeight = data.height / Math.pow(2, data.maxZoom)

    const xSize = minWidth / tileSize
    const ySize = minHeight / tileSize

    for (let x = 0; x < xSize; ++x) {
      for (let y = 0; y < ySize; ++y) {
        const plane = new OrthographicTileMesh(
          tileLoader,
          tileSize,
          idBaseUrl,
          data.photos[angle],
          x,
          y
        )
        plane.position.set(tileSize * x, -tileSize * y, 0)
        this.add(plane)
      }
    }
  }

  updateAngle(angle: number) {
    for (const plane of this.children) {
      if (plane instanceof OrthographicTileMesh) {
        plane.updateAngle(this.data.photos[angle])
      }
    }
  }

  preload() {
    const tasks: Promise<THREE.Texture>[] = []

    for (const angle of this.data.photos) {
      for (const plane of this.children) {
        if (plane instanceof OrthographicTileMesh) {
          tasks.push(plane.preload(angle))
        }
      }
    }

    return Promise.all(tasks)
  }
}
