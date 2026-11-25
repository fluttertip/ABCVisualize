import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { createJSONStorage, persist } from 'zustand/middleware'
import { BirthInput, Controls, Frame, birthMinute, birthSig } from '../lib/chart'
import { CITIES, GrahaId } from '../lib/constants'
import { ArrowToggles, NO_ARROWS } from '../lib/arrows'

/**
 * Everything that makes the screen look the way it does RIGHT NOW. A saved chart stores this together with the birth data,
 * so "Save chart" captures the latest view (scrubbed time, orbit offsets, frame, selected house/planet, Section 4 picks ...)
 * and not just the birth details the chart was first generated from.
 */
export interface SavedView {
  frame: Frame; controls: Controls; chartStyle: 'north' | 'south'
  selectedHouse: number; selectedGraha: GrahaId | null
  showNak: boolean; showAyanamsa: boolean; arrows: ArrowToggles
  vargaCount: 1 | 2 | 3; vargaSel: number[]; detailTab: DetailTab
  /** Section 4 arrows (absent in charts saved by older versions) */
  vargaArrows?: ArrowToggles
}
export type DetailTab = 'read' | 'planets' | 'aspects' | 'dasha' | 'math'
export interface SavedChart { id: string; savedAt: number; title: string; birth: BirthInput; view?: SavedView }

const DEFAULT_BIRTH: BirthInput = { name: '', dob: '2000-05-15', tob: '10:30:00', lat: 27.7172, lon: 85.324, tz: 5.75, cityKey: 'ktm', tzName: 'Asia/Kathmandu', place: 'Kathmandu, Bagmati, Nepal' }

/** the app used to be called "Jyotish Studio"; its saved charts live under the old key and are still picked up */
const STORAGE_KEY = 'astronomical-birth-chart-visualize-v1'
const OLD_STORAGE_KEY = 'jyotish-studio-v1'

interface State {
  draft: BirthInput
  committed: BirthInput | null
  generated: boolean
  animatedSig: string | null
  autoGenerate: boolean
  frame: Frame
  controls: Controls
  selectedHouse: number
  selectedGraha: GrahaId | null
  showNak: boolean
  showAyanamsa: boolean
  arrows: ArrowToggles
  /** arrows / lord links in the Section 4 divisional charts (separate from Section 2) */
  vargaArrows: ArrowToggles
  chartStyle: 'north' | 'south'
  vargaCount: 1 | 2 | 3
  vargaSel: number[]
  detailWidth: number
  detailTab: DetailTab
  /** layout choices for this visit only (not saved): Section 1 visible, time / animation tools open */
  showSky: boolean
  showControls: boolean
  saved: SavedChart[]
  /** a saved view waiting to be applied the moment the chart is (re)generated */
  pendingView: SavedView | null
  setDraft: (p: Partial<BirthInput>) => void
  setFrame: (f: Frame) => void
  setControls: (p: Partial<Controls>) => void
  /** returns true when the one-time morph animation should play */
  generate: () => boolean
  select: (house: number, graha?: GrahaId | null) => void
  set: (p: Partial<State>) => void
  saveCurrent: () => void
  openSaved: (id: string) => void
  deleteSaved: (id: string) => void
}

/** snapshot of the current screen (null before a chart is generated) */
export function captureView(s: Pick<State, 'frame' | 'controls' | 'chartStyle' | 'selectedHouse' | 'selectedGraha' | 'showNak' | 'showAyanamsa' | 'arrows' | 'vargaArrows' | 'vargaCount' | 'vargaSel' | 'detailTab'>): SavedView {
  return {
    frame: s.frame, controls: { ...s.controls, morphT: 1 }, chartStyle: s.chartStyle, selectedHouse: s.selectedHouse, selectedGraha: s.selectedGraha,
    showNak: s.showNak, showAyanamsa: s.showAyanamsa, arrows: { ...s.arrows }, vargaArrows: { ...s.vargaArrows }, vargaCount: s.vargaCount,
    vargaSel: [0, 1, 2].map((i) => s.vargaSel[i] ?? [9, 10, 7][i]), detailTab: s.detailTab,
  }
}
/** two saves are "the same chart" only if birth data AND everything on screen are identical */
export const viewKey = (b: BirthInput, v: SavedView) => JSON.stringify([b.name.trim(), birthSig(b), v])
export function isCurrentSaved(s: State) {
  if (!s.committed) return false
  const key = viewKey(s.committed, captureView(s))
  return s.saved.some((x) => x.view && viewKey(x.birth, x.view) === key)
}

