import { ChartData, Placement, dignityOf, houseOf, rashiOf } from './chart'
import { GRAHA_ORDER, GrahaId } from './constants'
import { norm360 } from './math'

/**
 * Divisional charts (vargas).
 *
 * Every varga works the same way: take a SIDEREAL longitude, find its sign `s` (0 = Aries … 11 = Pisces) and its
 * degree inside that sign, cut the sign into N equal parts, and map the k-th part (0-based) to a new sign.
 * Only the "which sign do I start counting from, and in which direction" rule differs between vargas.
 *
 * THREE honesty levels (see VARGA_INFO in vargaInfo.ts - every chart carries its own label in the UI):
 *  1. CLASSICAL  - the 16 Shodashavarga of Brihat Parashara Hora Shastra (+ D1). One accepted rule each.
 *  2. CONVENTION - D5, D6, D8, D11. Not in BPHS's sixteen. Published conventions are implemented and labelled; schools differ.
 *  3. HARMONIC   - every other number D13…D59. NO traditional Vedic rule exists (the standard texts list them as "not used").
 *                  They are the plain mathematical harmonic (longitude × N) and are shown only as a labelled reference.
 *  Plus two re-based reference charts: Moon chart (Chandra Lagna) and Sun chart (Surya Lagna).
 */

const mod12 = (n: number) => ((n % 12) + 12) % 12
const quality = (s: number) => s % 3          // 0 movable, 1 fixed, 2 dual
const element = (s: number) => s % 4          // 0 fire, 1 earth, 2 air, 3 water
const isOdd = (s: number) => s % 2 === 0      // Aries (0) is an "odd" sign

/** special chart codes (kept negative so they can live in the same number[] as D-numbers) */
export const MOON_CHART = -1
export const SUN_CHART = -2
export const isRebased = (n: number) => n < 0

export interface VargaPos {
  sign: number; frac: number      // sign 0-11, frac 0..1 = position inside the varga sign
  part: number; parts: number     // which part (1-based) of how many - shown in the "working" table
  ruler?: string                  // D30 only: the planet that rules the 5°/7°/8° slice
  from: number; to: number        // degree range (inside the D1 sign) of that part
}

export const STANDARD = [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60]
export const CONVENTION = [5, 6, 8, 11]
export type VargaKind = 'classical' | 'convention' | 'harmonic' | 'rebased'
export const kindOf = (n: number): VargaKind => (n < 0 ? 'rebased' : STANDARD.includes(n) ? 'classical' : CONVENTION.includes(n) ? 'convention' : 'harmonic')
export const isStandard = (n: number) => STANDARD.includes(n)

// D30 (Trimsamsa): [upper bound in degrees, resulting sign, ruling planet]
const TRIM_ODD: [number, number, string][] = [[5, 0, 'Mars'], [10, 10, 'Saturn'], [18, 8, 'Jupiter'], [25, 2, 'Mercury'], [30, 6, 'Venus']]
const TRIM_EVEN: [number, number, string][] = [[5, 1, 'Venus'], [12, 5, 'Mercury'], [20, 11, 'Jupiter'], [25, 9, 'Saturn'], [30, 7, 'Mars']]

