import { isApproxZero } from '../math'
import {
  EventDispatcher,
  PerspectiveCamera,
  Quaternion,
  Spherical,
  Vector2,
  Vector3,
  MathUtils
} from '../three'
import { MathUtils as ThreeMathUtils } from '../three'
const { degToRad } = ThreeMathUtils

// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
//
//    Orbit - left mouse / touch: one-finger move
//    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
//    Pan - right mouse, or left mouse + ctrl/meta/shiftKey, or arrow keys / touch: two-finger move

const _changeEvent = { type: 'change' } as any
const _startEvent = { type: 'start' } as any
const _endEvent = { type: 'end' } as any

const EPS = 0.000001
const STATE = {
  NONE: -1,
  ROTATE: 0,
  TOUCH_ROTATE: 3,
  TOUCH_DOLLY_PAN: 5
}

export class InteriorControls extends EventDispatcher {
  // Set to false to disable this control
  enabled = true

  // "target" sets the location of focus, where the object orbits around
  target = new Vector3()

  // handle zoom inside the cubemap
  minFov = 0
  maxFov = 100

  // How far you can dolly in and out ( PerspectiveCamera only )
  protected minDistance = 0
  protected maxDistance = Infinity

  protected fov: number
  protected fovEnd: number

  // How far you can orbit vertically, upper and lower limits. Current values are set to account for black spots at bottom/top of interior images.
  // Range is 0 to Math.PI radians.
  protected minPolarAngle = degToRad(75) // radians
  protected maxPolarAngle = degToRad(102) // radians

  // How far you can orbit horizontally, upper and lower limits.
  // If set, the interval [ min, max ] must be a sub-interval of [ - 2 PI, 2 PI ], with ( max - min < 2 PI )
  protected minAzimuthAngle = -Infinity // radians
  protected maxAzimuthAngle = Infinity // radians

  // Set to true to enable damping (inertia)
  // If damping is enabled, you must call controls.update() in your animation loop
  protected enableDamping = false
  protected dampingFactor = 0.05
  protected dampingZoomFactor = 0.25

  // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
  // Set to false to disable zooming
  protected enableZoom = true
  protected enableWheelZoom = false
  protected zoomSpeed = 1.0

  // Set to false to disable rotating
  protected enableRotate = true
  protected rotateSpeed = 0.35

  // Set to true to automatically rotate around the target
  // If auto-rotate is enabled, you must call controls.update() in your animation loop
  protected autoRotate = false
  protected autoRotateSpeed = 2.0 // 30 seconds per orbit when fps is 60

  protected camera: PerspectiveCamera
  protected domElement: HTMLElement

  protected target0: Vector3
  protected position0: Vector3

  protected state = STATE.NONE

  // current position in spherical coordinates
  protected spherical = new Spherical()
  protected sphericalDelta = new Spherical()

  protected panOffset = new Vector3()
  protected zoomChanged = false

  protected rotateStart = new Vector2()
  protected rotateEnd = new Vector2()
  protected rotateDelta = new Vector2()

  protected panStart = new Vector2()
  protected panEnd = new Vector2()
  protected panDelta = new Vector2()

  protected dollyStart = new Vector2()
  protected dollyEnd = new Vector2()
  protected dollyDelta = new Vector2()

  protected pointers: PointerEvent[] = []
  protected pointerPositions: Record<number, Vector2> = {}

  protected onZoomChange: (data: { ratio: number; value: number }) => void

  update: (delta: number) => void

  dispose = () => {
    this.domElement.removeEventListener('contextmenu', this.onContextMenu)

    this.domElement.removeEventListener('pointerdown', this.onPointerDown)
    this.domElement.removeEventListener('pointercancel', this.onPointerCancel)
    this.domElement.removeEventListener('wheel', this.onMouseWheel)

    this.domElement.removeEventListener('pointermove', this.onPointerMove)
    this.domElement.removeEventListener('pointerup', this.onPointerUp)
  }

