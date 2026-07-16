export interface GameAssets {
  stadiumLandscape: HTMLImageElement
  stadiumPortrait: HTMLImageElement
  goal: HTMLImageElement
  keeperAtlas: HTMLImageElement
  ballStrip: HTMLImageElement
  legStrip: HTMLImageElement
  effectsStrip: HTMLImageElement
}

const ASSET_PATHS = {
  stadiumLandscape: '/assets/stadium-landscape.png',
  stadiumPortrait: '/assets/stadium-portrait.png',
  goal: '/assets/goal.png',
  keeperAtlas: '/assets/keeper-atlas.png',
  ballStrip: '/assets/ball-strip-v2.png',
  legStrip: '/assets/leg-strip.png',
  effectsStrip: '/assets/effects-strip.png',
} as const

let cachedAssets: Promise<GameAssets> | undefined

const loadImage = (source: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`No se pudo cargar ${source}`))
    image.src = source
  })

export const loadGameAssets = (): Promise<GameAssets> => {
  cachedAssets ??= Promise.all(
    Object.entries(ASSET_PATHS).map(async ([key, path]) => [key, await loadImage(path)] as const),
  ).then((entries) => Object.fromEntries(entries) as unknown as GameAssets)

  return cachedAssets
}
