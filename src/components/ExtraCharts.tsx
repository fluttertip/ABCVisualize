import { useMemo, useState } from 'react'
import { birthMinute, computeChart, nakshatraOf } from '../lib/chart'
import { BhavaMethod, bhavaSet, chalitHouse } from '../lib/chalit'
import { DIAMOND_CELLS, GRAHAS, GRAHA_ORDER, GrahaId, RASHIS, SOUTH_RASHI_POS } from '../lib/constants'
import { siderealAt } from '../lib/engine'
import { Episode, saturnEpisodes, saturnStay } from '../lib/gochar'
import { useChartData } from '../lib/useChartData'
import { GOOD_FROM_MOON, houseFrom } from '../lib/timing'
import { useChart } from '../store/useChart'

const DAY = 86400000
const pad = (n: number) => String(n).padStart(2, '0')
const toLocalInput = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` }
const day = (ms: number) => { const d = new Date(ms); return `${pad(d.getDate())} ${d.toLocaleString('en-GB', { month: 'short' })} ${d.getFullYear()}` }
const degMin = (lon: number) => { const x = ((lon % 30) + 30) % 30, d = Math.floor(x), m = Math.floor((x - d) * 60); return `${d}°${pad(m)}'` }
const pos = (lon: number) => `${RASHIS[Math.floor((((lon % 360) + 360) % 360) / 30)].sym} ${RASHIS[Math.floor((((lon % 360) + 360) % 360) / 30)].name} ${degMin(lon)}`
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`
const span = (ms: number) => { const y = ms / (365.25 * DAY); return y >= 1 ? `${y.toFixed(1)} years` : `${Math.max(1, Math.round(ms / (30.44 * DAY)))} months` }

/* ------------------------------------------------------------------------------------------------ small chart drawer */
export interface Item { text: string; color: string; flag?: boolean }
export interface Cell { house: number; sign: number; items: Item[]; note?: string; tag?: string; hi?: boolean }

/** North (diamond) or South (fixed signs) chart. Cells arrive ready-made, so the same drawer serves Gochar and Bhava Chalit. */
export function MiniChart({ style, cells }: { style: 'north' | 'south'; cells: Cell[] }) {
  return (
    <svg viewBox="0 0 500 500" className="h-auto w-full select-none" role="img">
      {cells.map((c) => {
        const r = RASHIS[c.sign], south = style === 'south'
        const g = south ? (() => { const [col, row] = SOUTH_RASHI_POS[c.sign + 1], w = 117, x = 16 + col * w, y = 16 + row * w; return { x, y, w, cx: x + w / 2, cy: y + w / 2 + 8, lx: x + 8, ly: y + 14 } })() : (() => { const d = DIAMOND_CELLS[c.house - 1]; return { poly: d.poly, cx: d.cx, cy: d.cy, lx: d.rx, ly: d.ry } })()
        const lines = c.items.length + (c.note ? 1 : 0), lh = 15, top = g.cy - ((lines - 1) * lh) / 2
        const fill = c.hi ? 'rgba(232,176,75,0.09)' : 'rgba(255,255,255,0.025)'
        return (
          <g key={c.house}>
            {south
              ? <rect x={(g as { x: number }).x} y={(g as { y: number }).y} width={117} height={117} fill={fill} stroke="rgba(148,163,184,0.45)" strokeWidth={1.1} />
              : <polygon points={(g as { poly: string }).poly} fill={fill} stroke="rgba(148,163,184,0.45)" strokeWidth={1.1} />}
            <text x={g.lx} y={g.ly} textAnchor={south ? 'start' : 'middle'} dominantBaseline="middle" fill="#94a3b8" fontSize="12" fontWeight="700" fontFamily="JetBrains Mono, monospace">
              {south ? `${r.sym} ${r.name}` : r.num}
            </text>
            {south && <text x={g.lx} y={g.ly + 14} fill="#64748b" fontSize="10" fontFamily="JetBrains Mono, monospace">H{c.house}</text>}
            {c.tag && <text x={south ? g.lx + 40 : g.cx} y={south ? g.ly + 14 : top - 20} textAnchor={south ? 'start' : 'middle'} fill="#f5b041" fontSize="10.5" fontWeight="700" fontFamily="JetBrains Mono, monospace">{c.tag}</text>}
            {c.items.map((it, i) => (
              <text key={i} x={g.cx} y={top + i * lh} textAnchor="middle" dominantBaseline="middle" fill={it.color} fontSize="12" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                {it.text}{it.flag && <tspan fill="#fbbf24"> *</tspan>}
              </text>
            ))}
            {c.note && <text x={g.cx} y={top + c.items.length * lh + 2} textAnchor="middle" dominantBaseline="middle" fill="#64748b" fontSize="10" fontFamily="JetBrains Mono, monospace">{c.note}</text>}
          </g>
        )
      })}
    </svg>
  )
}

export const G = ({ id }: { id: GrahaId }) => <b style={{ color: GRAHAS[id].color }}>{GRAHAS[id].sym} {GRAHAS[id].name}</b>
export const Card = ({ t, children }: { t: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5"><div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">{t}</div>{children}</div>
)
export const Th = ({ children }: { children?: React.ReactNode }) => <th className="whitespace-nowrap px-2 py-1.5 text-left text-[10.5px] font-medium uppercase tracking-wider text-slate-500">{children}</th>
export const Td = ({ children, c }: { children?: React.ReactNode; c?: string }) => <td className={`whitespace-nowrap px-2 py-1.5 ${c ?? ''}`}>{children}</td>

/* ------------------------------------------------------------------------------------------------------- GOCHAR */
function Gochar({ natal, style }: { natal: ReturnType<typeof computeChart>; style: 'north' | 'south' }) {
  const [refStr, setRefStr] = useState(() => toLocalInput(Date.now()))
  const [base, setBase] = useState<'moon' | 'lagna'>('moon')
  const [showNatal, setShowNatal] = useState(true)
  const ref = useMemo(() => { const t = new Date(refStr).getTime(); return Number.isFinite(t) ? t : Date.now() }, [refStr])
  const shift = (ms: number) => setRefStr(toLocalInput(ref + ms))
  const moonSign = natal.placements.moon.rashiIdx, lagnaSign = natal.lagnaIdx

  const rows = useMemo(() => {
    const jd = ref / DAY + 2440587.5, now = siderealAt(jd), a = siderealAt(jd - 0.5), b = siderealAt(jd + 0.5)
    return GRAHA_ORDER.map((id) => {
      const lon = now[id], sign = Math.floor(lon / 30)
      let d = b[id] - a[id]; if (d > 180) d -= 360; if (d < -180) d += 360
      const hM = houseFrom(sign, moonSign)
      return { id, lon, sign, retro: id !== 'rahu' && id !== 'ketu' && d < 0, node: id === 'rahu' || id === 'ketu', hL: houseFrom(sign, lagnaSign), hM, good: GOOD_FROM_MOON[id].includes(hM), nak: nakshatraOf(lon) }
    })
  }, [ref, moonSign, lagnaSign])

  const dayKey = Math.floor(ref / DAY)
  const sat = useMemo(() => {
    const t = dayKey * DAY + DAY / 2
    return { sade: saturnEpisodes([moonSign + 11, moonSign, moonSign + 1], t), d4: saturnEpisodes([moonSign + 3], t), d8: saturnEpisodes([moonSign + 7], t), stay: saturnStay(t) }
  }, [moonSign, dayKey])

  const rel = rows.find((r) => r.id === 'saturn')!.hM
  const inEp = (e: Episode[]) => e.find((x) => x.start <= ref && ref < x.end)
  const nextEp = (e: Episode[]) => e.find((x) => x.start > ref)
  const sadeNow = inEp(sat.sade), sadeNext = nextEp(sat.sade)
  const dh = [{ name: 'Small Panoti (Kantak Shani, Saturn 4th from Moon)', eps: sat.d4 }, { name: 'Ashtama Shani (Saturn 8th from Moon)', eps: sat.d8 }]
  const dhNow = dh.find((d) => (d.name.startsWith('Small') ? rel === 4 : rel === 8))
  const dhNext = dh.map((d) => ({ name: d.name, ep: nextEp(d.eps) })).filter((x) => x.ep).sort((p, q) => p.ep!.start - q.ep!.start)[0]
  const phase = rel === 12 ? 'first phase (Saturn in the 12th from your Moon)' : rel === 1 ? 'middle phase (Saturn over your Moon sign)' : 'last phase (Saturn in the 2nd from your Moon)'

  const baseSign = base === 'moon' ? moonSign : lagnaSign
  const cells: Cell[] = Array.from({ length: 12 }, (_, i) => {
    const sign = (baseSign + i) % 12
    const nat = showNatal ? [...(sign === lagnaSign && base === 'moon' ? ['As'] : []), ...GRAHA_ORDER.filter((id) => natal.placements[id].rashiIdx === sign).map((id) => GRAHAS[id].short)] : []
    return {
      house: i + 1, sign, hi: i === 0,
      tag: i === 0 ? (base === 'moon' ? 'Moon sign' : 'Asc') : undefined,
      items: rows.filter((r) => r.sign === sign).map((r) => ({ text: `${GRAHAS[r.id].short}${r.retro ? 'ᴿ' : ''} ${Math.floor(r.lon % 30)}°`, color: GRAHAS[r.id].color })),
      note: nat.length ? `natal ${nat.join(' ')}` : undefined,
    }
  })

  return (
    <div>
      <p className="mb-3 max-w-3xl text-[12.5px] leading-relaxed text-slate-400">
        <b className="text-slate-200">Gochar</b> means “transit”: where the planets are in the sky on a chosen day, read against <i>your</i> birth chart. Coloured planets are today’s positions; grey “natal” text is where they stood at your birth.
        Gochar adds timing colour on top of your birth chart and your dasha. It does not replace them.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input type="datetime-local" className="btn !bg-transparent !py-1" value={refStr} onChange={(e) => setRefStr(e.target.value)} aria-label="Transit date and time" />
        <button className="btn !py-1" onClick={() => setRefStr(toLocalInput(Date.now()))}>Now</button>
        <button className="btn !py-1" onClick={() => shift(-30.44 * DAY)}>−1 month</button><button className="btn !py-1" onClick={() => shift(-DAY)}>−1 day</button>
        <button className="btn !py-1" onClick={() => shift(DAY)}>+1 day</button><button className="btn !py-1" onClick={() => shift(30.44 * DAY)}>+1 month</button>
        <div className="seg ml-auto" role="group" aria-label="Count houses from"><button data-on={base === 'moon'} onClick={() => setBase('moon')}>From Moon</button><button data-on={base === 'lagna'} onClick={() => setBase('lagna')}>From Lagna</button></div>
        <label className="flex items-center gap-1.5 text-[12px] text-slate-400"><input type="checkbox" checked={showNatal} onChange={(e) => setShowNatal(e.target.checked)} />Show natal planets</label>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div>
          <MiniChart style={style} cells={cells} />
          <p className="mt-1 text-center text-[11px] text-mute">House 1 = {base === 'moon' ? `your natal Moon sign (${RASHIS[moonSign].name})` : `your Lagna (${RASHIS[lagnaSign].name})`} · ᴿ = retrograde</p>
        </div>

        <div className="min-w-0 space-y-3">
          <Card t={`Saturn · counted from your natal Moon in ${RASHIS[moonSign].sym} ${RASHIS[moonSign].name}`}>
            {sadeNow ? (
              <div className="text-[13px] leading-relaxed text-slate-300">
                <div className="text-[15px] font-semibold text-white">Sade Sati is running · {phase.split(' (')[0]}</div>
                <div>{phase.includes('(') ? `(${phase.split(' (')[1]}` : ''}</div>
                <div className="mt-1 font-mono text-[12px] text-slate-200">{day(sadeNow.start)} → {day(sadeNow.end)} <span className="text-slate-500">({span(sadeNow.end - sadeNow.start)}, {span(sadeNow.end - ref)} left)</span></div>
              </div>
            ) : dhNow ? (
              <div className="text-[13px] leading-relaxed text-slate-300">
                <div className="text-[15px] font-semibold text-white">{dhNow.name.split(' (')[0]} is running</div>
                <div>({dhNow.name.split(' (')[1]}</div>
                <div className="mt-1 font-mono text-[12px] text-slate-200">{day(sat.stay.start)} → {day(sat.stay.end)}</div>
              </div>
            ) : (
              <div className="text-[13px] leading-relaxed text-slate-300"><div className="text-[15px] font-semibold text-white">No Sade Sati or Dhaiya at this date</div></div>
            )}
            {(!sadeNow || dhNext) && (
              <ul className="mt-2 space-y-0.5 border-t border-white/10 pt-2 text-[12px] text-slate-400">
                {!sadeNow && sadeNext && <li>Next Sade Sati: <span className="font-mono text-slate-200">{day(sadeNext.start)} → {day(sadeNext.end)}</span></li>}
                {!dhNow && dhNext && <li>Next Dhaiya: {dhNext.name.split(' (')[0]} <span className="font-mono text-slate-200">{day(dhNext.ep!.start)} → {day(dhNext.ep!.end)}</span></li>}
              </ul>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-mute">Dates are by sign entry (sidereal Lahiri). Saturn’s retrograde can dip it back into a sign, so other software may differ by days or weeks, and some count Sade Sati from the Moon’s <i>degree</i> instead.</p>
          </Card>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-[12.5px]">
              <thead className="bg-white/[0.03]"><tr><Th>Planet</Th><Th>Sign · degree</Th><Th>Star</Th><Th>From Lagna</Th><Th>From Moon</Th><Th>Moon rule</Th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-white/5">
                    <Td><G id={r.id} />{r.retro && <span className="ml-1 text-[10.5px] text-rose-300">retro</span>}</Td>
                    <Td c="font-mono text-slate-200">{RASHIS[r.sign].sym} {RASHIS[r.sign].name} {degMin(r.lon)}</Td>
                    <Td c="text-slate-400">{r.nak.name} {r.nak.pada}</Td>
                    <Td c="text-slate-200">{ordinal(r.hL)} house</Td>
                    <Td c="text-slate-200">{ordinal(r.hM)} house</Td>
                    <Td c={r.good ? 'font-semibold text-emerald-300' : 'text-slate-500'}>{r.good ? '✓ good house' : '–'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] leading-relaxed text-mute">“Moon rule” ✓ = the planet is in one of the houses the classical texts call favourable for that planet when counted from the natal Moon (same lists as Section 5). Vedha (the blocking rule) is not applied. Rahu and Ketu use the mean node.</p>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------------------------------- BHAVA CHALIT */
function Chalit({ natal, style }: { natal: ReturnType<typeof computeChart>; style: 'north' | 'south' }) {
  const [method, setMethod] = useState<BhavaMethod>('sripati')
  const set = useMemo(() => bhavaSet(natal, method), [natal, method])
  const rows = useMemo(() => GRAHA_ORDER.map((id) => {
    const p = natal.placements[id], ch = chalitHouse(p.lon, set), b = set.bhavas[ch - 1]
    const fromStart = ((p.lon - b.start) % 360 + 360) % 360, toEnd = ((b.end - p.lon) % 360 + 360) % 360
    return { id, p, d1: p.house, ch, moved: ch !== p.house, edge: Math.min(fromStart, toEnd) }
  }), [natal, set])
  const moved = rows.filter((r) => r.moved)

  const cells: Cell[] = set.bhavas.map((b) => ({
    house: b.house, sign: Math.floor(b.mid / 30), hi: b.house === 1,
    tag: b.house === 1 ? 'Asc' : b.house === 10 && set.method === 'sripati' ? 'MC' : undefined,
    items: rows.filter((r) => r.ch === b.house).map((r) => ({ text: `${GRAHAS[r.id].short}${r.p.retro ? 'ᴿ' : ''} ${Math.floor(r.p.degInSign)}°`, color: GRAHAS[r.id].color, flag: r.moved })),
  }))

  return (
    <div>
      <p className="mb-3 max-w-3xl text-[12.5px] leading-relaxed text-slate-400">
        <b className="text-slate-200">Bhava Chalit</b> is a second view of the same birth chart. In the normal D1 chart a planet is in a house because of its <i>sign</i>.
        In Chalit each house gets a real width around its own centre, so a planet near the edge of a sign can move into the next or the previous house.
        Many astrologers read <i>house matters</i> (what a planet gives, and in which area) from Chalit, and keep D1 for signs, dignity, aspects, yogas and dasha. Schools differ, so look at both.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="seg" role="group" aria-label="House method"><button data-on={method === 'sripati'} onClick={() => setMethod('sripati')}>Sripati (usual)</button><button data-on={method === 'equal'} onClick={() => setMethod('equal')}>Equal house</button></div>
        <span className="text-[11.5px] text-mute">{method === 'sripati' ? 'Houses centred between Lagna, IC, Descendant and Midheaven.' : 'Every house exactly 30°, centred on your Lagna degree.'}</span>
      </div>
      {set.method !== set.asked && <p className="mb-2 text-[12px] text-amber-300">At this birth latitude Sripati houses are not usable, so equal houses are shown.</p>}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div>
          <MiniChart style={style} cells={cells} />
          <p className="mt-1 text-center text-[11px] text-mute"><span className="text-amber-300">*</span> = house is different from D1 · ᴿ = retrograde</p>
        </div>
        <div className="min-w-0 space-y-3">
          <Card t="Does anything change?">
            {moved.length === 0
              ? <p className="text-[13px] text-slate-300">No planet changes house. D1 and Chalit agree for this birth chart.</p>
              : <ul className="space-y-1 text-[13px] text-slate-300">{moved.map((r) => <li key={r.id}><G id={r.id} />: D1 <b className="text-white">{ordinal(r.d1)} house</b> → Chalit <b className="text-white">{ordinal(r.ch)} house</b> <span className="text-slate-500">({r.edge.toFixed(1)}° inside the new house edge)</span></li>)}</ul>}
          </Card>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-[12.5px]">
              <thead className="bg-white/[0.03]"><tr><Th>Planet</Th><Th>Position</Th><Th>D1 house</Th><Th>Chalit house</Th><Th>From house edge</Th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={`border-t border-white/5 ${r.moved ? 'bg-amber-300/[0.06]' : ''}`}>
                    <Td><G id={r.id} /></Td>
                    <Td c="font-mono text-slate-200">{pos(r.p.lon)}</Td>
                    <Td c="text-slate-300">{ordinal(r.d1)}</Td>
                    <Td c={r.moved ? 'font-semibold text-amber-200' : 'text-slate-300'}>{ordinal(r.ch)}{r.moved ? ' · moved' : ''}</Td>
                    <Td c={!r.moved && r.edge < 2 ? 'text-amber-200' : 'text-slate-500'}>{r.edge.toFixed(1)}°{!r.moved && r.edge < 2 ? ' · near edge' : ''}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-[12.5px]">
              <thead className="bg-white/[0.03]"><tr><Th>House</Th><Th>Starts</Th><Th>Centre</Th><Th>Ends</Th><Th>Planets inside</Th></tr></thead>
              <tbody>
                {set.bhavas.map((b) => (
                  <tr key={b.house} className="border-t border-white/5">
                    <Td c="font-semibold text-slate-100">{ordinal(b.house)}</Td>
                    <Td c="font-mono text-slate-300">{pos(b.start)}</Td><Td c="font-mono text-slate-200">{pos(b.mid)}</Td><Td c="font-mono text-slate-300">{pos(b.end)}</Td>
                    <Td>{rows.filter((r) => r.ch === b.house).map((r) => <span key={r.id} className="mr-2"><G id={r.id} /></span>)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------------------------------------ SECTION */
export function ExtraCharts() {
  const { birth } = useChartData()
  const [tab, setTab] = useState<'gochar' | 'chalit'>('gochar')
  const [style, setStyle] = useState<'north' | 'south'>(() => useChart.getState().chartStyle)
  // always the sidereal chart of the birth moment (Gochar and Chalit are Vedic tools)
  const natal = useMemo(() => computeChart(birth, { minuteOfDay: birthMinute(birth), dayOffset: 0, yearOffset: 0, hourOffset: 0, minuteOffset: 0 }, 'sidereal'), [birth])
  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-mute">Section 6</div>
      <h2 className="text-[15px] font-semibold text-white">Gochar (transits) &amp; Bhava Chalit</h2>
      <p className="mb-3 text-[11px] text-mute">Sidereal Lahiri · always counted from your birth moment, whatever time you moved the chart to above.</p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button className={`btn !py-1 text-[11.5px] ${tab === 'gochar' ? '!border-white/25 !bg-white/12 !text-white' : ''}`} onClick={() => setTab('gochar')}>Gochar · transit chart</button>
        <button className={`btn !py-1 text-[11.5px] ${tab === 'chalit' ? '!border-white/25 !bg-white/12 !text-white' : ''}`} onClick={() => setTab('chalit')}>Bhava Chalit</button>
        <div className="seg ml-auto" role="group" aria-label="Chart style"><button data-on={style === 'north'} onClick={() => setStyle('north')}>North</button><button data-on={style === 'south'} onClick={() => setStyle('south')}>South</button></div>
      </div>
      {tab === 'gochar' ? <Gochar natal={natal} style={style} /> : <Chalit natal={natal} style={style} />}
    </section>
  )
}

// import { useMemo, useState } from 'react'
// import { birthMinute, computeChart, nakshatraOf } from '../lib/chart'
// import { BhavaMethod, bhavaSet, chalitHouse } from '../lib/chalit'
// import { DIAMOND_CELLS, GRAHAS, GRAHA_ORDER, GrahaId, RASHIS, SOUTH_RASHI_POS } from '../lib/constants'
// import { siderealAt } from '../lib/engine'
// import { Episode, saturnEpisodes, saturnStay } from '../lib/gochar'
// import { useChartData } from '../lib/useChartData'
// import { GOOD_FROM_MOON, houseFrom } from '../lib/timing'
// import { useChart } from '../store/useChart'

// const DAY = 86400000
// const pad = (n: number) => String(n).padStart(2, '0')
// const toLocalInput = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` }
// const day = (ms: number) => { const d = new Date(ms); return `${pad(d.getDate())} ${d.toLocaleString('en-GB', { month: 'short' })} ${d.getFullYear()}` }
// const degMin = (lon: number) => { const x = ((lon % 30) + 30) % 30, d = Math.floor(x), m = Math.floor((x - d) * 60); return `${d}°${pad(m)}'` }
// const pos = (lon: number) => `${RASHIS[Math.floor((((lon % 360) + 360) % 360) / 30)].sym} ${RASHIS[Math.floor((((lon % 360) + 360) % 360) / 30)].name} ${degMin(lon)}`
// const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`
// const span = (ms: number) => { const y = ms / (365.25 * DAY); return y >= 1 ? `${y.toFixed(1)} years` : `${Math.max(1, Math.round(ms / (30.44 * DAY)))} months` }