  protected getPolarAngle = () => {
    return this.spherical.phi
  }

  protected getAzimuthalAngle = () => {
    return this.spherical.theta
  }

  protected getDistance = () => {
    return this.camera.position.distanceTo(this.target)
  }

  protected saveState = () => {
    this.target0.copy(this.target)
    this.position0.copy(this.camera.position)
  }

  protected reset = () => {
    this.target.copy(this.target0)
    this.camera.position.copy(this.position0)

    this.camera.updateProjectionMatrix();
    (this as any).dispatchEvent(_changeEvent);

    this.update(0)

    this.state = STATE.NONE
  }

  constructor(
    object: PerspectiveCamera,
    domElement: HTMLElement,
    onZoomChange: (data: { ratio: number; value: number }) => void
  ) {
    super()

    this.camera = object
    this.domElement = domElement
    this.domElement.style.touchAction = 'none' // disable touch scroll

    this.onZoomChange = onZoomChange

    // for reset
    this.target0 = this.target.clone()
    this.position0 = this.camera.position.clone()

    this.fov = this.camera.fov
    this.fovEnd = this.fov

    this.update = (() => {
      const offset = new Vector3()

      // so camera.up is the orbit axis
      const quat = new Quaternion().setFromUnitVectors(
        this.camera.up,
        new Vector3(0, 1, 0)
      )
      const quatInverse = quat.clone().invert()

      const lastPosition = new Vector3()
      const lastQuaternion = new Quaternion()

      const twoPI = 2 * Math.PI

      return (delta: number) => {
        const lerpRatio = Math.min(this.dampingZoomFactor * delta * 75, 1)

        const fovDelta = (this.fovEnd - this.fov) * lerpRatio
        this.fov += fovDelta
        this.fov = MathUtils.clamp(this.fov, this.minFov, this.maxFov)

        if (this.camera.fov !== this.fov) {
          if (isApproxZero(fovDelta)) this.fov = this.fovEnd
          this.camera.fov = this.fov
          this.camera.updateProjectionMatrix()

          this.onZoomChange({
            value: this.fov,
            ratio: 1 - (this.fov - this.minFov) / (this.maxFov - this.minFov)
          })
        }

        const position = this.camera.position

        offset.copy(position).sub(this.target)

        // rotate offset to "y-axis-is-up" space
        offset.applyQuaternion(quat)

        // angle from z-axis around y-axis
        this.spherical.setFromVector3(offset)

        if (this.autoRotate && this.state === STATE.NONE) {
          this.rotateLeft(this.getAutoRotationAngle())
        }

        if (this.enableDamping) {
          this.spherical.theta += this.sphericalDelta.theta * this.dampingFactor
          this.spherical.phi += this.sphericalDelta.phi * this.dampingFactor
        } else {
          this.spherical.theta += this.sphericalDelta.theta
          this.spherical.phi += this.sphericalDelta.phi
        }

        // restrict theta to be between desired limits
        let min = this.minAzimuthAngle
        let max = this.maxAzimuthAngle

        if (isFinite(min) && isFinite(max)) {
          if (min < -Math.PI) min += twoPI
          else if (min > Math.PI) min -= twoPI

          if (max < -Math.PI) max += twoPI
          else if (max > Math.PI) max -= twoPI

          if (min <= max) {
            this.spherical.theta = Math.max(
              min,
              Math.min(max, this.spherical.theta)
            )
          } else {
            this.spherical.theta =
              this.spherical.theta > (min + max) / 2
                ? Math.max(min, this.spherical.theta)
                : Math.min(max, this.spherical.theta)
          }
        }

        // restrict phi to be between desired limits
        // adjust min/max vertical angle according to camera FOV changes
        const cameraFovOffsetAngle = degToRad(this.maxFov - this.camera.fov)
        this.spherical.phi = MathUtils.clamp(
          this.spherical.phi,
          this.minPolarAngle - cameraFovOffsetAngle / 2,
          this.maxPolarAngle + cameraFovOffsetAngle / 2
        )

        this.spherical.makeSafe()

        // restrict radius to be between desired limits
        this.spherical.radius = Math.max(
          this.minDistance,
          Math.min(this.maxDistance, this.spherical.radius)
        )

        // move target to panned location
        if (this.enableDamping === true) {
          this.target.addScaledVector(this.panOffset, this.dampingFactor)
        } else {
          this.target.add(this.panOffset)
        }

        offset.setFromSpherical(this.spherical)

        // rotate offset back to "camera-up-vector-is-up" space
        offset.applyQuaternion(quatInverse)

        position.copy(this.target).add(offset)

        this.camera.lookAt(this.target)

        if (this.enableDamping === true) {
          this.sphericalDelta.theta *= 1 - this.dampingFactor
          this.sphericalDelta.phi *= 1 - this.dampingFactor

          this.panOffset.multiplyScalar(1 - this.dampingFactor)
        } else {
          this.sphericalDelta.set(0, 0, 0)
          this.panOffset.set(0, 0, 0)
        }

        // scale = 1

        // update condition is:
        // min(camera displacement, camera rotation in radians)^2 > EPS
        // using small-angle approximation cos(x/2) = 1 - x^2 / 8

        if (
          this.zoomChanged ||
          lastPosition.distanceToSquared(this.camera.position) > EPS ||
          8 * (1 - lastQuaternion.dot(this.camera.quaternion)) > EPS
        ) {
          (this as any).dispatchEvent(_changeEvent)

          lastPosition.copy(this.camera.position)
          lastQuaternion.copy(this.camera.quaternion)
          this.zoomChanged = false

          return true
        }

        return false
      }
    })()

    this.domElement.addEventListener('contextmenu', this.onContextMenu)
    this.domElement.addEventListener('pointerdown', this.onPointerDown)
    this.domElement.addEventListener('pointercancel', this.onPointerCancel)
    this.domElement.addEventListener('wheel', this.onMouseWheel, {
      passive: false
    })

    // force an update at start
    this.update(0)
  }

