import { memo } from 'react'
import { ChartData } from '../lib/chart'
import { Arrow, ArrowToggles, buildArrows } from '../lib/arrows'
import { DIAMOND_CELLS, GRAHAS, GrahaId, RASHIS, SOUTH_RASHI_POS } from '../lib/constants'
import { fmtDMS } from '../lib/math'
import { lordLoops } from '../lib/loops'

interface Cell { house: number; rashiIdx: number; poly?: string; rect?: { x: number; y: number; w: number }; cx: number; cy: number; numX: number; numY: number }

function layout(style: 'north' | 'south', lagnaIdx: number): Cell[] {
  if (style === 'north') {
    return DIAMOND_CELLS.map((c) => ({ house: c.num, rashiIdx: (lagnaIdx + c.num - 1) % 12, poly: c.poly, cx: c.cx, cy: c.cy, numX: c.rx, numY: c.ry }))
  }
  const out: Cell[] = []
  for (let r = 1; r <= 12; r++) {
    const [col, row] = SOUTH_RASHI_POS[r], w = 117, x = 16 + col * w, y = 16 + row * w
    out.push({ house: ((r - 1 - lagnaIdx + 12) % 12) + 1, rashiIdx: r - 1, rect: { x, y, w }, cx: x + w / 2, cy: y + w / 2, numX: x + 12, numY: y + 14 })
  }
  return out
}

const KIND = {
  out: { color: '#38bdf8', dash: '1.6 3.2', marker: 'mk-out' },
  in: { color: '#a78bfa', dash: '1.6 3.2', marker: 'mk-in' },
  lord: { color: '#fbbf24', dash: '0.8 3', marker: 'mk-lord' },
  loopL: { color: '#fb923c', dash: '', marker: 'mk-loopL' },
  loopD: { color: '#2dd4bf', dash: '', marker: 'mk-loopD' },
} as const

interface Props {
  chart: ChartData; style: 'north' | 'south'; focusH: number; focusG: GrahaId | null
  toggles: ArrowToggles; reveal: boolean; onPick: (house: number, graha: GrahaId | null) => void
}

