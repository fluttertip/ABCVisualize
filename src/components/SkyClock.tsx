import { useEffect, useMemo, useRef, useState } from 'react'
import { KundaliChart } from './KundaliChart'
import { NO_ARROWS } from '../lib/arrows'
import { fmtCal } from '../lib/calendar'
import { GRAHAS, RASHIS } from '../lib/constants'
import { OUTER_INFO, OUTER_PLANETS, Pick, SEARCH_PLANETS, chartAtJd, outerTropLon } from '../lib/customChart'
import { norm360 } from '../lib/math'
import { matches } from '../lib/skyMatch'
import { useAnalysis } from '../store/useAnalysis'

const SPEEDS = [10, 30, 60, 120]   // minutes of sky time per tick

/** Time travel for one real moment: step a day / week / year, or spin through 24 hours, and watch how the sky compares to your target chart. */
export function SkyClock() {
  const jd = useAnalysis((s) => s.clockJd)
  const setClock = useAnalysis((s) => s.setClock)
  const { lagna, planets, outer, use, showOuter, style, lat, lon, ayShift, matchNak } = useAnalysis()
  const eff = (p: Pick): Pick => (matchNak ? p : { sign: p.sign, nak: null, pada: null })
  const run = useAnalysis((s) => s.run)
  const [spin, setSpin] = useState(false), [speed, setSpeed] = useState(30)
  const spun = useRef(0)
  // the place used by the search that found this moment (falls back to the place in Part 2)
  const pLat = run.status !== 'idle' ? run.lat : lat, pLon = run.status !== 'idle' ? run.lon : lon, pShift = run.status !== 'idle' ? run.shift : ayShift

  useEffect(() => {
    if (!spin) return
    spun.current = 0
    const id = setInterval(() => {
      const cur = useAnalysis.getState().clockJd
      if (cur === null) return
      spun.current += speed
      useAnalysis.getState().setClock(cur + speed / 1440)
      if (spun.current >= 1440) setSpin(false)       // one full turn of the Earth, then stop
    }, 60)
    return () => clearInterval(id)
  }, [spin, speed])

  const chart = useMemo(() => (jd === null ? null : chartAtJd(jd, pLat, pLon, pShift)), [jd, pLat, pLon, pShift])
  if (jd === null || !chart) return null
  const step = (days: number) => setClock(jd + days)
  const off = pLon / 15

  const rows = [
    ...SEARCH_PLANETS.filter((id) => use[id]).map((id) => ({ key: id as string, name: GRAHAS[id].name, ok: matches(chart.placements[id].lon, eff(planets[id])), now: RASHIS[chart.placements[id].rashiIdx].name, want: RASHIS[planets[id].sign].name })),
    ...(showOuter ? OUTER_PLANETS.filter((id) => use[id]).map((id) => { const l = norm360(outerTropLon(id, jd) - chart.ayanamsa); return { key: id as string, name: OUTER_INFO[id].name, ok: matches(l, eff(outer[id])), now: RASHIS[Math.floor(l / 30)].name, want: RASHIS[outer[id].sign].name } }) : []),
    ...(use.lagna ? [{ key: 'lagna', name: 'Lagna', ok: matches(chart.lagnaLon, eff(lagna)), now: RASHIS[chart.lagnaIdx].name, want: RASHIS[lagna.sign].name }] : []),
  ]
  const good = rows.filter((r) => r.ok).length
  const btn = (txt: string, d: number) => <button key={txt} type="button" className="btn !px-2.5 !py-1 font-mono" onClick={() => step(d)}>{txt}</button>

  return (
    <section id="clock" className="mt-14 scroll-mt-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-emerald-400/80">Part 3</div>
      <h2 className="text-xl font-semibold text-white">Look at that sky, and move through time</h2>
      <p className="mt-0.5 max-w-2xl text-[13px] text-mute">The real sky at the moment you picked in Part 2. Step forward or back, or spin one full day to watch the Lagna sweep. The list shows which parts of your target chart match at each moment.</p>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,430px)]">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="font-mono text-[13px] text-white">{fmtCal(jd, off)} <span className="text-slate-500">local mean time</span></div>
            <span className={`rounded-full px-2 py-0.5 text-[11px] ${good === rows.length ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-200'}`}>{good} of {rows.length} match</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5"><span className="w-12 text-[11px] text-mute">Day</span>{btn('−1 day', -1)}{btn('+1 day', 1)}</div>
            <div className="flex flex-wrap items-center gap-1.5"><span className="w-12 text-[11px] text-mute">Week</span>{btn('−1 week', -7)}{btn('+1 week', 7)}</div>
            <div className="flex flex-wrap items-center gap-1.5"><span className="w-12 text-[11px] text-mute">Year</span>{btn('−1 year', -365.25)}{btn('+1 year', 365.25)}</div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-12 text-[11px] text-mute">Spin</span>
              <button type="button" className="btn !py-1" onClick={() => setSpin(!spin)}>{spin ? '⏸ Pause' : '▶ Spin 24h'}</button>
              <select className="btn !bg-transparent !py-1" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>{SPEEDS.map((s) => <option key={s} value={s}>{s} min / tick</option>)}</select>
              <button type="button" className="btn !py-1" onClick={() => { setSpin(false); setClock(useAnalysis.getState().hits.length ? useAnalysis.getState().hits[0].bestJd : jd) }}>Back to first match</button>
            </div>
          </div>
          <div className="slim-scroll mt-3 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[360px] text-left text-[12px]">
              <thead className="text-[10.5px] uppercase tracking-wider text-slate-500"><tr><th className="px-2.5 py-2">Item</th><th className="px-2">Now</th><th className="px-2">Target</th><th className="px-2" /></tr></thead>
              <tbody>{rows.map((r) => <tr key={r.key} className="border-t border-white/10"><td className="px-2.5 py-1.5 font-semibold text-slate-100">{r.name}</td><td className="px-2">{r.now}</td><td className="px-2 text-slate-400">{r.want}</td><td className={`px-2 ${r.ok ? 'text-emerald-300' : 'text-rose-400'}`}>{r.ok ? '✓' : '✗'}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">Weeks and years move the whole sky, so a full match usually breaks after a step. Use “Back to first match” to return.</div>
        </div>
        <div className="mx-auto aspect-square w-full max-w-[520px]">
          <KundaliChart chart={chart} style={style} focusH={1} focusG={null} toggles={NO_ARROWS} reveal={false} onPick={() => undefined} />
        </div>
      </div>
    </section>
  )
}