  protected getAutoRotationAngle = () => {
    return ((2 * Math.PI) / 60 / 60) * this.autoRotateSpeed
  }

  protected getZoomScale = () => {
    return Math.pow(0.95, this.zoomSpeed)
  }

  protected rotateLeft = (angle: number) => {
    this.sphericalDelta.theta += angle
  }

  protected rotateUp = (angle: number) => {
    this.sphericalDelta.phi += angle
  }

  protected zoomDelta = (delta: number, immediate: boolean) => {
    this.fovEnd = MathUtils.clamp(
      this.camera.fov + delta,
      this.minFov,
      this.maxFov
    )

    if (immediate) {
      this.fov = this.fovEnd
    }
  }

  zoomOut = () => {
    this.fovEnd = MathUtils.clamp(
      this.camera.fov * 1.5,
      this.minFov,
      this.maxFov
    )
  }

  zoomIn = () => {
    this.fovEnd = MathUtils.clamp(
      this.camera.fov / 1.5,
      this.minFov,
      this.maxFov
    )
  }

  zoomReset = () => {
    // 75 is the default value of zoom reset
    this.fovEnd = MathUtils.clamp(75, this.maxFov, this.maxFov)
  }

  //
  // event callbacks - update the object state
  //
  protected handleMouseDownRotate = (event: PointerEvent) => {
    this.rotateStart.set(event.clientX, event.clientY)
  }

  protected handleMouseMoveRotate = (event: PointerEvent) => {
    this.rotateEnd.set(event.clientX, event.clientY)

    this.rotateDelta
      .subVectors(this.rotateEnd, this.rotateStart)
      .multiplyScalar((this.fov / this.maxFov) * this.rotateSpeed) // adjust rotation speed by current zoom

    const element = this.domElement

    this.rotateLeft((2 * Math.PI * this.rotateDelta.x) / element.clientHeight) // yes, height
    this.rotateUp((2 * Math.PI * this.rotateDelta.y) / element.clientHeight)
    this.rotateStart.copy(this.rotateEnd)

    this.update(0)
  }

