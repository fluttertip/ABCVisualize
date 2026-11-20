import { memo, startTransition, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BirthForm } from '../components/BirthForm'
import { ControlsBar } from '../components/ControlsBar'
import { DetailPanel } from '../components/DetailPanel'
import { ExtraCharts } from '../components/ExtraCharts'
import { KundaliChart } from '../components/KundaliChart'
import { SkyWheel } from '../components/SkyWheel'
import { VargaSection } from '../components/VargaSection'
import { TimingSection } from '../components/TimingSection'
import { drawSky } from '../lib/drawSky'
import { useChartData } from '../lib/useChartData'
import { ArrowBar, LoopNotes } from '../components/ArrowBar'
import { useChart } from '../store/useChart'

// the heavy children are memoised so the animation's state changes (stage / phase) never re-render them mid-flight
const DetailPanelM = memo(DetailPanel)
const VargaSectionM = memo(VargaSection)
const TimingSectionM = memo(TimingSection)
const ExtraChartsM = memo(ExtraCharts)

type Phase = 'idle' | 'flight' | 'reveal'
type Stage = 'fly1' | 'copy' | 'fly2' | 'morph'
const ease = (p: number) => -(Math.cos(Math.PI * p) - 1) / 2          // sine in-out: gentle start and stop
const clamp = (x: number) => Math.max(0, Math.min(1, x))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const center = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 })

// slow, one-step-at-a-time choreography (ms)
const T_FLY1 = 800    // big chart settles into Section 1 (quick)
const T_COPY = 650    // a glowing copy lifts off Section 1
const T_FLY2 = 1400   // copy glides sideways into Section 2
const T_HOLD = 200    // beat before the morph starts
const T_MORPH = 2900  // circle -> diamond
const X_AT = 0.78     // the real D1 chart starts cross-fading in at this point of the morph (no hard hand-off)
const pickHG = (h: number, g: Parameters<ReturnType<typeof useChart.getState>['select']>[1]) => useChart.getState().select(h, g)   // stable identity so the memoized diamond is not redrawn on every animation frame
const T_REVEAL = 4400 // after that: labels, planets, arrows fade in one after another

