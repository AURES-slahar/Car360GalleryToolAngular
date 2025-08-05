import * as THREE from '../three'
import { TileAbortError, TileLoader } from './TileLoader'

interface TileOptions {
  tileSize: number
  baseUrl: string
  zOffset?: number
}

interface TilePosition {
  level: number
  x: number
  y: number
}

type PerspectiveOrientationType = 'px' | 'nx' | 'py' | 'ny' | 'pz' | 'nz'

export class TileMesh extends THREE.Mesh {
  protected variant: string
  protected tilePosition: TilePosition
  protected options: TileOptions

  protected textureAbortController: AbortController | undefined
  protected textureLoader: TileLoader

  static childTranslate = [
    [0, 0, -0.25, 0.25],
    [1, 0, 0.25, 0.25],
    [0, 1, -0.25, -0.25],
    [1, 1, 0.25, -0.25]
  ]

  constructor(
    textureLoader: TileLoader,
    variant: string,
    options: TileOptions,
    tilePosition: TilePosition
  ) {
    super(new THREE.PlaneGeometry(options.tileSize, options.tileSize))

    this.variant = variant
    this.textureLoader = textureLoader

    this.options = options
    this.tilePosition = tilePosition

    this.renderOrder = this.tilePosition.level
    this.material = new THREE.MeshBasicMaterial({
      opacity: 0,
      transparent: true
    })

    this.loadTextureMap()
  }

  protected loadTextureMap() {
    if (this.textureAbortController != null) {
      this.textureAbortController.abort()
    }

    const job = this.textureLoader.load(
      this.options.baseUrl,
      this.variant,
      this.tilePosition
    )

    this.textureAbortController = job.abortController
    job.task.result
      .then(texture => {
        if (this.material instanceof THREE.MeshBasicMaterial) {
          this.material.map = texture
          this.material.opacity = 1
          this.material.needsUpdate = true
        }
      })
      .catch(err => {
        if (!(err instanceof TileAbortError)) {
          throw err
        }
      })
  }

  protected divideSelf() {
    let childPlane: THREE.Mesh

    if (this.children.length > 0) return
    for (const [dx, dy, px, py] of TileMesh.childTranslate) {
      childPlane = new TileMesh(
        this.textureLoader,
        this.variant,
        this.options,
        {
          level: this.tilePosition.level + 1,
          x: this.tilePosition.x * 2 + dx,
          y: this.tilePosition.y * 2 + dy
        }
      )

      if (this.geometry instanceof THREE.PlaneGeometry) {
        childPlane.scale.set(0.5, 0.5, 1)
        childPlane.position.set(
          px * this.geometry.parameters.width,
          py * this.geometry.parameters.width,
          this.options.zOffset ?? 0
        )
      }

      this.add(childPlane)
      childPlane.updateMatrix()
      childPlane.updateMatrixWorld(true)
      childPlane.geometry.computeBoundingBox()
    }
  }

  protected mergeChildren() {
    if (this.children.length <= 0) return
    // remove from the back, as the array is sliced directly from memory
    for (let i = this.children.length - 1; i >= 0; i--) {
      this.remove(this.children[i])
    }
  }

  protected mergeSelf() {
    if (this.parent instanceof TileMesh) {
      this.parent.mergeChildren()
    }
  }

  updateVariant(variant: string) {
    if (this.variant === variant) return
    if (this.tilePosition.level > 0) {
      if (this.material instanceof THREE.MeshBasicMaterial) {
        this.material.opacity = 0
        this.material.needsUpdate = true
      }
    }

    this.variant = variant
    this.loadTextureMap()

    for (const item of this.children) {
      if (item instanceof TileMesh) {
        item.updateVariant(variant)
      }
    }
  }

  requestLevel(targetLevel: number) {
    if (this.tilePosition.level < targetLevel) {
      this.divideSelf()
    } else if (this.tilePosition.level > targetLevel) {
      this.mergeSelf()
    }
  }

  preload(altVariant?: string) {
    const job = this.textureLoader.load(
      this.options.baseUrl,
      altVariant ?? this.variant,
      this.tilePosition
    )

    job.task.execute()
    return job.task.result
  }
}

export class PerspectiveTileMesh extends TileMesh {
  plane: PerspectiveOrientationType

  constructor(
    textureLoader: TileLoader,
    tileSize: number,
    baseUrl: string,
    plane: PerspectiveOrientationType
  ) {
    super(
      textureLoader,
      plane,
      // add z translation to combat z-fighting
      { tileSize, baseUrl, zOffset: 0.01 },
      { x: 0, y: 0, level: 0 }
    )
    this.plane = plane
  }
}

export class OrthographicTileMesh extends TileMesh {
  constructor(
    textureLoader: TileLoader,
    tileSize: number,
    protected baseUrl: string,
    angle: string,
    x = 0,
    y = 0
  ) {
    super(textureLoader, angle, { tileSize, baseUrl }, { x, y, level: 0 })
  }

  updateAngle(angle: string) {
    this.updateVariant(angle)
  }
}
