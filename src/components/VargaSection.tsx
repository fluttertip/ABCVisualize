import { useMemo, useState } from 'react'
import { ChartData } from '../lib/chart'
import { GRAHAS, GRAHA_ORDER, GrahaId, RASHIS } from '../lib/constants'
import { fmtDMS } from '../lib/math'
import { CONVENTION, MOON_CHART, STANDARD, SUN_CHART, computeVarga, kindOf, vargaWorking } from '../lib/vargas'
import { KIND_LABEL, infoOf, vargaLabel } from '../lib/vargaInfo'
import { useChart } from '../store/useChart'
import { KundaliChart } from './KundaliChart'
import { EXPORT_SET, buildPdf, buildPng, buildZip, download } from '../lib/exportCharts'

/** dropdown text: name plus the main themes in brackets */
const opt = (n: number) => `${vargaLabel(n)} (${infoOf(n).theme})`

const HARMONIC = Array.from({ length: 60 }, (_, i) => i + 1).filter((n) => !STANDARD.includes(n) && !CONVENTION.includes(n))

function VargaSelect({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <select className="input !w-auto !max-w-full !py-1 text-xs font-semibold" value={value} onChange={(e) => onChange(Number(e.target.value))}>
      <optgroup label="STANDARD · BPHS Shodashavarga (16, same in all software)">
        {STANDARD.map((n) => <option key={n} value={n}>{opt(n)}</option>)}
      </optgroup>
      <optgroup label="OTHER · D5, D6, D8, D11 (used in Jagannatha Hora; school-based)">
        {CONVENTION.map((n) => <option key={n} value={n}>{opt(n)}</option>)}
      </optgroup>
      <optgroup label="STANDARD · Moon / Sun charts (re-based D1)">
        <option value={MOON_CHART}>{opt(MOON_CHART)}</option>
        <option value={SUN_CHART}>{opt(SUN_CHART)}</option>
      </optgroup>
      <optgroup label="OTHER · harmonic only (no Vedic rule)">
        {HARMONIC.map((n) => <option key={n} value={n}>{`D${n} · harmonic (no Vedic meaning)`}</option>)}
      </optgroup>
    </select>
  )
}

const Sec = ({ t, c, children }: { t: string; c: string; children: React.ReactNode }) => (
  <div className="mb-1.5 rounded-r-lg border-l-2 bg-white/[0.025] py-1.5 pl-2.5 pr-2" style={{ borderColor: 'rgba(148,163,184,0.28)' }} data-c={c}>
    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t}</div>
    <div className="mt-0.5 text-[11.5px] leading-relaxed text-slate-300">{children}</div>
  </div>
)

