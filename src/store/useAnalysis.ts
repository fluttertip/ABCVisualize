import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ChartData } from '../lib/chart'
import { Pick, SEARCH_PLANETS, SearchPlanet, cleanPick, pickOfLon } from '../lib/customChart'
import { SkyHit } from '../lib/skyMatch'

export type Slot = SearchPlanet | 'lagna'
export type Era = 'CE' | 'BCE'
export interface Run { status: 'idle' | 'running' | 'done' | 'cancelled' | 'error'; frac: number; found: number; jd: number; truncated: boolean; message: string; lat: number; lon: number; shift: number; total: number; maxMiss: number; fromJd: number; toJd: number }
const IDLE: Run = { status: 'idle', frac: 0, found: 0, jd: 0, truncated: false, message: '', lat: 27.7172, lon: 85.324, shift: 0, total: 0, maxMiss: 0, fromJd: 0, toJd: 0 }

const P = (sign: number): Pick => ({ sign, nak: null, pada: null })
const DEFAULT_PLANETS: Record<SearchPlanet, Pick> = { sun: P(4), moon: P(3), mars: P(0), mercury: P(4), jupiter: P(3), venus: P(5), saturn: P(6), rahu: P(1) }
const ALL_ON = { sun: true, moon: true, mars: true, mercury: true, jupiter: true, venus: true, saturn: true, rahu: true, lagna: true }

interface Setup {
  lagna: Pick; planets: Record<SearchPlanet, Pick>; use: Record<Slot, boolean>
  style: 'north' | 'south'
  place: string; lat: number; lon: number; ayShift: number
  fromYear: number; fromEra: Era; toYear: number; toEra: Era; maxMiss: number
}
interface State extends Setup {
  hits: SkyHit[]; run: Run
  setPick: (slot: Slot, patch: Partial<Pick>) => void
  setUse: (slot: Slot, on: boolean) => void
  set: (p: Partial<Setup>) => void
  /** copy a real chart (positions, nakshatras, padas) into the builder */
  loadChart: (c: ChartData) => void
  reset: () => void
  setRun: (p: Partial<Run>) => void
  startRun: (r: Partial<Run>) => void
  addHits: (h: SkyHit[]) => void
}

const SETUP_DEFAULT: Setup = {
  lagna: P(0), planets: DEFAULT_PLANETS, use: ALL_ON, style: 'north',
  place: 'Kathmandu, Bagmati, Nepal', lat: 27.7172, lon: 85.324, ayShift: 0,
  fromYear: 1, fromEra: 'CE', toYear: 2100, toEra: 'CE', maxMiss: 0,
}

/** Analysis lab settings. Separate store + storage key, so nothing in the saved birth charts is touched. */
export const useAnalysis = create<State>()(
  persist(
    (set) => ({
      ...SETUP_DEFAULT,
      hits: [], run: IDLE,
      setPick: (slot, patch) => set((s) => slot === 'lagna'
        ? { lagna: cleanPick({ ...s.lagna, ...patch }) }
        : { planets: { ...s.planets, [slot]: cleanPick({ ...s.planets[slot], ...patch }) } }),
      setUse: (slot, on) => set((s) => ({ use: { ...s.use, [slot]: on } })),
      set: (p) => set(p),
      loadChart: (c) => set(() => {
        const planets = {} as Record<SearchPlanet, Pick>
        SEARCH_PLANETS.forEach((id) => { planets[id] = pickOfLon(c.placements[id].lon) })
        return { lagna: pickOfLon(c.lagnaLon), planets }
      }),
      reset: () => set({ lagna: P(0), planets: DEFAULT_PLANETS, use: ALL_ON }),
      setRun: (p) => set((s) => ({ run: { ...s.run, ...p } })),
      startRun: (r) => set({ hits: [], run: { ...IDLE, ...r, status: 'running' } }),
      addHits: (h) => set((s) => (h.length ? { hits: [...s.hits, ...h] } : s)),
    }),
    {
      name: 'astro-analysis-v1',
      version: 1,
      // only the setup is kept between visits; results are recalculated on demand
      partialize: (s) => ({ lagna: s.lagna, planets: s.planets, use: s.use, style: s.style, place: s.place, lat: s.lat, lon: s.lon, ayShift: s.ayShift, fromYear: s.fromYear, fromEra: s.fromEra, toYear: s.toYear, toEra: s.toEra, maxMiss: s.maxMiss }),
    },
  ),
)