  protected handleMouseUp = (event: PointerEvent) => {
    // no-op
  }

  protected handleMouseWheel = (event: WheelEvent) => {
    this.zoomDelta(Math.atan(event.deltaY), true)
    this.update(0)
  }

  protected handleTouchStartRotate = () => {
    if (this.pointers.length === 1) {
      this.rotateStart.set(this.pointers[0].pageX, this.pointers[0].pageY)
    } else {
      const x = 0.5 * (this.pointers[0].pageX + this.pointers[1].pageX)
      const y = 0.5 * (this.pointers[0].pageY + this.pointers[1].pageY)

      this.rotateStart.set(x, y)
    }
  }

  protected handleTouchStartDolly = () => {
    const dx = this.pointers[0].pageX - this.pointers[1].pageX
    const dy = this.pointers[0].pageY - this.pointers[1].pageY

    const distance = Math.sqrt(dx * dx + dy * dy)

    this.dollyStart.set(0, distance)
  }

  protected handleTouchStartDollyPan = () => {
    if (this.enableZoom) this.handleTouchStartDolly()
  }

  protected handleTouchMoveRotate = (event: PointerEvent) => {
    if (this.pointers.length === 1) {
      this.rotateEnd.set(event.pageX, event.pageY)
    } else {
      const position = this.getSecondPointerPosition(event)

      const x = 0.5 * (event.pageX + position.x)
      const y = 0.5 * (event.pageY + position.y)

      this.rotateEnd.set(x, y)
    }

    this.rotateDelta
      .subVectors(this.rotateEnd, this.rotateStart)
      .multiplyScalar((this.fov / this.maxFov) * this.rotateSpeed) // adjust rotation speed by current zoom

    const element = this.domElement

    this.rotateLeft((2 * Math.PI * this.rotateDelta.x) / element.clientHeight) // yes, height

    this.rotateUp((2 * Math.PI * this.rotateDelta.y) / element.clientHeight)

    this.rotateStart.copy(this.rotateEnd)
  }

  protected handleTouchMoveDolly = (event: PointerEvent) => {
    const position = this.getSecondPointerPosition(event)

    const dx = event.pageX - position.x
    const dy = event.pageY - position.y

    const distance = Math.sqrt(dx * dx + dy * dy)

    this.dollyEnd.set(0, distance)
    if (this.dollyStart.y > 0) {
      const scale = Math.atan(
        100 * Math.pow(1 - this.dollyEnd.y / this.dollyStart.y, this.zoomSpeed)
      )
      this.zoomDelta(scale, true)
    }
    this.dollyStart.copy(this.dollyEnd)
  }

  protected handleTouchMoveDollyPan = (event: PointerEvent) => {
    if (this.enableZoom) this.handleTouchMoveDolly(event)
  }

  protected handleTouchEnd = (event: PointerEvent) => {
    // no-op
  }

  //
  // event handlers - FSM: listen for events and reset state
  //
  protected onPointerDown = (event: PointerEvent) => {
    if (this.enabled === false) return

    if (this.pointers.length === 0) {
      this.domElement.setPointerCapture(event.pointerId)

      this.domElement.addEventListener('pointermove', this.onPointerMove)
      this.domElement.addEventListener('pointerup', this.onPointerUp)
    }

    this.addPointer(event)

    if (event.pointerType === 'touch') {
      this.onTouchStart(event)
    } else {
      this.onMouseDown(event)
    }
  }

  protected onPointerMove = (event: PointerEvent) => {
    if (this.enabled === false) return

    if (event.pointerType === 'touch') {
      this.onTouchMove(event)
    } else {
      this.onMouseMove(event)
    }
  }

