import { GRAHAS, GRAHA_ORDER, GrahaId, RASHIS } from './constants'
import { ChartData, aspectTargets } from './chart'

/**
 * LOOPS = closed circles of links between houses.
 *  - Lord loops: every house points to the house where its lord sits. Following those pointers always ends in a circle:
 *      A -> B -> A is an exchange of signs (parivartana), A -> B -> C -> A a longer circle. A lord in its own house points to itself.
 *  - Drishti loops: house A points to house B when a planet in A aspects B. A circle needs a planet in each house, so the
 *      mutual pair (7th aspect both ways, Jupiter 5th/9th both ways, Mars 4th/8th ...) is the common one; 3-house circles are listed too.
 */
export interface LoopEdge { from: number; to: number; label: string }
export interface Loop { kind: 'lord' | 'drishti'; houses: number[]; edges: LoopEdge[] }

export function lordLoops(chart: ChartData): { loops: Loop[]; own: number[] } {
  const next: number[] = [0], by: GrahaId[] = ['sun']
  for (let h = 1; h <= 12; h++) { const l = RASHIS[(chart.lagnaIdx + h - 1) % 12].lord; by[h] = l; next[h] = chart.placements[l].house }
  const own: number[] = [], loops: Loop[] = [], seen = new Set<number>()
  for (let h = 1; h <= 12; h++) {
    if (seen.has(h)) continue
    const path: number[] = []
    let x = h
    while (!seen.has(x) && !path.includes(x)) { path.push(x); x = next[x] }
    if (path.includes(x)) {                                // found a circle: it starts where the path met itself
      const cyc = path.slice(path.indexOf(x))
      if (cyc.length === 1) own.push(cyc[0])
      else loops.push({ kind: 'lord', houses: cyc, edges: cyc.map((a) => ({ from: a, to: next[a], label: `${GRAHAS[by[a]].short}` })) })
    }
    path.forEach((p) => seen.add(p))
  }
  return { loops, own }
}

export function drishtiLoops(chart: ChartData, maxLen = 3): Loop[] {
  const P = chart.placements
  const adj: Record<number, Map<number, string[]>> = {}
  for (let h = 1; h <= 12; h++) adj[h] = new Map()
  GRAHA_ORDER.forEach((g) => aspectTargets(g, P[g].house).forEach((a) => {
    if (a.toHouse === P[g].house) return
    const m = adj[P[g].house]; m.set(a.toHouse, [...(m.get(a.toHouse) ?? []), GRAHAS[g].short])
  }))
  const out: Loop[] = []
  // simple circles of length 2..maxLen, each reported once (starting at its smallest house)
  const walk = (start: number, path: number[]) => {
    const last = path[path.length - 1]
    adj[last].forEach((_, to) => {
      if (to === start && path.length >= 2) {
        out.push({ kind: 'drishti', houses: [...path], edges: path.map((a, i) => { const b = path[(i + 1) % path.length]; return { from: a, to: b, label: adj[a].get(b)!.join('+') } }) })
      } else if (to > start && !path.includes(to) && path.length < maxLen) walk(start, [...path, to])
    })
  }
  for (let s = 1; s <= 12; s++) walk(s, [s])
  // a 3-house circle read in the other direction is a different circle; two-house circles were found once per direction pair -> dedupe
  const key = (l: Loop) => l.houses.length === 2 ? l.houses.join('-') : [...l.houses].join('>')
  const seen = new Set<string>()
  return out.filter((l) => { const k = key(l); if (seen.has(k)) return false; seen.add(k); return true })
}