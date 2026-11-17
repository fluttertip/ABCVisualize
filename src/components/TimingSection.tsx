import { useMemo, useState } from 'react'
import { birthInstantMs, birthMinute, computeChart } from '../lib/chart'
import { GRAHAS, GRAHA_ORDER, GrahaId, NAKSHATRAS, RASHIS } from '../lib/constants'
import { moonSidAt, siderealAt } from '../lib/engine'
import { GOOD_FROM_MOON, LEVEL_NAMES, YEAR_DAYS, DPeriod, houseFrom, mahadashas, moonSegments, stackAt, subPeriods, taraOf } from '../lib/timing'
import { THEMES, findWindows, points, signify } from '../lib/windows'
import { useChartData } from '../lib/useChartData'
import { DashaOverview } from './DashaOverview'

const pad = (n: number) => String(n).padStart(2, '0')
const fmt = (ms: number) => { const d = new Date(ms); return `${pad(d.getDate())} ${d.toLocaleString('en-GB', { month: 'short' })} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}` }
const dur = (ms: number) => { const m = Math.round(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60); return d >= 1 ? `${d}d ${h}h` : h >= 1 ? `${h}h ${m % 60}m` : `${m}m` }
const mark = (l: number) => (l === 2 ? '●' : l === 1 ? '◐' : '○')
const grade = (p: number) => (p >= 5 ? 'A · very high activation' : p === 4 ? 'B · high' : p === 3 ? 'C · moderate' : 'low')
const tzLabel = () => { const o = -new Date().getTimezoneOffset(); return `UTC${o >= 0 ? '+' : '-'}${pad(Math.floor(Math.abs(o) / 60))}:${pad(Math.abs(o) % 60)}` }
const toLocalInput = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` }
const jdOf = (ms: number) => ms / 86400000 + 2440587.5
const WEEKDAY_LORD = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']
const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const G = ({ id }: { id: GrahaId }) => <b style={{ color: GRAHAS[id].color }}>{GRAHAS[id].sym} {GRAHAS[id].name}</b>
const Box = ({ t, c = '#38bdf8', children }: { t: string; c?: string; children: React.ReactNode }) => (
  <div className="mb-2 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2" data-c={c}><div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">{t}</div><div className="text-[11.5px] leading-relaxed text-slate-300">{children}</div></div>
)

export function TimingSection() {
  const { birth } = useChartData()
  const [tab, setTab] = useState<'overview' | 'now' | 'windows' | 'daily' | 'how'>('overview')
  const [themeId, setThemeId] = useState('accident')
  const [refStr, setRefStr] = useState(() => toLocalInput(Date.now()))
  const [years, setYears] = useState(3)
  const [minPts, setMinPts] = useState(4)

  const natal = useMemo(() => computeChart(birth, { minuteOfDay: birthMinute(birth), dayOffset: 0, yearOffset: 0, hourOffset: 0, minuteOffset: 0 }, 'sidereal'), [birth])
  const birthMs = useMemo(() => birthInstantMs(birth), [birth])
  const md = useMemo(() => mahadashas(natal.moonSid, birthMs), [natal.moonSid, birthMs])
  const ref = useMemo(() => { const t = new Date(refStr).getTime(); return Number.isFinite(t) ? t : Date.now() }, [refStr])
  const theme = THEMES.find((t) => t.id === themeId)!
  const stack = useMemo(() => stackAt(ref, md.periods, 5), [ref, md])

  const windows = useMemo(() => tab === 'windows' ? findWindows(theme, natal, md.periods, ref, ref + years * YEAR_DAYS * 86400000, minPts).sort((a, b) => a.pd.start - b.pd.start) : [], [tab, theme, natal, md, ref, years, minPts])

  const natalMoon = natal.placements.moon
  const sidNow = useMemo(() => siderealAt(jdOf(ref)), [ref])
  const moonNowNak = Math.floor(sidNow.moon / (360 / 27))
  const week = useMemo(() => tab === 'daily' ? moonSegments(ref, ref + 7 * 86400000) : [], [tab, ref])

  const Row = ({ p, why }: { p: DPeriod; why?: boolean }) => (
    <tr className="border-b border-white/5 align-top">
      <td className="py-1 pr-2 text-slate-400">{LEVEL_NAMES[p.level]}</td>
      <td className="py-1 pr-2"><G id={p.lord} /></td>
      <td className="py-1 pr-2 font-mono text-slate-300">{fmt(p.start)} → {fmt(p.end)}</td>
      <td className="py-1 pr-2 font-mono text-slate-400">{dur(p.end - p.start)}</td>
      {why && <td className="py-1 text-[10.5px] text-slate-400">{mark(signify(p.lord, theme, natal).level)} {signify(p.lord, theme, natal).why}</td>}
    </tr>
  )

  const tabs: [typeof tab, string][] = [['overview', 'Overview · dasha at a glance'], ['now', 'Now · dasha to the minute'], ['windows', 'Event windows'], ['daily', 'Daily & weekly'], ['how', 'How it works · limits']]
  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-mute">Section 5</div>
      <h2 className="text-[15px] font-semibold text-white">Timing · Dasha, Gochar, Tara &amp; event windows</h2>
      <p className="mb-3 text-[11px] text-mute">All times in your device time zone ({tzLabel()}). Sidereal Lahiri · Vimshottari year = {YEAR_DAYS} days.</p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`btn !py-1 text-[11.5px] ${tab === k ? '!border-white/25 !bg-white/12 !text-white' : ''}`}>{l}</button>)}
        <label className="ml-auto flex items-center gap-1.5 text-[11px] text-mute">Reference time
          <input type="datetime-local" className="btn !py-1 !bg-transparent" value={refStr} onChange={(e) => setRefStr(e.target.value)} />
          <button className="btn !py-1" onClick={() => setRefStr(toLocalInput(Date.now()))}>Now</button>
        </label>
      </div>

      {(tab === 'now' || tab === 'windows') && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-mute">Theme
          <select className="btn !bg-transparent !py-1" value={themeId} onChange={(e) => setThemeId(e.target.value)}>{THEMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
          <span className="text-slate-400">{theme.vedic}</span>
        </div>
      )}

      {tab === 'overview' && <DashaOverview natal={natal} md={md} birthMs={birthMs} at={ref} />}

      {tab === 'now' && (
        <div>
          <Box t="Running periods at the reference time (Vimshottari, five levels)" c="#a78bfa">
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-[11px]"><tbody>{stack.map((p) => <Row key={p.level} p={p} why />)}</tbody></table></div>
            <div className="mt-1 text-[10.5px] text-mute">● connects strongly to “{theme.label}” (lords/occupies a primary house or is its karaka) · ◐ partly (supporting house, aspect, or via dispositor) · ○ not connected. Activation points (Maha+Antar+Pratyantar, max 6): <b className="text-white">{points(stack.slice(0, 3).map((p) => p.lord), theme, natal)}</b> → {grade(points(stack.slice(0, 3).map((p) => p.lord), theme, natal))}</div>
          </Box>
          <Box t="All themes at a glance (current stack)" c="#fbbf24">
            <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-[11px]"><thead><tr className="text-left text-slate-500"><th className="py-1">Theme</th>{['Maha', 'Antar', 'Pratyantar', 'Sookshma', 'Prana'].map((h) => <th key={h}>{h}</th>)}<th>Points</th><th>Grade</th></tr></thead>
              <tbody>{THEMES.map((th) => { const lv = stack.map((p) => signify(p.lord, th, natal).level), pt = lv.slice(0, 3).reduce<number>((s, x) => s + x, 0); return (
                <tr key={th.id} className="border-t border-white/5"><td className="py-1 pr-2">{th.label}</td>{[0, 1, 2, 3, 4].map((i) => <td key={i} className="font-mono">{stack[i] ? <>{mark(lv[i])} <span style={{ color: GRAHAS[stack[i].lord].color }}>{GRAHAS[stack[i].lord].short}</span></> : '-'}</td>)}<td className="font-mono">{pt}/6</td><td>{grade(pt)}</td></tr>) })}</tbody></table></div>
          </Box>
          {[2, 3, 4].map((lv) => stack[lv - 1] && stack[lv - 1].level < 5 && (
            <details key={lv} className="mb-1 rounded-lg border border-white/10 px-2.5 py-1.5" open={lv === 3}>
              <summary className="cursor-pointer text-[11.5px] font-semibold text-slate-300">All {LEVEL_NAMES[lv + 1]}s inside the running {LEVEL_NAMES[lv]} (<span style={{ color: GRAHAS[stack[lv - 1].lord].color }}>{GRAHAS[stack[lv - 1].lord].name}</span>)</summary>
              <div className="mt-1 overflow-x-auto"><table className="w-full min-w-[640px] text-[11px]"><tbody>{subPeriods(stack[lv - 1]).map((p, i) => <tr key={i} className={`border-b border-white/5 ${ref >= p.start && ref < p.end ? 'bg-emerald-400/10' : ''}`}><td className="py-1 pr-2"><G id={p.lord} /></td><td className="py-1 pr-2 font-mono">{fmt(p.start)} → {fmt(p.end)}</td><td className="py-1 pr-2 font-mono text-slate-400">{dur(p.end - p.start)}</td><td className="py-1 font-mono">{mark(signify(p.lord, theme, natal).level)}{ref >= p.start && ref < p.end ? ' ◀ running' : ''}</td></tr>)}</tbody></table></div>
            </details>
          ))}
        </div>
      )}

      {tab === 'windows' && (
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-mute">Look ahead
            <select className="btn !bg-transparent !py-1" value={years} onChange={(e) => setYears(Number(e.target.value))}>{[1, 2, 3, 5, 10].map((y) => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>)}</select>
            Show grade
            <select className="btn !bg-transparent !py-1" value={minPts} onChange={(e) => setMinPts(Number(e.target.value))}><option value={5}>A only (5-6 points)</option><option value={4}>B and above (4+)</option><option value={3}>C and above (3+)</option></select>
          </div>
          <Box t={`Windows for “${theme.label}” (Pratyantardasha level, with Sookshma peaks)`} c="#34d399">
            <p className="mb-1 text-slate-400">A window is a Pratyantardasha in which the Maha, Antar and Pratyantar lords are connected to the theme. “Peaks” are the Sookshma sub-periods whose lord is a strong signifier. Gochar tags show slow planets matching the theme at the window’s midpoint. <b className="text-amber-300">{theme.caution}</b></p>
            {windows.length === 0 && <p className="text-slate-400">No windows at this grade in the chosen range. Lower the grade or look further ahead.</p>}
            {windows.slice(0, 40).map((w, i) => (
              <div key={i} className="mb-1.5 rounded-md border border-white/10 bg-white/[0.02] p-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-mono text-[11.5px] text-white">{fmt(w.pd.start)} → {fmt(w.pd.end)} <span className="text-slate-500">({dur(w.pd.end - w.pd.start)})</span></span><span className="text-[10.5px] font-semibold text-emerald-300">{w.pts}/6 · {grade(w.pts)}</span></div>
                <div className="text-[11px]">{w.pd.path.slice(0, 3).map((g, k) => <span key={k}>{k ? ' › ' : ''}<G id={g} /> {mark(w.levels[k])}</span>)} <span className="text-slate-500">(Maha › Antar › Pratyantar)</span></div>
                {w.gochar.length > 0 && <div className="text-[10.5px] text-amber-300">Gochar: {w.gochar.join(' · ')}</div>}
                {w.peaks.length > 0 && <div className="mt-0.5 text-[10.5px] text-slate-400">Peaks: {w.peaks.map((s) => `${GRAHAS[s.lord].short} ${fmt(s.start)}→${fmt(s.end)}`).join(' · ')}</div>}
              </div>
            ))}
            {windows.length > 40 && <p className="text-slate-500">Showing the first 40 of {windows.length}. Raise the grade to narrow.</p>}
          </Box>
        </div>
      )}

      {tab === 'daily' && (
        <div>
          <Box t="Moment at the reference time" c="#38bdf8">
            {(() => {
              const sign = Math.floor(sidNow.moon / 30), h = houseFrom(sign, natalMoon.rashiIdx), ok = GOOD_FROM_MOON.moon.includes(h), tr = taraOf(natalMoon.nak.idx, moonNowNak)
              return <div>Moon is in <b>{RASHIS[sign].en}</b>, <b>{NAKSHATRAS[moonNowNak].name}</b>. <b>Chandra Bala:</b> {h}th from your natal Moon ({RASHIS[natalMoon.rashiIdx].en}) → <b className={ok ? 'text-emerald-300' : 'text-rose-300'}>{ok ? 'favourable' : 'unfavourable'}</b>. <b>Tara Bala:</b> count {tr.count} → <b>{tr.name}</b> tara (<span className={tr.good ? 'text-emerald-300' : tr.good === false ? 'text-rose-300' : 'text-amber-300'}>{tr.good ? 'favourable' : tr.good === false ? 'unfavourable' : 'mixed'}</span>, {tr.note}). Birth star: {natalMoon.nak.name}.</div>
            })()}
          </Box>
          <Box t="Gochar · today’s planets in your chart (counted from natal Moon, then Lagna)" c="#fbbf24">
            <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-[11px]"><thead><tr className="text-left text-slate-500"><th className="py-1">Graha</th><th>Now in</th><th>House from Moon</th><th>Result (Phaladeepika list)</th><th>House from Lagna</th></tr></thead>
              <tbody>{GRAHA_ORDER.map((g) => { const sign = Math.floor(sidNow[g] / 30), hm = houseFrom(sign, natalMoon.rashiIdx), ok = GOOD_FROM_MOON[g].includes(hm); return (
                <tr key={g} className="border-t border-white/5"><td className="py-1"><G id={g} /></td><td>{RASHIS[sign].en} {(sidNow[g] % 30).toFixed(1)}°</td><td className="font-mono">{hm}H</td><td className={ok ? 'text-emerald-300' : 'text-rose-300'}>{ok ? 'favourable' : 'unfavourable'}</td><td className="font-mono">{houseFrom(sign, natal.lagnaIdx)}H</td></tr>) })}</tbody></table></div>
            <p className="mt-1 text-[10.5px] text-mute">Sources differ slightly on a few entries (Rahu/Ketu sometimes include the 10th; Mars sometimes the 10th). The common list is used. Gochar is read alongside the running dasha, not instead of it.</p>
          </Box>
          <Box t="Next 7 days · Moon by nakshatra and sign (changes found to the minute)" c="#34d399">
            <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-[11px]"><thead><tr className="text-left text-slate-500"><th className="py-1">From → to</th><th>Moon in</th><th>Chandra Bala</th><th>Tara Bala</th><th>Day read</th></tr></thead>
              <tbody>{week.map((s, i) => { const h = houseFrom(s.sign, natalMoon.rashiIdx), ok = GOOD_FROM_MOON.moon.includes(h), tr = taraOf(natalMoon.nak.idx, s.nak), sc = (ok ? 1 : 0) + (tr.good ? 1 : tr.good === null ? 0.5 : 0), d = new Date(s.start); return (
                <tr key={i} className="border-t border-white/5"><td className="py-1 pr-2 font-mono">{DAY[d.getDay()].slice(0, 3)} {fmt(s.start)} → {fmt(s.end)}</td><td>{RASHIS[s.sign].en} · {NAKSHATRAS[s.nak].name} p{s.pada + 1}</td><td className={ok ? 'text-emerald-300' : 'text-rose-300'}>{h}H {ok ? '✓' : '✗'}</td><td className={tr.good ? 'text-emerald-300' : tr.good === false ? 'text-rose-300' : 'text-amber-300'}>{tr.name} {tr.good ? '✓' : tr.good === false ? '✗' : '~'}</td><td className={sc >= 2 ? 'text-emerald-300' : sc >= 1 ? 'text-amber-300' : 'text-rose-300'}>{sc >= 2 ? 'supportive' : sc >= 1 ? 'mixed' : 'testing'}</td></tr>) })}</tbody></table></div>
            <p className="mt-1 text-[10.5px] text-mute">“Day read” is this app’s simple convention: Chandra Bala ✓ plus Tara Bala ✓ = supportive, one = mixed, none = testing. It is a mood-and-timing hint for routine choices, not a forecast of events. Weekday lords: {DAY.map((d, i) => `${d.slice(0, 3)}=${WEEKDAY_LORD[i]}`).join(', ')}.</p>
          </Box>
        </div>
      )}

      {tab === 'how' && (
        <div>
          <Box t="Which tool answers which question" c="#a78bfa">
            <b>Years to months to days to minutes:</b> Vimshottari dasha. 9 Mahadasha → 81 Antardasha → 729 Pratyantar → 6,561 Sookshma → 59,049 Prana periods in 120 years; each is the parent’s length × lord’s years ÷ 120. Prana periods run from about 20 minutes to 5.6 days.<br />
            <b>Weeks to months:</b> Gochar, the live planets counted from your natal Moon (Phaladeepika lists), plus Sade Sati (Saturn 12th/1st/2nd from Moon) and Guru’s year-long passage.<br />
            <b>Day to day:</b> Chandra Bala (Moon’s house from natal Moon: 1,3,6,7,10,11 good) and Tara Bala (nine taras from birth star: Sampat, Kshema, Sadhaka, Mitra, Parama Mitra good; Vipat, Pratyari, Vadha poor; Janma mixed). The Moon changes sign every ~2¼ days and nakshatra every ~day, so the “day” changes quality several times a week.<br />
            <b>Daily/weekly “predictions” in apps</b> are usually these Moon-based rules plus the dasha stack. Nothing more is hidden.
          </Box>
          <Box t="How a window is judged (the classical checklist)" c="#34d399">
            For a theme, pick the houses (bhava) and karakas. Example, accident: 8H (Randhra, sudden events), 6H (Ripu, injury), 1H (body), supported by 12H/3H/4H; karakas Mangala, Rahu, Shani, Ketu. A dasha lord connects to the theme if it <i>lords</i> a theme house, <i>sits</i> in one, <i>aspects</i> one or is a karaka (Rahu/Ketu act through their sign-lord). A period is “live” when the Maha, Antar and Pratyantar lords connect together, and it is confirmed when slow-moving gochar planets (Shani, Guru, Rahu, Mangala) touch the same houses. Foreign: 12H and 9H (3H, 4H, 7H support; Rahu, Guru, Shani). Education: 4H, 5H, 9H (Guru, Budha). Gains: 11H, 2H (5H, 9H; Guru). Loss: 12H, 8H, 6H. Mind: Chandra, Budha, 4H, with Shani/Rahu and Sade Sati.
          </Box>
          <Box t="What is verified, what is this app’s convention" c="#fbbf24">
            <b>Verified across several sources:</b> the proportional dasha formula at all five levels, Vimshottari sequence and years, gochar favourable-house lists, Tara Bala counting, and the house/karaka signification lists for each theme.<br />
            <b>This app’s convention (not classical numbers):</b> “activation points” (0–2 per level, summed over Maha/Antar/Pratyantar), the A/B/C grades, and the “Day read” label. Different astrologers weigh levels differently.<br />
            <b>Fixed in this build:</b> the Antardashas inside your first (birth) Mahadasha were squeezed into the remaining balance, which was wrong. They are now laid out on the full Mahadasha with the already-elapsed ones dropped. Dasha dates also now use the exact birth instant and a 365.25-day year.
          </Box>
          <Box t="Why “to the minute” is not the same as “accurate to the minute”" c="#fb7185">
            • The dasha clock starts from the Moon’s exact longitude. The Moon moves ~0.55° per hour, so a 1-minute error in birth time shifts every date by roughly 2 to 5 days (smaller lords less, Venus most). Prana periods (minutes to days) are therefore far finer than any birth time can support.<br />
            • Ayanamsa choice (e.g. Raman vs Lahiri, ~1.4°) moves dasha dates by about a year or two. Year length (360, 365.25, 365.2425) moves them by days.<br />
            • The windows say a period is <i>themed</i> around an area of life. They do not say an event will occur, and the text sources themselves say astrology cannot give the exact moment of an accident or any other event.<br />
            • Treat accident, loss and mental-fatigue windows as prompts for extra care (rest, safe driving, medical check-ups, talking to someone), not as predictions. For real health or mental-health concerns, see a doctor or counsellor.
          </Box>
        </div>
      )}
    </section>
  )
}