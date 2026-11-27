import { useEffect, useMemo, useRef, useState } from 'react'
import { CITIES, GRAHAS, RASHIS } from '../lib/constants'
import { fmtCal, fmtClock, fmtDate, fmtYear, jdToCal, toAstroYear, yearStartJd } from '../lib/calendar'
import { OUTER_INFO, OUTER_PLANETS, Pick, SEARCH_PLANETS, SearchItem } from '../lib/customChart'
import { impossibles } from '../lib/feasibility'
import { Place, searchPlaces } from '../lib/geocode'
import { SearchReq, SkyHit } from '../lib/skyMatch'
import type { WorkerIn, WorkerOut } from '../workers/skySearch.worker'
import { Direction, Era, MAX_YEAR, Mode, Slot, useAnalysis } from '../store/useAnalysis'

const label = (k: string) => (k === 'lagna' ? 'Lagna' : k === 'uranus' || k === 'neptune' ? OUTER_INFO[k].name : GRAHAS[k as keyof typeof GRAHAS].name)
const asNum = (t: string) => { const n = Number(t.trim().replace(',', '.')); return t.trim() !== '' && Number.isFinite(n) ? n : NaN }
const YEAR_D = 365.25
const BATCH_YEARS = 1000          // size of the "scan earlier / later years" step
const CHUNK_YEARS = 250           // "nearest" mode looks at this many years at a time, then checks if it has enough matches
const MIN_JD = () => yearStartJd(-MAX_YEAR + 1), MAX_JD = () => yearStartJd(MAX_YEAR + 1)
const nowJd = () => Date.now() / 86400000 + 2440587.5
const astroToField = (a: number): { y: number; e: Era } => (a <= 0 ? { y: 1 - a, e: 'BCE' } : { y: a, e: 'CE' })

interface Episode { hits: SkyHit[]; start: number; end: number; best: number }
/** windows on neighbouring days belong to one "episode" (the slow planets stay put for days, the Lagna comes round again each day) */
function episodes(hits: SkyHit[]): Episode[] {
  const sorted = [...hits].sort((a, b) => a.startJd - b.startJd), out: Episode[] = []
  for (const h of sorted) {
    const e = out[out.length - 1]
    if (e && h.startJd - e.end <= 1.5) { e.hits.push(h); e.end = Math.max(e.end, h.endJd); e.best = Math.min(e.best, h.misses) }
    else out.push({ hits: [h], start: h.startJd, end: h.endJd, best: h.misses })
  }
  return out
}

function PlaceBox() {
  const place = useAnalysis((s) => s.place), lat = useAnalysis((s) => s.lat), lon = useAnalysis((s) => s.lon), set = useAnalysis((s) => s.set)
  const [q, setQ] = useState(''), [items, setItems] = useState<Place[]>([]), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  const [latT, setLatT] = useState(String(lat)), [lonT, setLonT] = useState(String(lon))
  useEffect(() => { setLatT(String(lat)); setLonT(String(lon)) }, [lat, lon])
  const find = async () => {
    if (q.trim().length < 2) return
    setBusy(true); setMsg('')
    try { const r = await searchPlaces(q.trim()); setItems(r); if (!r.length) setMsg('No places found.') } catch { setMsg('Could not reach the place search. Use the list below or type the numbers.') }
    setBusy(false)
  }
  const bad = (t: string, lo: number, hi: number) => { const n = asNum(t); return !(n >= lo && n <= hi) }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); find() } }} placeholder="Search a city or region…" />
        <button type="button" className="btn shrink-0" onClick={find} disabled={busy}>{busy ? '…' : 'Search'}</button>
      </div>
      {items.length > 0 && (
        <div className="slim-scroll max-h-44 overflow-y-auto rounded-lg border border-white/10">
          {items.map((p) => <button key={p.id} type="button" className="block w-full px-3 py-1.5 text-left text-[12.5px] hover:bg-white/10" onClick={() => { set({ place: p.label, lat: p.lat, lon: p.lon }); setItems([]); setQ('') }}>{p.label}</button>)}
        </div>
      )}
      {msg && <div className="text-[11px] text-amber-300">{msg}</div>}
      <select className="input" value="" onChange={(e) => { const c = CITIES.find((x) => x.key === e.target.value); if (c) set({ place: c.label, lat: c.lat, lon: c.lon }) }}>
        <option value="">Or pick a built-in city…</option>
        {CITIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
      </select>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
        <div><label className="label">Latitude ° (+N / −S)</label>
          <input className={`input font-mono ${bad(latT, -90, 90) ? '!border-rose-400/70' : ''}`} inputMode="decimal" value={latT} onChange={(e) => { setLatT(e.target.value); const n = asNum(e.target.value); if (n >= -90 && n <= 90) set({ lat: n, place: 'Custom coordinates' }) }} /></div>
        <div><label className="label">Longitude ° (+E / −W)</label>
          <input className={`input font-mono ${bad(lonT, -180, 180) ? '!border-rose-400/70' : ''}`} inputMode="decimal" value={lonT} onChange={(e) => { setLonT(e.target.value); const n = asNum(e.target.value); if (n >= -180 && n <= 180) set({ lon: n, place: 'Custom coordinates' }) }} /></div>
      </div>
      <div className="text-[11px] text-slate-500">Using: {place} ({lat.toFixed(3)}, {lon.toFixed(3)}). For a region, type its middle point.</div>
    </div>
  )
}

