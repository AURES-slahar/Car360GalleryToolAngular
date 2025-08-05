import * as THREE from '../three'
import { TileTextureCache } from './TileTextureCache'

export class TileAbortError extends Error {
  constructor() {
    super('Aborted tile loading')
  }
}

function bindOnce<T extends HTMLElement>(image: T) {
  type Name = Parameters<HTMLImageElement['addEventListener']>[0]
  type Callback = Parameters<HTMLImageElement['addEventListener']>[1]
  const callbacks: [Name, Callback][] = []

  function cancel() {
    for (const [name, callback] of callbacks) {
      image.removeEventListener(name, callback)
    }
  }

  return {
    bind(
      ...[name, func, options]: Parameters<HTMLImageElement['addEventListener']>
    ) {
      callbacks.push([name, func])

      const callback: typeof func = (...args) => {
        cancel()
        if (typeof func === 'function') {
          func(...args)
        }
      }

      image.addEventListener(name, callback, options)
    },
    cancel
  }
}

export type TileLoaderCancel = () => void

// Images are considered low priority by Chrome etc.
// https://web.dev/priority-hints/
// Thus, to load images in high priority, we need to load them via fetch
class CancellableImageLoader {
  load(url: string, signal?: AbortSignal): Promise<HTMLImageElement> {
    const image = document.createElement('img')
    const callbacks = bindOnce(image)
    image.crossOrigin = 'anonymous'

    if (signal) {
      if (signal.aborted) return Promise.reject(new TileAbortError())
      signal.addEventListener('abort', () => {
        callbacks.cancel()
        image.src = ''
      })
    }

    // TODO: download and decode images in a web worker to reduce loading times
    // This will require us to upgrade to Webpack 5 and might destroy
    // compatibility with Aures
    return fetch(url, { signal })
      .then(i => {
        if (signal?.aborted) throw new TileAbortError()
        return i.blob()
      })
      .then(blob => {
        if (signal?.aborted) throw new TileAbortError()

        const blobUrl = URL.createObjectURL(blob)
        image.src = blobUrl
        return new Promise<HTMLImageElement>((resolve, reject) => {
          callbacks.bind('load', () => resolve(image), false)
          callbacks.bind('error', () => reject(new TileAbortError()), false)
        }).finally(() => URL.revokeObjectURL(blobUrl))
      })
      .catch(err => {
        if (
          err instanceof DOMException &&
          err.code === DOMException.ABORT_ERR
        ) {
          throw new TileAbortError()
        }
        throw err
      })
  }
}

interface TilePosition {
  level: number
  x: number
  y: number
}

function getTilePositionString(position: TilePosition) {
  return [position.level, position.x, position.y].join('_')
}

enum State {
  Error,
  InProgress,
  Success,
  Idle
}

interface LazyPromise<T> {
  state: State
  execute: () => void
  result: Promise<T>
}

function createLazyPromise<T>(innerFn: () => Promise<T>): LazyPromise<T> {
  let resolver: ((value: T) => void) | null = null
  let rejecter: ((reason?: unknown) => void) | null = null

  const result = new Promise<T>((resolve, reject) => {
    resolver = resolve
    rejecter = reject
  })

  const lazyPromise = {
    state: State.Idle,
    execute: () => {
      lazyPromise.state = State.InProgress
      innerFn()
        .then(value => {
          lazyPromise.state = State.Success
          if (!resolver) throw new Error('Resolver not found')
          resolver?.(value)
        })
        .catch(err => {
          lazyPromise.state = State.Error
          rejecter?.(err)
        })
    },
    result
  }

  return lazyPromise
}

export interface TileJob {
  abortController: AbortController | undefined
  task: LazyPromise<THREE.Texture>
}

export class TileLoader {
  protected textureCache: TileTextureCache
  protected jobList = new Map<string, TileJob>()

  constructor(cache: TileTextureCache) {
    this.textureCache = cache
  }

  // To prevent frame drops, execute only a fraction of jobs at 1 frame
  work() {
    const idleTasks = [...this.jobList.values()]
      .filter(
        i => i.task.state === State.Idle && !i.abortController?.signal.aborted
      )
      .slice(0, 3)

    return Promise.all(idleTasks.map(({ task }) => task.execute()))
  }

  load(baseUrl: string, variant: string, position: TilePosition): TileJob {
    const fileName = `${getTilePositionString(position)}.jpg`
    const url = [baseUrl, variant, fileName].join('/')

    const cachedTask = this.jobList.get(url)
    if (
      cachedTask != null &&
      cachedTask.task.state !== State.Error &&
      !(
        cachedTask.abortController?.signal.aborted &&
        cachedTask.task.state !== State.Success
      )
    ) {
      return cachedTask
    }

    const loader = new CancellableImageLoader()
    const abortController = new AbortController()

    const execute = () => {
      // add to cache to perform GC
      // TODO: handle case when overwriting texture
      const texture = new THREE.Texture()
      this.textureCache.set(url, texture)

      return loader.load(url, abortController.signal).then(image => {
        texture.image = image
        texture.needsUpdate = true

        return texture
      })
    }

    const task = {
      abortController,
      task: createLazyPromise(execute)
    }

    this.jobList.set(url, task)
    return task
  }

  cancelAll() {
    for (const task of this.jobList.values()) {
      task.abortController?.abort()
    }
  }
}