export const KundaliChart = memo(function KundaliChart({ chart, style, focusH, focusG, toggles, reveal, onPick }: Props) {
  const cells = layout(style, chart.lagnaIdx)
  const byHouse = new Map(cells.map((c) => [c.house, c]))
  const arrows = buildArrows(chart, focusH, focusG, toggles)

  // group arrows between the same pair of houses so each gets its own lane (no overlap)
  const groups = new Map<string, Arrow[]>()
  arrows.forEach((a) => { const k = `${Math.min(a.from, a.to)}-${Math.max(a.from, a.to)}`; groups.set(k, [...(groups.get(k) ?? []), a]) })

  const tint = new Map<number, string>()
  arrows.forEach((a) => { tint.set(a.to, KIND[a.kind].color); if (a.kind === 'in' || a.kind === 'loopL' || a.kind === 'loopD') tint.set(a.from, KIND[a.kind].color) })
  const ownLord = toggles.loopL ? lordLoops(chart).own : []   // lord sitting in its own house = a loop of one

  const paths: JSX.Element[] = []
  groups.forEach((arr, key) => {
    arr.forEach((a, k) => {
      const c1 = byHouse.get(a.from)!, c2 = byHouse.get(a.to)!
      const lo = a.from < a.to ? c1 : c2, hi = a.from < a.to ? c2 : c1
      const dx = hi.cx - lo.cx, dy = hi.cy - lo.cy, d = Math.hypot(dx, dy) || 1
      const nx = -dy / d, ny = dx / d
      const off = (k - (arr.length - 1) / 2) * 20 || 12
      const mx = (c1.cx + c2.cx) / 2 + nx * off, my = (c1.cy + c2.cy) / 2 + ny * off
      const q = (t: number) => ({ x: (1 - t) ** 2 * c1.cx + 2 * (1 - t) * t * mx + t * t * c2.cx, y: (1 - t) ** 2 * c1.cy + 2 * (1 - t) * t * my + t * t * c2.cy })
      const s = q(0.2), e = q(0.8), lb = q(0.5)
      const K = KIND[a.kind]
      paths.push(
        <g key={`${key}-${k}-${a.kind}-${a.label}`} pointerEvents="none" className="k-arrow">
          <path d={`M${s.x.toFixed(1)} ${s.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${e.x.toFixed(1)} ${e.y.toFixed(1)}`} fill="none" stroke={K.color} strokeWidth={a.kind.startsWith('loop') ? 1.5 : 0.9}
            strokeDasharray={K.dash || undefined} strokeLinecap="round" opacity={a.kind.startsWith('loop') ? 0.9 : 0.75} markerEnd={`url(#${K.marker})`} />
          <text x={lb.x} y={lb.y} textAnchor="middle" dominantBaseline="middle" fontSize="7.5" fontWeight="600" fill={K.color}
            fontFamily="JetBrains Mono, monospace" style={{ paintOrder: 'stroke', stroke: '#0a0e16', strokeWidth: 3, strokeLinejoin: 'round' }}>{a.label}</text>
        </g>,
      )
    })
  })

  return (
    <svg viewBox="0 0 500 500" className={`w-full h-full select-none ${reveal ? 'reveal' : ''}`}>
      <defs>
        {Object.entries(KIND).map(([k, v]) => (
          <marker key={k} id={v.marker} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
            <path d="M0 0.4 L4.6 2.5 L0 4.6 Z" fill={v.color} opacity="0.8" />
          </marker>
        ))}
      </defs>
      {cells.map((c) => {
        const r = RASHIS[c.rashiIdx], focus = focusH === c.house, t = tint.get(c.house)
        const common = {
          className: 'k-line cursor-pointer', onClick: () => onPick(c.house, null),
          fill: focus ? r.color + '30' : t ? t + '14' : r.color + '0d', stroke: focus ? r.color : r.color + '80', strokeWidth: focus ? 2 : 1.1,
        }
        return c.poly ? <polygon key={c.house} points={c.poly} {...common} /> : <rect key={c.house} x={c.rect!.x} y={c.rect!.y} width={c.rect!.w} height={c.rect!.w} {...common} />
      })}
      {cells.map((c) => {
        const r = RASHIS[c.rashiIdx], ps = chart.byHouse[c.house]
        const delay = `${0.35 + c.house * 0.09}s`
        const south = style === 'south'
        return (
          <g key={`t${c.house}`} className="k-fade" style={{ animationDelay: delay }}>
            <text x={c.numX} y={c.numY} textAnchor={south ? 'start' : 'middle'} dominantBaseline="middle" fill={r.color} fontSize="12" fontWeight="700" fontFamily="JetBrains Mono, monospace" pointerEvents="none">
              {south ? `${r.sym} ${r.name}` : r.num}
            </text>
            {ownLord.includes(c.house) && <text x={c.numX + (south ? 56 : 15)} y={c.numY} textAnchor="middle" dominantBaseline="middle" fill={KIND.loopL.color} fontSize="12" fontWeight="700" pointerEvents="none"><title>Lord of this house sits in it</title>↻</text>}
            {c.house === 1 && (
              <text x={south ? c.numX : c.cx} y={south ? c.numY + 14 : c.cy - 22} textAnchor={south ? 'start' : 'middle'} fill="#f5b041" fontSize="9.5" fontWeight="700" fontFamily="JetBrains Mono, monospace" pointerEvents="none">
                Asc {fmtDMS(chart.lagnaDeg)}
              </text>
            )}
            {ps.map((id, i) => {
              const g = GRAHAS[id], p = chart.placements[id]
              const y = south ? c.cy - 22 + i * 14 + (c.house === 1 ? 14 : 0) : c.cy + (i - (ps.length - 1) / 2) * 15 + (c.house === 1 ? 8 : 0)
              const sel = focusG === id
              return (
                <g key={id} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onPick(c.house, id) }}>
                  {sel && <rect x={c.cx - 46} y={y - 8} width="92" height="15" rx="4" fill="#ffffff14" />}
                  <text x={c.cx} y={y} textAnchor="middle" dominantBaseline="middle" fill={g.color} fontSize="10.5" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                    {g.short}{p.retro ? '(R)' : ''}{p.dignity.short}{p.combust ? 'ᶜ' : ''} {fmtDMS(p.degInSign)}
                  </text>
                </g>
              )
            })}
          </g>
        )
      })}
      {paths}
    </svg>
  )
})