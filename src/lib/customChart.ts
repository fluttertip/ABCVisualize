import { ChartData, Placement, dignityOf, houseOf, nakshatraOf, rashiOf } from './chart'
import { GRAHAS, GRAHA_ORDER, GrahaId } from './constants'
import { computeEphemeris } from './engine'
import { norm360 } from './math'

/** a hand-placed planet: its sign, and optionally a nakshatra / pada inside that sign */
export interface Pick { sign: number; nak: number | null; pada: number | null }
export const NAK_SPAN = 360 / 27

/** the nakshatras that overlap a sign (always 2 or 3) */
export function naksInSign(sign: number): number[] {
  const a = Math.floor((sign * 30 + 1e-9) / NAK_SPAN), b = Math.floor((sign * 30 + 30 - 1e-9) / NAK_SPAN)
  const out: number[] = []
  for (let i = a; i <= b; i++) out.push(i)
  return out
}
/** padas (1-4) of a nakshatra that lie inside a sign. Signs and padas share the 3°20' grid, so each pada sits wholly in one sign */
export function padasInSign(nak: number, sign: number): number[] {
  return [1, 2, 3, 4].filter((p) => { const mid = nak * NAK_SPAN + (p - 0.5) * (NAK_SPAN / 4); return mid >= sign * 30 && mid < sign * 30 + 30 })
}
/** make a pick consistent: a nakshatra / pada that does not fall in the chosen sign is dropped */
export function cleanPick(p: Pick): Pick {
  let { nak, pada } = p
  if (nak !== null && !naksInSign(p.sign).includes(nak)) { nak = null; pada = null }
  if (nak === null) pada = null
  else if (pada !== null && !padasInSign(nak, p.sign).includes(pada)) pada = null
  return { sign: p.sign, nak, pada }
}
/** sidereal longitude used for a pick: middle of the pada, else middle of the nakshatra (inside the sign), else middle of the sign */
export function pickLon(p: Pick): number {
  if (p.nak !== null && p.pada !== null) return p.nak * NAK_SPAN + (p.pada - 0.5) * (NAK_SPAN / 4)
  if (p.nak !== null) { const lo = Math.max(p.nak * NAK_SPAN, p.sign * 30), hi = Math.min((p.nak + 1) * NAK_SPAN, p.sign * 30 + 30); return (lo + hi) / 2 }
  return p.sign * 30 + 15
}
/** pick of an exact longitude (used to copy a real sky into the builder) */
export function pickOfLon(lon: number): Pick {
  const n = nakshatraOf(lon)
  return { sign: rashiOf(lon), nak: n.idx, pada: n.pada }
}

type Lons = Record<GrahaId, number>
/** ChartData (the same shape the rest of the app draws) from sidereal longitudes. Whole-sign houses from the lagna sign. */
export function chartFromLongitudes(lagnaLon: number, lon: Lons): ChartData {
  const lagnaIdx = rashiOf(lagnaLon)
  const placements = {} as Record<GrahaId, Placement>
  const byHouse: GrahaId[][] = Array.from({ length: 13 }, () => [])
  GRAHA_ORDER.forEach((id) => {
    const L = norm360(lon[id]), ri = rashiOf(L), h = houseOf(ri, lagnaIdx)
    let sep = Math.abs(norm360(L - lon.sun)); if (sep > 180) sep = 360 - sep
    const orb = GRAHAS[id].combustOrb
    placements[id] = { id, house: h, rashiIdx: ri, lon: L, degInSign: L % 30, nak: nakshatraOf(L), dignity: dignityOf(id, ri), retro: false, combust: orb > 0 && sep <= orb, speed: 0 }
    byHouse[h].push(id)
  })
  const nl = norm360(lagnaLon)
  return { jd: 0, ayanamsa: 0, frame: 'sidereal', lagnaLon: nl, lagnaIdx, lagnaDeg: nl % 30, lagnaNak: nakshatraOf(nl), moonSid: placements.moon.lon, ut: 0, audit: { T: 0, gst: 0, lst: 0, epsDeg: 0, yAsc: 0, xAsc: 0, lagnaTrop: 0, lagnaSid: nl }, placements, byHouse }
}

export type SearchPlanet = 'sun' | 'moon' | 'mars' | 'mercury' | 'jupiter' | 'venus' | 'saturn' | 'rahu'
export const SEARCH_PLANETS: SearchPlanet[] = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu']

export function chartFromPicks(lagna: Pick, planets: Record<SearchPlanet, Pick>): ChartData {
  const lon = {} as Lons
  SEARCH_PLANETS.forEach((id) => { lon[id] = pickLon(planets[id]) })
  lon.ketu = norm360(lon.rahu + 180)                  // the nodes are always exactly opposite
  return chartFromLongitudes(pickLon(lagna), lon)
}

/** the real sky (apparent positions, Lahiri) at a Julian day (UT) and place, as ChartData */
export function chartAtJd(jd: number, lat: number, lon: number, ayanamsaShift = 0): ChartData {
  const e = computeEphemeris(jd, lat, lon)
  const L = {} as Lons
  GRAHA_ORDER.forEach((id) => { L[id] = norm360(e.bodies[id].sid - ayanamsaShift) })
  const c = chartFromLongitudes(norm360(e.lagna.sid - ayanamsaShift), L)
  GRAHA_ORDER.forEach((id) => { c.placements[id].retro = e.bodies[id].isRetro && id !== 'rahu' && id !== 'ketu'; c.placements[id].speed = e.bodies[id].speed })
  c.jd = jd; c.ayanamsa = e.ayanamsa + ayanamsaShift
  return c
}