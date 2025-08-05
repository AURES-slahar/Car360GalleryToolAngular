import { MutableRefObject, useRef } from 'react'
import type { ManifestRenderer } from './Renderer'

type ControlsCallbacks = Omit<ManifestRenderer, 'init' | 'dispose'>
export type ControlProp = MutableRefObject<ControlsCallbacks | undefined>

export function useRendererControls(): { control: ControlProp } {
  const control = useRef<ControlsCallbacks>()
  return { control }
}
