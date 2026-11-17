import { useMemo, useState } from 'react'
import { ChartData } from '../lib/chart'
import { GRAHAS, GrahaId, HOUSES, RASHIS } from '../lib/constants'
import { DPeriod, YEAR_MS, subPeriods } from '../lib/timing'
import { YPeriod, yoginiMahas, yoginiSubs } from '../lib/yogini'

const pad = (n: number) => String(n).padStart(2, '0')
const day = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const yrs = (ms: number) => ms / YEAR_MS
const lenText = (ms: number) => { const y = yrs(ms); return y >= 1.5 ? `${y.toFixed(1)} y` : y >= 0.1 ? `${(y * 12).toFixed(1)} m` : `${Math.max(1, Math.round(y * 365.25))} d` }
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`
const LEVELS = ['Mahadasha', 'Antardasha', 'Pratyantardasha']

/** plain-language reading of one running period lord, from the natal chart */
function describe(lord: GrahaId, p: { start: number; end: number }, level: number, natal: ChartData) {
  const g = GRAHAS[lord], pl = natal.placements[lord]
  const rules = Array.from({ length: 12 }, (_, i) => i + 1).filter((h) => RASHIS[(natal.lagnaIdx + h - 1) % 12].lord === lord)
  const via = lord === 'rahu' || lord === 'ketu' ? RASHIS[pl.rashiIdx].lord : null
  const viaH = via ? Array.from({ length: 12 }, (_, i) => i + 1).filter((h) => RASHIS[(natal.lagnaIdx + h - 1) % 12].lord === via) : []
  const where = `sits in the ${ordinal(pl.house)} house (${HOUSES[pl.house - 1].english}) in ${RASHIS[pl.rashiIdx].en}, ${pl.dignity.label.toLowerCase()}${pl.retro ? ', retrograde' : ''}${pl.combust ? ', combust' : ''}`
  const rule = rules.length
    ? `It rules the ${rules.map(ordinal).join(' and ')} house${rules.length > 1 ? 's' : ''} (${rules.map((h) => HOUSES[h - 1].english.split(',')[0]).join('; ')}).`
    : `It owns no sign, so it acts through its sign lord ${GRAHAS[via!].name}${viaH.length ? ` (ruler of the ${viaH.map(ordinal).join(' and ')} house${viaH.length > 1 ? 's' : ''})` : ''}.`
  return { head: `${g.name} ${LEVELS[level - 1]}`, dates: `${day(p.start)} to ${day(p.end)} · ${lenText(p.end - p.start)}`, themes: g.meaning, where, rule, focus: `So this period works mostly through ${ordinal(pl.house)}-house matters: ${HOUSES[pl.house - 1].domains.join(', ').toLowerCase()}.` }
}

const Chip = ({ id, big }: { id: GrahaId; big?: boolean }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${big ? 'px-3 py-1 text-[14px]' : 'px-2 py-0.5 text-[12px]'}`} style={{ color: GRAHAS[id].color, borderColor: 'rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)' }}>
    <span>{GRAHAS[id].sym}</span>{GRAHAS[id].name}
  </span>
)

const Bar = ({ p, at }: { p: { start: number; end: number; lord: GrahaId }; at: number }) => {
  const pct = Math.max(0, Math.min(100, ((at - p.start) / (p.end - p.start)) * 100))
  return <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: GRAHAS[p.lord].color }} /></div>
}