/** Sign (0-11) and in-sign fraction a sidereal longitude falls in, for divisional chart D`n`. */
export function vargaPos(siderealLon: number, n: number): VargaPos {
  const lon = norm360(siderealLon)
  const s = rashiOf(lon)
  const deg = lon - s * 30

  if (n === 1) return { sign: s, frac: deg / 30, part: 1, parts: 1, from: 0, to: 30 }

  if (n === 30) {
    const table = isOdd(s) ? TRIM_ODD : TRIM_EVEN
    let lo = 0, i = 0
    for (const [hi, sign, ruler] of table) {
      i++
      if (deg < hi || hi === 30) return { sign, frac: (deg - lo) / (hi - lo), part: i, parts: 5, ruler, from: lo, to: hi }
      lo = hi
    }
  }

  if (n === 2) {
    const first = deg < 15
    const sunHora = isOdd(s) ? first : !first
    return { sign: sunHora ? 4 : 3, frac: (first ? deg : deg - 15) / 15, part: first ? 1 : 2, parts: 2, from: first ? 0 : 15, to: first ? 15 : 30 }
  }

  const w = 30 / n
  const k = Math.min(n - 1, Math.floor(deg / w + 1e-9))
  const frac = Math.max(0, Math.min(0.999999, (deg - k * w) / w))

  let sign: number
  switch (n) {
    // ---- classical (BPHS) ----
    case 3: sign = s + 4 * k; break                                   // itself, 5th, 9th
    case 4: sign = s + 3 * k; break                                   // itself, 4th, 7th, 10th
    case 7: sign = (isOdd(s) ? s : s + 6) + k; break                 // odd: itself, even: 7th
    case 9: sign = [0, 9, 6, 3][element(s)] + k; break               // = movable itself, fixed 9th, dual 5th
    case 10: sign = (isOdd(s) ? s : s + 8) + k; break                // odd: itself, even: 9th
    case 12: sign = s + k; break
    case 16: sign = [0, 4, 8][quality(s)] + k; break                 // movable Aries, fixed Leo, dual Sagittarius
    case 20: sign = [0, 8, 4][quality(s)] + k; break                 // movable Aries, fixed Sagittarius, dual Leo
    case 24: sign = (isOdd(s) ? 4 : 3) + k; break                    // odd Leo, even Cancer
    case 27: sign = [0, 3, 6, 9][element(s)] + k; break              // fire Aries, earth Cancer, air Libra, water Capricorn
    case 40: sign = (isOdd(s) ? 0 : 6) + k; break                    // BPHS 6.29: odd Aries, even Libra
    case 45: sign = [0, 4, 8][quality(s)] + k; break                 // movable Aries, fixed Leo, dual Sagittarius
    case 60: sign = s + k; break                                      // from the sign itself
    // ---- published conventions (not in BPHS's sixteen) ----
    case 5: sign = s + [0, 4, 8][quality(s)] + k; break              // Parivritti (cyclical), as in Jagannatha Hora / Iyer: movable itself, fixed 5th, dual 9th
    case 6: sign = (isOdd(s) ? 0 : 6) + k; break                     // odd: Aries, even: Libra
    case 8: sign = [0, 8, 4][quality(s)] + k; break                  // movable Aries, fixed Sagittarius, dual Leo
    case 11: sign = -s + k; break                                     // Rudramsa (PVR Narasimha Rao): start = Aries counted BACK by the sign's number, then parts run FORWARD
    // ---- harmonic only (no traditional rule) ----
    default: sign = s * n + k                                         // continuous zodiac: floor(longitude × N / 30)
  }
  return { sign: mod12(sign), frac, part: k + 1, parts: n, from: k * w, to: (k + 1) * w }
}

/** Builds a full ChartData for divisional chart D`n` from a (D1) chart, so the existing chart renderers work unchanged. */
export function computeVarga(chart: ChartData, n: number): ChartData {
  const off = chart.frame === 'tropical' ? chart.ayanamsa : 0   // vargas are always worked on sidereal longitudes
  let lagnaIdx: number, lagnaDeg: number
  let pos: (lon: number) => { sign: number; deg: number }

  if (isRebased(n)) {
    // Moon chart / Sun chart: the ordinary D1 signs, but the 1st house is the sign of the Moon / Sun
    const base = chart.placements[n === MOON_CHART ? 'moon' : 'sun']
    const b = vargaPos(base.lon - off, 1)
    lagnaIdx = b.sign; lagnaDeg = b.frac * 30
    pos = (lon) => { const v = vargaPos(lon - off, 1); return { sign: v.sign, deg: v.frac * 30 } }
  } else {
    const L = vargaPos(chart.lagnaLon - off, n)
    lagnaIdx = L.sign; lagnaDeg = L.frac * 30
    pos = (lon) => { const v = vargaPos(lon - off, n); return { sign: v.sign, deg: v.frac * 30 } }
  }

  const placements = {} as Record<GrahaId, Placement>
  const byHouse: GrahaId[][] = Array.from({ length: 13 }, () => [])
  GRAHA_ORDER.forEach((id) => {
    const p = chart.placements[id]
    const v = pos(p.lon)
    const house = houseOf(v.sign, lagnaIdx)
    placements[id] = { ...p, house, rashiIdx: v.sign, lon: v.sign * 30 + v.deg, degInSign: v.deg, dignity: dignityOf(id, v.sign) }
    byHouse[house].push(id)
  })
  return { ...chart, frame: 'sidereal', lagnaLon: lagnaIdx * 30 + lagnaDeg, lagnaIdx, lagnaDeg, placements, byHouse }
}

/** The "show your working" rows for the UI: for each planet (and the lagna) which part of which sign it fell in. */
export function vargaWorking(chart: ChartData, n: number) {
  const off = chart.frame === 'tropical' ? chart.ayanamsa : 0
  const rows = [{ id: 'lagna' as GrahaId | 'lagna', lon: chart.lagnaLon - off }, ...GRAHA_ORDER.map((id) => ({ id, lon: chart.placements[id].lon - off }))]
  return rows.map((r) => {
    const d1 = vargaPos(r.lon, 1), v = vargaPos(r.lon, n)
    return { id: r.id, d1Sign: d1.sign, d1Deg: d1.frac * 30, part: v.part, parts: v.parts, from: v.from, to: v.to, ruler: v.ruler, sign: v.sign }
  })
}
