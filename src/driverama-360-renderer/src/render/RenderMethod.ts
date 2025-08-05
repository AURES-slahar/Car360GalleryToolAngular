import type { Renderer, Texture } from '../three'
import type { TileLoader } from '../tile/TileLoader'

export type ObjectFit = 'cover' | 'contain'

export interface RenderOptions {
  objectFit: ObjectFit
}

export interface RenderCallbacks {
  onActive: () => void
  onZoomChange: (data: { ratio: number; value: number }) => void
}

export interface TransitionViewport {
  width: number
  height: number
  fit: ObjectFit
}

export abstract class RenderMethod {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    protected tileLoader: TileLoader,
    protected renderer: Renderer,
    protected callbacks: RenderCallbacks,
    protected options: RenderOptions
  ) {}

  abstract destroy(): void
  abstract render(delta?: number): void

  abstract onResize(width: number, height: number): void
  abstract zoomIn(): void
  abstract zoomOut(): void
  abstract zoomReset(): void
  abstract preload(): Promise<Texture[]>

  startTransition?(
    source: TransitionViewport,
    target: TransitionViewport,
    preserveZoom: boolean
  ): void
  endTransition?(): void
  setTransitionProgress?(progress: number): void

  setObjectFit?(objectFit: ObjectFit): void

  abstract setWheelZoomEnabled(state: boolean): void
}