interface RowP { lord: GrahaId; name?: string; start: number; end: number }
function Table({ title, sub, rows, at, sel, onPick }: { title: string; sub: string; rows: RowP[]; at: number; sel: number; onPick?: (i: number) => void }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
      <div className="mb-1.5 flex items-baseline justify-between gap-2"><span className="text-[12.5px] font-semibold text-white">{title}</span><span className="text-[10.5px] text-mute">{sub}</span></div>
      <table className="w-full text-[12px]">
        <thead><tr className="text-left text-[10.5px] uppercase tracking-wider text-slate-500"><th className="py-1 font-medium">Planet</th><th className="font-medium">From</th><th className="font-medium">To</th></tr></thead>
        <tbody>
          {rows.map((r, i) => {
            const now = at >= r.start && at < r.end, on = i === sel, c = GRAHAS[r.lord].color
            return (
              <tr key={i} onClick={onPick ? () => onPick(i) : undefined} className={`border-t border-white/5 ${onPick ? 'cursor-pointer hover:bg-white/[0.04]' : ''} ${now ? 'bg-emerald-400/10' : ''}`} style={on ? { boxShadow: `inset 3px 0 0 ${c}`, background: 'rgba(255,255,255,0.06)' } : undefined}>
                <td className="whitespace-nowrap py-1.5 pl-2 pr-2 font-semibold" style={{ color: c }}>{r.name ?? GRAHAS[r.lord].name}{now && <span className="ml-1.5 rounded bg-emerald-400/20 px-1 text-[9.5px] font-semibold uppercase text-emerald-300">now</span>}</td>
                <td className="whitespace-nowrap py-1.5 pr-2 font-mono text-slate-300">{day(r.start)}</td>
                <td className="whitespace-nowrap py-1.5 pr-1 font-mono text-slate-300">{day(r.end)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function DashaOverview({ natal, md, birthMs, at }: { natal: ChartData; md: { startLord: GrahaId; balanceYears: number; periods: DPeriod[] }; birthMs: number; at: number }) {
  const [pickM, setPickM] = useState<number | null>(null)
  const [pickA, setPickA] = useState<number | null>(null)

  // periods as shown: the first Mahadasha starts at birth (only its balance is left)
  const mahas = useMemo(() => md.periods.filter((p) => p.end > birthMs).map((p) => ({ ...p, start: Math.max(p.start, birthMs) })), [md, birthMs])
  const total = mahas[mahas.length - 1].end - birthMs
  const runM = mahas.findIndex((p) => at >= p.start && at < p.end)
  const mIdx = pickM ?? (runM >= 0 ? runM : 0)
  const maha = mahas[mIdx]
  const fullMaha = md.periods.find((p) => p.lord === maha.lord && p.end === maha.end)!
  const antars = useMemo(() => subPeriods(fullMaha).filter((a) => a.end > birthMs).map((a) => ({ ...a, start: Math.max(a.start, birthMs) })), [fullMaha, birthMs])
  const runA = antars.findIndex((a) => at >= a.start && at < a.end)
  const aIdx = pickA !== null && pickA < antars.length ? pickA : runA >= 0 ? runA : 0
  const antar = antars[aIdx]
  // sub-periods are always laid out on the UNCLIPPED Antardasha (the one running at birth is only partly left)
  const fullAntar = subPeriods(fullMaha).find((a) => a.lord === antar.lord)!
  const pratyRows = useMemo(() => subPeriods(fullAntar).filter((x) => x.end > birthMs).map((x) => ({ ...x, start: Math.max(x.start, birthMs) })), [fullAntar, birthMs])

  // the running stack (always the true one at the reference time, whatever row is picked)
  const run = useMemo(() => {
    const out: DPeriod[] = []
    let cur: DPeriod | undefined = md.periods.find((p) => at >= p.start && at < p.end)
    while (cur && out.length < 3) { out.push(cur); cur = out.length < 3 ? subPeriods(cur).find((p) => at >= p.start && at < p.end) : undefined }
    return out
  }, [md, at])

  const yog = useMemo(() => yoginiMahas(natal.moonSid, birthMs), [natal.moonSid, birthMs])
  const yRows = useMemo(() => yog.periods.map((p) => ({ ...p, start: Math.max(p.start, birthMs) })), [yog, birthMs])
  const yRun = yRows.findIndex((p) => at >= p.start && at < p.end)
  const ageNow = yrs(at - birthMs)
  const nowPct = Math.max(0, Math.min(100, ((at - birthMs) / total) * 100))
  const ticks = Array.from({ length: Math.floor(yrs(total) / 10) + 1 }, (_, i) => i * 10)

  return (
    <div>
      {/* 1 · running now */}
      <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300"><i className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Running now</span>
          {run.map((p, i) => <span key={i} className="flex items-center gap-2">{i > 0 && <span className="text-slate-500">→</span>}<Chip id={p.lord} big /></span>)}
          <span className="ml-auto text-[11.5px] text-slate-400">age {ageNow.toFixed(1)}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {run.map((p, i) => (
            <div key={i}>
              <div className="mb-1 flex items-baseline justify-between text-[11.5px]"><span className="font-semibold" style={{ color: GRAHAS[p.lord].color }}>{LEVELS[i]}</span><span className="text-slate-500">{lenText(p.end - p.start)}</span></div>
              <Bar p={p} at={at} />
              <div className="mt-1 flex justify-between font-mono text-[11px] text-slate-400"><span>{day(Math.max(p.start, birthMs))}</span><span>{day(p.end)}</span></div>
              <div className="text-[10.5px] text-slate-500">{Math.round(Math.max(0, Math.min(1, (at - p.start) / (p.end - p.start))) * 100)}% elapsed · {lenText(Math.max(0, p.end - at))} left</div>
            </div>
          ))}
        </div>
      </div>

      {/* 2 · whole-life timeline */}
      <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2"><span className="text-[12.5px] font-semibold text-white">Life timeline · Mahadashas from birth</span><span className="text-[10.5px] text-mute">Block width = length of the period. Click a block to open its Antardashas below.</span></div>
        <div className="overflow-x-auto pb-1"><div className="relative min-w-[640px] pt-5">
          <div className="absolute top-0 z-10 -translate-x-1/2 text-center" style={{ left: `${nowPct}%` }}><div className="rounded bg-emerald-400 px-1.5 text-[10px] font-bold uppercase leading-4 text-[#0a0e16]">now</div></div>
          <div className="absolute bottom-6 top-4 z-10 w-px bg-emerald-300/80" style={{ left: `${nowPct}%` }} />
          <div className="flex h-16 overflow-hidden rounded-lg border border-white/10">
            {mahas.map((p, i) => {
              const c = GRAHAS[p.lord].color, w = ((p.end - p.start) / total) * 100
              return (
                <button key={i} onClick={() => { setPickM(i); setPickA(null) }} title={`${GRAHAS[p.lord].name}: ${day(p.start)} to ${day(p.end)}`} className="flex min-w-0 flex-col items-center justify-center overflow-hidden border-r border-black/40 px-0.5 text-center transition hover:brightness-125"
                  style={{ width: `${w}%`, background: `${c}${i === mIdx ? '3d' : '1f'}`, boxShadow: i === mIdx ? `inset 0 0 0 2px ${c}` : undefined }}>
                  <span className="text-[13px] font-bold leading-tight" style={{ color: c }}>{w > 6 ? GRAHAS[p.lord].name : GRAHAS[p.lord].short}</span>
                  <span className="font-mono text-[10.5px] leading-tight text-slate-300">{new Date(p.end).getFullYear()}</span>
                </button>
              )
            })}
          </div>
          <div className="relative mt-1 h-5">{ticks.map((a) => <span key={a} className={`absolute font-mono text-[10.5px] text-slate-500 ${a === 0 ? '' : '-translate-x-1/2'}`} style={{ left: `${((a * YEAR_MS) / total) * 100}%` }}>{a === 0 ? 'birth' : `${a}y`}</span>)}</div>
        </div></div>
        <div className="mt-1 text-[11px] text-slate-400">Birth Moon in <b className="text-slate-200">{natal.placements.moon.nak.name}</b> (pada {natal.placements.moon.nak.pada}) → starts in <b style={{ color: GRAHAS[md.startLord].color }}>{GRAHAS[md.startLord].name}</b> with <b className="text-slate-200">{md.balanceYears.toFixed(2)} years</b> left at birth.</div>
      </div>

      {/* 3 · the three linked tables */}
      <div className="mb-3 grid gap-3 lg:grid-cols-3">
        <Table title="1 · Mahadasha" sub="click a row" rows={mahas} at={at} sel={mIdx} onPick={(i) => { setPickM(i); setPickA(null) }} />
        <Table title="2 · Antardasha" sub={`inside ${GRAHAS[maha.lord].name}`} rows={antars} at={at} sel={aIdx} onPick={(i) => setPickA(i)} />
        <Table title="3 · Pratyantardasha" sub={`inside ${GRAHAS[maha.lord].short} › ${GRAHAS[antar.lord].short}`} rows={pratyRows} at={at} sel={-1} />
      </div>

      {/* 4 · what the running periods mean */}
      <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <div className="mb-2 text-[12.5px] font-semibold text-white">What the running periods mean in this chart</div>
        <div className="grid gap-2 lg:grid-cols-3">
          {run.map((p, i) => { const d = describe(p.lord, { start: Math.max(p.start, birthMs), end: p.end }, i + 1, natal); return (
            <div key={i} className="rounded-lg border-l-2 bg-white/[0.025] px-3 py-2 text-[12px] leading-relaxed text-slate-300" style={{ borderColor: GRAHAS[p.lord].color }}>
              <div className="font-semibold text-white"><i className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: GRAHAS[p.lord].color }} />{d.head}</div>
              <div className="mb-1 font-mono text-[11px] text-slate-500">{d.dates}</div>
              <p><b className="text-slate-100">Stands for:</b> {d.themes}</p>
              <p className="mt-1">{GRAHAS[p.lord].name} {d.where}. {d.rule}</p>
              <p className="mt-1 text-slate-200">{d.focus}</p>
            </div>
          ) })}
        </div>
        <p className="mt-2 text-[11px] text-mute">Read the Mahadasha as the main theme, the Antardasha as the area that colours it, and the Pratyantardasha as the short-term trigger. Traditional readings: the sub-lord's themes, filtered through the main lord.</p>
      </div>

      {/* 5 · Yogini dasha */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <div className="mb-1 text-[12.5px] font-semibold text-white">Yogini Dasha · a second timing system</div>
        <p className="mb-2 text-[11.5px] leading-relaxed text-slate-400">A 36-year cycle of 8 periods started by the Moon's nakshatra: birth star no. {yog.nakNo} ({yog.nakName}); ({yog.nakNo} + 3) mod 8 = {(yog.nakNo + 3) % 8} → <b className="text-slate-200">{yog.periods[0].name}</b>. Some astrologers read it alongside Vimshottari. Open a period for its sub-periods.</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {yRows.slice(0, 9).concat(yRun > 8 ? [yRows[yRun]] : []).map((p, i) => { const now = at >= p.start && at < p.end, c = GRAHAS[p.lord].color; return (
            <span key={i} className="rounded-md border px-2 py-0.5 text-[11.5px]" style={{ borderColor: now ? '#34d399' : 'rgba(255,255,255,0.12)', color: now ? '#6ee7b7' : '#cbd5e1', background: 'rgba(255,255,255,0.03)' }}><i className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: c }} />{p.name} <span className="font-mono text-slate-400">{day(p.start).slice(0, 4)}–{day(p.end).slice(0, 4)}</span></span>
          ) })}
        </div>
        {yRows.slice(0, Math.max(10, yRun + 3)).filter((p) => p.end > birthMs).map((p, i) => {
          const now = at >= p.start && at < p.end, c = GRAHAS[p.lord].color, full = yog.periods[i]
          return (
            <details key={i} open={now} className="mb-1 rounded-lg border border-white/10 px-2.5 py-1.5">
              <summary className="cursor-pointer text-[12px] font-semibold text-slate-100"><i className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: c }} />{p.name} <span className="font-normal text-slate-400">({GRAHAS[p.lord].name}, {p.years} y) · {day(p.start)} to {day(p.end)}</span>{now && <span className="ml-2 rounded bg-emerald-400/20 px-1 text-[9.5px] font-semibold uppercase text-emerald-300">now</span>}</summary>
              <div className="mt-1 grid gap-x-6 sm:grid-cols-2">
                {yoginiSubs(full).filter((s: YPeriod) => s.end > birthMs).map((s: YPeriod, k: number) => { const sn = at >= s.start && at < s.end; return (
                  <div key={k} className={`flex justify-between gap-2 border-b border-white/5 py-1 text-[11.5px] ${sn ? 'bg-emerald-400/10' : ''}`}><span style={{ color: GRAHAS[s.lord].color }} className="font-semibold">{s.name} <span className="font-normal text-slate-500">({GRAHAS[s.lord].short})</span>{sn ? ' ◀ now' : ''}</span><span className="font-mono text-slate-400">{day(Math.max(s.start, birthMs))} → {day(s.end)}</span></div>
                ) })}
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}