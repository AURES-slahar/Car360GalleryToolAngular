import { isApproxEquals, isApproxZero } from '../math'
import * as THREE from '../three'
import { OrthographicCamera, Vector2, Vector3, MathUtils } from '../three'

enum State {
  NONE = -1,
  PAN = 1,
  TOUCH_PAN = 2,
  TOUCH_DOLLY_PAN = 3
}

export class ExteriorControls {
  enabled = true

  minZoom = 1
  maxZoom = Infinity

  zoomSpeed = 1.0
  zoomTouchSpeed = 3.0
  panSpeed = 1.0

  protected camera: OrthographicCamera
  protected domElement: HTMLElement

  protected initialPosition = new Vector3()

  protected panOffset = new Vector3()
  protected zoomOffset = new Vector3()

  protected panStart = new Vector2()
  protected panEnd = new Vector2()
  protected panDelta = new Vector2()

  protected dollyStart = new Vector2()
  protected dollyEnd = new Vector2()

  protected pointers: PointerEvent[] = []
  protected pointerPositions: Record<number, Vector2> = {}

  protected state = State.NONE

  protected minWidth: number
  protected minHeight: number

  protected onAngleChange: (delta: number) => void
  protected onZoomChange: (data: { ratio: number; value: number }) => void

  protected zoom: number
  protected zoomEnd: number
  protected zoomCursor = new Vector2()

  protected dampingFactor = 0.25

  protected mouseWheelEnabled = false

  constructor(
    object: OrthographicCamera,
    domElement: HTMLElement,
    minZoom: number,
    maxZoom: number,
    minWidth: number,
    minHeight: number,
    onAngleChange: (delta: number) => void,
    onZoomChange: (data: { ratio: number; value: number }) => void
  ) {
    this.camera = object
    this.domElement = domElement

    this.minZoom = minZoom
    this.maxZoom = maxZoom

    this.minWidth = minWidth
    this.minHeight = minHeight
    this.onAngleChange = onAngleChange
    this.onZoomChange = onZoomChange

    this.zoom = this.camera.zoom
    this.zoomEnd = this.camera.zoom
    this.initialPosition.copy(this.camera.position)
    this.bind()
  }

  update = (() => {
    const sumOffset = new Vector3()
    const fromVec = new Vector3()
    const toVec = new Vector3()

    const zoomMouseDelta = new Vector2()
    const zoomPositionDelta = new Vector3()

    return (delta: number) => {
      const lerpRatio = Math.min(this.dampingFactor * delta * 75, 1)

      const zoomDelta = (this.zoomEnd - this.zoom) * lerpRatio
      this.zoom += zoomDelta

      if (isApproxEquals(this.zoom, this.minZoom, 1e-2)) {
        this.zoom = this.minZoom
      }

      if (this.camera.zoom !== this.zoom) {
        if (isApproxZero(zoomDelta)) this.zoom = this.zoomEnd
        const newZoom = this.zoom

        zoomMouseDelta.subVectors(
          this.zoomCursor.clone().divideScalar(this.camera.zoom),
          this.zoomCursor.clone().divideScalar(newZoom)
        )

        zoomPositionDelta.set(zoomMouseDelta.x, -zoomMouseDelta.y, 0)
        this.zoomOffset.add(zoomPositionDelta)

        this.camera.zoom = newZoom
        this.camera.updateProjectionMatrix()

        this.onZoomChange({
          value: this.zoom,
          ratio: (this.zoom - this.minZoom) / (this.maxZoom - this.minZoom)
        })
      }

      // fromVec and toVec specify the bounds of the canvas
      fromVec
        .set(-this.minWidth, -this.minHeight, 0)
        .multiplyScalar((this.camera.zoom - this.minZoom) / 2)
        .divideScalar(this.camera.zoom) // get world coordinates for camera

      toVec
        .set(this.minWidth, this.minHeight, 0)
        .multiplyScalar((this.camera.zoom - this.minZoom) / 2)
        .divideScalar(this.camera.zoom) // get world coordinates for camera

      // offset should be within bounds
      this.panOffset.clamp(fromVec, toVec)
      this.zoomOffset.clamp(fromVec, toVec)

      // the addition should be also within bounds
      sumOffset.addVectors(this.panOffset, this.zoomOffset)
      sumOffset.clamp(fromVec, toVec)

      // add to the center position
      this.camera.position.addVectors(this.initialPosition, sumOffset)
    }
  })()

