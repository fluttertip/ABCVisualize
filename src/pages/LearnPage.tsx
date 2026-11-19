import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DERIVED_HOUSES, DISAGREEMENTS, HOUSE_GUIDE, HouseGuide } from '../data/housesGuide'

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`
const haystack = (h: HouseGuide) => [h.names, h.karaka, h.body, h.aspected, h.books, ...h.groups, ...h.core, ...h.secondary, ...h.minor].join(' ').toLowerCase()

/** wraps matches of the search text in <mark> so people can see why a house matched */
function Hl({ text, q }: { text: string; q: string }) {
  const k = q.trim()
  if (k.length < 2) return <>{text}</>
  const i = text.toLowerCase().indexOf(k.toLowerCase())
  if (i < 0) return <>{text}</>
  return <>{text.slice(0, i)}<mark className="rounded bg-amber-300/25 px-0.5 text-inherit">{text.slice(i, i + k.length)}</mark>{text.slice(i + k.length)}</>
}

function Facts({ h }: { h: HouseGuide }) {
  const Row = ({ k, v, tip }: { k: string; v: string; tip?: string }) => (
    <div className="grid gap-0.5 border-t border-white/10 py-2 sm:grid-cols-[8.5rem_1fr] sm:gap-3 first:border-t-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400" title={tip}>{k}</dt>
      <dd className="text-[13.5px] leading-relaxed text-slate-200">{v}</dd>
    </div>
  )
  return (
    <dl className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-1">
      <Row k="Karaka" v={h.karaka} tip="The planet(s) that naturally stand for this house" />
      <Row k="Body part" v={h.body} />
      <Row k="Looked at by" v={h.aspected} tip="Which planets aspect this house, and from where" />
    </dl>
  )
}

function Tier({ title, hint, items, start, q, strong }: { title: string; hint: string; items: string[]; start: number; q: string; strong?: boolean }) {
  if (!items.length) return null
  return (
    <section className="mt-5">
      <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-white">{title}</h3>
        <span className="text-[12px] text-mute">{hint}</span>
      </div>
      <ol className="divide-y divide-white/5 rounded-xl border border-white/10 bg-white/[0.02]">
        {items.map((t, i) => (
          <li key={i} className="flex gap-3 px-3.5 py-2">
            <span className="w-6 shrink-0 pt-px text-right font-mono text-[11.5px] text-slate-500">{start + i}</span>
            <span className={strong ? 'text-[15px] font-medium text-white' : 'text-[13.5px] text-slate-300'}><Hl text={t} q={q} /></span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function LearnPage() {
  const { house } = useParams()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const sel = Math.min(12, Math.max(1, Number(house) || 1))
  const matches = useMemo(() => { const k = q.trim().toLowerCase(); return k.length < 2 ? HOUSE_GUIDE : HOUSE_GUIDE.filter((h) => haystack(h).includes(k)) }, [q])
  const h = HOUSE_GUIDE[sel - 1]
  const go = (n: number) => { nav(`/learn/${n}`); window.scrollTo({ top: 0 }) }

  // searching jumps to the first house that matches
  useEffect(() => { if (q.trim().length >= 2 && matches.length && !matches.some((m) => m.n === sel)) nav(`/learn/${matches[0].n}`, { replace: true }) }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  const coreN = h.core.length, secN = h.secondary.length
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-4 sm:px-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-white">Learn · The 12 houses</h1>
        <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-slate-400">
          What each house stands for, from the most important meaning to the least. Pick a house, or search for a topic like “marriage”, “career” or “father”.
          Numbers show the priority: lower number = more central to that house.
        </p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-slate-400">
          <span><b className="text-slate-200">Core:</b> the main meaning</span>
          <span><b className="text-slate-200">Secondary:</b> strong, but not the main meaning</span>
          <span><b className="text-slate-200">Minor:</b> small items and body links</span>
          <span><b className="text-slate-200">Some books:</b> not all sources agree</span>
        </div>
      </div>

      <input className="input mb-3 w-full sm:max-w-sm" placeholder="Search a topic (marriage, career, father, money…)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the houses" />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[13.5rem_minmax(0,1fr)]">
        {/* house list: a sticky column on desktop, a scrolling strip on phones */}
        <nav aria-label="Houses" className="min-w-0 md:sticky md:top-4 md:self-start">
          <ul className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-col md:gap-0.5 md:overflow-visible md:px-0 md:pb-0">
            {HOUSE_GUIDE.map((x) => {
              const hit = matches.includes(x), on = x.n === sel
              return (
                <li key={x.n} className="shrink-0">
                  <button onClick={() => go(x.n)} aria-current={on ? 'page' : undefined} disabled={!hit && q.trim().length >= 2}
                    className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition md:border-transparent ${on ? 'border-white/25 bg-white/10 text-white' : 'border-white/10 text-slate-300 hover:bg-white/[0.06] md:border-transparent'} ${!hit && q.trim().length >= 2 ? 'opacity-30' : ''}`}>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/[0.07] font-mono text-[12px] font-semibold">{x.n}</span>
                    <span className="min-w-0"><span className="block whitespace-nowrap text-[13px] font-medium">{ordinal(x.n)} house</span><span className="hidden truncate text-[11px] text-mute md:block">{x.names}</span></span>
                  </button>
                </li>
              )
            })}
          </ul>
          {q.trim().length >= 2 && <p className="mt-2 text-[12px] text-mute">{matches.length ? `${matches.length} house${matches.length > 1 ? 's' : ''} mention “${q.trim()}”` : `No house mentions “${q.trim()}”`}</p>}
        </nav>

        <article className="min-w-0">
          <header className="mb-3">
            <div className="text-[11px] font-medium uppercase tracking-wider text-mute">House {h.n} of 12</div>
            <h2 className="text-2xl font-semibold text-white">{ordinal(h.n)} House <span className="text-slate-400">· {h.names}</span></h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {h.groups.map((g) => <span key={g} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[12px] text-slate-300">{g}</span>)}
            </div>
          </header>

          <Facts h={h} />
          <Tier title="Core" hint="the main meaning" items={h.core} start={1} q={q} strong />
          <Tier title="Secondary" hint="strong, but not the main meaning" items={h.secondary} start={coreN + 1} q={q} />
          <Tier title="Minor" hint="small items and body links" items={h.minor} start={coreN + secN + 1} q={q} />
          {h.books && (
            <section className="mt-5 rounded-xl border border-dashed border-white/15 px-4 py-3">
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Some books also say</h3>
              <p className="mt-1 text-[13.5px] leading-relaxed text-slate-300"><Hl text={h.books} q={q} /></p>
            </section>
          )}

          <div className="mt-6 flex items-center justify-between gap-2">
            <button className="btn" disabled={sel === 1} onClick={() => go(sel - 1)}>← {sel > 1 ? `${ordinal(sel - 1)} house` : ''}</button>
            <Link to="/" className="text-[12.5px] text-mute underline-offset-2 hover:text-white hover:underline">Back to my chart</Link>
            <button className="btn" disabled={sel === 12} onClick={() => go(sel + 1)}>{sel < 12 ? `${ordinal(sel + 1)} house` : ''} →</button>
          </div>
        </article>
      </div>

      {/* applies to every house, so it sits below instead of inside one */}
      <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-white">Derived houses</h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-slate-400">Any house can stand for a relative’s life: count from that relative’s house as if it were the 1st. Examples:</p>
          <ul className="mt-2 space-y-1.5 text-[13.5px] text-slate-200">{DERIVED_HOUSES.map((t) => <li key={t} className="flex gap-2"><span className="text-slate-500">•</span>{t}</li>)}</ul>
        </section>
        <section className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-white">Where books disagree</h3>
          <ul className="mt-2 space-y-1.5 text-[13.5px] text-slate-200">{DISAGREEMENTS.map((t) => <li key={t} className="flex gap-2"><span className="text-slate-500">•</span>{t}</li>)}</ul>
        </section>
      </div>
    </main>
  )
}