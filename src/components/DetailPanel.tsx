import { useEffect, useMemo, useRef, useState } from 'react'
import { ChartData, aspectTargets, birthInstantMs } from '../lib/chart'
import { GRAHAS, GRAHA_ORDER, GrahaId, HOUSES, RASHIS } from '../lib/constants'
import { vimshottari } from '../lib/dasha'
import { fmtDMS } from '../lib/math'
import { DetailTab as Tab, useChart } from '../store/useChart'

const TABS: [Tab, string][] = [['read', 'Reading'], ['planets', 'Planets'], ['aspects', 'Aspects'], ['dasha', 'Dasha'], ['math', 'Math']]
const TONE: Record<string, string> = { good: '#34d399', bad: '#fb7185', own: '#38bdf8', neutral: '#cbd5e1' }
const CYAN = '#38bdf8', AMBER = '#fbbf24', VIOLET = '#a78bfa', EMERALD = '#34d399', ROSE = '#fb7185'
/** colour is kept for what carries meaning (planet, sign, good/bad, arrow kinds); everything else is quiet grey */
const QUIET = '#64748b'

const Row = ({ k, v, c }: { k: string; v: React.ReactNode; c?: string }) => <div className="flex justify-between gap-3 py-0.5 text-[11.5px]"><span className="shrink-0 text-mute">{k}</span><span className="min-w-0 break-words text-right" style={{ color: c ?? '#e2e8f0' }}>{v}</span></div>
const Eyebrow = ({ children, c = '#8a93a6' }: { children: React.ReactNode; c?: string }) => <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400"><i className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: c }} />{children}</div>
/** a section with a coloured spine and a soft tint of the same colour */
const Block = ({ children, c = '#64748b' }: { children: React.ReactNode; c?: string }) => (
  <div className="mb-2 rounded-r-lg border-l-2 bg-white/[0.025] py-2.5 pl-3 pr-2" style={{ borderColor: c === QUIET ? 'rgba(148,163,184,0.28)' : `${c}99` }}>{children}</div>
)
const Pill = ({ c, children }: { c: string; children: React.ReactNode }) => <span className="inline-block rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-semibold" style={{ color: c, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>{children}</span>

function GrahaCard({ id, chart }: { id: GrahaId; chart: ChartData }) {
  const g = GRAHAS[id], p = chart.placements[id]
  const asp = aspectTargets(id, p.house)
  return (
    <Block c={g.color}>
      <div className="flex items-baseline justify-between gap-2"><span className="text-sm font-semibold" style={{ color: g.color }}>{g.sym} {g.name} <span className="font-normal text-mute">({g.nepali})</span></span><Pill c={g.color}>{fmtDMS(p.degInSign)}</Pill></div>
      <div className="mb-1 mt-0.5 text-[11.5px] text-mute">{g.meaning}</div>
      <Row k="Sign · House" v={`${RASHIS[p.rashiIdx].name} · H${p.house}`} />
      <Row k="Nakshatra" v={`${p.nak.name} P${p.nak.pada} · “${p.nak.akshar}” · ${GRAHAS[p.nak.lord].name}`} />
      <Row k="Dignity" v={p.dignity.label} c={TONE[p.dignity.tone]} />
      <Row k="Motion" v={`${p.retro ? 'Retrograde' : 'Direct'} ${p.speed >= 0 ? '+' : ''}${p.speed.toFixed(2)}°/d${p.combust ? ' · Combust' : ''}`} c={p.retro ? ROSE : p.combust ? AMBER : undefined} />
      <Row k="Aspects" v={asp.map((a) => `${a.ordinal}→H${a.toHouse}`).join(', ')} />
    </Block>
  )
}

function HouseSlide({ chart, h, sg }: { chart: ChartData; h: number; sg: GrahaId | null }) {
  const hi = HOUSES[h - 1], ri = (chart.lagnaIdx + h - 1) % 12, r = RASHIS[ri]
  const lord = GRAHAS[r.lord], lp = chart.placements[r.lord], inside = chart.byHouse[h]
  const incoming = GRAHA_ORDER.flatMap((g) => chart.placements[g].house === h ? [] : aspectTargets(g, chart.placements[g].house).filter((a) => a.toHouse === h).map((a) => ({ g, from: chart.placements[g].house, ord: a.ordinal })))
  return (
    <div>
      {sg && <GrahaCard id={sg} chart={chart} />}
      <Block c={QUIET}>
        <Eyebrow c={QUIET}>Layer 1 · Where (house)</Eyebrow>
        <div className="mt-1 text-sm font-semibold text-white"><Pill c="#e2e8f0">H{h}</Pill> {hi.sanskrit} <span className="font-normal text-mute">· {hi.english}</span></div>
        <p className="my-1 text-[11.5px] leading-relaxed text-slate-300">{hi.desc}</p>
        <div className="mb-1 flex flex-wrap gap-1">{hi.domains.map((d) => <span key={d} className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-300">{d}</span>)}</div>
        <Row k="Type" v={hi.type} /><Row k="Sky position" v={hi.horizon} /><Row k="Karaka" v={hi.karaka} />
      </Block>
      <Block c={r.color}>
        <Eyebrow c={r.color}>Layer 2 · How (sign & lord)</Eyebrow>
        <div className="mt-1 text-sm font-semibold" style={{ color: r.color }}>{r.sym} {r.name} <span className="font-normal text-mute">({r.en})</span></div>
        <Row k="Element · Mode" v={`${r.element} · ${r.style}`} /><Row k="Keywords" v={r.keywords.join(', ')} />
        <p className="my-1 text-[11.5px] leading-relaxed text-slate-300">{r.vibe}</p>
        <p className="text-[11.5px] leading-relaxed text-slate-300"><span style={{ color: lord.color }}>{lord.sym} {lord.name}</span> rules H{h} and sits in <b>H{lp.house}</b> ({HOUSES[lp.house - 1].english}) in {RASHIS[lp.rashiIdx].name}, {lp.dignity.label.toLowerCase()}.</p>
      </Block>
      <Block c={QUIET}>
        <Eyebrow c={QUIET}>Layer 3 · What (planets inside: {inside.length})</Eyebrow>
        {inside.length === 0 && <p className="mt-1 text-[11.5px] text-mute">Empty. Results flow through its lord ({lord.name} in H{lp.house}) and incoming aspects.</p>}
      </Block>
      {inside.filter((g) => g !== sg).map((g) => <GrahaCard key={g} id={g} chart={chart} />)}
      <Block c={VIOLET}>
        <Eyebrow c={VIOLET}>Incoming aspects ({incoming.length})</Eyebrow>
        <div className="mt-1 flex flex-wrap gap-1 text-[11.5px] text-slate-300">{incoming.length ? incoming.map((a) => <Pill key={a.g + a.ord} c={GRAHAS[a.g].color}>{GRAHAS[a.g].short} H{a.from} · {a.ord}</Pill>) : 'None'}</div>
      </Block>
      <Block c={QUIET}>
        <Eyebrow c={QUIET}>Synthesis</Eyebrow>
        <p className="mt-1 text-[11.5px] leading-relaxed text-slate-300">
          Your {hi.english.toLowerCase()} is filtered through the {r.element.toLowerCase()} energy of {r.name}, bringing {r.keywords.join(', ').toLowerCase()}. With {inside.length ? inside.map((g) => GRAHAS[g].name).join(' & ') : 'no direct occupants'} inside and its lord {lord.name} in H{lp.house} ({HOUSES[lp.house - 1].english.toLowerCase()}), this area of life is tied to {HOUSES[lp.house - 1].domains[0].toLowerCase()}.
        </p>
      </Block>
    </div>
  )
}

/** Reading tab: one swipeable slide per house (H1-H12), kept in sync with the chart selection */
function Reading({ chart }: { chart: ChartData }) {
  const { selectedHouse: h, selectedGraha: sg, select } = useChart()
  const box = useRef<HTMLDivElement>(null)
  const byScroll = useRef(false)
  const timer = useRef(0)
  const go = (n: number) => { const el = box.current; if (el) el.scrollTo({ left: (((n - 1 + 12) % 12)) * el.clientWidth, behavior: 'smooth' }) }

  useEffect(() => {                       // chart click / arrows -> slide
    const el = box.current
    if (!el || byScroll.current) { byScroll.current = false; return }
    el.scrollTo({ left: (h - 1) * el.clientWidth, behavior: 'smooth' })
  }, [h])
  useEffect(() => { const el = box.current; if (el) el.scrollLeft = (useChart.getState().selectedHouse - 1) * el.clientWidth }, [])
  useEffect(() => () => clearTimeout(timer.current), [])

  const onScroll = () => {                // swipe -> select that house
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const el = box.current
      if (!el) return
      const n = Math.round(el.scrollLeft / el.clientWidth) + 1
      if (n !== useChart.getState().selectedHouse) { byScroll.current = true; select(n, null) }
    }, 120)
  }
  const nav = 'grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/10 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white'
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <button className={nav} onClick={() => go(h - 1)} aria-label="Previous house">‹</button>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-1">
          {Array.from({ length: 12 }, (_, i) => { const r = RASHIS[(chart.lagnaIdx + i) % 12]; const on = h === i + 1
            return <button key={i} onClick={() => select(i + 1, null)} title={`H${i + 1} · ${r.name}`} className="h-2.5 rounded-full transition-all" style={{ width: on ? 22 : 9, background: on ? r.color : 'rgba(148,163,184,0.35)' }} /> })}
        </div>
        <button className={nav} onClick={() => go(h + 1)} aria-label="Next house">›</button>
      </div>
      <div ref={box} onScroll={onScroll} className="flex snap-x snap-mandatory items-start overflow-x-auto overflow-y-hidden scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="w-full min-w-full shrink-0 snap-center snap-always px-0.5"><HouseSlide chart={chart} h={i + 1} sg={h === i + 1 ? sg : null} /></div>
        ))}
      </div>
      <p className="mt-1 text-center text-[10px] text-mute">swipe or use ‹ › to move house by house</p>
    </div>
  )
}

