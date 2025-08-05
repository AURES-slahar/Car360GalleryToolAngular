import * as THREE from '../three'
import { PerspectiveTileMesh } from '../tile/TileMesh'
import { InteriorTilePanorama } from '../types'
import { TileLoader } from '../tile/TileLoader'

export class InteriorMapCube extends THREE.Group {
  constructor(
    tileLoader: TileLoader,
    tileSize: number,
    data: InteriorTilePanorama,
    baseUrl: string
  ) {
    super()

    const idBaseUrl = `${baseUrl}/interior/${data.id}`
    const pz = new PerspectiveTileMesh(tileLoader, tileSize, idBaseUrl, 'pz')
    pz.position.set(0, 0, -1).multiplyScalar(0.5 * tileSize)
    pz.rotation.set(0, 0, 0)
    pz.scale.set(1, 1, 1)

    this.add(pz)

    const nz = new PerspectiveTileMesh(tileLoader, tileSize, idBaseUrl, 'nz')
    nz.position.set(0, 0, 1).multiplyScalar(0.5 * tileSize)
    nz.rotation.set(0, 0, 0)
    nz.scale.set(-1, 1, -1)
    this.add(nz)

    const py = new PerspectiveTileMesh(tileLoader, tileSize, idBaseUrl, 'py')
    py.position.set(0, 1, 0).multiplyScalar(0.5 * tileSize)
    py.rotation.set(Math.PI / 2, 0, 0)
    py.scale.set(1, 1, 1)
    this.add(py)

    const ny = new PerspectiveTileMesh(tileLoader, tileSize, idBaseUrl, 'ny')
    ny.position.set(0, -1, 0).multiplyScalar(0.5 * tileSize)
    ny.rotation.set(Math.PI / 2, 0, 0)
    ny.scale.set(1, -1, -1)
    this.add(ny)

    const px = new PerspectiveTileMesh(tileLoader, tileSize, idBaseUrl, 'px')
    px.position.set(1, 0, 0).multiplyScalar(0.5 * tileSize)
    px.rotation.set(0, Math.PI / 2, 0)
    px.scale.set(-1, 1, -1)
    this.add(px)

    const nx = new PerspectiveTileMesh(tileLoader, tileSize, idBaseUrl, 'nx')
    nx.position.set(-1, 0, 0).multiplyScalar(0.5 * tileSize)
    nx.rotation.set(0, Math.PI / 2, 0)
    nx.scale.set(1, 1, 1)
    this.add(nx)
  }

  preload() {
    const tasks: Promise<THREE.Texture>[] = []
    for (const plane of this.children) {
      if (plane instanceof PerspectiveTileMesh) {
        tasks.push(plane.preload())
      }
    }
    return Promise.all(tasks)
  }
}
