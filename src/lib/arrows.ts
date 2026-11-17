import { GRAHAS, GRAHA_ORDER, GrahaId, RASHIS } from './constants'
import { ChartData, aspectTargets } from './chart'

export interface Arrow { kind: 'out' | 'in' | 'lord'; from: number; to: number; label: string }
export interface ArrowToggles { out: boolean; in: boolean; lord: boolean }

export function buildArrows(chart: ChartData, focusH: number, focusG: GrahaId | null, t: ArrowToggles): Arrow[] {
  const list: Arrow[] = []
  const P = chart.placements
  if (t.out) {
    const src = focusG ? [focusG] : GRAHA_ORDER.filter((g) => P[g].house === focusH)
    src.forEach((g) => aspectTargets(g, P[g].house).forEach((a) => list.push({ kind: 'out', from: P[g].house, to: a.toHouse, label: `${GRAHAS[g].short} ${a.ordinal}` })))
  }
  if (t.in) {
    GRAHA_ORDER.forEach((g) => {
      if (P[g].house === focusH) return
      aspectTargets(g, P[g].house).forEach((a) => {
        if (a.toHouse === focusH) list.push({ kind: 'in', from: P[g].house, to: focusH, label: `${GRAHAS[g].short} ${a.ordinal}` })
      })
    })
  }
  if (t.lord) {
    const lord = RASHIS[(chart.lagnaIdx + focusH - 1) % 12].lord
    const lh = P[lord].house
    if (lh !== focusH) list.push({ kind: 'lord', from: focusH, to: lh, label: `Lord ${GRAHAS[lord].short}` })
  }
  return list
}
