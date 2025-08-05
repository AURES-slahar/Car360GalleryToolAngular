import { ObjectFit } from '../render/RenderMethod'

export interface ClientDimensions {
  width: number
  height: number
  fit: ObjectFit
}

export function getMinZoom(
  minWidth: number,
  minHeight: number,
  dimensions: ClientDimensions
) {
  switch (dimensions.fit) {
    case 'contain':
      return Math.max(
        0,
        Math.min(dimensions.width / minWidth, dimensions.height / minHeight)
      )
    case 'cover':
    default:
      return Math.max(
        0,
        Math.max(dimensions.width / minWidth, dimensions.height / minHeight)
      )
  }
}

export function getMinZoomInterpolate(
  minWidth: number,
  minHeight: number,
  ratio: number,
  ranges: [ClientDimensions, ClientDimensions]
) {
  const [fromZoom, toZoom] = ranges.map(dimensions =>
    getMinZoom(minWidth, minHeight, dimensions)
  )

  return fromZoom + (toZoom - fromZoom) * ratio
}
