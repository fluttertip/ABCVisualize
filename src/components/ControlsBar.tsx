import { useEffect, useRef, useState } from 'react'
import { effectiveDateTime } from '../lib/chart'
import { useChart } from '../store/useChart'

const pad = (n: number) => String(n).padStart(2, '0')

function Stepper({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, Math.round(v))))
  return (
    <div className="flex items-center gap-1">
      <span className="w-9 text-[11px] text-mute">{label}</span>
      <button className="btn !px-2 !py-1" onClick={() => set(value - 1)}>−</button>
      <input className="input !w-14 !px-1 !py-1 text-center font-mono text-xs" type="number" value={value} onChange={(e) => set(Number(e.target.value) || 0)} />
      <button className="btn !px-2 !py-1" onClick={() => set(value + 1)}>+</button>
    </div>
  )
}

export function ControlsBar() {
  const { controls: c, setControls, committed } = useChart()
  const [spin, setSpin] = useState(false)
  const [speed, setSpeed] = useState(5)
  const raf = useRef(0)
  const busy = useRef(false)

  useEffect(() => {
    if (!spin) return
    const id = setInterval(() => setControls({ minuteOfDay: (useChart.getState().controls.minuteOfDay + speed) % 1440 }), 45)
    return () => clearInterval(id)
  }, [spin, speed, setControls])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const setTod = (m: number) => setControls({ minuteOfDay: ((Math.round(m) % 1440) + 1440) % 1440 })
  const day = (d: number) => setControls({ dayOffset: Math.max(-36500, Math.min(36500, c.dayOffset + d)) })

  const animateMorph = () => {
    if (busy.current) return
    busy.current = true
    const from = c.morphT, to = from < 0.5 ? 1 : 0, t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 1800), e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2
      setControls({ morphT: from + (to - from) * e })
      if (p < 1) raf.current = requestAnimationFrame(tick); else busy.current = false
    }
    raf.current = requestAnimationFrame(tick)
  }

  const eff = committed ? effectiveDateTime(committed, c) : ''
  const Head = ({ t, r }: { t: string; r: string }) => <div className="mb-1.5 flex items-baseline justify-between gap-2"><span className="text-xs font-semibold text-white">{t}</span><span className="font-mono text-[11px] text-slate-300">{r}</span></div>

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-5 border-y border-white/10 py-3 lg:grid-cols-[1fr_1.25fr_0.7fr]">
      <div>
        <Head t="Earth spin · Lagna sweep (24h)" r={`${pad(Math.floor(c.minuteOfDay / 60))}:${pad(c.minuteOfDay % 60)}`} />
        <input type="range" min={0} max={1439} value={c.minuteOfDay} onChange={(e) => setTod(Number(e.target.value))} />
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <Stepper label="Hour" value={Math.floor(c.minuteOfDay / 60)} min={0} max={23} onChange={(h) => setTod(h * 60 + (c.minuteOfDay % 60))} />
          <Stepper label="Min" value={c.minuteOfDay % 60} min={0} max={59} onChange={(m) => setTod(Math.floor(c.minuteOfDay / 60) * 60 + m)} />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {([[-10, '-10m'], [-1, '-1m'], [1, '+1m'], [10, '+10m']] as const).map(([v, l]) => <button key={l} className="btn !px-2 !py-1 font-mono" onClick={() => setTod(c.minuteOfDay + v)}>{l}</button>)}
          <select className="btn !bg-transparent !py-1" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>{[1, 5, 15, 30].map((s) => <option key={s} value={s}>{s}x</option>)}</select>
          <button className="btn !py-1" onClick={() => setSpin(!spin)}>{spin ? '⏸ Pause' : '▶ Spin 24h'}</button>
        </div>
      </div>

      <div>
        <Head t="Planetary orbit offset" r={eff} />
        <input type="range" min={-365} max={365} value={Math.max(-365, Math.min(365, c.dayOffset))} onChange={(e) => setControls({ dayOffset: Number(e.target.value) })} />
        <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1.5">
          <Stepper label="Year" value={c.yearOffset} min={-120} max={120} onChange={(v) => setControls({ yearOffset: v })} />
          <Stepper label="Day" value={c.dayOffset} min={-36500} max={36500} onChange={(v) => setControls({ dayOffset: v })} />
          <Stepper label="Hour" value={c.hourOffset} min={-100000} max={100000} onChange={(v) => setControls({ hourOffset: v })} />
          <Stepper label="Min" value={c.minuteOffset} min={-100000} max={100000} onChange={(v) => setControls({ minuteOffset: v })} />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <button className="btn !px-2 !py-1 font-mono" onClick={() => day(-27)}>−1 moon</button>
          <button className="btn !px-2 !py-1 font-mono" onClick={() => day(27)}>+1 moon</button>
          <button className="btn !px-2 !py-1 font-mono" onClick={() => setControls({ yearOffset: c.yearOffset - 1 })}>−1y</button>
          <button className="btn !px-2 !py-1 font-mono" onClick={() => setControls({ yearOffset: c.yearOffset + 1 })}>+1y</button>
          <button className="btn !py-1" onClick={() => setControls({ dayOffset: 0, yearOffset: 0, hourOffset: 0, minuteOffset: 0 })}>Reset offset</button>
        </div>
      </div>

      <div>
        <Head t="Section 2 · Wheel → Diamond" r={`${Math.round(c.morphT * 100)}%`} />
        <input type="range" min={0} max={1} step={0.01} value={c.morphT} onChange={(e) => setControls({ morphT: Number(e.target.value) })} />
        <div className="mt-1.5"><button className="btn !py-1" onClick={animateMorph}>Animate morph</button><span className="ml-2 text-[11px] text-mute">drives Section 2 only</span></div>
      </div>
    </div>
  )
}
