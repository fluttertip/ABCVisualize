import { useMemo, useState } from 'react'
import { birthMinute, computeChart } from '../lib/chart'
import { GRAHAS, GrahaId, RASHIS } from '../lib/constants'
import { siderealAt } from '../lib/engine'
import { AV_PLANETS, AV_SOURCES, AvPlanet, ashtakavarga } from '../lib/ashtakavarga'
import { SB_PLANETS, SHADBALA_NOTES, shadbala } from '../lib/shadbala'
import { useChartData } from '../lib/useChartData'
import { useChart } from '../store/useChart'
import { Card, Cell, G, MiniChart, Td, Th } from './ExtraCharts'

const GOOD = '#7dd3fc', WEAK = '#fbbf24', MID = '#cbd5e1'
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`
const SRC_LABEL = (s: string) => (s === 'lagna' ? 'Lagna' : GRAHAS[s as GrahaId].short)
const PL_SYM = (id: GrahaId) => GRAHAS[id].sym

/* ------------------------------------------------------------------------------------------------ ASHTAKAVARGA */
function Ashtakavarga({ natal, style }: { natal: ReturnType<typeof computeChart>; style: 'north' | 'south' }) {
  const av = useMemo(() => ashtakavarga(natal), [natal])
  const [sel, setSel] = useState<'sarva' | AvPlanet>('sarva')
  const houseSign = (h: number) => (natal.lagnaIdx + h - 1) % 12
  const occupants = (sign: number) => Object.values(natal.placements).filter((p) => p.rashiIdx === sign).map((p) => PL_SYM(p.id)).join(' ')

  const vals = sel === 'sarva' ? av.sav : av.bav[sel]
  const avg = vals.reduce((a, b) => a + b, 0) / 12
  const hi = sel === 'sarva' ? 30 : Math.ceil(avg + 1), lo = sel === 'sarva' ? 25 : Math.floor(avg - 1)
  const tone = (v: number) => (v >= hi ? GOOD : v <= lo ? WEAK : MID)

  const cells: Cell[] = Array.from({ length: 12 }, (_, i) => {
    const h = i + 1, sign = houseSign(h), v = vals[sign]
    return { house: h, sign, items: [{ text: String(v), color: tone(v) }], note: occupants(sign) }
  })
  const order = Array.from({ length: 12 }, (_, i) => i + 1).sort((a, b) => vals[houseSign(b)] - vals[houseSign(a)])
  const best = order.slice(0, 3), worst = order.slice(-3).reverse()

  // today's transit, read against each planet's own chart
  const today = useMemo(() => { const lon = siderealAt(Date.now() / 86400000 + 2440587.5); return AV_PLANETS.map((p) => { const sign = Math.floor(lon[p] / 30); return { p, sign, house: ((sign - natal.lagnaIdx + 12) % 12) + 1, bindu: av.bav[p][sign], sav: av.sav[sign] } }) }, [av, natal.lagnaIdx])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Which Ashtakavarga chart">
        <button className={`btn !py-1 text-[11.5px] ${sel === 'sarva' ? '!border-white/25 !bg-white/12 !text-white' : ''}`} onClick={() => setSel('sarva')}>All planets · Sarva <span className="ml-1 font-mono text-slate-400">{av.grand}</span></button>
        {AV_PLANETS.map((p) => (
          <button key={p} className={`btn !py-1 text-[11.5px] ${sel === p ? '!border-white/25 !bg-white/12 !text-white' : ''}`} onClick={() => setSel(p)}>
            <span style={{ color: GRAHAS[p].color }}>{GRAHAS[p].sym}</span> {GRAHAS[p].name} <span className="ml-1 font-mono text-slate-400">{av.totals[p]}</span>
          </button>
        ))}
      </div>
      <p className="text-[11.5px] leading-snug text-slate-400">
        {sel === 'sarva'
          ? 'Each number is the total points a house (sign) gets from all seven planets and the Lagna. The average is about 28.'
          : `Points (0 to 8) that the Lagna and the seven planets give each house in ${GRAHAS[sel].name}'s own chart. The average is ${avg.toFixed(1)}.`}
        {' '}<span style={{ color: GOOD }}>Blue</span> is high, <span style={{ color: WEAK }}>amber</span> is low. Small symbols under a number are your planets in that sign.
      </p>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[460px]"><MiniChart style={style} cells={cells} /></div>
        <div className="min-w-0 space-y-3">
          <Card t="At a glance">
            <div className="space-y-1 text-[12.5px] leading-snug text-slate-200">
              <div><span className="text-slate-400">Highest:</span> {best.map((h) => <b key={h} className="mr-2" style={{ color: GOOD }}>{ordinal(h)} house ({vals[houseSign(h)]})</b>)}</div>
              <div><span className="text-slate-400">Lowest:</span> {worst.map((h) => <b key={h} className="mr-2" style={{ color: WEAK }}>{ordinal(h)} house ({vals[houseSign(h)]})</b>)}</div>
              <div className="text-[11.5px] text-slate-500">Check: {av.ok ? '✓ totals match the classical 48 · 49 · 39 · 54 · 56 · 52 · 39 = 337' : '⚠ totals do not match the classical values'}</div>
            </div>
          </Card>

          <Card t="Transits today, read with Ashtakavarga">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead><tr><Th>Planet</Th><Th>Now in</Th><Th>House</Th><Th>Own points</Th><Th>Sign total</Th></tr></thead>
                <tbody className="divide-y divide-white/5">
                  {today.map((r) => (
                    <tr key={r.p}><Td><G id={r.p} /></Td><Td>{RASHIS[r.sign].sym} {RASHIS[r.sign].en}</Td><Td c="font-mono text-slate-300">{ordinal(r.house)}</Td>
                      <Td c="font-mono font-semibold" ><span style={{ color: r.bindu >= 4 ? GOOD : r.bindu <= 2 ? WEAK : MID }}>{r.bindu}</span></Td><Td c="font-mono text-slate-300">{r.sav}</Td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-slate-500">A planet moving through a sign where its own chart gives 4 or more points usually gives easier results; 2 or fewer, harder. For the live transit chart see Section 6.</p>
          </Card>
        </div>
      </div>

      {/* the working table */}
      <Card t={sel === 'sarva' ? 'Points in each house, planet by planet' : `Who gives ${GRAHAS[sel].name} its points (the working)`}>
        <div className="overflow-x-auto">
          {sel === 'sarva' ? (
            <table className="w-full text-[12px]">
              <thead><tr><Th>House</Th><Th>Sign</Th>{AV_PLANETS.map((p) => <Th key={p}>{GRAHAS[p].short}</Th>)}<Th>Total</Th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
                  const sg = houseSign(h)
                  return (
                    <tr key={h}><Td c="font-mono text-slate-300">{h}</Td><Td><span style={{ color: RASHIS[sg].color }}>{RASHIS[sg].sym}</span> {RASHIS[sg].en}</Td>
                      {AV_PLANETS.map((p) => <Td key={p} c="font-mono text-slate-400">{av.bav[p][sg]}</Td>)}
                      <Td c="font-mono font-semibold"><span style={{ color: tone(av.sav[sg]) }}>{av.sav[sg]}</span></Td></tr>
                  )
                })}
                <tr className="border-t border-white/15"><Td c="text-slate-400">Total</Td><Td />{AV_PLANETS.map((p) => <Td key={p} c="font-mono text-slate-300">{av.totals[p]}</Td>)}<Td c="font-mono font-semibold text-white">{av.grand}</Td></tr>
              </tbody>
            </table>
          ) : (
            <table className="w-full text-[12px]">
              <thead><tr><Th>Gives</Th>{Array.from({ length: 12 }, (_, i) => <Th key={i}>H{i + 1}</Th>)}<Th>Pts</Th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {AV_SOURCES.map((s) => (
                  <tr key={s}><Td c="font-semibold">{s === 'lagna' ? <span className="text-slate-200">Lagna</span> : <G id={s as GrahaId} />}</Td>
                    {Array.from({ length: 12 }, (_, i) => <Td key={i} c="text-center font-mono text-slate-500">{av.prastara[sel][s][houseSign(i + 1)] ? <span className="text-white">●</span> : '·'}</Td>)}
                    <Td c="font-mono text-slate-400">{av.prastara[sel][s].reduce((a, b) => a + b, 0)}</Td></tr>
                ))}
                <tr className="border-t border-white/15"><Td c="text-slate-400">Total</Td>
                  {Array.from({ length: 12 }, (_, i) => <Td key={i} c="text-center font-mono font-semibold"><span style={{ color: tone(av.bav[sel][houseSign(i + 1)]) }}>{av.bav[sel][houseSign(i + 1)]}</span></Td>)}
                  <Td c="font-mono font-semibold text-white">{av.totals[sel]}</Td></tr>
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}

/* ---------------------------------------------------------------------------------------------------- SHADBALA */
const fx = (n: number, d = 0) => n.toFixed(d)
const clock = (ms: number, tz: number) => { const d = new Date(ms + tz * 3600e3); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}` }

function Shadbala({ natal, birth }: { natal: ReturnType<typeof computeChart>; birth: Parameters<typeof shadbala>[1] }) {
  const sb = useMemo(() => shadbala(natal, birth), [natal, birth])
  const [more, setMore] = useState(false)
  const max = Math.max(...sb.rows.map((r) => r.ratio), 1.2)
  const ranked = [...sb.rows].sort((a, b) => b.ratio - a.ratio)
  const t = sb.times
  return (
    <div className="space-y-3">
      <p className="text-[11.5px] leading-snug text-slate-400">
        How strong each planet is, as a number. Each planet needs a minimum to deliver its results: <span style={{ color: GOOD }}>blue</span> means it meets it, <span style={{ color: WEAK }}>amber</span> means it falls short. Values are in virupas (60 virupas = 1 rupa).
      </p>
      <Card t="Strength against the minimum needed">
        <div className="space-y-2">
          {sb.rows.map((r) => (
            <div key={r.id} className="grid grid-cols-[5.5rem_minmax(0,1fr)_4.6rem] items-center gap-2 text-[12px]">
              <G id={r.id} />
              <div className="relative h-3.5 rounded bg-white/[0.05]">
                <div className="absolute inset-y-0 left-0 rounded" style={{ width: `${(r.ratio / max) * 100}%`, background: r.ratio >= 1 ? GOOD : WEAK, opacity: 0.8 }} />
                <div className="absolute inset-y-[-2px] w-px bg-white/70" style={{ left: `${(1 / max) * 100}%` }} title="minimum needed" />
              </div>
              <span className="text-right font-mono text-slate-300">{fx(r.rupas, 2)} <span className="text-slate-500">r</span></span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">The white line is the minimum each planet needs. Strongest: <b style={{ color: GRAHAS[ranked[0].id].color }}>{GRAHAS[ranked[0].id].name}</b> ({fx(ranked[0].ratio, 2)}×). Weakest: <b style={{ color: GRAHAS[ranked[6].id].color }}>{GRAHAS[ranked[6].id].name}</b> ({fx(ranked[6].ratio, 2)}×).</p>
      </Card>

      <Card t="The six strengths, in virupas">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead><tr><Th>Planet</Th><Th>Sthana</Th><Th>Dig</Th><Th>Kala</Th><Th>Chesta</Th><Th>Naisargika</Th><Th>Drik</Th><Th>Total</Th><Th>Needs</Th><Th>Ratio</Th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {sb.rows.map((r) => (
                <tr key={r.id}><Td><G id={r.id} /></Td>
                  <Td c="font-mono text-slate-300">{fx(r.sthana.total)}</Td><Td c="font-mono text-slate-300">{fx(r.dig)}</Td><Td c="font-mono text-slate-300">{fx(r.kala.total)}</Td>
                  <Td c="font-mono text-slate-300">{fx(r.chesta)}</Td><Td c="font-mono text-slate-300">{fx(r.naisargika)}</Td><Td c="font-mono text-slate-300">{fx(r.drik)}</Td>
                  <Td c="font-mono font-semibold text-white">{fx(r.total)}</Td><Td c="font-mono text-slate-500">{r.min}</Td>
                  <Td c="font-mono font-semibold"><span style={{ color: r.ratio >= 1 ? GOOD : WEAK }}>{fx(r.ratio, 2)}</span></Td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-0.5 text-[11px] leading-snug text-slate-500 sm:grid-cols-2">
          <div><b className="text-slate-400">Sthana</b> · position: sign strength, friend or enemy signs in seven charts, odd/even sign, house type</div>
          <div><b className="text-slate-400">Dig</b> · direction: each planet is strongest in one particular house</div>
          <div><b className="text-slate-400">Kala</b> · time: day or night, moon phase, weekday, hour, year and month lords, Sun's tilt</div>
          <div><b className="text-slate-400">Chesta</b> · motion: slow or backward-moving planets count as stronger</div>
          <div><b className="text-slate-400">Naisargika</b> · natural: a fixed ranking, Sun highest, Saturn lowest</div>
          <div><b className="text-slate-400">Drik</b> · aspects: helpful aspects add, harmful ones subtract</div>
        </dl>
      </Card>

      <button className="btn !py-1 text-[11.5px]" onClick={() => setMore((v) => !v)}>{more ? 'Hide' : 'Show'} the working for Sthana and Kala</button>
      {more && (
        <Card t="Working: Sthana and Kala parts">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr><Th>Planet</Th><Th>Uchcha</Th><Th>Sapta&shy;vargaja</Th><Th>Ojha&#8209;yugma</Th><Th>Kendradi</Th><Th>Drekkana</Th><Th>|</Th><Th>Nata</Th><Th>Paksha</Th><Th>Tribhaga</Th><Th>Abda</Th><Th>Masa</Th><Th>Vara</Th><Th>Hora</Th><Th>Ayana</Th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sb.rows.map((r) => (
                  <tr key={r.id} className="font-mono text-slate-300"><Td><G id={r.id} /></Td>
                    <Td>{fx(r.sthana.uchcha)}</Td><Td>{fx(r.sthana.saptavarga)}</Td><Td>{fx(r.sthana.ojha)}</Td><Td>{fx(r.sthana.kendra)}</Td><Td>{fx(r.sthana.drekkana)}</Td><Td c="text-slate-600">|</Td>
                    <Td>{fx(r.kala.nata)}</Td><Td>{fx(r.kala.paksha)}</Td><Td>{fx(r.kala.tribhaga)}</Td><Td>{fx(r.kala.abda)}</Td><Td>{fx(r.kala.masa)}</Td><Td>{fx(r.kala.vara)}</Td><Td>{fx(r.kala.hora)}</Td><Td>{fx(r.kala.ayana)}</Td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-[11.5px] leading-snug text-slate-400">
            Born in the <b className="text-slate-200">{t.dayBirth ? 'day' : 'night'}</b> · sunrise {clock(t.sunrise, birth.tz)}, sunset {clock(t.sunset, birth.tz)} (local) · weekday lord <G id={t.vara} /> · hour lord <G id={t.hora} /> · year lord <G id={t.abda} /> · month lord <G id={t.masa} />
          </div>
          <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[11px] leading-snug text-slate-500">
            {SHADBALA_NOTES.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </Card>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------------------------------------------ SECTION */
export function StrengthSection() {
  const { birth } = useChartData()
  const [tab, setTab] = useState<'av' | 'sb'>('av')
  const [style, setStyle] = useState<'north' | 'south'>(() => useChart.getState().chartStyle)
  // always the sidereal chart of the birth moment
  const natal = useMemo(() => computeChart(birth, { minuteOfDay: birthMinute(birth), dayOffset: 0, yearOffset: 0, hourOffset: 0, minuteOffset: 0 }, 'sidereal'), [birth])
  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-mute">Section 7</div>
      <h2 className="text-[15px] font-semibold text-white">Strength: Ashtakavarga &amp; Shadbala</h2>
      <p className="mb-3 text-[11px] text-mute">Sidereal Lahiri · always counted from your birth moment. Ashtakavarga scores each house; Shadbala scores each planet.</p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button className={`btn !py-1 text-[11.5px] ${tab === 'av' ? '!border-white/25 !bg-white/12 !text-white' : ''}`} onClick={() => setTab('av')}>Ashtakavarga · houses</button>
        <button className={`btn !py-1 text-[11.5px] ${tab === 'sb' ? '!border-white/25 !bg-white/12 !text-white' : ''}`} onClick={() => setTab('sb')}>Shadbala · planets</button>
        {tab === 'av' && <div className="seg ml-auto" role="group" aria-label="Chart style"><button data-on={style === 'north'} onClick={() => setStyle('north')}>North</button><button data-on={style === 'south'} onClick={() => setStyle('south')}>South</button></div>}
      </div>
      {tab === 'av' ? <Ashtakavarga natal={natal} style={style} /> : <Shadbala natal={natal} birth={birth} />}
    </section>
  )
}