import { useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { ArrowBar, LoopNotes } from './ArrowBar'
import { DetailPanel } from './DetailPanel'
import { KundaliChart } from './KundaliChart'
import { ArrowToggles, NO_ARROWS } from '../lib/arrows'
import { aspectTargets, computeChart, birthMinute, houseOf, nakshatraOf, rashiOf } from '../lib/chart'
import { GRAHAS, GRAHA_ORDER, GrahaId, NAKSHATRAS, RASHIS } from '../lib/constants'
import { OUTER_INFO, OUTER_PLANETS, OuterPlanet, SEARCH_PLANETS, SearchPlanet, chartAtJd, chartFromPicks, naksInSign, padasInSign, pickLon } from '../lib/customChart'
import { fmtDMS } from '../lib/math'
import { Slot, useAnalysis } from '../store/useAnalysis'
import { useChart } from '../store/useChart'

const dig = (id: GrahaId, sign: number) => (sign === GRAHAS[id].exalted ? '↑' : sign === GRAHAS[id].debilitated ? '↓' : GRAHAS[id].own.includes(sign) ? '★' : '')
const TONE = { good: 'text-emerald-300', bad: 'text-rose-400', own: 'text-sky-300', neutral: 'text-slate-400' } as const
const pickHG = (h: number, g: GrahaId | null) => useChart.getState().select(h, g)

/** one planet (or the Lagna): sign <-> house, nakshatra, pada, quick dignity buttons, "use in search" tick */
function PickRow({ slot }: { slot: Slot }) {
  const outerSlot = slot === 'uranus' || slot === 'neptune'
  const pick = useAnalysis((s) => (slot === 'lagna' ? s.lagna : outerSlot ? s.outer[slot as OuterPlanet] : s.planets[slot as SearchPlanet]))
  const lagnaSign = useAnalysis((s) => s.lagna.sign)
  const use = useAnalysis((s) => !!s.use[slot])
  const setPick = useAnalysis((s) => s.setPick)
  const setUse = useAnalysis((s) => s.setUse)
  const g = slot === 'lagna' || outerSlot ? null : GRAHAS[slot as GrahaId]
  const oi = outerSlot ? OUTER_INFO[slot as OuterPlanet] : null
  const color = g ? g.color : oi ? oi.color : '#e8b04b'
  const quick = g ? [{ k: '↑ Exalted', s: g.exalted }, ...g.own.map((s) => ({ k: '★ Own', s })), { k: '↓ Debilitated', s: g.debilitated }] : []
  const naks = naksInSign(pick.sign), padas = pick.nak !== null ? padasInSign(pick.nak, pick.sign) : []
  const house = ((pick.sign - lagnaSign + 12) % 12) + 1
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[13px] font-semibold" style={{ color }}>{g ? `${g.sym} ${g.name}` : oi ? `${oi.sym} ${oi.name}` : '⬆ Lagna (rising sign)'}{oi && <span className="ml-1.5 text-[10.5px] font-normal text-slate-500">modern, not in Vedic rules</span>}{g && dig(slot as GrahaId, pick.sign) && <span className="ml-1.5 text-[12px]">{dig(slot as GrahaId, pick.sign)}</span>}</div>
        <label className="flex cursor-pointer items-center gap-1.5 text-[11.5px] text-slate-400" title="Tick = this item must match when searching the sky for this chart">
          <input type="checkbox" checked={use} onChange={(e) => setUse(slot, e.target.checked)} className="accent-amber-400" />Match in search
        </label>
      </div>
      <div className={`grid grid-cols-[minmax(0,1fr)] gap-2 ${slot === 'lagna' ? '' : 'sm:grid-cols-[minmax(0,1fr)_minmax(0,6.5rem)]'}`}>
        <div className="min-w-0"><label className="label">Sign</label>
          <select className="input !py-1.5" value={pick.sign} onChange={(e) => setPick(slot, { sign: Number(e.target.value) })}>
            {RASHIS.map((r, i) => <option key={r.name} value={i}>{r.sym} {r.name} · {r.en}{g && dig(slot as GrahaId, i) ? ` ${dig(slot as GrahaId, i)}` : ''}</option>)}
          </select></div>
        {slot !== 'lagna' && (
          <div className="min-w-0"><label className="label">House</label>
            <select className="input !py-1.5" value={house} onChange={(e) => setPick(slot, { sign: (lagnaSign + Number(e.target.value) - 1) % 12 })}>
              {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>House {i + 1}</option>)}
            </select></div>
        )}
      </div>
      {quick.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {quick.map((q, i) => (
            <button key={i} type="button" onClick={() => setPick(slot, { sign: q.s })} aria-pressed={pick.sign === q.s}
              className={`rounded-full border px-2 py-0.5 text-[10.5px] transition ${pick.sign === q.s ? 'border-white/40 bg-white/10 text-white' : 'border-white/10 text-slate-400 hover:text-white'}`}>{q.k} · {RASHIS[q.s].name} · house {((q.s - lagnaSign + 12) % 12) + 1}</button>
          ))}
        </div>
      )}
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,6.5rem)] gap-2">
        <div className="min-w-0"><label className="label">Nakshatra (optional)</label>
          <select className="input !py-1.5" value={pick.nak ?? ''} onChange={(e) => setPick(slot, { nak: e.target.value === '' ? null : Number(e.target.value), pada: null })}>
            <option value="">Any</option>
            {naks.map((n) => <option key={n} value={n}>{NAKSHATRAS[n].name}</option>)}
          </select></div>
        <div className="min-w-0"><label className="label">Pada</label>
          <select className="input !py-1.5" disabled={pick.nak === null} value={pick.pada ?? ''} onChange={(e) => setPick(slot, { pada: e.target.value === '' ? null : Number(e.target.value) })}>
            <option value="">Any</option>
            {padas.map((p) => <option key={p} value={p}>{p} · {NAKSHATRAS[pick.nak!].padas[p - 1]}</option>)}
          </select></div>
      </div>
    </div>
  )
}