function Planets({ chart }: { chart: ChartData }) {
  const { select } = useChart()
  const lagna = RASHIS[chart.lagnaIdx]
  const moon = chart.placements.moon, sun = chart.placements.sun
  const Card = ({ t, v, s }: { t: string; v: string; s: string; c?: string }) => <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] p-2"><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t}</div><div className="truncate text-[12.5px] font-semibold text-white">{v}</div><div className="break-words text-[10.5px] text-mute">{s}</div></div>
  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Card c={AMBER} t="Lagna" v={`${lagna.sym} ${lagna.name}`} s={`${fmtDMS(chart.lagnaDeg)} · ${chart.lagnaNak.name} P${chart.lagnaNak.pada}`} />
        <Card c={CYAN} t="Moon sign" v={`${RASHIS[moon.rashiIdx].sym} ${RASHIS[moon.rashiIdx].name}`} s={`${fmtDMS(moon.degInSign)} · ${moon.nak.name} P${moon.nak.pada}`} />
        <Card c={VIOLET} t="Naam ko akshar" v={`“${moon.nak.akshar}”`} s={`${moon.nak.name} · Pada ${moon.nak.pada}`} />
        <Card c={ROSE} t="Sun sign" v={`${RASHIS[sun.rashiIdx].sym} ${RASHIS[sun.rashiIdx].name}`} s={`${fmtDMS(sun.degInSign)} · ${sun.nak.name} P${sun.nak.pada}`} />
      </div>
      {GRAHA_ORDER.map((id) => {
        const g = GRAHAS[id], p = chart.placements[id]
        return (
          <button key={id} onClick={() => select(p.house, id)} className="mb-1.5 block w-full rounded-r-lg border-l-2 bg-white/[0.025] py-1.5 pl-3 pr-2 text-left transition hover:bg-white/[0.06]" style={{ borderColor: g.color }}>
            <div className="flex items-baseline justify-between gap-2"><span className="text-[12.5px] font-semibold" style={{ color: g.color }}>{g.sym} {g.name}{p.retro ? ' (R)' : ''}{p.combust ? ' ᶜ' : ''}</span><Pill c="#e2e8f0">H{p.house}</Pill></div>
            <div className="text-[11px] text-slate-300"><span>{RASHIS[p.rashiIdx].sym} {RASHIS[p.rashiIdx].name}</span> <span className="font-mono">{fmtDMS(p.degInSign)}</span> <span className="text-mute">· abs {p.lon.toFixed(3)}°</span></div>
            <div className="text-[11px] text-mute">{p.nak.name} P{p.nak.pada} · “{p.nak.akshar}” · <span style={{ color: TONE[p.dignity.tone] }}>{p.dignity.label}</span> · <span style={{ color: p.speed < 0 ? ROSE : undefined }}>{p.speed >= 0 ? '+' : ''}{p.speed.toFixed(2)}°/d</span></div>
          </button>
        )
      })}
    </div>
  )
}