// /* ------------------------------------------------------------------------------------------------ small chart drawer */
// interface Item { text: string; color: string; flag?: boolean }
// interface Cell { house: number; sign: number; items: Item[]; note?: string; tag?: string; hi?: boolean }

// /** North (diamond) or South (fixed signs) chart. Cells arrive ready-made, so the same drawer serves Gochar and Bhava Chalit. */
// function MiniChart({ style, cells }: { style: 'north' | 'south'; cells: Cell[] }) {
//   return (
//     <svg viewBox="0 0 500 500" className="h-auto w-full select-none" role="img">
//       {cells.map((c) => {
//         const r = RASHIS[c.sign], south = style === 'south'
//         const g = south ? (() => { const [col, row] = SOUTH_RASHI_POS[c.sign + 1], w = 117, x = 16 + col * w, y = 16 + row * w; return { x, y, w, cx: x + w / 2, cy: y + w / 2 + 8, lx: x + 8, ly: y + 14 } })() : (() => { const d = DIAMOND_CELLS[c.house - 1]; return { poly: d.poly, cx: d.cx, cy: d.cy, lx: d.rx, ly: d.ry } })()
//         const lines = c.items.length + (c.note ? 1 : 0), lh = 15, top = g.cy - ((lines - 1) * lh) / 2
//         const fill = c.hi ? 'rgba(232,176,75,0.09)' : 'rgba(255,255,255,0.025)'
//         return (
//           <g key={c.house}>
//             {south
//               ? <rect x={(g as { x: number }).x} y={(g as { y: number }).y} width={117} height={117} fill={fill} stroke="rgba(148,163,184,0.45)" strokeWidth={1.1} />
//               : <polygon points={(g as { poly: string }).poly} fill={fill} stroke="rgba(148,163,184,0.45)" strokeWidth={1.1} />}
//             <text x={g.lx} y={g.ly} textAnchor={south ? 'start' : 'middle'} dominantBaseline="middle" fill="#94a3b8" fontSize="12" fontWeight="700" fontFamily="JetBrains Mono, monospace">
//               {south ? `${r.sym} ${r.name}` : r.num}
//             </text>
//             {south && <text x={g.lx} y={g.ly + 14} fill="#64748b" fontSize="10" fontFamily="JetBrains Mono, monospace">H{c.house}</text>}
//             {c.tag && <text x={south ? g.lx + 40 : g.cx} y={south ? g.ly + 14 : top - 20} textAnchor={south ? 'start' : 'middle'} fill="#f5b041" fontSize="10.5" fontWeight="700" fontFamily="JetBrains Mono, monospace">{c.tag}</text>}
//             {c.items.map((it, i) => (
//               <text key={i} x={g.cx} y={top + i * lh} textAnchor="middle" dominantBaseline="middle" fill={it.color} fontSize="12" fontWeight="700" fontFamily="JetBrains Mono, monospace">
//                 {it.text}{it.flag && <tspan fill="#fbbf24"> *</tspan>}
//               </text>
//             ))}
//             {c.note && <text x={g.cx} y={top + c.items.length * lh + 2} textAnchor="middle" dominantBaseline="middle" fill="#64748b" fontSize="10" fontFamily="JetBrains Mono, monospace">{c.note}</text>}
//           </g>
//         )
//       })}
//     </svg>
//   )
// }

