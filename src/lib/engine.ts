import * as Astronomy from 'astronomy-engine'
import { GRAHAS, GRAHA_ORDER, GrahaId } from './constants'
import { DEG2RAD, RAD2DEG, norm360 } from './math'
import { geoVec } from './safeGeo'

export function computeJD(year: number, month: number, day: number, utHours: number) {
  let Y = year, M = month
  const D = day + utHours / 24
  if (M <= 2) { Y -= 1; M += 12 }
  const A = Math.floor(Y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5
}

/**
 * Planet positions come from the `astronomy-engine` ephemeris (VSOP87 planets + a full lunar series, arc-second level),
 * with light-time and aberration applied (apparent positions, as Swiss-Ephemeris based software uses).
 * `Ecliptic()` / `EclipticGeoMoon()` return longitudes referred to the equinox OF DATE, so sidereal = tropical − ayanamsa(date).
 * (Nutation, at most ±0.005°, stays in the tropical value; it is far below the thinnest varga slice, 0.5° for D60.)
 *
 * WHY THIS REPLACED THE OLD ENGINE: the earlier build used low-precision Keplerian elements that are referred to the
 * fixed J2000.0 equinox, but then subtracted the ayanamsa of the BIRTH date. It never precessed the planets, so every
 * planet except the Moon was off by ~0.014° per year away from 2000 (≈ −0.37° in 2026, +0.7° around 1950). Wide slices
 * hid it, but D40 (0.75°), D45 (0.67°) and D60 (0.5°) - and sometimes D30 / D27 / D24 - flipped sign.
 */
const A0 = 23.85709233 // Lahiri ayanamsa at J2000.0 (degrees)
/** general precession in longitude, degrees, T = Julian centuries from J2000 (IAU 1976) */
const precession = (T: number) => (5028.796195 * T + 1.1054348 * T * T) / 3600
export const lahiriAyanamsa = (jd: number) => A0 + precession((jd - 2451545) / 36525)

const toDate = (jd: number) => new Date((jd - 2440587.5) * 86400000)
const BODY: Record<string, Astronomy.Body> = { mercury: Astronomy.Body.Mercury, venus: Astronomy.Body.Venus, mars: Astronomy.Body.Mars, jupiter: Astronomy.Body.Jupiter, saturn: Astronomy.Body.Saturn }

/** TROPICAL (equinox-of-date) longitudes of all nine grahas at a Julian day */
function tropicalAt(jd: number): Record<GrahaId, number> {
  const T = (jd - 2451545) / 36525
  const date = toDate(jd)
  const g: Record<string, number> = {}
  g.sun = norm360(Astronomy.Ecliptic(geoVec(Astronomy.Body.Sun, date)).elon)
  for (const k of Object.keys(BODY)) g[k] = norm360(Astronomy.Ecliptic(geoVec(BODY[k], date)).elon)
  g.moon = norm360(Astronomy.EclipticGeoMoon(date).lon)                     // already referred to the equinox of date
  const rahu = norm360(125.04452 - 1934.136261 * T + 0.0020708 * T * T)      // mean node (the standard Vedic default)
  return { sun: g.sun, moon: g.moon, mars: g.mars, mercury: g.mercury, jupiter: g.jupiter, venus: g.venus, saturn: g.saturn, rahu, ketu: norm360(rahu + 180) }
}

export interface BodyPos { trop: number; sid: number; speed: number; isRetro: boolean; isCombust: boolean }
export interface Ephem {
  jd: number; T: number; gst: number; lst: number; epsDeg: number; yAsc: number; xAsc: number; ayanamsa: number; lagna: { trop: number; sid: number }; bodies: Record<GrahaId, BodyPos>
}

export function computeEphemeris(jd: number, latDeg: number, lonDeg: number): Ephem {
  const T = (jd - 2451545) / 36525
  const ayanamsa = lahiriAyanamsa(jd) // Lahiri
  const now = tropicalAt(jd), prev = tropicalAt(jd - 0.5), next = tropicalAt(jd + 0.5)
  const gst = norm360(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T)
  const lst = norm360(gst + lonDeg)
  const eps = (23.43929111 - 0.013004167 * T) * DEG2RAD
  const lr = lst * DEG2RAD, la = latDeg * DEG2RAD
  const yAsc = Math.cos(lr), xAsc = -(Math.sin(lr) * Math.cos(eps) + Math.tan(la) * Math.sin(eps))
  const lagnaTrop = norm360(Math.atan2(yAsc, xAsc) * RAD2DEG)
  const bodies = {} as Record<GrahaId, BodyPos>
  GRAHA_ORDER.forEach((id) => {
    let d = next[id] - prev[id]
    if (d > 180) d -= 360
    if (d < -180) d += 360
    let sd = Math.abs(norm360(now[id] - now.sun))
    if (sd > 180) sd = 360 - sd
    const orb = GRAHAS[id].combustOrb
    bodies[id] = { trop: now[id], sid: norm360(now[id] - ayanamsa), speed: d, isRetro: d < 0, isCombust: orb > 0 && sd <= orb }
  })
  return { jd, T, gst, lst, epsDeg: eps * RAD2DEG, yAsc, xAsc, ayanamsa, lagna: { trop: lagnaTrop, sid: norm360(lagnaTrop - ayanamsa) }, bodies }
}

/** Cheap sidereal longitudes of all nine grahas at a Julian day (no lagna / speed work). Used for transit and Moon-timing scans. */
export function siderealAt(jd: number): Record<GrahaId, number> {
  const tr = tropicalAt(jd), ay = lahiriAyanamsa(jd), out = {} as Record<GrahaId, number>
  GRAHA_ORDER.forEach((id) => { out[id] = norm360(tr[id] - ay) })
  return out
}
/** Sidereal Moon only (much cheaper than siderealAt) */
export function moonSidAt(jd: number): number {
  return norm360(norm360(Astronomy.EclipticGeoMoon(toDate(jd)).lon) - lahiriAyanamsa(jd))
}