  dispose = () => {
    this.domElement.removeEventListener('dblclick', this.onDoubleClick)
    this.domElement.removeEventListener('pointerdown', this.onPointerDown)
    this.domElement.removeEventListener('pointercancel', this.onPointerCancel)
    this.domElement.removeEventListener('wheel', this.onMouseWheel)

    this.domElement.removeEventListener('pointermove', this.onPointerMove)
    this.domElement.removeEventListener('pointerup', this.onPointerUp)

    for (const pointer of this.pointers) {
      this.domElement.releasePointerCapture(pointer.pointerId)
    }
  }

  clickZoomIn = () => this.zoomIn(1 / 1.5)
  clickZoomOut = () => this.zoomOut(1 / 1.5)

  updateMinZoom = (minZoom: number) => {
    this.minZoom = minZoom

    this.zoom = MathUtils.clamp(this.camera.zoom, this.minZoom, this.maxZoom)
  }

  zoomReset = () => {
    this.zoomEnd = this.minZoom
  }

  protected bind = () => {
    if (this.domElement) {
      this.domElement.style.touchAction = 'none' // disable touch scroll
    }

    this.domElement.addEventListener('dblclick', this.onDoubleClick)
    this.domElement.addEventListener('pointerdown', this.onPointerDown)
    this.domElement.addEventListener('pointercancel', this.onPointerCancel)
    this.domElement.addEventListener('wheel', this.onMouseWheel, {
      passive: false
    })
  }

  protected zoomTo = (zoom: number, cursor?: Vector2, instant?: boolean) => {
    if (cursor) {
      this.zoomCursor.copy(cursor)
    } else {
      this.zoomCursor.set(0, 0)
    }
    this.zoomEnd = MathUtils.clamp(zoom, this.minZoom, this.maxZoom)

    if (instant) {
      this.zoom = this.zoomEnd
    }
  }

  protected zoomOut(zoomScale: number, cursor?: Vector2, instant?: boolean) {
    this.zoomTo(this.zoom * zoomScale, cursor, instant)
  }

  protected zoomIn(zoomScale: number, cursor?: Vector2, instant?: boolean) {
    this.zoomTo(this.zoom / zoomScale, cursor, instant)
  }

  protected getZoomScale() {
    return Math.pow(0.95, this.zoomSpeed)
  }

  protected panLeft = (() => {
    const v = new Vector3()

    return (distance: number, objectMatrix: THREE.Matrix4) => {
      v.setFromMatrixColumn(objectMatrix, 0) // get X column of objectMatrix
      v.multiplyScalar(-distance)

      this.panOffset.add(v)
    }
  })()

  protected panUp = (() => {
    const v = new Vector3()

    return (distance: number, objectMatrix: THREE.Matrix4) => {
      v.setFromMatrixColumn(objectMatrix, 1)
      v.multiplyScalar(distance)

      this.panOffset.add(v)
    }
  })()

  // deltaX and deltaY are in pixels; right and down are positive
  protected pan = (deltaX: number, deltaY: number) => {
    if (
      this.camera.zoom <= this.minZoom ||
      isApproxEquals(this.camera.zoom, this.minZoom)
    ) {
      this.onAngleChange(deltaX)
      return
    }

    const element = this.domElement

    const cameraWidth = this.camera.right - this.camera.left
    const cameraHeight = this.camera.top - this.camera.bottom

    // orthographic
    this.panLeft(
      (deltaX * cameraWidth) / this.camera.zoom / element.clientWidth,
      this.camera.matrix
    )
    this.panUp(
      (deltaY * cameraHeight) / this.camera.zoom / element.clientHeight,
      this.camera.matrix
    )
  }

  //
  // event callbacks - update the object state
  //
  protected handleMouseDownPan = (event: PointerEvent) => {
    const { x, y } = this.getRelativeClient(event)
    this.panStart.set(x, y)
  }

  protected handleMouseMovePan = (event: PointerEvent) => {
    const { x, y } = this.getRelativeClient(event)

    this.panEnd.set(x, y)
    this.panDelta
      .subVectors(this.panEnd, this.panStart)
      .multiplyScalar(this.panSpeed)

    this.pan(this.panDelta.x, this.panDelta.y)

    this.panStart.copy(this.panEnd)
    this.update(0)
  }

  protected handleMouseUp = (/*event*/) => {
    // no-op
  }

  protected getRelativeClient = (event: {
    clientX: number
    clientY: number
  }) => {
    const boundingBox = this.domElement.getBoundingClientRect()

    return {
      x: event.clientX - boundingBox.x,
      y: event.clientY - boundingBox.y
    }
  }

  protected handleMouseWheel = (event: WheelEvent) => {
    const cursor = this.getRelativeClient(event)

    const cameraWidth = this.camera.right - this.camera.left
    const cameraHeight = this.camera.top - this.camera.bottom

    const relativeCursor = new Vector2(
      cursor.x - cameraWidth / 2,
      cursor.y - cameraHeight / 2
    )

    if (event.deltaY < 0) {
      this.zoomIn(this.getZoomScale(), relativeCursor, true)
    } else if (event.deltaY > 0) {
      this.zoomOut(this.getZoomScale(), relativeCursor, true)
    }

    // force update of values immediately
    this.update(0)
  }