// const G = ({ id }: { id: GrahaId }) => <b style={{ color: GRAHAS[id].color }}>{GRAHAS[id].sym} {GRAHAS[id].name}</b>
// const Card = ({ t, children }: { t: string; children: React.ReactNode }) => (
//   <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5"><div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">{t}</div>{children}</div>
// )
// const Th = ({ children }: { children?: React.ReactNode }) => <th className="whitespace-nowrap px-2 py-1.5 text-left text-[10.5px] font-medium uppercase tracking-wider text-slate-500">{children}</th>
// const Td = ({ children, c }: { children?: React.ReactNode; c?: string }) => <td className={`whitespace-nowrap px-2 py-1.5 ${c ?? ''}`}>{children}</td>

// /* ------------------------------------------------------------------------------------------------------- GOCHAR */
// function Gochar({ natal, style }: { natal: ReturnType<typeof computeChart>; style: 'north' | 'south' }) {
//   const [refStr, setRefStr] = useState(() => toLocalInput(Date.now()))
//   const [base, setBase] = useState<'moon' | 'lagna'>('moon')
//   const [showNatal, setShowNatal] = useState(true)
//   const ref = useMemo(() => { const t = new Date(refStr).getTime(); return Number.isFinite(t) ? t : Date.now() }, [refStr])
//   const shift = (ms: number) => setRefStr(toLocalInput(ref + ms))
//   const moonSign = natal.placements.moon.rashiIdx, lagnaSign = natal.lagnaIdx

