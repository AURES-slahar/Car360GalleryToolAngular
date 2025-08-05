interface TilePanorama {
  id: string
  width: number
  height: number
  tileSize: number
  maxZoom: number
}

export interface ExteriorTilePanorama extends TilePanorama {
  photos: string[]
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InteriorTilePanorama extends TilePanorama {}

export interface HandheldShape {
  fileName: string
  type: string | null
}

export interface Manifest {
  baseUrl: string
  id: number
  timestamp: number
  exterior: ExteriorTilePanorama[]
  interior: InteriorTilePanorama[]
  handheld?: (HandheldShape | string)[]
}