export function SkyBuilder() {
  const { lagna, planets, outer, showOuter, style, lat, lon, ayShift } = useAnalysis(useShallow((s) => ({ lagna: s.lagna, planets: s.planets, outer: s.outer, showOuter: s.showOuter, style: s.style, lat: s.lat, lon: s.lon, ayShift: s.ayShift })))
  const set = useAnalysis((s) => s.set)
  const loadChart = useAnalysis((s) => s.loadChart)
  const reset = useAnalysis((s) => s.reset)
  const focusH = useChart((s) => s.selectedHouse)
  const focusG = useChart((s) => s.selectedGraha)
  const generated = useChart((s) => s.generated)
  const savedCharts = useChart((s) => s.saved)
  const keepHouses = useAnalysis((s) => s.keepHouses)
  const [arrows, setArrows] = useState<ArrowToggles>({ ...NO_ARROWS })
  const chart = useMemo(() => chartFromPicks(lagna, planets), [lagna, planets])
  const chosen = (slot: Slot) => (slot === 'lagna' ? lagna : planets[slot as SearchPlanet])
  // Uranus / Neptune: placed in the same houses, shown on the chart as italic extras, never used in arrows, aspects or lordship
  const outerRows = useMemo(() => OUTER_PLANETS.map((id) => {
    const lon = pickLon(outer[id]), ri = rashiOf(lon)
    return { id, lon, ri, house: houseOf(ri, chart.lagnaIdx), nk: nakshatraOf(lon), pick: outer[id] }
  }), [outer, chart.lagnaIdx])
  const extras = useMemo(() => (showOuter ? outerRows.map((o) => ({ id: o.id, label: OUTER_INFO[o.id].short, color: OUTER_INFO[o.id].color, house: o.house, deg: fmtDMS(o.lon % 30) })) : undefined), [showOuter, outerRows])

  const loadMine = () => {
    const st = useChart.getState()
    if (!st.committed) return
    const c = computeChart(st.committed, { minuteOfDay: birthMinute(st.committed), dayOffset: 0, yearOffset: 0, hourOffset: 0, minuteOffset: 0 }, 'sidereal')
    loadChart(c)
  }
  const loadToday = () => loadChart(chartAtJd(Date.now() / 86400000 + 2440587.5, lat, lon, ayShift))

  return (
    <section id="builder" className="scroll-mt-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-amber-400/80">Part 1</div>
          <h2 className="text-xl font-semibold text-white">Build any sky</h2>
          <p className="mt-0.5 max-w-xl text-[13px] text-mute">Put each planet in any sign or house, as exalted, own, debilitated or anywhere else. The chart and the guide update at once. Nothing here depends on a real date.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className="btn" onClick={loadToday} title="Copies today's real sky (at the place in Part 2) into the builder">Start from today's sky</button>
          {generated && <button type="button" className="btn" onClick={loadMine} title="Copies the chart you made on the New chart page">Start from my birth chart</button>}
          {savedCharts.length > 0 && (
            <select className="input !w-auto !py-1.5 text-xs" value="" onChange={(e) => { const sc = savedCharts.find((x) => x.id === e.target.value); if (sc) loadChart(computeChart(sc.birth, { minuteOfDay: birthMinute(sc.birth), dayOffset: 0, yearOffset: 0, hourOffset: 0, minuteOffset: 0 }, 'sidereal')) }}>
              <option value="">Load a saved birth chart…</option>
              {savedCharts.map((sc) => <option key={sc.id} value={sc.id}>{sc.birth.name.trim() || 'Untitled'} · {sc.birth.dob}</option>)}
            </select>
          )}
          <button type="button" className="btn" onClick={reset}>Reset</button>
        </div>
        <label className="flex w-full cursor-pointer items-center gap-2 text-[12.5px] text-slate-300" title="On: changing the Lagna moves every planet with it, so each planet stays in the same house">
          <input type="checkbox" checked={keepHouses} onChange={(e) => set({ keepHouses: e.target.checked })} className="accent-amber-400" />
          When I change the Lagna, keep every planet in the same house <span className="text-slate-500">(a planet in the 8th stays in the 8th; its sign moves with the Lagna)</span>
        </label>
        <label className="flex w-full cursor-pointer items-center gap-2 text-[12.5px] text-slate-300">
          <input type="checkbox" checked={showOuter} onChange={(e) => set({ showOuter: e.target.checked })} className="accent-cyan-400" />
          Also show Uranus and Neptune <span className="text-slate-500">(modern planets: shown for information, not used in traditional rules)</span>
        </label>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-2">
          <PickRow slot="lagna" />
          {SEARCH_PLANETS.map((id) => <PickRow key={id} slot={id} />)}
          {showOuter && OUTER_PLANETS.map((id) => <PickRow key={id} slot={id} />)}
          <div className="rounded-xl border border-dashed border-white/10 p-2.5 text-[12px] text-slate-400">
            <b style={{ color: GRAHAS.ketu.color }}>☋ Ketu</b> is always exactly opposite Rahu, so it follows Rahu automatically: {RASHIS[(planets.rahu.sign + 6) % 12].name}, house {((planets.rahu.sign + 6 - lagna.sign + 12) % 12) + 1}.
          </div>
        </div>

        <div className="min-w-0 lg:sticky lg:top-3 lg:self-start">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">Your chart</h3>
            <div className="seg"><button data-on={style === 'north'} onClick={() => set({ style: 'north' })}>North</button><button data-on={style === 'south'} onClick={() => set({ style: 'south' })}>South</button></div>
          </div>
          <div className="mb-1.5 flex justify-center"><ArrowBar value={arrows} onChange={setArrows} /></div>
          <div className="mx-auto aspect-square w-full max-w-[640px]">
            <KundaliChart chart={chart} style={style} focusH={focusH} focusG={focusG} toggles={arrows} reveal={false} onPick={pickHG} extras={extras} hideDeg />
          </div>
          <div className="mt-1 text-center text-[11px] text-mute">Click a house or planet to draw its links. No degrees are used here: only the sign (and so the house) of each planet matters.</div>
          <LoopNotes value={arrows} chart={chart} />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-semibold text-white">Placements</h3>
          <div className="slim-scroll overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[520px] text-left text-[12px]">
              <thead className="text-[10.5px] uppercase tracking-wider text-slate-500"><tr>
                <th className="px-2.5 py-2">Planet</th><th className="px-2">Sign</th><th className="px-2">House</th><th className="px-2">Nakshatra · pada</th><th className="px-2">Nak. lord</th><th className="px-2">Looks at</th></tr></thead>
              <tbody>
                <tr className="border-t border-white/10"><td className="px-2.5 py-1.5 font-semibold text-amber-300">Lagna</td><td className="px-2">{RASHIS[chart.lagnaIdx].name}</td><td className="px-2">1</td>
                  <td className="px-2">{lagna.nak !== null ? `${NAKSHATRAS[lagna.nak].name}${lagna.pada ? ` · ${lagna.pada}` : ''}` : <span className="text-slate-500">—</span>}</td><td className="px-2">{lagna.nak !== null ? GRAHAS[NAKSHATRAS[lagna.nak].lord].name : ''}</td><td className="px-2" /></tr>
                {GRAHA_ORDER.map((id) => {
                  const p = chart.placements[id], g = GRAHAS[id]
                  const src = id === 'ketu' ? { nak: planets.rahu.nak, pada: planets.rahu.pada } : chosen(id)
                  const nk = nakshatraOf(p.lon)
                  return (
                    <tr key={id} className="border-t border-white/10">
                      <td className="px-2.5 py-1.5 font-semibold" style={{ color: g.color }}>{g.sym} {g.name}</td>
                      <td className="px-2">{RASHIS[p.rashiIdx].name} <span className={TONE[p.dignity.tone]}>{p.dignity.short || ''}</span><div className={`text-[10px] ${TONE[p.dignity.tone]}`}>{p.dignity.label}{p.combust ? ' · combust' : ''}</div></td>
                      <td className="px-2">{p.house}</td>
                      <td className="px-2">{src.nak !== null ? `${nk.name}${src.pada ? ` · ${nk.pada} (${nk.akshar})` : ''}` : <span className="text-slate-500">—</span>}</td>
                      <td className="px-2">{src.nak !== null ? GRAHAS[nk.lord].name : ''}</td>
                      <td className="px-2 text-slate-400">{aspectTargets(id, p.house).map((a) => a.toHouse).join(', ')}</td>
                    </tr>
                  )
                })}
                {showOuter && outerRows.map((o) => {
                  const oi = OUTER_INFO[o.id]
                  return (
                    <tr key={o.id} className="border-t border-white/10">
                      <td className="px-2.5 py-1.5 font-semibold italic" style={{ color: oi.color }}>{oi.sym} {oi.name}</td>
                      <td className="px-2">{RASHIS[o.ri].name}<div className="text-[10px] text-slate-500">modern planet</div></td>
                      <td className="px-2">{o.house}</td>
                      <td className="px-2">{o.pick.nak !== null ? `${o.nk.name}${o.pick.pada ? ` · ${o.nk.pada} (${o.nk.akshar})` : ''}` : <span className="text-slate-500">—</span>}</td>
                      <td className="px-2">{o.pick.nak !== null ? GRAHAS[o.nk.lord].name : ''}</td>
                      <td className="px-2 text-slate-600">not used</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">Houses are whole-sign from the Lagna. “Looks at” = houses aspected (drishti). Combust and exact degrees are not shown, because this chart has only signs. Exalted, debilitated and own sign belong to a sign, so the house of such a planet depends on the Lagna: exalted Jupiter is in Karkat, which is the 8th house only when the Lagna is Dhanu.</p>
        </div>
        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-semibold text-white">House guide for this chart</h3>
          <DetailPanel chart={chart} />
        </div>
      </div>
    </section>
  )
}