//   const rows = useMemo(() => {
//     const jd = ref / DAY + 2440587.5, now = siderealAt(jd), a = siderealAt(jd - 0.5), b = siderealAt(jd + 0.5)
//     return GRAHA_ORDER.map((id) => {
//       const lon = now[id], sign = Math.floor(lon / 30)
//       let d = b[id] - a[id]; if (d > 180) d -= 360; if (d < -180) d += 360
//       const hM = houseFrom(sign, moonSign)
//       return { id, lon, sign, retro: id !== 'rahu' && id !== 'ketu' && d < 0, node: id === 'rahu' || id === 'ketu', hL: houseFrom(sign, lagnaSign), hM, good: GOOD_FROM_MOON[id].includes(hM), nak: nakshatraOf(lon) }
//     })
//   }, [ref, moonSign, lagnaSign])

//   const dayKey = Math.floor(ref / DAY)
//   const sat = useMemo(() => {
//     const t = dayKey * DAY + DAY / 2
//     return { sade: saturnEpisodes([moonSign + 11, moonSign, moonSign + 1], t), d4: saturnEpisodes([moonSign + 3], t), d8: saturnEpisodes([moonSign + 7], t), stay: saturnStay(t) }
//   }, [moonSign, dayKey])

//   const rel = rows.find((r) => r.id === 'saturn')!.hM
//   const inEp = (e: Episode[]) => e.find((x) => x.start <= ref && ref < x.end)
//   const nextEp = (e: Episode[]) => e.find((x) => x.start > ref)
//   const sadeNow = inEp(sat.sade), sadeNext = nextEp(sat.sade)
//   const dh = [{ name: 'Small Panoti (Kantak Shani, Saturn 4th from Moon)', eps: sat.d4 }, { name: 'Ashtama Shani (Saturn 8th from Moon)', eps: sat.d8 }]
//   const dhNow = dh.find((d) => (d.name.startsWith('Small') ? rel === 4 : rel === 8))
//   const dhNext = dh.map((d) => ({ name: d.name, ep: nextEp(d.eps) })).filter((x) => x.ep).sort((p, q) => p.ep!.start - q.ep!.start)[0]
//   const phase = rel === 12 ? 'first phase (Saturn in the 12th from your Moon)' : rel === 1 ? 'middle phase (Saturn over your Moon sign)' : 'last phase (Saturn in the 2nd from your Moon)'

