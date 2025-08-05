import * as THREE from '../three'
import { ExteriorControls } from './ExteriorControls'
import {
  ObjectFit,
  RenderCallbacks,
  RenderMethod,
  RenderOptions,
  TransitionViewport
} from '../render/RenderMethod'
import { ExteriorTilePanorama } from '../types'
import { clamp } from 'three/src/math/MathUtils'
import { TileLoader } from '../tile/TileLoader'
import { ExteriorMapPlane } from './ExteriorMapPlane'
import { RenderFrustum } from '../render/RenderFrustum'
import { getMinZoom, getMinZoomInterpolate } from './ExteriorUtils'

const PX_PER_ANGLE = 20
const STARTING_ANGLE = 230

interface Viewport {
  width: number
  height: number
  fit: ObjectFit
}

interface Transition {
  source: Viewport
  target: Viewport
  preserveZoom: boolean
}

export class ExteriorMethod extends RenderMethod {
  protected scene: THREE.Scene
  protected camera: THREE.OrthographicCamera
  protected planeMap: ExteriorMapPlane

  protected frustum: RenderFrustum
  protected controls: ExteriorControls

  protected data: ExteriorTilePanorama

  // handle turntable rotation
  protected deltaX = 0
  protected maxDelta = 0

  // handle scaling to fit screen
  protected minZoom = 0

  // object fit
  protected objectFit: ObjectFit

  // transition of object fit
  protected transitionProgress = 0
  protected transitionObjectFit: Transition | null = null

  constructor(
    tileLoader: TileLoader,
    renderer: THREE.Renderer,
    callbacks: RenderCallbacks,
    options: RenderOptions,
    data: ExteriorTilePanorama,
    baseUrl: string
  ) {
    super(tileLoader, renderer, callbacks, options)

    this.data = data
    this.scene = new THREE.Scene()
    this.scene.background = null

    const { clientWidth, clientHeight } = renderer.domElement
    this.camera = new THREE.OrthographicCamera(
      clientWidth / -2,
      clientWidth / 2,
      clientHeight / 2,
      clientHeight / -2,
      1,
      1000
    )

    this.deltaX =
      Math.floor((STARTING_ANGLE / 360) * this.data.photos.length) *
      PX_PER_ANGLE

    this.maxDelta = PX_PER_ANGLE * this.data.photos.length

    const minWidth = this.data.width / Math.pow(2, this.data.maxZoom)
    const minHeight = this.data.height / Math.pow(2, this.data.maxZoom)
    const tileSize = this.data.tileSize

    this.objectFit = options.objectFit

    this.minZoom = getMinZoom(minWidth, minHeight, {
      width: clientWidth,
      height: clientHeight,
      fit: this.objectFit
    })
    this.camera.zoom = this.minZoom
    this.camera.up.set(0, 0, 0)

    // TODO: consider moving this logic to MapControls
    // [-tileSize / 2, tileSize / 2] ... translation to the top-left edge of tile
    // [minWidth / 2, -minHeight / 2] ... translation to the center of the whole image
    this.camera.position.set(
      -tileSize / 2 + minWidth / 2,
      tileSize / 2 - minHeight / 2,
      1
    )
    this.camera.updateProjectionMatrix()

    this.planeMap = new ExteriorMapPlane(
      tileLoader,
      tileSize,
      Math.floor(this.deltaX / PX_PER_ANGLE),
      this.data,
      baseUrl
    )
    this.scene.add(this.planeMap)

    this.controls = new ExteriorControls(
      this.camera,
      this.renderer.domElement,
      this.minZoom,
      Math.pow(2, this.data.maxZoom),
      minWidth,
      minHeight,
      delta => {
        this.callbacks.onActive()

        this.deltaX -= delta
        if (this.deltaX < 0) {
          this.deltaX += this.maxDelta
        }

        this.deltaX = this.deltaX % this.maxDelta
      },
      this.callbacks.onZoomChange
    )
    this.controls.update(0)
    this.frustum = new RenderFrustum(this.scene, this.camera)

    const container = document.querySelector<HTMLElement>('.hotspots')
    if (container) {
      container.style.opacity = '0'
    }
  }

  destroy() {
    this.controls.dispose()
  }

  zoomIn() {
    this.controls.clickZoomIn()
  }

  zoomOut() {
    this.controls.clickZoomOut()
  }

  zoomReset() {
    this.controls.zoomReset()
  }

  override setObjectFit(fit: ObjectFit) {
    // only available if no transition is happening
    if (this.transitionObjectFit == null) {
      this.objectFit = fit
    }
  }

  override startTransition(
    source: TransitionViewport,
    target: TransitionViewport,
    preserveZoom: boolean
  ) {
    this.transitionObjectFit = { source, target, preserveZoom }
  }

  override endTransition() {
    const targetFit =
      this.transitionProgress >= 1
        ? this.transitionObjectFit?.target.fit
        : this.transitionObjectFit?.source.fit

    if (targetFit != null) {
      this.objectFit = targetFit
    }

    this.transitionObjectFit = null
  }

  override setTransitionProgress(ratio: number) {
    this.transitionProgress = THREE.MathUtils.clamp(ratio, 0, 1)
  }

  onResize(width: number, height: number) {
    this.camera.left = width / -2
    this.camera.right = width / 2
    this.camera.top = height / 2
    this.camera.bottom = height / -2
    this.camera.updateProjectionMatrix()

    const minWidth = this.data.width / Math.pow(2, this.data.maxZoom)
    const minHeight = this.data.height / Math.pow(2, this.data.maxZoom)

    if (this.transitionObjectFit != null) {
      this.minZoom = getMinZoomInterpolate(
        minWidth,
        minHeight,
        this.transitionProgress,
        [this.transitionObjectFit.source, this.transitionObjectFit.target]
      )
    } else {
      this.minZoom = getMinZoom(minWidth, minHeight, {
        width,
        height,
        fit: this.objectFit
      })
    }

    this.camera.zoom = Math.max(this.minZoom, this.camera.zoom)
    this.camera.updateProjectionMatrix()

    this.controls.updateMinZoom(this.minZoom)

    if (
      this.transitionObjectFit == null ||
      this.transitionObjectFit.preserveZoom !== true
    ) {
      this.controls.zoomReset()
    }
    this.renderer.setSize(width, height)
  }

  preload() {
    return this.planeMap.preload()
  }

  render(delta: number) {
    const targetLevel = clamp(
      Math.ceil(Math.log2(this.camera.zoom)),
      0,
      this.data.maxZoom
    )

    this.controls.update(delta)
    this.frustum.update(targetLevel)
    this.renderer.render(this.scene, this.camera)
    this.planeMap.updateAngle(Math.floor(this.deltaX / PX_PER_ANGLE))
  }

  setWheelZoomEnabled(state: boolean) {
    this.controls.setWheelEnabled(state)
  }
}
