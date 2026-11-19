import { ChartData } from './chart'
import { DEG2RAD, RAD2DEG, norm360 } from './math'

/**
 * BHAVA CHALIT. D1 gives every planet a whole sign = one house. Chalit instead gives each house a real width around its own
 * centre (Bhava madhya), so a planet near the edge of a sign can fall into the next or the previous house.
 *
 *  - 'sripati' (default in most Indian software): the centres of houses 1, 4, 7, 10 are the Lagna, IC, Descendant and Midheaven.
 *    Each of the four arcs between them is cut into three equal parts, which gives the centres of the other houses.
 *    A house runs from the midpoint between its centre and the previous centre to the midpoint between its centre and the next one.
 *  - 'equal': every house is exactly 30 degrees wide and centred on the Lagna degree (centre of house n = Lagna + 30 x (n - 1)).
 */
export type BhavaMethod = 'sripati' | 'equal'
export interface Bhava { house: number; start: number; mid: number; end: number }
export interface BhavaSet { method: BhavaMethod; asked: BhavaMethod; mc: number; bhavas: Bhava[] }

const fwd = (from: number, to: number) => norm360(to - from)   // how far you travel going forward from `from` to `to`

/** Midheaven (sidereal when the chart is sidereal), from the sidereal time and obliquity the engine already worked out */
export function midheaven(c: ChartData) {
  const ram = c.audit.lst * DEG2RAD, eps = c.audit.epsDeg * DEG2RAD
  const trop = norm360(Math.atan2(Math.sin(ram), Math.cos(ram) * Math.cos(eps)) * RAD2DEG)
  return c.frame === 'sidereal' ? norm360(trop - c.ayanamsa) : trop
}

export function bhavaSet(c: ChartData, method: BhavaMethod): BhavaSet {
  const asc = c.lagnaLon, mc = midheaven(c)
  let mids: number[] = Array.from({ length: 12 }, (_, i) => norm360(asc + 30 * i))
  let used: BhavaMethod = 'equal'
  if (method === 'sripati') {
    const ic = norm360(mc + 180), dsc = norm360(asc + 180)
    const d1 = fwd(asc, ic), d2 = fwd(ic, dsc), d3 = fwd(dsc, mc), d4 = fwd(mc, asc)
    // each arc must be a sensible 0-180 degree stretch (it is, except in extreme polar cases) - otherwise fall back to equal houses
    if ([d1, d2, d3, d4].every((d) => d > 1 && d < 180)) {
      used = 'sripati'
      mids = [asc, asc + d1 / 3, asc + (2 * d1) / 3, ic, ic + d2 / 3, ic + (2 * d2) / 3, dsc, dsc + d3 / 3, dsc + (2 * d3) / 3, mc, mc + d4 / 3, mc + (2 * d4) / 3].map(norm360)
    }
  }
  const starts = mids.map((m, i) => norm360(mids[(i + 11) % 12] + fwd(mids[(i + 11) % 12], m) / 2))   // border between the previous house and this one
  const bhavas = mids.map((m, i) => ({ house: i + 1, start: starts[i], mid: m, end: starts[(i + 1) % 12] }))
  return { method: used, asked: method, mc, bhavas }
}

export function chalitHouse(lon: number, set: BhavaSet): number {
  const l = norm360(lon)
  const b = set.bhavas.find((x) => fwd(x.start, l) < fwd(x.start, x.end))
  return b ? b.house : 1
}