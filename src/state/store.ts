import { create } from 'zustand'

export type Vec3 = [number, number, number]

export type SceneLodEntry = {
  id: string
  file: string
  count: number
  bytes: number
}

export type SceneBlock = {
  id: string
  lods: SceneLodEntry[]
}

export type SceneManifest = {
  id: string
  displayName: string
  kind: 'single' | 'lod-blocks'
  sourceVertexCount?: number
  bbox: { min: Vec3; max: Vec3 }
  centroid: Vec3
  up: Vec3
  right: Vec3
  forward: Vec3
  floorOffset: number
  ceilOffset: number
  height: number
  extents: Vec3
  suggestedCamera: { eye: Vec3; target: Vec3 }
  lods?: SceneLodEntry[]
  blocks?: SceneBlock[]
  builtAt: string
}

export type SceneIndexEntry = {
  id: string
  displayName: string
  kind: 'single' | 'lod-blocks'
  path: string
}

export type SceneIndex = {
  builtAt: string
  scenes: SceneIndexEntry[]
}

export type AppPhase = 'start' | 'loading' | 'experience'
export type ControlMode = 'fly' | 'orbit'
export type RenderQuality = 'high' | 'low'

type Store = {
  phase: AppPhase
  index: SceneIndex | null
  indexError: string | null
  currentSceneId: string | null
  currentManifest: SceneManifest | null
  loadProgress: number
  loadError: string | null

  mode: ControlMode
  speed: number // multiplier (0.25..8)
  paused: boolean
  showHelp: boolean
  showSceneDrawer: boolean

  quality: RenderQuality
  webgl2: boolean
  isMobile: boolean

  fadeAlpha: number // 0..1, 1 = fully black

  setIndex(idx: SceneIndex): void
  setIndexError(err: string): void
  beginExperience(sceneId: string): void
  setManifest(m: SceneManifest): void
  setLoadProgress(p: number): void
  setLoadError(err: string | null): void
  goToStart(): void

  setMode(m: ControlMode): void
  setSpeed(s: number): void
  togglePause(): void
  setPaused(p: boolean): void
  toggleHelp(): void
  toggleSceneDrawer(open?: boolean): void

  setQuality(q: RenderQuality): void
  setWebGL2(v: boolean): void
  setMobile(v: boolean): void
  setFade(a: number): void
  switchScene(sceneId: string): Promise<void>
}

const SPEED_STEPS = [0.25, 0.5, 1, 2, 4, 8] as const

async function fetchManifest(idxEntry: SceneIndexEntry): Promise<SceneManifest> {
  const res = await fetch(`${import.meta.env.BASE_URL}${idxEntry.path}`)
  if (!res.ok) throw new Error(`Failed to load manifest for ${idxEntry.id}: ${res.status}`)
  return res.json() as Promise<SceneManifest>
}

export const useStore = create<Store>((set, get) => ({
  phase: 'start',
  index: null,
  indexError: null,
  currentSceneId: null,
  currentManifest: null,
  loadProgress: 0,
  loadError: null,

  mode: 'fly',
  speed: 1,
  paused: false,
  showHelp: false,
  showSceneDrawer: false,

  quality: 'high',
  webgl2: true,
  isMobile: false,

  fadeAlpha: 1,

  setIndex(idx) { set({ index: idx, indexError: null }) },
  setIndexError(err) { set({ indexError: err }) },

  beginExperience(sceneId) {
    set({ phase: 'loading', currentSceneId: sceneId, loadProgress: 0, loadError: null })
  },

  setManifest(m) { set({ currentManifest: m }) },
  setLoadProgress(p) { set({ loadProgress: Math.max(0, Math.min(1, p)) }) },
  setLoadError(err) { set({ loadError: err }) },
  goToStart() {
    set({ phase: 'start', currentSceneId: null, currentManifest: null, fadeAlpha: 1 })
  },

  setMode(m) { set({ mode: m }) },
  setSpeed(s) { set({ speed: s }) },
  togglePause() { set({ paused: !get().paused }) },
  setPaused(p) { set({ paused: p }) },
  toggleHelp() { set({ showHelp: !get().showHelp }) },
  toggleSceneDrawer(open) {
    set({ showSceneDrawer: typeof open === 'boolean' ? open : !get().showSceneDrawer })
  },

  setQuality(q) { set({ quality: q }) },
  setWebGL2(v) { set({ webgl2: v }) },
  setMobile(v) { set({ isMobile: v }) },
  setFade(a) { set({ fadeAlpha: Math.max(0, Math.min(1, a)) }) },

  async switchScene(sceneId) {
    const { index } = get()
    if (!index) return
    const entry = index.scenes.find((s) => s.id === sceneId)
    if (!entry) return
    set({ phase: 'loading', currentSceneId: sceneId, currentManifest: null, loadProgress: 0, loadError: null, fadeAlpha: 1, showSceneDrawer: false })
    try {
      const m = await fetchManifest(entry)
      set({ currentManifest: m, phase: 'experience' })
    } catch (e) {
      set({ loadError: (e as Error).message })
    }
  },
}))

export const speedSteps = SPEED_STEPS

export function nextSpeed(s: number, dir: 1 | -1): number {
  let i = SPEED_STEPS.findIndex((v) => v >= s)
  if (i < 0) i = SPEED_STEPS.length - 1
  const ni = Math.max(0, Math.min(SPEED_STEPS.length - 1, i + dir))
  return SPEED_STEPS[ni]
}

export async function loadIndex(): Promise<SceneIndex> {
  const url = `${import.meta.env.BASE_URL}assets/scenes/index.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Scenes not built. Run \`npm run scenes\` to convert PLY → .splat. (${res.status})`)
  return res.json() as Promise<SceneIndex>
}

export async function loadManifest(entry: SceneIndexEntry): Promise<SceneManifest> {
  return fetchManifest(entry)
}
