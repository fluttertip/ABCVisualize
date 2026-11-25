import { memo } from 'react'
import { ChartData } from '../lib/chart'
import { GRAHAS, GrahaId, RASHIS } from '../lib/constants'
import { fmtDMS } from '../lib/math'

/**
 * Plain-words line under the sky wheel: what the lit-up planet is sitting in.
 * The sign, nakshatra and pada shown here are exactly the ones lit on the wheel (same longitude).
 */
export const PlanetReadout = memo(function PlanetReadout({ chart, graha }: { chart: ChartData; graha: GrahaId | null }) {
  if (!graha) return <p className="mt-2 text-center text-[12px] text-mute">Click a planet on the wheel to light up its sign and nakshatra.</p>
  const g = GRAHAS[graha], p = chart.placements[graha], r = RASHIS[p.rashiIdx], nl = GRAHAS[p.nak.lord]
  const Item = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{k}</div><div className="text-[12.5px] leading-snug text-slate-100">{children}</div></div>
  )
  return (
    <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2" aria-live="polite">
      <div className="mb-1.5 text-[13px] font-semibold" style={{ color: g.color }}>{g.sym} {g.name}{p.retro ? ' (retrograde)' : ''} <span className="font-normal text-slate-400">· House {p.house}</span></div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-4">
        <Item k="Sign"><span style={{ color: r.color }}>{r.sym} {r.name}</span></Item>
        <Item k="Degree in sign"><span className="font-mono">{fmtDMS(p.degInSign)}</span></Item>
        <Item k="Nakshatra">{p.nak.name} · pada {p.nak.pada}</Item>
        <Item k="Nakshatra lord"><span style={{ color: nl.color }}>{nl.sym} {nl.name}</span> <span className="text-slate-500">({p.nak.akshar})</span></Item>
      </div>
    </div>
  )
})