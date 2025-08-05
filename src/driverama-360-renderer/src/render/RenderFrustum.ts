import * as THREE from '../three'
import { TileMesh } from '../tile/TileMesh'

export class RenderFrustum {
  protected scene: THREE.Scene
  protected camera: THREE.Camera

  protected matrix4: THREE.Matrix4
  protected frustum: THREE.Frustum

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene
    this.camera = camera

    this.matrix4 = new THREE.Matrix4()
    this.frustum = new THREE.Frustum()
  }

  update(targetLevel: number) {
    this.frustum.setFromProjectionMatrix(
      this.matrix4.multiplyMatrices(
        this.camera.projectionMatrix,
        this.camera.matrixWorldInverse
      )
    )

    const visibleNodes = new Set<TileMesh>()
    this.scene.traverse(node => {
      if (node instanceof TileMesh) {
        const worldBox3 = new THREE.Box3()
        worldBox3.setFromObject(node)
        if (this.frustum.intersectsBox(worldBox3)) {
          visibleNodes.add(node)
        }
      }
    })

    for (const node of visibleNodes) {
      node.requestLevel(targetLevel)
    }
  }

  containsPoint(vec: THREE.Vector3) {
    return this.frustum.containsPoint(vec)
  }
}
