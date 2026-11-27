import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ChartData } from '../lib/chart'
import { OUTER_PLANETS, OuterPlanet, Pick, SEARCH_PLANETS, SearchItem, SearchPlanet, cleanPick, outerTropLon, pickOfLon } from '../lib/customChart'
import { norm360 } from '../lib/math'
import { SkyHit } from '../lib/skyMatch'

export type Slot = SearchItem | 'lagna'
export type Era = 'CE' | 'BCE'
export type Mode = 'range' | 'near'
export type Direction = 'future' | 'past' | 'both'
export type SkyKind = 'ancient' | 'good' | 'bad' | 'other'
/** a chart kept for the Analysis tab only (separate from the birth charts saved on the main pages) */
export interface SavedSky { id: string; savedAt: number; name: string; kind: SkyKind; lagna: Pick; planets: Record<SearchPlanet, Pick>; outer: Record<OuterPlanet, Pick>; use: Record<Slot, boolean> }
/** an optional second year range, so BCE and CE can each have their own custom range */
export interface ExtraRange { on: boolean; fromYear: number; fromEra: Era; toYear: number; toEra: Era }
/** the search can go this many years either side of year 0. Far from today the positions are only rough (see the warning in the search panel). */
export const MAX_YEAR = 100000

export interface Run {
  status: 'idle' | 'running' | 'done' | 'cancelled' | 'error'; frac: number; found: number; jd: number; truncated: boolean; message: string
  lat: number; lon: number; shift: number; total: number; maxMiss: number
  mode: Mode; center: number
  /** earliest / latest moment scanned so far: the "scan earlier / later years" buttons continue from here */
  lo: number; hi: number
}
const IDLE: Run = { status: 'idle', frac: 0, found: 0, jd: 0, truncated: false, message: '', lat: 27.7172, lon: 85.324, shift: 0, total: 0, maxMiss: 0, mode: 'range', center: 0, lo: 0, hi: 0 }

const P = (sign: number): Pick => ({ sign, nak: null, pada: null })
const DEFAULT_PLANETS: Record<SearchPlanet, Pick> = { sun: P(4), moon: P(3), mars: P(0), mercury: P(4), jupiter: P(3), venus: P(5), saturn: P(6), rahu: P(1) }
const DEFAULT_OUTER: Record<OuterPlanet, Pick> = { uranus: P(1), neptune: P(11) }
const ALL_ON: Record<Slot, boolean> = { sun: true, moon: true, mars: true, mercury: true, jupiter: true, venus: true, saturn: true, rahu: true, lagna: true, uranus: false, neptune: false }

interface Setup {
  lagna: Pick; planets: Record<SearchPlanet, Pick>; outer: Record<OuterPlanet, Pick>; use: Record<Slot, boolean>
  /** show Uranus & Neptune (display only in the traditional sense) */
  showOuter: boolean
  style: 'north' | 'south'
  place: string; lat: number; lon: number; ayShift: number
  mode: Mode
  fromYear: number; fromEra: Era; toYear: number; toEra: Era; maxMiss: number
  /** "nearest to a date" mode */
  nearToday: boolean; nearYear: number; nearEra: Era; nearDir: Direction; nearCount: number; nearSpan: number
  extra: ExtraRange
  savedSkies: SavedSky[]
  /** moving the Lagna carries every planet with it, so each planet stays in the same HOUSE (turn off to keep the same signs) */
  keepHouses: boolean
  /** also compare nakshatra and pada (much stricter). Off = only the sign of each planet and the Lagna is compared. */
  matchNak: boolean
}
interface State extends Setup {
  hits: SkyHit[]; run: Run
  /** the moment shown in the time-travel panel (not kept between visits) */
  clockJd: number | null
  setClock: (jd: number | null) => void
  saveSky: (name: string, kind: SkyKind) => void
  deleteSky: (id: string) => void
  loadSky: (id: string) => void
  setPick: (slot: Slot, patch: Partial<Pick>) => void
  setUse: (slot: Slot, on: boolean) => void
  set: (p: Partial<Setup>) => void
  /** copy a real chart (positions, nakshatras, padas) into the builder. Uranus / Neptune are worked out for the same moment. */
  loadChart: (c: ChartData, withNak?: boolean) => void
  reset: () => void
  setRun: (p: Partial<Run>) => void
  startRun: (r: Partial<Run>) => void
  addHits: (h: SkyHit[]) => void
}

const SETUP_DEFAULT: Setup = {
  lagna: P(0), planets: DEFAULT_PLANETS, outer: DEFAULT_OUTER, use: ALL_ON, showOuter: false, style: 'north',
  place: 'Kathmandu, Bagmati, Nepal', lat: 27.7172, lon: 85.324, ayShift: 0,
  mode: 'range', fromYear: 1, fromEra: 'CE', toYear: 2100, toEra: 'CE', maxMiss: 0,
  nearToday: true, nearYear: 2000, nearEra: 'CE', nearDir: 'both', nearCount: 3, nearSpan: 3000,
  extra: { on: false, fromYear: 3000, fromEra: 'BCE', toYear: 1, toEra: 'BCE' },
  savedSkies: [],
  keepHouses: true, matchNak: false,
}

