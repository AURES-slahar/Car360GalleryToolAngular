import * as THREE from '../three'

import { InteriorControls } from './InteriorControls'
import { InteriorMapCube } from './InteriorMapCube'
import {
  RenderCallbacks,
  RenderMethod,
  RenderOptions
} from '../render/RenderMethod'
import { InteriorTilePanorama } from '../types'
import { TileLoader } from '../tile/TileLoader'
import { RenderFrustum } from '../render/RenderFrustum'

const WORLD_TILE_SIZE = 256

export class InteriorMethod extends RenderMethod {
  protected scene: THREE.Scene
  protected camera: THREE.PerspectiveCamera

  protected cubeMap: InteriorMapCube

  protected frustum: RenderFrustum
  protected controls: InteriorControls

  protected data: InteriorTilePanorama
  protected points: {
    worldCoords: THREE.Vector3
    screenCoords: THREE.Vector3
    element: HTMLElement
  }[] = []

  protected computeCamera: THREE.PerspectiveCamera
  protected computeTopLeft: THREE.Vector3
  protected computeBottomRight: THREE.Vector3

  protected rendererSize: { width: number; height: number }

  constructor(
    tileLoader: TileLoader,
    renderer: THREE.Renderer,
    callbacks: RenderCallbacks,
    options: RenderOptions,
    data: InteriorTilePanorama,
    baseUrl: string
  ) {
    super(tileLoader, renderer, callbacks, options)
    this.rendererSize = {
      width: this.renderer.domElement.clientWidth,
      height: this.renderer.domElement.clientHeight
    }
    this.data = data

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.rendererSize.width / this.rendererSize.height,
      1,
      WORLD_TILE_SIZE
    )

    this.computeTopLeft = new THREE.Vector3()
    this.computeBottomRight = new THREE.Vector3()

    this.computeCamera = new THREE.PerspectiveCamera()
    this.computeCamera.copy(this.camera)

    this.camera.position.setFromSphericalCoords(
      1,
      THREE.MathUtils.degToRad(75),
      THREE.MathUtils.degToRad(145)
    )

    this.cubeMap = new InteriorMapCube(
      tileLoader,
      WORLD_TILE_SIZE,
      this.data,
      baseUrl
    )
    this.scene.add(this.cubeMap)

    this.controls = new InteriorControls(
      this.camera,
      this.renderer.domElement,
      this.callbacks.onZoomChange
    )

    this.updateMinZoom()
    this.frustum = new RenderFrustum(this.scene, this.camera)

    const container = document.querySelector<HTMLElement>('.hotspots')
    if (container) {
      container.style.opacity = '1'
      for (const child of container.children) {
        if (child instanceof HTMLElement) {
          const coords = [child.dataset['x'], child.dataset['y'], child.dataset['z']]
            .filter((x): x is string => x != null)
            .map(i => Number.parseFloat(i))

          if (coords.length < 3) continue

          this.points.push({
            element: child,
            screenCoords: new THREE.Vector3(),
            worldCoords: new THREE.Vector3(...coords)
          })
        }
      }
    }
  }

  destroy() {
    this.controls.dispose()
  }

  preload() {
    return this.cubeMap.preload()
  }

  render(delta: number) {
    const targetLevel = this.getLevelFov(this.camera.fov)

    this.frustum.update(Math.min(targetLevel, this.data.maxZoom))
    this.controls.update(delta)
    this.renderer.render(this.scene, this.camera)

    for (const child of this.points) {
      child.screenCoords.copy(child.worldCoords)
      child.screenCoords.project(this.camera)

      const x =
        (child.screenCoords.x * 0.5 + 0.5) *
        this.renderer.domElement.clientWidth
      const y =
        (child.screenCoords.y * -0.5 + 0.5) *
        this.renderer.domElement.clientHeight

      const visible = this.frustum.containsPoint(child.worldCoords)
      child.element.style.opacity = visible ? '1' : '0'
      child.element.style.transform = `translate(${x}px, ${y}px)`
    }
  }

  getLevelFov(fov: number) {
    this.computeCamera.fov = fov
    this.computeCamera.updateProjectionMatrix()

    this.computeTopLeft.set(-1, 1, -1).multiplyScalar(WORLD_TILE_SIZE / 2)
    this.computeBottomRight.set(1, -1, -1).multiplyScalar(WORLD_TILE_SIZE / 2)

    // ignore world matrix of camera
    this.computeTopLeft.applyMatrix4(this.computeCamera.projectionMatrix)
    this.computeBottomRight.applyMatrix4(this.computeCamera.projectionMatrix)

    const topLeftY =
      ((1 - this.computeTopLeft.y) / 2) * this.rendererSize.height
    const bottomRightY =
      ((1 - this.computeBottomRight.y) / 2) * this.rendererSize.height

    const projectHeight = bottomRightY - topLeftY

    return Math.ceil(Math.log2(Math.max(1, projectHeight / this.data.tileSize)))
  }

  onResize(width: number, height: number) {
    this.rendererSize.width = width
    this.rendererSize.height = height
    this.camera.aspect = width / height
    this.updateMinZoom()

    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  updateMinZoom() {
    // TODO: use binary search instead for performance
    for (let fov = 75; fov >= 1; fov -= 0.25) {
      if (this.getLevelFov(fov) <= this.data.maxZoom) {
        this.controls.minFov = fov
        continue
      }

      break
    }

    this.controls.update(0)
  }

  zoomIn(): void {
    this.controls.zoomIn()
  }

  zoomOut(): void {
    this.controls.zoomOut()
  }

  zoomReset(): void {
    this.controls.zoomReset()
  }

  setWheelZoomEnabled(state: boolean) {
    this.controls.setWheelEnabled(state)
  }
}