function Aspects({ chart }: { chart: ChartData }) {
  const { selectedHouse: h, selectedGraha: sg } = useChart()
  const P = chart.placements, hi = HOUSES[h - 1], r = RASHIS[(chart.lagnaIdx + h - 1) % 12]
  const lord = GRAHAS[r.lord], lh = P[r.lord].house
  const src = sg ? [sg] : GRAHA_ORDER.filter((g) => P[g].house === h)
  const Card = ({ c, t, children }: { c: string; t: string; children: React.ReactNode }) => <div className="mb-1.5 rounded-r-lg border-l-2 bg-white/[0.025] py-2 pl-3 pr-2" style={{ borderColor: `${c}aa` }}><div className="text-[11.5px] font-semibold text-slate-100"><i className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: c }} />{t}</div><p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-300">{children}</p></div>
  return (
    <div>
      <p className="mb-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-[11.5px] leading-relaxed text-slate-400">Every arrow drawn for House {h} ({hi.sanskrit}), explained. All planets aspect the 7th house; Mars also 4th/8th; Jupiter, Rahu, Ketu 5th/9th; Saturn 3rd/10th.</p>
      {lh !== h && <Card c="#fbbf24" t={`Lord link · ${lord.name}: H${h} → H${lh}`}>{r.name} sits in H{h}, so {lord.name} manages {hi.english.toLowerCase()}. It is placed in H{lh} ({HOUSES[lh - 1].english}), so H{h} matters flow into H{lh} affairs.</Card>}
      {lh === h && <Card c="#fbbf24" t={`Lord link · ${lord.name} is in its own house`}>The lord of H{h} sits in H{h} itself.</Card>}
      {src.flatMap((g) => aspectTargets(g, P[g].house).map((a) => <Card key={g + a.offset} c="#38bdf8" t={`Outgoing · ${GRAHAS[g].sym} ${GRAHAS[g].name} H${P[g].house} → H${a.toHouse} (${a.ordinal}, ${a.angleDeg}°)`}>{GRAHAS[g].name} casts its {a.ordinal} aspect onto H{a.toHouse} ({HOUSES[a.toHouse - 1].english}). {GRAHAS[g].meaning}</Card>))}
      {GRAHA_ORDER.flatMap((g) => P[g].house === h ? [] : aspectTargets(g, P[g].house).filter((a) => a.toHouse === h).map((a) => <Card key={'i' + g + a.offset} c="#a78bfa" t={`Incoming · ${GRAHAS[g].sym} ${GRAHAS[g].name} from H${P[g].house} (${a.ordinal}, ${a.angleDeg}°)`}>From H{P[g].house} ({HOUSES[P[g].house - 1].sanskrit}), {GRAHAS[g].name} gazes into H{h}, shaping {hi.english.toLowerCase()}. {GRAHAS[g].meaning}</Card>))}
    </div>
  )
}