//   const baseSign = base === 'moon' ? moonSign : lagnaSign
//   const cells: Cell[] = Array.from({ length: 12 }, (_, i) => {
//     const sign = (baseSign + i) % 12
//     const nat = showNatal ? [...(sign === lagnaSign && base === 'moon' ? ['As'] : []), ...GRAHA_ORDER.filter((id) => natal.placements[id].rashiIdx === sign).map((id) => GRAHAS[id].short)] : []
//     return {
//       house: i + 1, sign, hi: i === 0,
//       tag: i === 0 ? (base === 'moon' ? 'Moon sign' : 'Asc') : undefined,
//       items: rows.filter((r) => r.sign === sign).map((r) => ({ text: `${GRAHAS[r.id].short}${r.retro ? 'ᴿ' : ''} ${Math.floor(r.lon % 30)}°`, color: GRAHAS[r.id].color })),
//       note: nat.length ? `natal ${nat.join(' ')}` : undefined,
//     }
//   })

//   return (
//     <div>
//       <p className="mb-3 max-w-3xl text-[12.5px] leading-relaxed text-slate-400">
//         <b className="text-slate-200">Gochar</b> means “transit”: where the planets are in the sky on a chosen day, read against <i>your</i> birth chart. Coloured planets are today’s positions; grey “natal” text is where they stood at your birth.
//         Gochar adds timing colour on top of your birth chart and your dasha. It does not replace them.
//       </p>
//       <div className="mb-3 flex flex-wrap items-center gap-2">
//         <input type="datetime-local" className="btn !bg-transparent !py-1" value={refStr} onChange={(e) => setRefStr(e.target.value)} aria-label="Transit date and time" />
//         <button className="btn !py-1" onClick={() => setRefStr(toLocalInput(Date.now()))}>Now</button>
//         <button className="btn !py-1" onClick={() => shift(-30.44 * DAY)}>−1 month</button><button className="btn !py-1" onClick={() => shift(-DAY)}>−1 day</button>
//         <button className="btn !py-1" onClick={() => shift(DAY)}>+1 day</button><button className="btn !py-1" onClick={() => shift(30.44 * DAY)}>+1 month</button>
//         <div className="seg ml-auto" role="group" aria-label="Count houses from"><button data-on={base === 'moon'} onClick={() => setBase('moon')}>From Moon</button><button data-on={base === 'lagna'} onClick={() => setBase('lagna')}>From Lagna</button></div>
//         <label className="flex items-center gap-1.5 text-[12px] text-slate-400"><input type="checkbox" checked={showNatal} onChange={(e) => setShowNatal(e.target.checked)} />Show natal planets</label>
//       </div>

