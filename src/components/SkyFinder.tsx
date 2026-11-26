import { useEffect, useMemo, useRef, useState } from 'react'
import { CITIES, GRAHAS, RASHIS } from '../lib/constants'
import { fmtCal, fmtClock, fmtDate, fmtYear, toAstroYear, yearStartJd } from '../lib/calendar'
import { SEARCH_PLANETS, SearchPlanet, chartAtJd } from '../lib/customChart'
import { impossibles } from '../lib/feasibility'
import { Place, searchPlaces } from '../lib/geocode'
import { SearchReq, SkyHit } from '../lib/skyMatch'
import type { WorkerIn, WorkerOut } from '../workers/skySearch.worker'
import { Era, Slot, useAnalysis } from '../store/useAnalysis'

const label = (k: string) => (k === 'lagna' ? 'Lagna' : GRAHAS[k as keyof typeof GRAHAS].name)
const asNum = (t: string) => { const n = Number(t.trim().replace(',', '.')); return t.trim() !== '' && Number.isFinite(n) ? n : NaN }

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

export function SkyFinder({ onAnalyse }: { onAnalyse: () => void }) {
  const st = useAnalysis()
  const { lagna, planets, use, run, hits } = st
  const worker = useRef<Worker | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'match'>('date')
  const [openAll, setOpenAll] = useState<Record<number, boolean>>({})
  const [shown, setShown] = useState(40)

  useEffect(() => () => { worker.current?.terminate(); worker.current = null; if (useAnalysis.getState().run.status === 'running') useAnalysis.getState().setRun({ status: 'cancelled' }) }, [])

  const items = (SEARCH_PLANETS.filter((id) => use[id]) as Slot[]).concat(use.lagna ? ['lagna'] : [])
  const N = items.length
  const maxMissOpt = Math.min(st.maxMiss, Math.max(0, N - 1))
  const problems = useMemo(() => impossibles(planets, use), [planets, use])
  const fromY = toAstroYear(st.fromYear, st.fromEra), toY = toAstroYear(st.toYear, st.toEra)
  const rangeBad = !(Number.isInteger(st.fromYear) && Number.isInteger(st.toYear) && st.fromYear >= 1 && st.toYear >= 1 && st.fromYear <= 9999 && st.toYear <= 9999 && fromY <= toY)
  const placeBad = use.lagna && !(Math.abs(st.lat) <= 90 && Math.abs(st.lon) <= 180)
  const far = fromY < -3000 || toY > 3000

  const start = () => {
    worker.current?.terminate()
    const pk: SearchReq['picks'] = {}
    SEARCH_PLANETS.forEach((id) => { if (use[id]) pk[id as SearchPlanet] = planets[id] })
    const jdFrom = yearStartJd(fromY), jdTo = yearStartJd(toY + 1)
    const req: SearchReq = { picks: pk, lagna: use.lagna ? lagna : null, lat: st.lat, lon: st.lon, ayanamsaShift: st.ayShift, jdFrom, jdTo, maxMiss: maxMissOpt, maxResults: 400 }
    useAnalysis.getState().startRun({ lat: st.lat, lon: st.lon, shift: st.ayShift, total: N, maxMiss: maxMissOpt, fromJd: jdFrom, toJd: jdTo })
    setOpenAll({}); setShown(40)
    const w = new Worker(new URL('../workers/skySearch.worker.ts', import.meta.url), { type: 'module' })
    worker.current = w
    let buf: SkyHit[] = []
    const flush = () => { if (buf.length) { useAnalysis.getState().addHits(buf); buf = [] } }
    w.onmessage = (e: MessageEvent<WorkerOut>) => {
      const m = e.data
      if (m.type === 'hit') buf.push(m.hit)
      else if (m.type === 'progress') { flush(); useAnalysis.getState().setRun({ frac: m.frac, found: m.found, jd: m.jd }) }
      else if (m.type === 'done') { flush(); useAnalysis.getState().setRun({ status: m.cancelled ? 'cancelled' : 'done', truncated: m.truncated, frac: m.cancelled ? useAnalysis.getState().run.frac : 1 }); w.terminate(); worker.current = null }
      else if (m.type === 'error') { flush(); useAnalysis.getState().setRun({ status: 'error', message: m.message }); w.terminate(); worker.current = null }
    }
    w.onerror = () => { useAnalysis.getState().setRun({ status: 'error', message: 'The background search could not start in this browser.' }); worker.current = null }
    w.postMessage({ type: 'start', req } satisfies WorkerIn)
  }
  const cancel = () => worker.current?.postMessage({ type: 'cancel' } satisfies WorkerIn)

  const eps = useMemo(() => {
    const e = episodes(hits)
    return sortBy === 'match' ? [...e].sort((a, b) => a.best - b.best || a.start - b.start) : e
  }, [hits, sortBy])
  const off = run.lon / 15                              // local MEAN time: time zones did not exist in ancient times
  const running = run.status === 'running'
  const pct = N ? Math.round(((N - maxMissOpt) / N) * 100) : 100

  const analyse = (jd: number) => {
    useAnalysis.getState().loadChart(chartAtJd(jd, run.lat, run.lon, run.shift))
    onAnalyse()
  }
  const yearField = (k: 'fromYear' | 'toYear', ek: 'fromEra' | 'toEra') => (
    <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-1.5">
      <input className="input font-mono" inputMode="numeric" value={Number.isFinite(st[k]) ? st[k] : ''} onChange={(e) => st.set({ [k]: e.target.value === '' ? NaN : Math.floor(Number(e.target.value)) })} />
      <select className="input" value={st[ek]} onChange={(e) => st.set({ [ek]: e.target.value as Era })}><option>CE</option><option>BCE</option></select>
    </div>
  )

  return (
    <section id="finder" className="mt-14 scroll-mt-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-cyan-400/80">Part 2</div>
      <h2 className="text-xl font-semibold text-white">When did (or will) this sky happen?</h2>
      <p className="mt-0.5 max-w-2xl text-[13px] text-mute">The app scans the real sky through the years you choose and lists the moments when it looks like the chart in Part 1: same signs (so the same exalted / debilitated planets), same nakshatra and pada if you chose them, and the same rising sign at your place.</p>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-white">What must match</div>
            {N === 0 ? <div className="text-[12px] text-rose-400">Tick at least one item (“Match in search”) in Part 1.</div> : (
              <div className="flex flex-wrap gap-1.5">
                {items.map((k) => {
                  const p = k === 'lagna' ? lagna : planets[k as SearchPlanet]
                  return <span key={k} className="rounded-full border border-white/15 px-2 py-0.5 text-[11.5px] text-slate-200">{label(k)} · {RASHIS[p.sign].name}{p.nak !== null ? ` · ${p.pada ? `pada ${p.pada}` : 'nak.'}` : ''}</span>
                })}
              </div>
            )}
            <p className="mt-1 text-[11px] text-slate-500">Change these in Part 1 above. Untick “Match in search” for anything you do not care about.</p>
            {problems.map((t) => <div key={t} className="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/5 px-2.5 py-1.5 text-[12px] text-amber-200">⚠ {t}</div>)}
          </div>

          <div>
            <label className="label" htmlFor="mm">How close must it be?</label>
            <select id="mm" className="input" value={maxMissOpt} onChange={(e) => st.set({ maxMiss: Number(e.target.value) })}>
              {Array.from({ length: Math.min(4, Math.max(1, N)) }, (_, k) => <option key={k} value={k}>{k === 0 ? 'Exact: every item must match' : `Allow ${k} mismatch${k > 1 ? 'es' : ''}`} ({Math.round(((N - k) / Math.max(N, 1)) * 100)}% or better)</option>)}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">With a mismatch allowed, the list also shows near-matches and tells you which item is off.</p>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div><label className="label">From year</label>{yearField('fromYear', 'fromEra')}</div>
            <div><label className="label">To year</label>{yearField('toYear', 'toEra')}</div>
          </div>
          {rangeBad && <div className="text-[12px] text-rose-400">Enter whole years from 1 to 9999. “From” must not be after “To”.</div>}
          {far && <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-2.5 py-1.5 text-[12px] text-amber-200">Before 3000 BCE or after 3000 CE the planet tables are less exact, and the Earth's spin (ΔT) is uncertain by hours. Treat Moon, nakshatra and Lagna matches there as approximate and expect borderline signs to flip.</div>}

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
            {!running ? <button type="button" className="btn-primary" disabled={N === 0 || rangeBad || placeBad} onClick={start}>Search the sky</button>
              : <button type="button" className="btn !py-2" onClick={cancel}>Stop</button>}
            {running && <span className="text-[12px] text-slate-300">Scanning… {Math.round(run.frac * 100)}% · {fmtDate(run.jd)} · {run.found} found</span>}
          </div>
          {running && <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round(run.frac * 100)}%` }} /></div>}
        </div>

        <details className="min-w-0 self-start rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-[12.5px] leading-relaxed text-slate-300" open>
          <summary className="cursor-pointer text-[13px] font-semibold text-white">What the search takes into account</summary>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 marker:text-slate-600">
            <li><b>Time:</b> everything is in Universal Time, then shown as <b>local mean time</b> for your longitude (4 minutes per degree). Modern time zones and daylight saving did not exist in the old eras, so none are used.</li>
            <li><b>Place:</b> the Lagna changes sign about every 2 hours, and the exact times depend on latitude and longitude. A planet's sign does not depend on the place.</li>
            <li><b>Calendar:</b> dates before 15 Oct 1582 are in the Julian calendar, later ones Gregorian (the historians' rule). Year 1 BCE is followed by 1 CE.</li>
            <li><b>Positions:</b> the same engine as the rest of the app: apparent planet places, Lahiri ayanamsa, mean Rahu. Houses are whole-sign from the Lagna.</li>
            <li><b>What counts as a match:</b> the sign, and the nakshatra / pada when you chose them. Degrees are not compared. Retrograde is not compared.</li>
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
              <span className="ml-2 font-normal text-slate-400">{fmtYear(fromY)} to {fmtYear(toY)} · {pct}% match or better</span>
            </h3>
            {eps.length > 1 && <div className="seg"><button data-on={sortBy === 'date'} onClick={() => setSortBy('date')}>By date</button><button data-on={sortBy === 'match'} onClick={() => setSortBy('match')}>Best match first</button></div>}
          </div>
          {run.status === 'error' && <div className="text-[12px] text-rose-400">{run.message}</div>}
          {run.truncated && <div className="mb-2 rounded-lg border border-amber-400/30 bg-amber-400/5 px-2.5 py-1.5 text-[12px] text-amber-200">Stopped after 400 matching windows. Narrow the years, or tick more items, to see the rest.</div>}
          {run.status === 'cancelled' && <div className="mb-2 text-[12px] text-slate-400">Stopped. The list covers only the years scanned so far.</div>}
          {run.status === 'done' && eps.length === 0 && (
            <div className="rounded-xl border border-white/10 p-4 text-[13px] text-slate-300">
              No moment matches in these years. Try a wider range, allow one mismatch, or untick the item that is hardest to match (usually the Moon, a nakshatra, or the Lagna).
            </div>
          )}
          <div className="space-y-3">
            {eps.slice(0, shown).map((ep, ei) => {
              const rows = openAll[ei] ? ep.hits : ep.hits.slice(0, 3)
              return (
                <div key={ep.start} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="text-[13.5px] font-semibold text-white">{fmtDate(ep.start, off)}{fmtDate(ep.start, off) !== fmtDate(ep.end, off) ? ` to ${fmtDate(ep.end, off)}` : ''} <span className="text-[11px] font-normal text-slate-500">{ep.start < 2299160.5 ? 'Julian calendar' : 'Gregorian calendar'}</span></div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${ep.best === 0 ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-200'}`}>{ep.best === 0 ? 'Exact match' : `${Math.round(((run.total - ep.best) / run.total) * 100)}% match`}</span>
                  </div>
                  <div className="mt-2 divide-y divide-white/5">
                    {rows.map((h) => (
                      <div key={h.startJd} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1.5">
                        <div className="min-w-0 text-[12px]">
                          <span className="font-mono text-slate-100">{fmtCal(h.startJd, off, false)} → {fmtClock(h.endJd, off)}</span> <span className="text-slate-500">local mean time</span>
                          <div className="font-mono text-[11px] text-slate-500">UT {fmtClock(h.startJd)} → {fmtClock(h.endJd)}{h.misses > 0 ? <span className="ml-2 font-sans text-amber-200/90">off: {h.missed.map(label).join(', ')}</span> : null}</div>
                        </div>
                        <button type="button" className="btn !py-1" onClick={() => analyse(h.bestJd)}>Analyse this sky</button>
                      </div>
                    ))}
                  </div>
                  {ep.hits.length > 3 && <button type="button" className="mt-1 text-[11.5px] text-sky-300 hover:underline" onClick={() => setOpenAll((o) => ({ ...o, [ei]: !o[ei] }))}>{openAll[ei] ? 'Show fewer' : `Show all ${ep.hits.length} windows (about one per day)`}</button>}
                </div>
              )
            })}
          </div>
          {eps.length > shown && <button type="button" className="btn mt-3" onClick={() => setShown((n) => n + 40)}>Show more ({eps.length - shown} left)</button>}
        </div>
      )}
    </section>
  )
}