let lastSaved = ''
export const useChart = create<State>()(
  persist(
    (set, get) => ({
      draft: DEFAULT_BIRTH,
      committed: null,
      generated: false,
      animatedSig: null,
      autoGenerate: false,
      frame: 'sidereal',
      controls: { minuteOfDay: 630, dayOffset: 0, yearOffset: 0, hourOffset: 0, minuteOffset: 0, morphT: 0 },
      selectedHouse: 1,
      selectedGraha: null,
      showNak: true,
      showAyanamsa: true,
      arrows: { ...NO_ARROWS },
      vargaArrows: { ...NO_ARROWS },
      chartStyle: 'north',
      vargaCount: 1,
      vargaSel: [9, 10, 7],
      detailWidth: 270,
      detailTab: 'read',
      showSky: true,
      showControls: false,
      saved: [],
      pendingView: null,
      setDraft: (p) => set((s) => ({ draft: { ...s.draft, ...p } })),
      setFrame: (frame) => set({ frame }),
      setControls: (p) => set((s) => ({ controls: { ...s.controls, ...p } })),
      generate: () => {
        const s = get()
        const b = { ...s.draft }
        const sig = birthSig(b)
        const animate = s.animatedSig !== sig
        set({
          committed: b, generated: true, animatedSig: sig, autoGenerate: false,
          controls: { ...s.controls, minuteOfDay: birthMinute(b), dayOffset: 0, yearOffset: 0, hourOffset: 0, minuteOffset: 0, morphT: 1 }, // Section 2 always lands on the diamond
          selectedHouse: 1, selectedGraha: null,
        })
        const v = s.pendingView
        if (v) set({ ...v, controls: { ...v.controls, morphT: 1 }, arrows: { ...v.arrows }, ...(v.vargaArrows ? { vargaArrows: { ...v.vargaArrows } } : {}), vargaSel: [...v.vargaSel], pendingView: null })   // opening a saved chart: put the screen back exactly as it was saved
        return animate
      },
      select: (house, graha = null) => set({ selectedHouse: house, selectedGraha: graha }),
      set: (p) => set(p),
      saveCurrent: () => {
        const s = get()
        const b = s.committed
        if (!b) return
        const view = captureView(s)                       // the LATEST screen: current time, offsets, frame, selections ...
        if (isCurrentSaved(s)) return                     // exactly this screen is already saved; anything different is a new, separate save
        const title = `${b.name.trim() || 'Untitled'} · ${b.dob}`
        set({ saved: [{ id: crypto.randomUUID(), savedAt: Date.now(), title, birth: { ...b }, view }, ...s.saved] })
      },
      openSaved: (id) => {
        const item = get().saved.find((x) => x.id === id)
        if (!item) return
        // animatedSig is set to this chart's own signature, so generate() reports "already seen" and the intro animation does NOT play for saved charts
        set({ draft: { ...item.birth }, committed: null, generated: false, animatedSig: birthSig(item.birth), autoGenerate: true, pendingView: item.view ? { ...item.view } : null })
      },
      deleteSaved: (id) => set((s) => ({ saved: s.saved.filter((x) => x.id !== id) })),
    }),
    {
      name: STORAGE_KEY,
      version: 4,
      // reads the new key first and falls back to the old "jyotish-studio-v1" one, so nothing saved earlier is lost
      storage: createJSONStorage(() => ({
        getItem: (n) => { try { return localStorage.getItem(n) ?? localStorage.getItem(OLD_STORAGE_KEY) } catch { return null } },
        // the morph/spin sliders change the store every frame but nothing that is saved: skip the write when the text is unchanged
        setItem: (n, v) => { try { if (v !== lastSaved) { lastSaved = v; localStorage.setItem(n, v) } } catch { /* storage full / blocked */ } },
        removeItem: (n) => { try { localStorage.removeItem(n) } catch { /* ignore */ } },
      })),
      // v2: earlier builds saved a much wider panel; v3: saved charts gained a `view`; v4: places carry an IANA zone (`tzName`) and Section 4 has its own arrow settings
      migrate: (p: any, v: number) => {
        const q = { ...p, ...(v < 2 ? { detailWidth: 270 } : {}) }
        if (q.draft && !q.draft.tzName) {
          const c = CITIES.find((x) => x.key === q.draft.cityKey)
          if (c) q.draft = { ...q.draft, tzName: c.tzName, place: c.label }
        }
        return q
      },
      partialize: (s) => ({ saved: s.saved, frame: s.frame, detailWidth: s.detailWidth, chartStyle: s.chartStyle, vargaCount: s.vargaCount, vargaSel: s.vargaSel, vargaArrows: s.vargaArrows, draft: s.draft, detailTab: s.detailTab }),
    },
  ),
)

/**
 * The whole store EXCEPT `controls`. The Section 2 morph / spin / time sliders write `controls` up to 60 times a second;
 * components that never read it use this so they are not re-rendered on every one of those frames.
 */
export const useChartLite = () => useChart(useShallow((s) => { const { controls: _c, ...rest } = s; return rest }))