function Working({ chart, n }: { chart: ChartData; n: number }) {
  const rows = useMemo(() => vargaWorking(chart, n), [chart, n])
  const split = n === 30
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left font-mono text-[10.5px] text-slate-300">
        <thead className="text-mute"><tr><th className="py-0.5 pr-2 font-normal">Body</th><th className="pr-2 font-normal">D1 position</th><th className="pr-2 font-normal">{split ? 'Slice' : `Part of ${rows[0]?.parts}`}</th><th className="pr-2 font-normal">Slice range</th><th className="font-normal">→ sign</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const g = r.id === 'lagna' ? null : GRAHAS[r.id as GrahaId]
            return (
              <tr key={r.id} className="border-t border-white/5">
                <td className="py-0.5 pr-2" style={{ color: g?.color ?? '#fbbf24' }}>{g ? g.short : 'Lagna'}</td>
                <td className="pr-2">{RASHIS[r.d1Sign].sym} {fmtDMS(r.d1Deg)}</td>
                <td className="pr-2">{r.part}{split && r.ruler ? ` · ${r.ruler}` : ''}</td>
                <td className="pr-2">{r.from.toFixed(3)}°–{r.to.toFixed(3)}°</td>
                <td style={{ color: RASHIS[r.sign].color }}>{RASHIS[r.sign].sym} {RASHIS[r.sign].name}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function VargaPanel({ chart, n, onChange }: { chart: ChartData; n: number; onChange: (n: number) => void }) {
  const s = useChart()
  const [fh, setFh] = useState(1)
  const [fg, setFg] = useState<GrahaId | null>(null)
  const v = useMemo(() => computeVarga(chart, n), [chart, n])
  const info = infoOf(n), kind = kindOf(n), K = KIND_LABEL[kind]
  const lagna = RASHIS[v.lagnaIdx]
  const warn = kind === 'harmonic'
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <VargaSelect value={n} onChange={(x) => { onChange(x); setFh(1); setFg(null) }} />
        <div className="text-[11px] text-mute">
          {n < 0 ? (n === MOON_CHART ? 'Moon in' : 'Sun in') : 'Lagna'} <b style={{ color: lagna.color }}>{lagna.sym} {lagna.name}</b>
        </div>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold" style={{ color: K.color, borderColor: `${K.color}55`, background: `${K.color}14` }}>{K.label}</span>
        <span className="text-[11px] font-semibold text-white">{n < 0 ? info.name : `D${n} ${info.name}`}</span>
        <span className="text-[11px] text-mute">· {info.theme}</span>
      </div>
      <div className="mx-auto aspect-square w-full" style={{ maxWidth: 640 }}>
        <KundaliChart chart={v} style={s.chartStyle} focusH={fh} focusG={fg} toggles={s.vargaArrows} reveal={false} onPick={(h, g) => { setFh(h); setFg(g) }} />
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {GRAHA_ORDER.map((id) => {
          const p = v.placements[id], r = RASHIS[p.rashiIdx]
          return (
            <span key={id} className="chip font-mono" title={`${GRAHAS[id].name} in ${r.en} (house ${p.house}) · ${p.dignity.label}`}>
              <b style={{ color: GRAHAS[id].color }}>{GRAHAS[id].short}</b> {r.sym}{p.dignity.short}
            </span>
          )
        })}
      </div>

      <div className="mt-3">
        {warn && (
          <div className="mb-2 rounded-lg border px-2.5 py-2 text-[11px] leading-relaxed" style={{ color: K.color, borderColor: `${K.color}44`, background: `${K.color}0f` }}>
            {kind === 'harmonic'
              ? `This is not a traditional Vedic chart. No classical text defines D${n}; it is the plain mathematical harmonic, shown only for reference.`
              : `Not one of BPHS's sixteen. The rule below is a published convention; other schools use a different one, so another program may legitimately show a different D${n}.`}
          </div>
        )}
        <Sec t="Exact rule" c="#38bdf8">{info.rule}</Sec>
        <Sec t="Where the rule comes from" c={K.color}>{info.source}</Sec>
        <Sec t="What this chart is about" c="#a78bfa">{info.about}</Sec>
        {kind !== 'harmonic' && (
          <>
            <Sec t="When strong" c="#34d399">{info.strong}</Sec>
            <Sec t="When weak or afflicted · failure, bad luck, evils" c="#fb7185">{info.weak}</Sec>
            <Sec t="How to read" c="#fbbf24">{info.how}</Sec>
          </>
        )}
        <details className="mt-1 rounded-lg border border-white/10 px-2.5 py-1.5">
          <summary className="cursor-pointer text-[11px] font-semibold text-slate-300">Show the working (every planet, step by step)</summary>
          <div className="mt-1.5">
            {n < 0
              ? <p className="text-[11px] text-mute">No division: signs are the D1 signs; only the 1st house moves to the {n === MOON_CHART ? 'Moon' : 'Sun'}'s sign.</p>
              : <Working chart={chart} n={n} />}
          </div>
        </details>
      </div>
    </div>
  )
}

const DownIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
)

/** one clearly-labelled block: PDF, one combined image, or a ZIP with a separate image per chart. Always clean (no arrows). */
function DownloadAll({ chart }: { chart: ChartData }) {
  const s = useChart()
  const [busy, setBusy] = useState<'pdf' | 'png' | 'zip' | null>(null)
  const [err, setErr] = useState('')
  const N = EXPORT_SET.length
  const go = async (kind: 'pdf' | 'png' | 'zip') => {
    if (!s.committed || busy) return
    setBusy(kind); setErr('')
    try {
      const { controls: c, chartStyle } = s
      const name = (s.committed.name.trim() || 'chart').replace(/[^\w-]+/g, '_')
      const base = `${name}_${s.committed.dob}_all-${N}-charts`
      if (kind === 'pdf') download(await buildPdf(chart, s.committed, c, chartStyle), `${base}.pdf`)
      else if (kind === 'png') download(await buildPng(chart, s.committed, c, chartStyle), `${base}.png`)
      else download(await buildZip(chart, s.committed, c, chartStyle), `${base}_images.zip`)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Download failed') }
    setBusy(null)
  }
  const b = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-50'
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-100"><DownIcon />Download all {N} charts</div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={`${b} bg-accent text-[#0a0e16] hover:brightness-110`} disabled={!!busy} onClick={() => go('pdf')}>{busy === 'pdf' ? 'Making PDF…' : 'PDF'}</button>
          <button className={`${b} border border-white/15 text-slate-200 hover:bg-white/10`} disabled={!!busy} onClick={() => go('png')} title="All charts on one tall image">{busy === 'png' ? 'Making image…' : 'One image'}</button>
          <button className={`${b} border border-white/15 text-slate-200 hover:bg-white/10`} disabled={!!busy} onClick={() => go('zip')} title={`A ZIP file with ${N} separate PNG images, one per chart`}>{busy === 'zip' ? 'Making ZIP…' : `${N} images (ZIP)`}</button>
        </div>
      </div>
      <div className="mt-1.5 text-[10.5px] leading-snug text-slate-400">
        Clean charts, no arrows. D1 · Moon · Sun · the 16 classical charts · D5 D6 D8 D11 (harmonic-only charts are left out). Uses the current {s.chartStyle === 'north' ? 'North' : 'South'} style.
      </div>
      {err && <div className="mt-1 text-[11px] text-rose-400">{err}</div>}
    </div>
  )
}