/** Analysis lab settings. Separate store + storage key, so nothing in the saved birth charts is touched. */
export const useAnalysis = create<State>()(
  persist(
    (set) => ({
      ...SETUP_DEFAULT,
      hits: [], run: IDLE, clockJd: null,
      setClock: (jd) => set({ clockJd: jd }),
      saveSky: (name, kind) => set((s) => ({ savedSkies: [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, savedAt: Date.now(), name: name.trim() || 'Untitled sky', kind, lagna: s.lagna, planets: s.planets, outer: s.outer, use: s.use }, ...s.savedSkies] })),
      deleteSky: (id) => set((s) => ({ savedSkies: s.savedSkies.filter((x) => x.id !== id) })),
      loadSky: (id) => set((s) => { const k = s.savedSkies.find((x) => x.id === id); return k ? { lagna: k.lagna, planets: k.planets, outer: k.outer, use: { ...s.use, ...k.use } } : s }),
      setPick: (slot, patch) => set((s) => {
        if (slot === 'lagna') {
          const next = cleanPick({ ...s.lagna, ...patch })
          const delta = (next.sign - s.lagna.sign + 12) % 12
          if (!s.keepHouses || delta === 0) return { lagna: next }
          // carry the planets with the Lagna so they keep their houses (their nakshatra / pada belong to the old sign, so they are cleared)
          const shift = (p: Pick): Pick => ({ sign: (p.sign + delta) % 12, nak: null, pada: null })
          const planets = {} as Record<SearchPlanet, Pick>
          SEARCH_PLANETS.forEach((id) => { planets[id] = shift(s.planets[id]) })
          const outer = {} as Record<OuterPlanet, Pick>
          OUTER_PLANETS.forEach((id) => { outer[id] = shift(s.outer[id]) })
          return { lagna: next, planets, outer }
        }
        if (slot === 'uranus' || slot === 'neptune') return { outer: { ...s.outer, [slot]: cleanPick({ ...s.outer[slot], ...patch }) } }
        return { planets: { ...s.planets, [slot]: cleanPick({ ...s.planets[slot], ...patch }) } }
      }),
      setUse: (slot, on) => set((s) => ({ use: { ...s.use, [slot]: on } })),
      set: (p) => set(p),
      loadChart: (c, withNak = false) => set((s) => {
        const mk = (lon: number): Pick => { const k = pickOfLon(lon); return withNak ? k : P(k.sign) }   // default: sign only, no nakshatra / pada
        const planets = {} as Record<SearchPlanet, Pick>
        SEARCH_PLANETS.forEach((id) => { planets[id] = mk(c.placements[id].lon) })
        const outer = { ...s.outer }
        if (c.jd !== 0) OUTER_PLANETS.forEach((id) => { outer[id] = mk(norm360(outerTropLon(id, c.jd) - c.ayanamsa)) })
        return { lagna: mk(c.lagnaLon), planets, outer }
      }),
      reset: () => set({ lagna: P(0), planets: DEFAULT_PLANETS, outer: DEFAULT_OUTER, use: ALL_ON }),
      setRun: (p) => set((s) => ({ run: { ...s.run, ...p } })),
      startRun: (r) => set({ hits: [], run: { ...IDLE, ...r, status: 'running' } }),
      addHits: (h) => set((s) => (h.length ? { hits: [...s.hits, ...h] } : s)),
    }),
    {
      name: 'astro-analysis-v1',
      version: 1,
      // only the setup is kept between visits; results are recalculated on demand
      partialize: (s) => ({
        lagna: s.lagna, planets: s.planets, outer: s.outer, use: s.use, showOuter: s.showOuter, style: s.style, place: s.place, lat: s.lat, lon: s.lon, ayShift: s.ayShift,
        mode: s.mode, fromYear: s.fromYear, fromEra: s.fromEra, toYear: s.toYear, toEra: s.toEra, maxMiss: s.maxMiss,
        nearToday: s.nearToday, nearYear: s.nearYear, nearEra: s.nearEra, nearDir: s.nearDir, nearCount: s.nearCount, nearSpan: s.nearSpan,
        extra: s.extra, savedSkies: s.savedSkies, keepHouses: s.keepHouses, matchNak: s.matchNak,
      }),
      // settings saved by the first version of this page lack the newer fields: fill those from the defaults
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Setup>
        return { ...current, ...p, use: { ...current.use, ...p.use }, outer: { ...current.outer, ...p.outer }, extra: { ...current.extra, ...p.extra }, savedSkies: p.savedSkies ?? [] }
      },
    },
  ),
)