  protected onPointerUp = (event: PointerEvent) => {
    if (this.enabled === false) return

    if (event.pointerType === 'touch') {
      this.onTouchEnd(event)
    } else {
      this.onMouseUp(event)
    }

    this.removePointer(event)

    if (this.pointers.length === 0) {
      this.domElement.releasePointerCapture(event.pointerId)
      this.domElement.removeEventListener('pointermove', this.onPointerMove)
      this.domElement.removeEventListener('pointerup', this.onPointerUp)
    }
  }

  protected onPointerCancel = (event: PointerEvent) => {
    this.removePointer(event)
  }

  protected onMouseDown = (event: PointerEvent) => {
    if (this.enableRotate === false) return
    this.handleMouseDownRotate(event)
    this.state = STATE.ROTATE;
    (this as any).dispatchEvent(_startEvent);
  }

  protected onMouseMove = (event: PointerEvent) => {
    if (this.enabled === false) return

    switch (this.state) {
      case STATE.ROTATE:
        if (this.enableRotate === false) return
        this.handleMouseMoveRotate(event)
        break

      default:
        break
    }
  }

  protected onMouseUp = (event: PointerEvent) => {
    this.handleMouseUp(event);
    (this as any).dispatchEvent(_endEvent);
    this.state = STATE.NONE
  }

  protected onMouseWheel = (event: WheelEvent) => {
    if (
      this.enabled === false ||
      this.enableZoom === false ||
      this.enableWheelZoom === false ||
      (this.state !== STATE.NONE && this.state !== STATE.ROTATE)
    ) {
      return
    }

    event.preventDefault();

    (this as any).dispatchEvent(_startEvent);
    this.handleMouseWheel(event);
    (this as any).dispatchEvent(_endEvent);
  }

  protected onTouchStart = (event: PointerEvent) => {
    this.trackPointer(event)

    switch (this.pointers.length) {
      case 1:
        if (this.enableRotate === false) return
        this.handleTouchStartRotate()
        this.state = STATE.TOUCH_ROTATE

        break

      case 2:
        if (this.enableZoom === false) return
        this.handleTouchStartDollyPan()
        this.state = STATE.TOUCH_DOLLY_PAN

        break

      default:
        this.state = STATE.NONE
    }

    if (this.state !== STATE.NONE) {
      (this as any).dispatchEvent(_startEvent)
    }
  }

  protected onTouchMove = (event: PointerEvent) => {
    this.trackPointer(event)

    switch (this.state) {
      case STATE.TOUCH_ROTATE:
        if (this.enableRotate === false) return

        this.handleTouchMoveRotate(event)
        this.update(0)

        break

      case STATE.TOUCH_DOLLY_PAN:
        if (this.enableZoom === false) return

        this.handleTouchMoveDollyPan(event)
        this.update(0)

        break

      default:
        this.state = STATE.NONE
    }
  }

  protected onTouchEnd = (event: PointerEvent) => {
    this.handleTouchEnd(event);
    (this as any).dispatchEvent(_endEvent);
    this.state = STATE.NONE
  }

  protected onContextMenu = (event: MouseEvent) => {
    if (this.enabled === false) return
    event.preventDefault()
  }

  protected addPointer = (event: PointerEvent) => {
    this.pointers.push(event)
  }

  protected removePointer = (event: PointerEvent) => {
    delete this.pointerPositions[event.pointerId]

    for (let i = 0; i < this.pointers.length; i++) {
      if (this.pointers[i].pointerId === event.pointerId) {
        this.pointers.splice(i, 1)
        return
      }
    }
  }

  protected trackPointer = (event: PointerEvent) => {
    let position = this.pointerPositions[event.pointerId]

    if (position === undefined) {
      position = new Vector2()
      this.pointerPositions[event.pointerId] = position
    }

    position.set(event.pageX, event.pageY)
  }

  protected getSecondPointerPosition = (event: PointerEvent) => {
    const pointer =
      event.pointerId === this.pointers[0].pointerId
        ? this.pointers[1]
        : this.pointers[0]

    return this.pointerPositions[pointer.pointerId]
  }

  setWheelEnabled = (state: boolean) => {
    this.enableWheelZoom = state
  }
}