  protected handleTouchStartPan = () => {
    if (this.pointers.length === 1) {
      this.panStart.set(this.pointers[0].pageX, this.pointers[0].pageY)
    } else {
      const x = 0.5 * (this.pointers[0].pageX + this.pointers[1].pageX)
      const y = 0.5 * (this.pointers[0].pageY + this.pointers[1].pageY)

      this.panStart.set(x, y)
    }
  }

  protected handleTouchStartDolly = () => {
    const dx = this.pointers[0].pageX - this.pointers[1].pageX
    const dy = this.pointers[0].pageY - this.pointers[1].pageY

    const distance = Math.sqrt(dx * dx + dy * dy)

    this.dollyStart.set(this.zoom, distance)
  }

  protected handleTouchStartDollyPan = () => {
    this.handleTouchStartDolly()
    this.handleTouchStartPan()
  }

  protected handleTouchMovePan = (event: PointerEvent) => {
    if (this.pointers.length === 1) {
      this.panEnd.set(event.pageX, event.pageY)
    } else {
      const position = this.getSecondPointerPosition(event)

      const x = 0.5 * (event.pageX + position.x)
      const y = 0.5 * (event.pageY + position.y)

      this.panEnd.set(x, y)
    }

    this.panDelta
      .subVectors(this.panEnd, this.panStart)
      .multiplyScalar(this.panSpeed)
    this.pan(this.panDelta.x, this.panDelta.y)

    this.panStart.copy(this.panEnd)
  }

  protected handleTouchMoveDolly = (event: PointerEvent) => {
    const position = this.getSecondPointerPosition(event)

    const dx = event.pageX - position.x
    const dy = event.pageY - position.y

    const distance = Math.sqrt(dx * dx + dy * dy)

    this.dollyEnd.set(0, distance)
    this.zoomTo((this.dollyEnd.y / this.dollyStart.y) * this.dollyStart.x)
  }

  protected handleTouchMoveDollyPan = (event: PointerEvent) => {
    this.handleTouchMoveDolly(event)
    this.handleTouchMovePan(event)
  }

  protected handleTouchEnd = (/*event*/) => {
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
      this.onTouchEnd()
    } else {
      this.onMouseUp()
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
    this.handleMouseDownPan(event)
    this.state = State.PAN
  }

  protected onMouseMove = (event: PointerEvent) => {
    if (this.enabled === false) return

    if (this.state === State.PAN) {
      this.handleMouseMovePan(event)
    }
  }

  protected onMouseUp = () => {
    this.handleMouseUp()
    this.state = State.NONE
  }

  protected onMouseWheel = (event: WheelEvent) => {
    if (
      this.enabled === false ||
      this.mouseWheelEnabled === false ||
      this.state !== State.NONE
    ) {
      return
    }

    event.preventDefault()
    this.handleMouseWheel(event)
  }

  protected onTouchStart = (event: PointerEvent) => {
    this.trackPointer(event)

    switch (this.pointers.length) {
      case 1:
        this.handleTouchStartPan()
        this.state = State.TOUCH_PAN
        break

      case 2:
        this.handleTouchStartDollyPan()
        this.state = State.TOUCH_DOLLY_PAN
        break

      default:
        this.state = State.NONE
    }
  }

  protected onTouchMove = (event: PointerEvent) => {
    this.trackPointer(event)

    switch (this.state) {
      case State.TOUCH_PAN:
        this.handleTouchMovePan(event)
        this.update(0)

        break

      case State.TOUCH_DOLLY_PAN:
        this.handleTouchMoveDollyPan(event)
        this.update(0)

        break

      default:
        this.state = State.NONE
    }
  }

  protected onTouchEnd = () => {
    this.handleTouchEnd()
    this.state = State.NONE
  }

  protected onDoubleClick = (event: MouseEvent) => {
    const cursor = this.getRelativeClient(event)

    const cameraWidth = this.camera.right - this.camera.left
    const cameraHeight = this.camera.top - this.camera.bottom

    const relativeCursor = new Vector2(
      cursor.x - cameraWidth / 2,
      cursor.y - cameraHeight / 2
    )

    if (this.zoom > this.minZoom) {
      this.zoomReset()
    } else {
      this.zoomIn(1 / 3, relativeCursor)
    }
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

  setWheelEnabled = (data: boolean) => {
    this.mouseWheelEnabled = data
  }
}