//       <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
//         <div>
//           <MiniChart style={style} cells={cells} />
//           <p className="mt-1 text-center text-[11px] text-mute">House 1 = {base === 'moon' ? `your natal Moon sign (${RASHIS[moonSign].name})` : `your Lagna (${RASHIS[lagnaSign].name})`} · ᴿ = retrograde</p>
//         </div>

//         <div className="min-w-0 space-y-3">
//           <Card t={`Saturn · counted from your natal Moon in ${RASHIS[moonSign].sym} ${RASHIS[moonSign].name}`}>
//             {sadeNow ? (
//               <div className="text-[13px] leading-relaxed text-slate-300">
//                 <div className="text-[15px] font-semibold text-white">Sade Sati is running · {phase.split(' (')[0]}</div>
//                 <div>{phase.includes('(') ? `(${phase.split(' (')[1]}` : ''}</div>
//                 <div className="mt-1 font-mono text-[12px] text-slate-200">{day(sadeNow.start)} → {day(sadeNow.end)} <span className="text-slate-500">({span(sadeNow.end - sadeNow.start)}, {span(sadeNow.end - ref)} left)</span></div>
//               </div>
//             ) : dhNow ? (
//               <div className="text-[13px] leading-relaxed text-slate-300">
//                 <div className="text-[15px] font-semibold text-white">{dhNow.name.split(' (')[0]} is running</div>
//                 <div>({dhNow.name.split(' (')[1]}</div>
//                 <div className="mt-1 font-mono text-[12px] text-slate-200">{day(sat.stay.start)} → {day(sat.stay.end)}</div>
//               </div>
//             ) : (
//               <div className="text-[13px] leading-relaxed text-slate-300"><div className="text-[15px] font-semibold text-white">No Sade Sati or Dhaiya at this date</div></div>
//             )}
//             {(!sadeNow || dhNext) && (
//               <ul className="mt-2 space-y-0.5 border-t border-white/10 pt-2 text-[12px] text-slate-400">
//                 {!sadeNow && sadeNext && <li>Next Sade Sati: <span className="font-mono text-slate-200">{day(sadeNext.start)} → {day(sadeNext.end)}</span></li>}
//                 {!dhNow && dhNext && <li>Next Dhaiya: {dhNext.name.split(' (')[0]} <span className="font-mono text-slate-200">{day(dhNext.ep!.start)} → {day(dhNext.ep!.end)}</span></li>}
//               </ul>
//             )}
//             <p className="mt-2 text-[11px] leading-relaxed text-mute">Dates are by sign entry (sidereal Lahiri). Saturn’s retrograde can dip it back into a sign, so other software may differ by days or weeks, and some count Sade Sati from the Moon’s <i>degree</i> instead.</p>
//           </Card>