/** Section 4 arrows: "Clean chart" removes every arrow and lord link; the three boxes pick them one by one */
function ArrowControls() {
  const s = useChart()
  const A = s.vargaArrows
  const clean = !A.out && !A.in && !A.lord
  const box = (k: 'out' | 'in' | 'lord', label: string, color: string) => (
    <label key={k} className="flex cursor-pointer items-center gap-1.5 text-[11px]">
      <input type="checkbox" checked={A[k]} onChange={(e) => s.set({ vargaArrows: { ...A, [k]: e.target.checked } })} style={{ accentColor: color }} />
      <span style={{ color }}>{label}</span>
    </label>
  )
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="seg" title="Clean chart hides every arrow and lord link (the planets and houses stay)">
        <button data-on={clean} onClick={() => s.set({ vargaArrows: { out: false, in: false, lord: false } })}>Clean chart</button>
        <button data-on={!clean} onClick={() => { if (clean) s.set({ vargaArrows: { out: true, in: true, lord: true } }) }}>With arrows</button>
      </div>
      {!clean && <>{box('out', 'Outgoing', '#38bdf8')}{box('in', 'Incoming', '#a78bfa')}{box('lord', 'Lord link', '#fbbf24')}</>}
    </div>
  )
}

export function VargaSection({ chart }: { chart: ChartData }) {
  const s = useChart()
  const count = s.vargaCount
  const sel = [0, 1, 2].map((i) => s.vargaSel[i] ?? [9, 10, 7][i])
  const setOne = (i: number, n: number) => s.set({ vargaSel: sel.map((x, j) => (j === i ? n : x)) })
  const cols = count === 1 ? 'grid-cols-1' : count === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
  const maxW = count === 1 ? 720 : count === 2 ? 1180 : 1700

  return (
    <section className="mt-10">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-mute">Section 4</div>
          <h3 className="text-sm font-semibold text-white">Divisional Charts (D1 – D60)</h3>
          <p className="mt-0.5 max-w-2xl text-[11px] leading-relaxed text-mute">
            Worked from sidereal (Lahiri) longitudes at the current chart time. Only the 16 <b className="text-slate-200">classical</b> charts have one accepted rule. D5, D6, D8, D11 are <b className="text-slate-200">conventions</b> (schools differ).
            D13–D59 other than the classical ones have <b className="text-slate-200">no traditional Vedic rule</b> and are marked as harmonic-only.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ArrowControls />
          <div className="seg" title="How many charts to show at once">
            {([1, 2, 3] as const).map((c) => <button key={c} data-on={count === c} onClick={() => s.set({ vargaCount: c })}>{c} chart{c > 1 ? 's' : ''}</button>)}
          </div>
          <div className="seg"><button data-on={s.chartStyle === 'north'} onClick={() => s.set({ chartStyle: 'north' })}>North</button><button data-on={s.chartStyle === 'south'} onClick={() => s.set({ chartStyle: 'south' })}>South</button></div>
        </div>
      </div>
      <div className="mb-3"><DownloadAll chart={chart} /></div>
      <div className={`mx-auto grid items-start gap-4 ${cols}`} style={{ maxWidth: maxW }}>
        {sel.slice(0, count).map((n, i) => <VargaPanel key={i} chart={chart} n={n} onChange={(x) => setOne(i, x)} />)}
      </div>
    </section>
  )
}