export function ChartPage() {
  const s = useChart()
  const { chart, birthChart } = useChartData()
  const chartLive = useRef(chart); chartLive.current = chart
  const skyRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const ovRef = useRef<HTMLCanvasElement>(null)
  const timers = useRef<number[]>([])
  const [phase, setPhase] = useState<Phase>('idle')
  const [stage, setStage] = useState<Stage | null>(null)
  const [panelOn, setPanelOn] = useState(true)
  const [snap, setSnap] = useState<DOMRect | null>(null)
  const [vh, setVh] = useState(window.innerHeight)
  const [lowerOn, setLowerOn] = useState(false)       // Sections 4 + 5: mounted right after generate, in a low-priority render so the animation never stalls
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => { const f = () => setVh(window.innerHeight); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f) }, [])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  useEffect(() => {
    if (!s.generated) { setLowerOn(false); return }
    const id = window.setTimeout(() => startTransition(() => setLowerOn(true)), 0)
    return () => clearTimeout(id)
  }, [s.generated])

  const finishAll = () => { setPhase('idle'); setStage(null); setSnap(null); setPanelOn(true); useChart.getState().setControls({ morphT: 1 }) }

  const handleGenerate = () => {
    timers.current.forEach(clearTimeout); timers.current = []
    const canvas = skyRef.current?.querySelector('canvas')
    const rect = canvas ? canvas.getBoundingClientRect() : null          // where the big chart sits right now
    const animate = s.generate()                                          // true only for never-animated birth data
    if (animate && rect && !reduced) {
      setSnap(rect); setStage('fly1'); setPanelOn(false); setPhase('flight')
      timers.current.push(window.setTimeout(finishAll, 30000))            // failsafe
    } else setPanelOn(true)
  }

  useEffect(() => {
    if (!s.autoGenerate) return
    const id = setTimeout(handleGenerate, 600)
    return () => clearTimeout(id)
  }, [s.autoGenerate]) // eslint-disable-line

  // THE one-time animation, one calm step at a time, all on one overlay canvas:
  //  1) the big chart settles into Section 1   2) a glowing copy lifts off it   3) the copy glides into Section 2
  //  4) the copy slowly morphs circle -> diamond   5) the real D1 chart fades in under it and adds its details
  useLayoutEffect(() => {
    const cv = ovRef.current
    if (!snap || !cv) return
    const S0 = snap.width, dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = S0 * dpr; cv.height = S0 * dpr
    const ctx = cv.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const c0 = center(snap)
    const r1 = () => (skyRef.current?.querySelector('canvas') ?? skyRef.current!).getBoundingClientRect() // live: layout may still be settling
    const r2 = () => chartRef.current!.getBoundingClientRect()
    const put = (c: { x: number; y: number }, w: number, k = 1) => { cv.style.transform = `translate(${c.x - c0.x}px,${c.y - c0.y}px) scale(${(w / S0) * k})` }
    const draw = (m: number) => { const st = useChart.getState(); drawSky(ctx, S0, chartLive.current, { morphT: m, focusHouse: st.selectedHouse, focusGraha: st.selectedGraha, showNak: st.showNak, showAyanamsa: st.showAyanamsa }) }

    let st: Stage = 'fly1', t0 = performance.now(), dur1 = T_FLY1, first = true, raf = 0, done = false
    const go = (n: Stage, now: number) => { st = n; t0 = now; setStage(n) }

    const tick = (now: number) => {
      const el = now - t0
      if (st === 'fly1') {
        const a = r1(), ca = center(a)
        if (first) { first = false; if (Math.hypot(ca.x - c0.x, ca.y - c0.y) < 6 && Math.abs(a.width / S0 - 1) < 0.03) dur1 = 350 } // already in place (re-generate)
        const p = clamp(el / dur1), e = ease(p)
        put({ x: lerp(c0.x, ca.x, e), y: lerp(c0.y, ca.y, e) }, lerp(S0, a.width, e)); draw(0)
        if (p >= 1) go('copy', now)
      } else if (st === 'copy') {
        const a = r1(), p = clamp(el / T_COPY), lift = Math.sin(Math.PI * p)
        put(center(a), a.width, 1 + 0.05 * lift); draw(0)
        if (p >= 1) go('fly2', now)
      } else if (st === 'fly2') {
        const a = r1(), b = r2(), ca = center(a), cb = center(b)
        const p = clamp(el / T_FLY2), e = ease(p)
        put({ x: lerp(ca.x, cb.x, e), y: lerp(ca.y, cb.y, e) }, lerp(a.width, b.width, e)); draw(0)
        if (p >= 1) go('morph', now)
      } else {
        const b = r2(), pm = clamp((el - T_HOLD) / T_MORPH)
        const m = ease(pm)
        put(center(b), b.width); draw(m)
        if (!done && pm >= X_AT) {                             // cross-fade instead of a hard swap: no jerk at the end
          done = true
          if (useChart.getState().controls.morphT !== 1) useChart.getState().setControls({ morphT: 1 })   // Section 2 now owns the diamond (usually already 1: no store churn mid-animation)
          setPhase('reveal'); setStage(null)
          cv.style.transition = `opacity ${Math.round(T_MORPH * (1 - X_AT) + 350)}ms ease-in`; cv.style.opacity = '0'
          timers.current.push(window.setTimeout(() => setSnap(null), T_MORPH * (1 - X_AT) + 450))
          timers.current.push(window.setTimeout(() => setPanelOn(true), 900))
          timers.current.push(window.setTimeout(() => { setPhase('idle'); setPanelOn(true) }, T_REVEAL))
        }
        if (pm >= 1) return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)                  // timers intentionally NOT cleared here
  }, [snap])

  const drag = (e: React.PointerEvent) => {
    const grid = gridRef.current
    if (!grid) return
    const handle = e.currentTarget as HTMLElement
    handle.setPointerCapture(e.pointerId)
    // the grid is centred, so while there is spare room the handle moves at half the rate of the width change
    const move = (ev: PointerEvent) => {
      const w = useChart.getState().detailWidth
      const hx = handle.getBoundingClientRect().left + 4
      const used = 2 * sizeBudget + 8 + w + 3 * 16
      const f = used < grid.clientWidth ? 1.5 : 1
      s.set({ detailWidth: Math.round(Math.max(190, Math.min(640, w + f * (hx - ev.clientX)))) })
    }
    const up = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up) }
    handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up)
  }

  const ready = phase === 'idle'
  const T = s.arrows
  const sizeBudget = Math.max(340, Math.min(880, vh - (s.generated ? 330 : 300)))
  return (
    <main className="mx-auto max-w-[1700px] px-4 pb-16 sm:px-6">
      <BirthForm onGenerate={handleGenerate} />

      {s.generated && (
        <div className={`mt-3 rise-slow ${ready ? '' : 'pointer-events-none'}`}>
          <ControlsBar />
        </div>
      )}

      <div
        ref={gridRef}
        className={s.generated ? 'mt-4 grid grid-cols-1 gap-x-4 gap-y-10 xl:[grid-template-columns:var(--cols)] xl:justify-between' : 'mt-5'}
        // charts never grow past their square; the third section has a fixed (draggable) width and the group is centred
        style={{ ['--cols' as string]: `minmax(0,${sizeBudget}px) minmax(0,${sizeBudget}px) 8px ${s.detailWidth}px` } as React.CSSProperties}
      >
        <section>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-cyan-400/80">Section 1</div>
              <h3 className="text-sm font-semibold text-white">Celestial Horizon, Sightlines & Morph View</h3>
            </div>
            <div className="flex gap-3">
              <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-400"><input type="checkbox" checked={s.showNak} onChange={(e) => s.set({ showNak: e.target.checked })} className="accent-cyan-400" />27 Nakshatras</label>
              <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-400"><input type="checkbox" checked={s.showAyanamsa} onChange={(e) => s.set({ showAyanamsa: e.target.checked })} className="accent-amber-400" />Ayanamsa arc</label>
            </div>
          </div>
          <div ref={skyRef} style={{ opacity: phase === 'flight' && stage === 'fly1' ? 0 : 1 }}>
            <SkyWheel chart={chart} morphT={0} focusHouse={s.generated ? s.selectedHouse : null} focusGraha={s.generated ? s.selectedGraha : null}
              showNak={s.showNak} showAyanamsa={s.showAyanamsa} maxSize={sizeBudget} onPick={s.generated ? (h, g) => s.select(h, g) : undefined} />
          </div>
          <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-mute">
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#f5b041]" />East = H1</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#a78bfa]" />Zenith = H10</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#fb7185]" />West = H7</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#38bdf8]" />Nadir = H4</span>
          </div>
        </section>

        {s.generated && (
          <section>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2 transition-all duration-1000" style={{ opacity: phase === 'flight' && stage !== 'morph' ? 0 : 1, transform: phase === 'flight' && stage !== 'morph' ? 'translateY(6px)' : 'none' }}>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-amber-400/80">Section 2</div>
                <h3 className="text-sm font-semibold text-white">{s.committed?.name.trim() ? `${s.committed.name.trim()}'s ` : ''}D1 Rashi Chart</h3>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="seg"><button data-on={s.chartStyle === 'north'} onClick={() => s.set({ chartStyle: 'north' })}>North</button><button data-on={s.chartStyle === 'south'} onClick={() => s.set({ chartStyle: 'south' })}>South</button></div>
                
              </div>
            </div>
            <div className="mb-1.5 flex justify-center transition-opacity duration-1000" style={{ opacity: phase === 'flight' && stage !== 'morph' ? 0 : 1 }}><ArrowBar value={T} onChange={(v) => s.set({ arrows: v })} /></div>
            <div ref={chartRef} className="relative mx-auto aspect-square w-full" style={{ maxWidth: sizeBudget }}>
              {/* landing marker while the copy travels in */}
              <div className="pointer-events-none absolute inset-[2%] rounded-full border border-dashed border-sky-300/25 transition-opacity duration-700" style={{ opacity: phase === 'flight' && (stage === 'fly2' || stage === 'morph') ? 1 : 0 }} />
              <div className="absolute inset-0 transition-opacity duration-500" style={{ opacity: phase === 'flight' ? 0 : 1 }}>
                {/* Section 2 wheel: this is the one the "Sky wheel -> Diamond" control drives */}
                <div className="absolute inset-0" style={{ opacity: s.controls.morphT < 0.999 ? 1 : 0, pointerEvents: s.controls.morphT < 0.999 ? 'auto' : 'none', transition: s.controls.morphT < 0.999 ? 'none' : 'opacity 0.25s ease 0.35s' }}>{/* going to the diamond the wheel stays underneath until the SVG diamond has faded in: no blink */}
                  <SkyWheel chart={chart} morphT={s.controls.morphT} focusHouse={s.selectedHouse} focusGraha={s.selectedGraha}
                    showNak={s.showNak} showAyanamsa={s.showAyanamsa} maxSize={sizeBudget} onPick={(h, g) => s.select(h, g)} />
                </div>
                <div className="absolute inset-0 transition-opacity duration-300" style={{ opacity: s.controls.morphT < 0.999 ? 0 : 1, pointerEvents: s.controls.morphT < 0.999 ? 'none' : 'auto' }}>
                  <KundaliChart chart={chart} style={s.chartStyle} focusH={s.selectedHouse} focusG={s.selectedGraha} toggles={T} reveal={phase === 'reveal'} onPick={pickHG} />
                </div>
              </div>
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-mute">
              <span><b className="text-emerald-300">↑</b> exalted</span><span><b className="text-rose-400">↓</b> debilitated</span><span><b className="text-sky-300">★</b> own</span><span>ᶜ combust</span><span>(R) retro</span><span>Click a house or planet to draw its links</span>
            </div>
            <LoopNotes value={T} chart={chart} />
          </section>
        )}

        {s.generated && (
          <div onPointerDown={drag} title="Drag to resize" className={`group hidden cursor-col-resize touch-none transition-opacity duration-700 xl:flex xl:justify-center ${panelOn ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
            <div className="h-full w-px bg-white/10 transition group-hover:bg-accent group-active:bg-accent" />
          </div>
        )}
        {s.generated && (
          <div className={`min-w-0 transition-all duration-700 ease-out ${panelOn ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-4 opacity-0'}`}>
            <DetailPanelM chart={chart} birthChart={birthChart} />
          </div>
        )}
      </div>

      {s.generated && lowerOn && (
        <div className="fade-quick">
          <VargaSectionM chart={chart} />
          <TimingSectionM />
          <ExtraChartsM />
        </div>
      )}

      {snap && <canvas ref={ovRef} style={{ position: 'fixed', left: snap.left, top: snap.top, width: snap.width, height: snap.height, zIndex: 50, pointerEvents: 'none', transformOrigin: '50% 50%', willChange: 'transform, opacity' }} />}
    </main>
  )
}