//           <div className="overflow-x-auto rounded-xl border border-white/10">
//             <table className="w-full text-[12.5px]">
//               <thead className="bg-white/[0.03]"><tr><Th>Planet</Th><Th>Sign · degree</Th><Th>Star</Th><Th>From Lagna</Th><Th>From Moon</Th><Th>Moon rule</Th></tr></thead>
//               <tbody>
//                 {rows.map((r) => (
//                   <tr key={r.id} className="border-t border-white/5">
//                     <Td><G id={r.id} />{r.retro && <span className="ml-1 text-[10.5px] text-rose-300">retro</span>}</Td>
//                     <Td c="font-mono text-slate-200">{RASHIS[r.sign].sym} {RASHIS[r.sign].name} {degMin(r.lon)}</Td>
//                     <Td c="text-slate-400">{r.nak.name} {r.nak.pada}</Td>
//                     <Td c="text-slate-200">{ordinal(r.hL)} house</Td>
//                     <Td c="text-slate-200">{ordinal(r.hM)} house</Td>
//                     <Td c={r.good ? 'font-semibold text-emerald-300' : 'text-slate-500'}>{r.good ? '✓ good house' : '–'}</Td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//           <p className="text-[11px] leading-relaxed text-mute">“Moon rule” ✓ = the planet is in one of the houses the classical texts call favourable for that planet when counted from the natal Moon (same lists as Section 5). Vedha (the blocking rule) is not applied. Rahu and Ketu use the mean node.</p>
//         </div>
//       </div>
//     </div>
//   )
// }

// /* -------------------------------------------------------------------------------------------------- BHAVA CHALIT */
// function Chalit({ natal, style }: { natal: ReturnType<typeof computeChart>; style: 'north' | 'south' }) {
//   const [method, setMethod] = useState<BhavaMethod>('sripati')
//   const set = useMemo(() => bhavaSet(natal, method), [natal, method])
//   const rows = useMemo(() => GRAHA_ORDER.map((id) => {
//     const p = natal.placements[id], ch = chalitHouse(p.lon, set), b = set.bhavas[ch - 1]
//     const fromStart = ((p.lon - b.start) % 360 + 360) % 360, toEnd = ((b.end - p.lon) % 360 + 360) % 360
//     return { id, p, d1: p.house, ch, moved: ch !== p.house, edge: Math.min(fromStart, toEnd) }
//   }), [natal, set])
//   const moved = rows.filter((r) => r.moved)

//   const cells: Cell[] = set.bhavas.map((b) => ({
//     house: b.house, sign: Math.floor(b.mid / 30), hi: b.house === 1,
//     tag: b.house === 1 ? 'Asc' : b.house === 10 && set.method === 'sripati' ? 'MC' : undefined,
//     items: rows.filter((r) => r.ch === b.house).map((r) => ({ text: `${GRAHAS[r.id].short}${r.p.retro ? 'ᴿ' : ''} ${Math.floor(r.p.degInSign)}°`, color: GRAHAS[r.id].color, flag: r.moved })),
//   }))

