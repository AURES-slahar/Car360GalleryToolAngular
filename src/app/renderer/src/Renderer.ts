import {
  createManifestRenderer,
  fetchManifest,
  Manifest,
  ManifestRenderer
} from '../../../driverama-360-renderer'
import { RenderOptions } from '../../../driverama-360-renderer/src/render/RenderMethod'
import {
  MouseEventHandler,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useRef
} from 'react'
import type { ControlProp } from './Renderer.utils'

function useRefCallback<T>(fn: T) {
  const ref = useRef<T>(fn)

  useEffect(() => {
    ref.current = fn
  }, [fn])

  return ref
}

export function Renderer(props: {
  url: string
  type: 'exterior' | 'interior'
  preload?: boolean
  onManifest?: (manifest: Manifest) => void
  onInit?: () => void
  onError?: (err: unknown) => void
  onActive?: () => void
  objectFit?: 'cover' | 'contain'
  options?: RenderOptions
  onMouseMove?: MouseEventHandler<HTMLDivElement>
  onMouseEnter?: MouseEventHandler<HTMLDivElement>
  onMouseLeave?: MouseEventHandler<HTMLDivElement>
  onMouseDown?: MouseEventHandler<HTMLDivElement>
  onMouseUp?: MouseEventHandler<HTMLDivElement>
  children?: ReactNode
  control?: ControlProp
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<ManifestRenderer>()

  useLayoutEffect(() => {
    if (!containerRef.current) return
    // eslint-disable-next-line testing-library/render-result-naming-convention
    const renderer = createManifestRenderer({
      container: containerRef.current,
      preload: props.preload
    })

    if (props.control) {
      props.control.current = renderer
    }

    rendererRef.current = renderer
    return () => renderer.dispose()
  }, [props.preload, props.control])

  const hasInit = useRef<boolean>(false)

  const onManifestRef = useRefCallback(props.onManifest)
  const onErrorRef = useRefCallback(props.onError)
  const onInitRef = useRefCallback(props.onInit)
  const onActiveRef = useRefCallback(props.onActive)

  // TODO: handle changes in object fit
  const initialObjectFitRef = useRef<typeof props['objectFit']>(props.objectFit)

  useLayoutEffect(() => {
    if (!rendererRef.current) return
    const abortController = new AbortController()

    hasInit.current = false

    fetchManifest(props.url, { signal: abortController.signal })
      .then(data => {
        if (abortController.signal.aborted) return
        onManifestRef.current?.(data)

        return rendererRef.current?.init(
          props.type,
          data,
          { onActive: () => onActiveRef.current?.() },
          { objectFit: initialObjectFitRef.current ?? 'cover' }
        )
      })
      .then(() => {
        hasInit.current = true
        onInitRef.current?.()
      })
      .catch(err => {
        onErrorRef.current?.(err)
      })

    return () => abortController.abort()
  }, [
    props.url,
    props.type,
    initialObjectFitRef,
    onManifestRef,
    onErrorRef,
    onInitRef,
    onActiveRef
  ])

  // update object fit after initialized
  useEffect(() => {
    if (hasInit.current && props.objectFit != null) {
      rendererRef.current?.setObjectFit(props.objectFit)
    }
  }, [props.objectFit])

  return props;
}

export type { Manifest, ManifestRenderer }