function Dasha({ birth }: { birth: ChartData }) {
  const [sel, setSel] = useState(0)
  const d = useMemo(() => vimshottari(birth.moonSid, birthInstantMs(useChart.getState().committed ?? useChart.getState().draft)), [birth.moonSid])
  const today = new Date().toISOString().slice(0, 10)
  const nak = birth.placements.moon.nak
  const bY = Math.floor(d.balanceYears), bM = Math.floor((d.balanceYears - bY) * 12), bD = Math.floor(((d.balanceYears - bY) * 12 - bM) * 30)
  const m = d.mahas[sel]
  return (
    <div>
      <p className="mb-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-[11.5px] leading-relaxed text-slate-300">Birth Moon: <b className="text-white">{nak.name}</b> (Pada {nak.pada}). Starting balance: <b style={{ color: GRAHAS[d.startLord].color }}>{GRAHAS[d.startLord].name} {bY}y {bM}m {bD}d</b>. Click a Mahadasha for its 9 Antardashas.</p>
      {d.mahas.map((x, i) => {
        const cur = today >= x.start && today <= x.end
        return (
          <button key={i} onClick={() => setSel(i)} className={`mb-1 block w-full rounded-r-lg border-l-2 py-1.5 pl-3 pr-2 text-left transition hover:bg-white/[0.06] ${sel === i ? 'bg-white/[0.09]' : 'bg-white/[0.025]'}`} style={{ borderColor: GRAHAS[x.lord].color, boxShadow: cur ? `inset 0 0 0 1px ${EMERALD}66` : undefined }}>
            <div className="flex items-baseline justify-between gap-2"><span className="text-[12px] font-semibold" style={{ color: GRAHAS[x.lord].color }}>{GRAHAS[x.lord].sym} {GRAHAS[x.lord].name}{cur && <span className="ml-2 text-[10px] font-medium text-emerald-300">● current</span>}</span><Pill c="#cbd5e1">{x.years.toFixed(1)}y</Pill></div>
            <div className="font-mono text-[10.5px] text-slate-400">{x.start} → {x.end}</div>
          </button>
        )
      })}
      <div className="mt-3 border-t border-white/10 pt-3">
        <Eyebrow c={GRAHAS[m.lord].color}>{GRAHAS[m.lord].name} Antardashas</Eyebrow>
        {m.antars.map((a, i) => (
          <div key={i} className="flex flex-wrap items-baseline justify-between gap-x-2 border-b border-white/5 py-1 text-[11px]">
            <span className="font-semibold" style={{ color: GRAHAS[a.lord].color }}>{GRAHAS[a.lord].sym} {GRAHAS[a.lord].short}{today >= a.start && today <= a.end ? ' ●' : ''}</span>
            <span className="font-mono text-slate-400">{a.start} → {a.end} <span className="text-slate-500">({(a.years * 12).toFixed(1)}m)</span></span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MathAudit({ chart }: { chart: ChartData }) {
  const a = chart.audit, moon = chart.placements.moon
  const rows: [string, string][] = [
    ['Universal time', `${chart.ut.toFixed(6)} h`], ['Julian day', chart.jd.toFixed(6)], ['Julian centuries T', a.T.toFixed(8)],
    ['Obliquity ε', `${a.epsDeg.toFixed(6)}° (${fmtDMS(a.epsDeg)})`], ['Lahiri ayanamsa', `${chart.ayanamsa.toFixed(6)}° (${fmtDMS(chart.ayanamsa)})`],
    ['Greenwich sidereal time', `${a.gst.toFixed(5)}° (${(a.gst / 15).toFixed(4)} h)`], ['Local sidereal time θ', `${a.lst.toFixed(5)}° (${(a.lst / 15).toFixed(4)} h)`],
    ['Asc numerator y = cos θ', a.yAsc.toFixed(6)], ['Asc denominator x', a.xAsc.toFixed(6)],
    ['Tropical ascendant', `${a.lagnaTrop.toFixed(5)}° (${fmtDMS(a.lagnaTrop % 30)})`], ['Sidereal lagna (Asc − ayanamsa)', `${a.lagnaSid.toFixed(5)}°`],
    ['Moon nakshatra', `${moon.nak.name} P${moon.nak.pada}`],
  ]
  return (
    <div>
      <p className="mb-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-[11.5px] leading-relaxed text-slate-400">Every intermediate value, computed live: planet and Moon longitudes from the astronomy-engine ephemeris (VSOP87 / lunar series, apparent, equinox of date), mean lunar node for Rahu, Lahiri ayanamsa, and the ascendant by atan2 from local sidereal time.</p>
      {rows.map(([k, v], i) => { const c = QUIET; return <div key={k} className="flex justify-between gap-3 border-b border-white/5 py-1.5 text-[11px]"><span className="text-slate-400"><i className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ background: c }} />{k}</span><span className="min-w-0 break-words text-right font-mono" style={{ color: c }}>{v}</span></div> })}
    </div>
  )
}

export function DetailPanel({ chart, birthChart }: { chart: ChartData; birthChart: ChartData }) {
  const tab = useChart((st) => st.detailTab)
  const setTab = (t: Tab) => useChart.getState().set({ detailTab: t })
  return (
    <aside className="slim-scroll h-full overflow-y-auto overflow-x-hidden pl-2 pr-0 xl:max-h-[calc(100vh-170px)]">
      {/* tabs share the width evenly and wrap onto a second row when squeezed - never a scrollbar */}
      <div className="sticky top-0 z-10 -mx-1 mb-2 flex flex-wrap gap-1 bg-[#0a0e16]/90 px-1 pb-1.5 pt-0.5 backdrop-blur">
        {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className={`min-w-[3.6rem] flex-1 rounded-md border px-2 py-1 text-xs font-medium transition ${tab === k ? 'border-white/25 bg-white/12 text-white' : 'border-transparent bg-white/[0.03] text-slate-400 hover:bg-white/[0.07] hover:text-white'}`}>{l}</button>)}
      </div>
      {tab === 'read' && <Reading chart={chart} />}
      {tab === 'planets' && <Planets chart={chart} />}
      {tab === 'aspects' && <Aspects chart={chart} />}
      {tab === 'dasha' && <Dasha birth={birthChart} />}
      {tab === 'math' && <MathAudit chart={chart} />}
    </aside>
  )
}