//   return (
//     <div>
//       <p className="mb-3 max-w-3xl text-[12.5px] leading-relaxed text-slate-400">
//         <b className="text-slate-200">Bhava Chalit</b> is a second view of the same birth chart. In the normal D1 chart a planet is in a house because of its <i>sign</i>.
//         In Chalit each house gets a real width around its own centre, so a planet near the edge of a sign can move into the next or the previous house.
//         Many astrologers read <i>house matters</i> (what a planet gives, and in which area) from Chalit, and keep D1 for signs, dignity, aspects, yogas and dasha. Schools differ, so look at both.
//       </p>
//       <div className="mb-3 flex flex-wrap items-center gap-2">
//         <div className="seg" role="group" aria-label="House method"><button data-on={method === 'sripati'} onClick={() => setMethod('sripati')}>Sripati (usual)</button><button data-on={method === 'equal'} onClick={() => setMethod('equal')}>Equal house</button></div>
//         <span className="text-[11.5px] text-mute">{method === 'sripati' ? 'Houses centred between Lagna, IC, Descendant and Midheaven.' : 'Every house exactly 30°, centred on your Lagna degree.'}</span>
//       </div>
//       {set.method !== set.asked && <p className="mb-2 text-[12px] text-amber-300">At this birth latitude Sripati houses are not usable, so equal houses are shown.</p>}

//       <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
//         <div>
//           <MiniChart style={style} cells={cells} />
//           <p className="mt-1 text-center text-[11px] text-mute"><span className="text-amber-300">*</span> = house is different from D1 · ᴿ = retrograde</p>
//         </div>
//         <div className="min-w-0 space-y-3">
//           <Card t="Does anything change?">
//             {moved.length === 0
//               ? <p className="text-[13px] text-slate-300">No planet changes house. D1 and Chalit agree for this birth chart.</p>
//               : <ul className="space-y-1 text-[13px] text-slate-300">{moved.map((r) => <li key={r.id}><G id={r.id} />: D1 <b className="text-white">{ordinal(r.d1)} house</b> → Chalit <b className="text-white">{ordinal(r.ch)} house</b> <span className="text-slate-500">({r.edge.toFixed(1)}° inside the new house edge)</span></li>)}</ul>}
//           </Card>
//           <div className="overflow-x-auto rounded-xl border border-white/10">
//             <table className="w-full text-[12.5px]">
//               <thead className="bg-white/[0.03]"><tr><Th>Planet</Th><Th>Position</Th><Th>D1 house</Th><Th>Chalit house</Th><Th>From house edge</Th></tr></thead>
//               <tbody>
//                 {rows.map((r) => (
//                   <tr key={r.id} className={`border-t border-white/5 ${r.moved ? 'bg-amber-300/[0.06]' : ''}`}>
//                     <Td><G id={r.id} /></Td>
//                     <Td c="font-mono text-slate-200">{pos(r.p.lon)}</Td>
//                     <Td c="text-slate-300">{ordinal(r.d1)}</Td>
//                     <Td c={r.moved ? 'font-semibold text-amber-200' : 'text-slate-300'}>{ordinal(r.ch)}{r.moved ? ' · moved' : ''}</Td>
//                     <Td c={!r.moved && r.edge < 2 ? 'text-amber-200' : 'text-slate-500'}>{r.edge.toFixed(1)}°{!r.moved && r.edge < 2 ? ' · near edge' : ''}</Td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//           <div className="overflow-x-auto rounded-xl border border-white/10">
//             <table className="w-full text-[12.5px]">
//               <thead className="bg-white/[0.03]"><tr><Th>House</Th><Th>Starts</Th><Th>Centre</Th><Th>Ends</Th><Th>Planets inside</Th></tr></thead>
//               <tbody>
//                 {set.bhavas.map((b) => (
//                   <tr key={b.house} className="border-t border-white/5">
//                     <Td c="font-semibold text-slate-100">{ordinal(b.house)}</Td>
//                     <Td c="font-mono text-slate-300">{pos(b.start)}</Td><Td c="font-mono text-slate-200">{pos(b.mid)}</Td><Td c="font-mono text-slate-300">{pos(b.end)}</Td>
//                     <Td>{rows.filter((r) => r.ch === b.house).map((r) => <span key={r.id} className="mr-2"><G id={r.id} /></span>)}</Td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }

// /* ------------------------------------------------------------------------------------------------------ SECTION */
// export function ExtraCharts() {
//   const { birth } = useChartData()
//   const [tab, setTab] = useState<'gochar' | 'chalit'>('gochar')
//   const [style, setStyle] = useState<'north' | 'south'>(() => useChart.getState().chartStyle)
//   // always the sidereal chart of the birth moment (Gochar and Chalit are Vedic tools)
//   const natal = useMemo(() => computeChart(birth, { minuteOfDay: birthMinute(birth), dayOffset: 0, yearOffset: 0, hourOffset: 0, minuteOffset: 0 }, 'sidereal'), [birth])
//   return (
//     <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
//       <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-mute">Section 6</div>
//       <h2 className="text-[15px] font-semibold text-white">Gochar (transits) &amp; Bhava Chalit</h2>
//       <p className="mb-3 text-[11px] text-mute">Sidereal Lahiri · always counted from your birth moment, whatever time you moved the chart to above.</p>
//       <div className="mb-3 flex flex-wrap items-center gap-2">
//         <button className={`btn !py-1 text-[11.5px] ${tab === 'gochar' ? '!border-white/25 !bg-white/12 !text-white' : ''}`} onClick={() => setTab('gochar')}>Gochar · transit chart</button>
//         <button className={`btn !py-1 text-[11.5px] ${tab === 'chalit' ? '!border-white/25 !bg-white/12 !text-white' : ''}`} onClick={() => setTab('chalit')}>Bhava Chalit</button>
//         <div className="seg ml-auto" role="group" aria-label="Chart style"><button data-on={style === 'north'} onClick={() => setStyle('north')}>North</button><button data-on={style === 'south'} onClick={() => setStyle('south')}>South</button></div>
//       </div>
//       {tab === 'gochar' ? <Gochar natal={natal} style={style} /> : <Chalit natal={natal} style={style} />}
//     </section>
//   )
// }