export function SkyFinder() {
  const st = useAnalysis()
  const { lagna, planets, outer, showOuter, use, run, hits, mode } = st
  const worker = useRef<Worker | null>(null)
  const stopRef = useRef(false)
  const t0 = useRef(0)
  const [sortBy, setSortBy] = useState<'date' | 'match' | 'near'>('date')
  const [openAll, setOpenAll] = useState<Record<number, boolean>>({})
  const [shown, setShown] = useState(40)
  const [, tick] = useState(0)

  useEffect(() => () => { stopRef.current = true; worker.current?.terminate(); worker.current = null; if (useAnalysis.getState().run.status === 'running') useAnalysis.getState().setRun({ status: 'cancelled' }) }, [])
  useEffect(() => { if (run.status !== 'running') return; const id = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(id) }, [run.status])

  const items = ([...SEARCH_PLANETS, ...(showOuter ? OUTER_PLANETS : [])] as SearchItem[]).filter((id) => use[id]) as Slot[]
  if (use.lagna) items.push('lagna')
   const N = items.length
  /** sign only, unless "also match nakshatra and pada" is ticked */
  const eff = (p: Pick): Pick => (st.matchNak ? p : { sign: p.sign, nak: null, pada: null })
  const maxMissOpt = Math.min(st.maxMiss, Math.max(0, N - 1))
  const problems = useMemo(() => impossibles(planets, use), [planets, use])
  const fromY = toAstroYear(st.fromYear, st.fromEra), toY = toAstroYear(st.toYear, st.toEra)
  const yrOk = (y: number) => Number.isInteger(y) && y >= 1 && y <= MAX_YEAR
  const rangeBad = !(yrOk(st.fromYear) && yrOk(st.toYear) && fromY <= toY)
  const ex = st.extra
  const exFromY = toAstroYear(ex.fromYear, ex.fromEra), exToY = toAstroYear(ex.toYear, ex.toEra)
  const extraBad = ex.on && !(yrOk(ex.fromYear) && yrOk(ex.toYear) && exFromY <= exToY)
  const nearBad = !st.nearToday && !yrOk(st.nearYear)
  const placeBad = use.lagna && !(Math.abs(st.lat) <= 90 && Math.abs(st.lon) <= 180)
  const centerY = st.nearToday ? new Date().getUTCFullYear() : toAstroYear(st.nearYear, st.nearEra)
  const reach = mode === 'range' ? Math.max(Math.abs(fromY), Math.abs(toY)) : Math.max(Math.abs(centerY - (st.nearDir === 'future' ? 0 : st.nearSpan)), Math.abs(centerY + (st.nearDir === 'past' ? 0 : st.nearSpan)))
  const far = reach > 3000, veryFar = reach > 6000, extreme = reach > 20000

  /** run one or more time chunks through the background worker, adding hits as they arrive */
  const runChunks = async (chunks: { from: number; to: number }[], o: { append: boolean; stopAfter?: number; meta: Partial<ReturnType<typeof useAnalysis.getState>['run']> }) => {
    worker.current?.terminate()
    const pk: SearchReq['picks'] = {}
    SEARCH_PLANETS.forEach((id) => { if (use[id]) pk[id] = eff(planets[id]) })
    if (showOuter) OUTER_PLANETS.forEach((id) => { if (use[id]) pk[id] = eff(outer[id]) })
    const base = { picks: pk, lagna: use.lagna ? eff(lagna) : null, lat: st.lat, lon: st.lon, ayanamsaShift: st.ayShift, maxMiss: maxMissOpt, maxResults: 400 }
    const A = useAnalysis.getState()
    if (o.append) A.setRun({ status: 'running', message: '', truncated: false, frac: 0 })
    else A.startRun({ lat: st.lat, lon: st.lon, shift: st.ayShift, total: N, maxMiss: maxMissOpt, lo: 1e12, hi: -1e12, ...o.meta })
    setOpenAll({}); if (!o.append) setShown(40)
    stopRef.current = false; t0.current = Date.now()
    const w = new Worker(new URL('../workers/skySearch.worker.ts', import.meta.url), { type: 'module' })
    worker.current = w
    const totalDays = chunks.reduce((a, c) => a + (c.to - c.from), 0) || 1
    let doneDays = 0, status: 'done' | 'cancelled' | 'error' = 'done', message = '', truncated = false
    for (const c of chunks) {
      if (stopRef.current) { status = 'cancelled'; break }
      const res = await new Promise<{ type: 'done'; truncated: boolean; cancelled: boolean } | { type: 'error'; message: string }>((resolve) => {
        let buf: SkyHit[] = []
        const flush = () => { if (buf.length) { useAnalysis.getState().addHits(buf); buf = [] } }
        w.onmessage = (e: MessageEvent<WorkerOut>) => {
          const m = e.data
          if (m.type === 'hit') buf.push(m.hit)
          else if (m.type === 'progress') { flush(); useAnalysis.getState().setRun({ frac: Math.min(1, (doneDays + m.frac * (c.to - c.from)) / totalDays), found: useAnalysis.getState().hits.length, jd: m.jd }) }
          else if (m.type === 'done') { flush(); resolve(m) }
          else if (m.type === 'error') { flush(); resolve(m) }
        }
        w.onerror = () => resolve({ type: 'error', message: 'The background search could not start in this browser.' })
        w.postMessage({ type: 'start', req: { ...base, jdFrom: c.from, jdTo: c.to } } satisfies WorkerIn)
      })
      if (res.type === 'error') { status = 'error'; message = res.message; break }
      if (res.cancelled) { status = 'cancelled'; break }
      const r = useAnalysis.getState().run
      useAnalysis.getState().setRun({ lo: Math.min(r.lo, c.from), hi: Math.max(r.hi, c.to) })
      doneDays += c.to - c.from
      if (res.truncated) { truncated = true; break }
      if (o.stopAfter && episodes(useAnalysis.getState().hits).length >= o.stopAfter) break
    }
    w.terminate(); worker.current = null
    useAnalysis.getState().setRun({ status, message, truncated, frac: status === 'done' ? 1 : useAnalysis.getState().run.frac })
  }
  const cancel = () => { stopRef.current = true; worker.current?.postMessage({ type: 'cancel' } satisfies WorkerIn) }

  const startRange = () => {
    const chunks = [{ from: yearStartJd(fromY), to: yearStartJd(toY + 1) }]
    if (ex.on) chunks.push({ from: yearStartJd(exFromY), to: yearStartJd(exToY + 1) })
    runChunks(chunks, { append: false, meta: { mode: 'range', center: 0 } })
  }
  const startNear = () => {
    const c = st.nearToday ? nowJd() : yearStartJd(toAstroYear(st.nearYear, st.nearEra)) + 182.6
    const step = CHUNK_YEARS * YEAR_D, n = Math.ceil((st.nearSpan * YEAR_D) / step)
    const chunks: { from: number; to: number }[] = []
    for (let k = 0; k < n; k++) {
      if (st.nearDir !== 'past') chunks.push({ from: c + k * step, to: c + (k + 1) * step })
      if (st.nearDir !== 'future') chunks.push({ from: c - (k + 1) * step, to: c - k * step })
    }
    const ok = chunks.filter((x) => x.to > MIN_JD() && x.from < MAX_JD()).map((x) => ({ from: Math.max(x.from, MIN_JD()), to: Math.min(x.to, MAX_JD()) }))
    runChunks(ok, { append: false, stopAfter: st.nearCount, meta: { mode: 'near', center: c } })
  }
  const more = (dir: 'later' | 'earlier') => {
    const step = BATCH_YEARS * YEAR_D
    const c = dir === 'later' ? { from: run.hi, to: Math.min(run.hi + step, MAX_JD()) } : { from: Math.max(run.lo - step, MIN_JD()), to: run.lo }
    runChunks([c], { append: true, meta: {} })
  }
  const canLater = run.hi > 0 && run.hi < MAX_JD() - 1, canEarlier = run.lo < 1e11 && run.lo > MIN_JD() + 1

  const eps = useMemo(() => {
    const e = episodes(hits)
    if (sortBy === 'match') return [...e].sort((a, b) => a.best - b.best || a.start - b.start)
    if (sortBy === 'near' && run.center) return [...e].sort((a, b) => Math.abs((a.start + a.end) / 2 - run.center) - Math.abs((b.start + b.end) / 2 - run.center))
    return e
  }, [hits, sortBy, run.center])
  const off = run.lon / 15                              // local MEAN time: time zones did not exist in ancient times
  const running = run.status === 'running'
  const pct = N ? Math.round(((N - maxMissOpt) / N) * 100) : 100
  const elapsed = running ? Math.round((Date.now() - t0.current) / 1000) : 0
  const eta = running && run.frac > 0.05 ? Math.round((elapsed * (1 - run.frac)) / run.frac) : null

  const analyse = (jd: number) => {
    useAnalysis.getState().setClock(jd)
    setTimeout(() => document.getElementById('clock')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }
  const yearField = (k: 'fromYear' | 'toYear' | 'nearYear', ek: 'fromEra' | 'toEra' | 'nearEra') => (
    <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-1.5">
      <input className="input font-mono" inputMode="numeric" value={Number.isFinite(st[k]) ? st[k] : ''} onChange={(e) => st.set({ [k]: e.target.value === '' ? NaN : Math.floor(Number(e.target.value)) })} />
      <select className="input" value={st[ek]} onChange={(e) => st.set({ [ek]: e.target.value as Era })}><option>CE</option><option>BCE</option></select>
    </div>
  )
  const setEx = (p: Partial<typeof ex>) => st.set({ extra: { ...ex, ...p } })
  const exField = (k: 'fromYear' | 'toYear', ek: 'fromEra' | 'toEra') => (
    <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-1.5">
      <input className="input font-mono" inputMode="numeric" value={Number.isFinite(ex[k]) ? ex[k] : ''} onChange={(e) => setEx({ [k]: e.target.value === '' ? NaN : Math.floor(Number(e.target.value)) })} />
      <select className="input" value={ex[ek]} onChange={(e) => setEx({ [ek]: e.target.value as Era })}><option>CE</option><option>BCE</option></select>
    </div>
  )
  const quick = (a: number, b: number) => { const f = astroToField(a), t = astroToField(b); st.set({ fromYear: f.y, fromEra: f.e, toYear: t.y, toEra: t.e }) }
  const thisYear = new Date().getUTCFullYear()
  const chip = (txt: string, on: () => void) => <button key={txt} type="button" className="rounded-full border border-white/12 px-2.5 py-0.5 text-[11.5px] text-slate-300 hover:text-white" onClick={on}>{txt}</button>
  const rangeYears = Math.max(0, toY - fromY + 1)

  return (
    <section id="finder" className="mt-14 scroll-mt-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-cyan-400/80">Part 2</div>
      <h2 className="text-xl font-semibold text-white">When did (or will) this sky happen?</h2>
      <p className="mt-0.5 max-w-2xl text-[13px] text-mute">The app scans the real sky, in the past or the future, and lists the moments when it looks like the chart in Part 1: same signs (so the same exalted / debilitated planets), same nakshatra and pada if you chose them, and the same rising sign at your place.</p>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-white">What must match</div>
            {N === 0 ? <div className="text-[12px] text-rose-400">Tick at least one item (“Match in search”) in Part 1.</div> : (
              <div className="flex flex-wrap gap-1.5">
                {items.map((k) => {
                  const p = eff(k === 'lagna' ? lagna : k === 'uranus' || k === 'neptune' ? outer[k] : planets[k])
                  return <span key={k} className="rounded-full border border-white/15 px-2 py-0.5 text-[11.5px] text-slate-200">{label(k)} · {RASHIS[p.sign].name}{p.nak !== null ? ` · ${p.pada ? `pada ${p.pada}` : 'nak.'}` : ''}</span>
                })}
              </div>
            )}
                        <label className="mt-2 flex cursor-pointer items-center gap-2 text-[12px] text-slate-300"><input type="checkbox" checked={st.matchNak} onChange={(e) => st.set({ matchNak: e.target.checked })} className="accent-cyan-400" />Also match nakshatra and pada <span className="text-slate-500">(much stricter; leave off to match signs only)</span></label>
            <p className="mt-1 text-[11px] text-slate-500">Change these in Part 1 above. Untick “Match in search” for anything you do not care about. Uranus and Neptune can be added there too; they make the search sharper and faster, because they move so slowly.</p>
            {problems.map((t) => <div key={t} className="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/5 px-2.5 py-1.5 text-[12px] text-amber-200">⚠ {t}</div>)}
          </div>

          <div>
            <label className="label" htmlFor="mm">How close must it be?</label>
            <select id="mm" className="input" value={maxMissOpt} onChange={(e) => st.set({ maxMiss: Number(e.target.value) })}>
              {Array.from({ length: Math.min(4, Math.max(1, N)) }, (_, k) => <option key={k} value={k}>{k === 0 ? 'Exact: every item must match' : `Allow ${k} mismatch${k > 1 ? 'es' : ''}`} ({Math.round(((N - k) / Math.max(N, 1)) * 100)}% or better)</option>)}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">With a mismatch allowed, the list also shows near-matches and tells you which item is off.</p>
          </div>

          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-white">Where to look in time</div>
            <div className="seg mb-3" role="tablist">
              <button type="button" data-on={mode === 'range'} onClick={() => st.set({ mode: 'range' as Mode })}>A range of years</button>
              <button type="button" data-on={mode === 'near'} onClick={() => st.set({ mode: 'near' as Mode })}>Nearest to a date</button>
            </div>

            {mode === 'range' ? (
              <div className="space-y-2">
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div><label className="label">From year</label>{yearField('fromYear', 'fromEra')}</div>
                  <div><label className="label">To year</label>{yearField('toYear', 'toEra')}</div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] text-slate-500">Quick:</span>
                  {chip('Past 1,000 years', () => quick(thisYear - 1000, thisYear))}
                  {chip('Next 1,000 years', () => quick(thisYear, thisYear + 1000))}
                  {chip('±5,000 years', () => quick(thisYear - 5000, thisYear + 5000))}
                  {chip('Next 10,000 years', () => quick(thisYear, thisYear + 10000))}
                  {chip('Past 10,000 years', () => quick(thisYear - 10000, thisYear))}
                  {chip('All BCE (12,000 BCE to 1 BCE)', () => quick(-11999, 0))}
                  {chip('Next 50,000 years', () => quick(thisYear, thisYear + 50000))}
                  {chip('Next 100,000 years', () => quick(thisYear, MAX_YEAR))}
                  {chip('All CE (1 to 2100)', () => quick(1, 2100))}
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-[12px] text-slate-300"><input type="checkbox" checked={ex.on} onChange={(e) => setEx({ on: e.target.checked })} className="accent-cyan-400" />Also search a second range (for example one BCE range and one CE range)</label>
                {ex.on && (
                  <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div><label className="label">Second range: from</label>{exField('fromYear', 'fromEra')}</div>
                    <div><label className="label">Second range: to</label>{exField('toYear', 'toEra')}</div>
                  </div>
                )}
                {extraBad && <div className="text-[12px] text-rose-400">Second range: whole years from 1 to {MAX_YEAR.toLocaleString()}, and “from” must not be after “to”.</div>}
                {rangeBad ? <div className="text-[12px] text-rose-400">Enter whole years from 1 to {MAX_YEAR.toLocaleString()}. “From” must not be after “To”.</div>
                  : <div className="text-[11px] text-slate-500">{rangeYears.toLocaleString()} years: {fmtYear(fromY)} to {fmtYear(toY)}. Exact searches usually take a few seconds even for thousands of years; fewer items or allowed mismatches take longer. You can stop at any time.</div>}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div><label className="label">Look around</label>
                    <select className="input" value={st.nearToday ? 'today' : 'year'} onChange={(e) => st.set({ nearToday: e.target.value === 'today' })}><option value="today">Today</option><option value="year">A year I choose</option></select></div>
                  {!st.nearToday && <div><label className="label">Year</label>{yearField('nearYear', 'nearEra')}</div>}
                  <div><label className="label">Direction</label>
                    <select className="input" value={st.nearDir} onChange={(e) => st.set({ nearDir: e.target.value as Direction })}><option value="future">Future only</option><option value="past">Past only</option><option value="both">Both ways</option></select></div>
                  <div><label className="label">Stop after</label>
                    <select className="input" value={st.nearCount} onChange={(e) => st.set({ nearCount: Number(e.target.value) })}>{[1, 3, 5, 10].map((n) => <option key={n} value={n}>{n} time{n > 1 ? 's' : ''} found</option>)}</select></div>
                  <div><label className="label">Look up to</label>
                    <select className="input" value={st.nearSpan} onChange={(e) => st.set({ nearSpan: Number(e.target.value) })}>{[1000, 3000, 6000, 12000, 30000, 100000].map((n) => <option key={n} value={n}>{n.toLocaleString()} years {st.nearDir === 'both' ? 'each way' : st.nearDir === 'future' ? 'ahead' : 'back'}</option>)}</select></div>
                </div>
                {nearBad && <div className="text-[12px] text-rose-400">Enter a whole year from 1 to {MAX_YEAR.toLocaleString()}.</div>}
                <div className="text-[11px] text-slate-500">The search works outward in {CHUNK_YEARS}-year steps and stops as soon as enough matches are found. If it finds none, press “scan later / earlier years” under the results to keep going.</div>
              </div>
            )}
          </div>
          {far && <div className={`rounded-lg border px-2.5 py-1.5 text-[12px] ${veryFar ? 'border-rose-400/40 bg-rose-400/5 text-rose-200' : 'border-amber-400/30 bg-amber-400/5 text-amber-200'}`}>
            {extreme ? 'This reaches more than 20,000 years from today: treat the dates as a theoretical curiosity, not a real position of the sky. Scanning this far also takes a long time, so use fewer years or add Uranus / Neptune to speed it up. ' : veryFar ? 'This reaches more than 6,000 years from today: results are only a rough guide. ' : 'This reaches more than 3,000 years from today. '}
            The planet tables get less exact and the Earth's spin (ΔT) is uncertain by hours, so Moon, nakshatra and Lagna matches there are approximate and borderline signs can flip. Slow planets (Saturn, Jupiter, Uranus, Neptune, Rahu) stay reliable much longer.</div>}

          <details className="rounded-lg border border-white/10 px-3 py-2">
            <summary className="cursor-pointer text-[12px] text-slate-300">Advanced: ayanamsa shift</summary>
            <div className="mt-2 grid grid-cols-[minmax(0,8rem)_1fr] items-center gap-3">
              <input className="input font-mono" inputMode="decimal" value={st.ayShift} onChange={(e) => { const n = asNum(e.target.value); if (Number.isFinite(n) && Math.abs(n) <= 10) st.set({ ayShift: n }) }} />
              <span className="text-[11px] text-slate-500">Degrees added to Lahiri. 0 = standard Lahiri, as in the rest of the app. Other schools differ by 1° or more, which can move a planet into the next sign.</span>
            </div>
          </details>

          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-white">Where on Earth (needed for the Lagna)</div>
            <PlaceBox />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!running ? <button type="button" className="btn-primary" disabled={N === 0 || placeBad || (mode === 'range' ? rangeBad || extraBad : nearBad)} onClick={mode === 'range' ? startRange : startNear}>Search the sky</button>
              : <button type="button" className="btn !py-2" onClick={cancel}>Stop</button>}
            {running && <span className="text-[12px] text-slate-300">Scanning… {Math.round(run.frac * 100)}% · {fmtDate(run.jd)} · {run.found} found · {elapsed}s{eta !== null ? ` · about ${eta}s left` : ''}</span>}
          </div>
          {running && <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round(run.frac * 100)}%` }} /></div>}
        </div>

        <details className="min-w-0 self-start rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-[12.5px] leading-relaxed text-slate-300" open>
          <summary className="cursor-pointer text-[13px] font-semibold text-white">What the search takes into account</summary>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 marker:text-slate-600">
            <li><b>Time:</b> everything is in Universal Time, then shown as <b>local mean time</b> for your longitude (4 minutes per degree). Modern time zones and daylight saving did not exist in the old eras, so none are used.</li>
            <li><b>Past and future:</b> up to {MAX_YEAR.toLocaleString()} years either side of year 0. The search runs in the background in steps, so the page stays smooth and you can stop it or continue it.</li>
            <li><b>Place:</b> the Lagna changes sign about every 2 hours, and the exact times depend on latitude and longitude. A planet's sign does not depend on the place.</li>
            <li><b>Calendar:</b> dates before 15 Oct 1582 are in the Julian calendar, later ones Gregorian (the historians' rule). Year 1 BCE is followed by 1 CE.</li>
            <li><b>Positions:</b> the same engine as the rest of the app: apparent planet places, Lahiri ayanamsa, mean Rahu. Uranus and Neptune come from the same engine and are only compared by sign / nakshatra. Houses are whole-sign from the Lagna.</li>
            <li><b>What counts as a match:</b> the sign of each planet and of the Lagna. Nakshatra / pada only if you tick “Also match nakshatra and pada”. Degrees, combustion and retrograde are never compared.</li>
            <li><b>If your friend’s own chart is not found:</b> this app uses Lahiri ayanamsa and the <i>mean</i> Rahu. Software that uses another ayanamsa or the <i>true</i> Rahu can put a planet one sign away when it is near a sign edge. Allow 1 mismatch, or use the ayanamsa shift under Advanced.</li>
            <li><b>Real limits:</b> Rahu and Ketu are always opposite; Mercury stays within 1 sign of the Sun; Venus within 2. Charts that break these never occur.</li>
            <li><b>Edge accuracy:</b> window start and end times are found to about a minute. A sign dip shorter than 4 days (a planet touching a sign during a retrograde turn) can be missed.</li>
          </ul>
        </details>
      </div>

      {run.status !== 'idle' && (
        <div className="mt-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">
              {run.status === 'running' ? 'Matches so far' : run.status === 'error' ? 'Search problem' : `${eps.length} time${eps.length === 1 ? '' : 's'} found`}
              <span className="ml-2 font-normal text-slate-400">{run.hi > run.lo ? `scanned ${fmtYear(jdToCal(run.lo).year)} to ${fmtYear(jdToCal(run.hi - 1).year)} · ` : ''}{pct}% match or better</span>
            </h3>
            {eps.length > 1 && <div className="seg"><button data-on={sortBy === 'date'} onClick={() => setSortBy('date')}>By date</button><button data-on={sortBy === 'match'} onClick={() => setSortBy('match')}>Best match first</button>{run.mode === 'near' && <button data-on={sortBy === 'near'} onClick={() => setSortBy('near')}>Nearest to the date</button>}</div>}
          </div>
          {run.status === 'error' && <div className="text-[12px] text-rose-400">{run.message}</div>}
          {run.truncated && <div className="mb-2 rounded-lg border border-amber-400/30 bg-amber-400/5 px-2.5 py-1.5 text-[12px] text-amber-200">Stopped after 400 matching windows. Narrow the years, or tick more items, to see the rest.</div>}
          {run.status === 'cancelled' && <div className="mb-2 text-[12px] text-slate-400">Stopped. The list covers only the years scanned so far.</div>}
          {run.status === 'done' && eps.length === 0 && (
            <div className="rounded-xl border border-white/10 p-4 text-[13px] text-slate-300">
              No moment matches in the years scanned. Scan more years with the buttons below, allow one mismatch, or untick the item that is hardest to match (usually the Moon, a nakshatra, or the Lagna).
            </div>
          )}
          <div className="space-y-3">
            {eps.slice(0, shown).map((ep, ei) => {
              const rows = openAll[ei] ? ep.hits : ep.hits.slice(0, 3)
              const future = ep.start > nowJd()
              return (
                <div key={ep.start} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="text-[13.5px] font-semibold text-white">{fmtDate(ep.start, off)}{fmtDate(ep.start, off) !== fmtDate(ep.end, off) ? ` to ${fmtDate(ep.end, off)}` : ''} <span className="text-[11px] font-normal text-slate-500">{ep.start < 2299160.5 ? 'Julian calendar' : 'Gregorian calendar'}{future ? ' · in the future' : ''}</span></div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${ep.best === 0 ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-200'}`}>{ep.best === 0 ? 'Exact match' : `${Math.round(((run.total - ep.best) / run.total) * 100)}% match`}</span>
                  </div>
                  <div className="mt-2 divide-y divide-white/5">
                    {rows.map((h) => (
                      <div key={h.startJd} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1.5">
                        <div className="min-w-0 text-[12px]">
                          <span className="font-mono text-slate-100">{fmtCal(h.startJd, off, false)} → {fmtClock(h.endJd, off)}</span> <span className="text-slate-500">local mean time</span>
                          <div className="font-mono text-[11px] text-slate-500">UT {fmtClock(h.startJd)} → {fmtClock(h.endJd)}{h.misses > 0 ? <span className="ml-2 font-sans text-amber-200/90">off: {h.missed.map(label).join(', ')}</span> : null}</div>
                        </div>
                        <button type="button" className="btn !py-1" onClick={() => analyse(h.bestJd)}>Look at this sky</button>
                      </div>
                    ))}
                  </div>
                  {ep.hits.length > 3 && <button type="button" className="mt-1 text-[11.5px] text-sky-300 hover:underline" onClick={() => setOpenAll((o) => ({ ...o, [ei]: !o[ei] }))}>{openAll[ei] ? 'Show fewer' : `Show all ${ep.hits.length} windows (about one per day)`}</button>}
                </div>
              )
            })}
          </div>
          {eps.length > shown && <button type="button" className="btn mt-3" onClick={() => setShown((n) => n + 40)}>Show more ({eps.length - shown} left)</button>}
          {!running && run.status !== 'error' && run.hi > run.lo && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
              <button type="button" className="btn" disabled={!canEarlier} onClick={() => more('earlier')}>← Scan {BATCH_YEARS.toLocaleString()} earlier years</button>
              <button type="button" className="btn" disabled={!canLater} onClick={() => more('later')}>Scan {BATCH_YEARS.toLocaleString()} later years →</button>
              <span className="text-[11px] text-slate-500">New matches are added to this list.</span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}