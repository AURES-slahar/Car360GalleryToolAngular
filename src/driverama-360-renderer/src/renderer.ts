import { WebGLRenderer, Clock } from './three'
import {
  ObjectFit,
  RenderCallbacks,
  RenderMethod,
  RenderOptions,
  TransitionViewport
} from './render/RenderMethod'
import { ExteriorMethod } from './exterior/ExteriorMethod'
import { InteriorMethod } from './interior/InteriorMethod'
import { Manifest } from './types'
import { TileTextureCache } from './tile/TileTextureCache'
import { TileLoader } from './tile/TileLoader'

function getParentSize(element: HTMLElement | null): [number, number] {
  return [element?.clientWidth ?? 0, element?.clientHeight ?? 0]
}

export interface ManifestRenderer {
  init: (
    type: 'exterior' | 'interior',
    data: Manifest,
    callbacks: RenderCallbacks,
    options: RenderOptions
  ) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void

  startTransition: (
    source: TransitionViewport,
    target: TransitionViewport,
    preserveZoom: boolean
  ) => void
  endTransition: () => void
  setTransitionProgress: (progress: number) => void
  setObjectFit: (fit: ObjectFit) => void
  setWheelZoomEnabled: (state: boolean) => void

  dispose: () => void
}

export async function fetchManifest(
  url: string,
  options?: { signal?: AbortSignal | null }
): Promise<Manifest> {
  const res = await fetch(`${url}/manifest.json`, { signal: options?.signal })

  if (!res.ok) throw new Error(`Failed to fetch manifest (${res.status})`)
  const data: Omit<Manifest, 'baseUrl'> = await res.json()
  return { ...data, baseUrl: url }
}

export function createManifestRenderer(options: {
  container: HTMLDivElement
  preload?: boolean
}): ManifestRenderer {
  const renderer = new WebGLRenderer({ alpha: true })
  const cache = new TileTextureCache()
  const loader = new TileLoader(cache)
  const clock = new Clock()

  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(...getParentSize(options.container))
  renderer.setClearColor(0xffffff, 0)

  options.container.appendChild(renderer.domElement)

  let method: RenderMethod | undefined = undefined

  async function init(
    type: 'exterior' | 'interior',
    data: Manifest,
    callbacks: RenderCallbacks,
    options: RenderOptions
  ) {
    method?.destroy()

    switch (type) {
      case 'exterior': {
        if (data.exterior.length === 0)
          throw new Error('No exterior panorama found')
        method = new ExteriorMethod(
          loader,
          renderer,
          callbacks,
          options,
          data.exterior[0],
          data.baseUrl
        )
        break
      }
      case 'interior': {
        if (data.interior.length === 0)
          throw new Error('No interior panorama found')

        method = new InteriorMethod(
          loader,
          renderer,
          callbacks,
          options,
          data.interior[0],
          data.baseUrl
        )
        break
      }
      default: {
        throw new Error('Invalid renderer method')
      }
    }

    await method?.preload()
    animate()
  }

  let lastAnimationFrame = 0

  function animate() {
    const [width, height] = getParentSize(options.container)

    if (
      renderer.domElement.clientWidth !== width ||
      renderer.domElement.clientHeight !== height
    ) {
      method?.onResize(width, height)
    }

    lastAnimationFrame = requestAnimationFrame(animate)
    const delta = clock.getDelta()
    method?.render(delta)

    // process queued image fetching tasks
    loader.work()
  }

  function dispose() {
    cancelAnimationFrame(lastAnimationFrame)
    loader.cancelAll()
    cache.destroy()
    method?.destroy()
    renderer?.dispose()
    renderer.domElement.remove()
  }

  return {
    init,
    dispose,
    onZoomOut() {
      method?.zoomOut()
    },
    onZoomIn() {
      method?.zoomIn()
    },
    onZoomReset() {
      method?.zoomReset()
    },
    startTransition: (
      source: TransitionViewport,
      target: TransitionViewport,
      preserveZoom: boolean
    ) => {
      method?.startTransition?.(source, target, preserveZoom)
    },
    endTransition: () => {
      method?.endTransition?.()
    },
    setTransitionProgress: progress => {
      method?.setTransitionProgress?.(progress)
    },
    setObjectFit: objectFit => {
      method?.setObjectFit?.(objectFit)
    },
    setWheelZoomEnabled: state => {
      method?.setWheelZoomEnabled?.(state)
    }
  }
}
