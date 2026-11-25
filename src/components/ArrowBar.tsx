import { ArrowToggles, NO_ARROWS } from '../lib/arrows'
import { ChartData } from '../lib/chart'
import { drishtiLoops, lordLoops } from '../lib/loops'

/**
 * The link switches under a chart. Everything is OFF by default (clean chart); tick what you want.
 *   Outgoing / Incoming / Lord link  follow the house or planet you clicked.
 *   Lord loops / Drishti loops       are whole-chart: only the closed circles of links, whichever house is selected.
 * Tip: one at a time stays readable.
 */
const SW: { k: keyof ArrowToggles; label: string; color: string; tip: string; group: 'sel' | 'all' }[] = [
  { k: 'out', label: 'Outgoing', color: '#38bdf8', group: 'sel', tip: 'Houses the selected house / planet looks at (drishti)' },
  { k: 'in', label: 'Incoming', color: '#a78bfa', group: 'sel', tip: 'Planets in other houses that look at the selected house' },
  { k: 'lord', label: 'Lord link', color: '#fbbf24', group: 'sel', tip: 'From the selected house to the house where its lord sits' },
  { k: 'loopL', label: 'Lord loops', color: '#fb923c', group: 'all', tip: 'Closed circles of lord links, e.g. two houses whose lords sit in each other (sign exchange)' },
  { k: 'loopD', label: 'Drishti loops', color: '#2dd4bf', group: 'all', tip: 'Closed circles of aspects, e.g. a planet in each of two houses that look at each other' },
]

export function ArrowBar({ value, onChange }: { value: ArrowToggles; onChange: (v: ArrowToggles) => void }) {
  const any = SW.some((x) => value[x.k])
  const chip = (x: (typeof SW)[number]) => {
    const on = !!value[x.k]
    return (
      <button
        key={x.k} type="button" aria-pressed={on} title={x.tip}
        onClick={() => onChange({ ...value, [x.k]: !on })}
        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition"
        style={on ? { borderColor: x.color, color: x.color, background: x.color + '1f' } : { borderColor: 'rgba(255,255,255,0.12)', color: '#94a3b8' }}
      >
        <i className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: x.color, opacity: on ? 1 : 0.55 }} />{x.label}
      </button>
    )
  }
  return (
    <div className="flex max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
      <div className="flex flex-wrap items-center justify-center gap-1.5" role="group" aria-label="Links from the selected house or planet">
        <span className="text-[10.5px] uppercase tracking-wider text-slate-500">Selected</span>{SW.filter((x) => x.group === 'sel').map(chip)}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1.5" role="group" aria-label="Whole-chart loops">
        <span className="text-[10.5px] uppercase tracking-wider text-slate-500">Whole chart</span>{SW.filter((x) => x.group === 'all').map(chip)}
      </div>
      <button type="button" className="text-[11.5px] text-mute underline-offset-2 hover:text-white hover:underline disabled:opacity-40 disabled:no-underline" disabled={!any} onClick={() => onChange({ ...NO_ARROWS })}>Clean chart</button>
    </div>
  )
}

/** plain-words list of the loops that are switched on, shown under the chart so the lines can be read without guessing */
export function LoopNotes({ value, chart }: { value: ArrowToggles; chart: ChartData }) {
  if (!value.loopL && !value.loopD) return null
  const rows: JSX.Element[] = []
  if (value.loopL) {
    const { loops, own } = lordLoops(chart)
    loops.forEach((l, i) => rows.push(
      <div key={`l${i}`}><b style={{ color: '#fb923c' }}>Lord loop</b> {l.houses.map((h) => `H${h}`).join(' → ')} → H{l.houses[0]}
        <span className="text-slate-500"> · {l.houses.length === 2 ? 'sign exchange: each lord sits in the other house' : `${l.houses.length} houses, each lord sits in the next`}</span></div>))
    if (own.length) rows.push(<div key="own"><b style={{ color: '#fb923c' }}>↻ Own house</b> {own.map((h) => `H${h}`).join(', ')}<span className="text-slate-500"> · the lord sits in its own house</span></div>)
    if (!loops.length && !own.length) rows.push(<div key="nl" className="text-slate-500">No lord loop in this chart.</div>)
  }
  if (value.loopD) {
    const ds = drishtiLoops(chart)
    ds.forEach((l, i) => rows.push(
      <div key={`d${i}`}><b style={{ color: '#2dd4bf' }}>Drishti loop</b> {l.houses.map((h) => `H${h}`).join(' ⇄ ')}{l.houses.length > 2 ? ` ⇄ H${l.houses[0]}` : ''}
        <span className="text-slate-500"> · {l.edges.map((e) => `${e.label} in H${e.from}`).join(', ')}</span></div>))
    if (!ds.length) rows.push(<div key="nd" className="text-slate-500">No drishti loop in this chart.</div>)
  }
  return <div className="mx-auto mt-1.5 max-w-[640px] space-y-0.5 text-center text-[11px] leading-snug text-slate-300">{rows}</div>
}