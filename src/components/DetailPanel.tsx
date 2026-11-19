import { Link } from 'react-router-dom'
import { ChartData } from '../lib/chart'
import { GRAHAS, GRAHA_ORDER, GrahaId, RASHIS } from '../lib/constants'
import { HOUSE_GUIDE } from '../data/housesGuide'
import { GOOD_FROM_MOON } from '../lib/timing'
import { useChart } from '../store/useChart'

/**
 * SECTION 3 = the house guide for the house selected in the chart (click a house, or use the number buttons here).
 * Only what the chart does not already show: the meaning of the house (Core / Secondary / Minor), the planets that are favoured in it,
 * and what sits in this house in YOUR chart. Aspects are the arrows on the chart, the dasha is Section 5, so neither is repeated.
 */
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`

/** classical Dig bala: the house in which a planet is directionally strongest */
const DIG_BALA: Record<number, GrahaId[]> = { 1: ['jupiter', 'mercury'], 4: ['moon', 'venus'], 7: ['saturn'], 10: ['sun', 'mars'] }
const UPACHAYA_PLANETS: GrahaId[] = ['sun', 'mars', 'saturn', 'rahu']

const P = ({ id }: { id: GrahaId }) => (
  <span className="mr-2 inline-block whitespace-nowrap font-semibold" style={{ color: GRAHAS[id].color }}>{GRAHAS[id].sym} {GRAHAS[id].name}</span>
)

function Tier({ title, hint, items, start, strong }: { title: string; hint: string; items: string[]; start: number; strong?: boolean }) {
  if (!items.length) return null
  return (
    <details open className="group mt-3">
      <summary className="flex cursor-pointer list-none items-baseline gap-2 py-0.5 [&::-webkit-details-marker]:hidden">
        <span className="text-[10px] text-slate-500 transition group-open:rotate-90">▶</span>
        <span className="text-[11.5px] font-semibold uppercase tracking-wider text-white">{title}</span>
        <span className="text-[11px] text-mute">{hint}</span>
      </summary>
      <ol className="mt-1 divide-y divide-white/5 rounded-lg border border-white/10 bg-white/[0.02]">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2.5 px-2.5 py-1.5">
            <span className="w-5 shrink-0 text-right font-mono text-[10.5px] leading-[1.35rem] text-slate-500">{start + i}</span>
            <span className={strong ? 'text-[13.5px] font-medium leading-snug text-white' : 'text-[12.5px] leading-snug text-slate-300'}>{t}</span>
          </li>
        ))}
      </ol>
    </details>
  )
}

const Fact = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="border-t border-white/10 py-1.5 first:border-t-0">
    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{k}</div>
    <div className="text-[12.5px] leading-snug text-slate-200">{v}</div>
  </div>
)

export function DetailPanel({ chart }: { chart: ChartData; birthChart?: ChartData }) {
  const h = useChart((s) => s.selectedHouse)
  const pick = (n: number) => useChart.getState().select(n)
  const g = HOUSE_GUIDE[h - 1]
  const sign = RASHIS[(chart.lagnaIdx + h - 1) % 12]
  const lordId = sign.lord, lordPl = chart.placements[lordId], inside = chart.byHouse[h]
  const dig = DIG_BALA[h] ?? []
  const upachaya = g.groups.includes('Upachaya')
  const transit = GRAHA_ORDER.filter((id) => GOOD_FROM_MOON[id].includes(h))

  return (
    <aside className="slim-scroll h-full overflow-y-auto overflow-x-hidden pl-2 pr-0 xl:max-h-[calc(100vh-170px)]">
      {/* house picker: stays at the top while the guide scrolls */}
      <div className="sticky top-0 z-10 -mx-1 mb-2 bg-[#0a0e16]/90 px-1 pb-1.5 pt-0.5 backdrop-blur">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Choose a house">
          {HOUSE_GUIDE.map((x) => (
            <button key={x.n} onClick={() => pick(x.n)} aria-pressed={x.n === h} title={`${ordinal(x.n)} house · ${x.names}`}
              className={`grid h-7 min-w-[1.75rem] flex-1 place-items-center rounded-md border font-mono text-[12px] font-semibold transition ${x.n === h ? 'border-white/30 bg-white/15 text-white' : 'border-transparent bg-white/[0.04] text-slate-400 hover:bg-white/[0.09] hover:text-white'}`}>{x.n}</button>
          ))}
        </div>
      </div>

      <header className="mb-2">
        <h3 className="text-[17px] font-semibold leading-tight text-white">{ordinal(h)} House <span className="text-slate-400">· {g.names}</span></h3>
        <div className="mt-1.5 flex flex-wrap gap-1">{g.groups.map((x) => <span key={x} className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10.5px] text-slate-300">{x}</span>)}</div>
      </header>

      {/* what sits here in THIS chart: the one part the generic guide cannot know */}
      <div className="mb-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">In your chart</div>
        <div className="text-[12.5px] leading-relaxed text-slate-200">
          Sign <b style={{ color: sign.color }}>{sign.sym} {sign.name}</b> <span className="text-mute">({sign.en})</span>
          <br />House lord <P id={lordId} /> <span className="text-slate-400">sits in the {ordinal(lordPl.house)} house{lordPl.house === h ? ' (this house)' : ''} · {lordPl.dignity.label.toLowerCase()}</span>
          <br />Planets inside {inside.length ? inside.map((id) => <P key={id} id={id} />) : <span className="text-slate-400">none (empty house)</span>}
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1">
        <Fact k="Karaka (natural significator)" v={g.karaka} />
        <Fact k="Body part" v={g.body} />
        <Fact k="Looked at by" v={g.aspected} />
      </div>

      {/* planets that are favoured in this house */}
      <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2">
        <div className="mb-1 text-[11.5px] font-semibold uppercase tracking-wider text-white">Planets favoured here</div>
        {dig.length === 0 && !upachaya && transit.length === 0 && <p className="text-[12px] text-slate-400">No classical rule gives a planet a special place in this house.</p>}
        {dig.length > 0 && <Fact k="Directional strength (Dig bala)" v={<>{dig.map((id) => <P key={id} id={id} />)}<span className="text-slate-400">strongest in this house</span></>} />}
        {upachaya && <Fact k="Upachaya house: grows with time" v={<>{UPACHAYA_PLANETS.map((id) => <P key={id} id={id} />)}<span className="text-slate-400">(natural malefics) are said to do well here</span></>} />}
        {transit.length > 0 && <Fact k="When transiting, counted from your Moon" v={<>{transit.map((id) => <P key={id} id={id} />)}<span className="text-slate-400">give good results in this house</span></>} />}
      </div>

      <Tier title="Core" hint="the main meaning" items={g.core} start={1} strong />
      <Tier title="Secondary" hint="strong, but not the main meaning" items={g.secondary} start={g.core.length + 1} />
      <Tier title="Minor" hint="small items and body links" items={g.minor} start={g.core.length + g.secondary.length + 1} />
      {g.books && (
        <div className="mt-3 rounded-lg border border-dashed border-white/15 px-2.5 py-2">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">Some books also say</div>
          <p className="mt-0.5 text-[12.5px] leading-snug text-slate-300">{g.books}</p>
        </div>
      )}
      <Link to={`/learn/${h}`} className="mb-4 mt-3 block text-[12px] text-mute underline-offset-2 hover:text-white hover:underline">Open the full guide: derived houses, where books disagree →</Link>
    </aside>
  )
}