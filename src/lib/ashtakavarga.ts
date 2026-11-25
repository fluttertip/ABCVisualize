import { GrahaId } from './constants'
import { ChartData } from './chart'

/**
 * ASHTAKAVARGA ("eight-fold division"). Eight sources (the seven planets Sun..Saturn + the Lagna) each give a point (bindu) to some of the
 * 12 signs, counted from the sign the source itself sits in, by the fixed tables of Brihat Parashara Hora Shastra (ch. 66-72).
 *   Bhinnashtakavarga (BAV) of a planet = the points all eight sources give, in each sign, using THAT planet's table.
 *   Sarvashtakavarga (SAV) = the seven BAVs added together, sign by sign. Rahu and Ketu are not used.
 * Built-in check: the seven BAV totals are always 48, 49, 39, 54, 56, 52, 39 and the SAV total is always 337.
 */
export const AV_PLANETS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'] as const
export type AvPlanet = (typeof AV_PLANETS)[number]
export type AvSource = AvPlanet | 'lagna'
export const AV_SOURCES: AvSource[] = [...AV_PLANETS, 'lagna']
export const AV_TOTAL: Record<AvPlanet, number> = { sun: 48, moon: 49, mars: 39, mercury: 54, jupiter: 56, venus: 52, saturn: 39 }

/** TABLE[planet whose chart it is][source] = houses, counted from the source's own sign, that get a bindu */
const TABLE: Record<AvPlanet, Record<AvSource, number[]>> = {
  sun: { sun: [1, 2, 4, 7, 8, 9, 10, 11], moon: [3, 6, 10, 11], mars: [1, 2, 4, 7, 8, 9, 10, 11], mercury: [3, 5, 6, 9, 10, 11, 12], jupiter: [5, 6, 9, 11], venus: [6, 7, 12], saturn: [1, 2, 4, 7, 8, 9, 10, 11], lagna: [3, 4, 6, 10, 11, 12] },
  moon: { sun: [3, 6, 7, 8, 10, 11], moon: [1, 3, 6, 7, 10, 11], mars: [2, 3, 5, 6, 9, 10, 11], mercury: [1, 3, 4, 5, 7, 8, 10, 11], jupiter: [1, 4, 7, 8, 10, 11, 12], venus: [3, 4, 5, 7, 9, 10, 11], saturn: [3, 5, 6, 11], lagna: [3, 6, 10, 11] },
  mars: { sun: [3, 5, 6, 10, 11], moon: [3, 6, 11], mars: [1, 2, 4, 7, 8, 10, 11], mercury: [3, 5, 6, 11], jupiter: [6, 10, 11, 12], venus: [6, 8, 11, 12], saturn: [1, 4, 7, 8, 9, 10, 11], lagna: [1, 3, 6, 10, 11] },
  mercury: { sun: [5, 6, 9, 11, 12], moon: [2, 4, 6, 8, 10, 11], mars: [1, 2, 4, 7, 8, 9, 10, 11], mercury: [1, 3, 5, 6, 9, 10, 11, 12], jupiter: [6, 8, 11, 12], venus: [1, 2, 3, 4, 5, 8, 9, 11], saturn: [1, 2, 4, 7, 8, 9, 10, 11], lagna: [1, 2, 4, 6, 8, 10, 11] },
  jupiter: { sun: [1, 2, 3, 4, 7, 8, 9, 10, 11], moon: [2, 5, 7, 9, 11], mars: [1, 2, 4, 7, 8, 10, 11], mercury: [1, 2, 4, 5, 6, 9, 10, 11], jupiter: [1, 2, 3, 4, 7, 8, 10, 11], venus: [2, 5, 6, 9, 10, 11], saturn: [3, 5, 6, 12], lagna: [1, 2, 4, 5, 6, 7, 9, 10, 11] },
  venus: { sun: [8, 11, 12], moon: [1, 2, 3, 4, 5, 8, 9, 11, 12], mars: [3, 5, 6, 9, 11, 12], mercury: [3, 5, 6, 9, 11], jupiter: [5, 8, 9, 10, 11], venus: [1, 2, 3, 4, 5, 8, 9, 10, 11], saturn: [3, 4, 5, 8, 9, 10, 11], lagna: [1, 2, 3, 4, 5, 8, 9, 11] },
  saturn: { sun: [1, 2, 4, 7, 8, 10, 11], moon: [3, 6, 11], mars: [3, 5, 6, 10, 11, 12], mercury: [6, 8, 9, 10, 11, 12], jupiter: [5, 6, 11, 12], venus: [6, 11, 12], saturn: [3, 5, 6, 11], lagna: [1, 3, 4, 6, 10, 11] },
}

export interface Ashtakavarga {
  /** bav[planet][sign 0-11] = 0..8 */
  bav: Record<AvPlanet, number[]>
  /** sav[sign 0-11] */
  sav: number[]
  /** prastara[planet][source][sign] = 1 when that source gave a bindu */
  prastara: Record<AvPlanet, Record<AvSource, number[]>>
  totals: Record<AvPlanet, number>
  grand: number
  ok: boolean
}

export function ashtakavarga(chart: ChartData): Ashtakavarga {
  const signOf = (s: AvSource) => (s === 'lagna' ? chart.lagnaIdx : chart.placements[s as GrahaId].rashiIdx)
  const bav = {} as Record<AvPlanet, number[]>, prastara = {} as Ashtakavarga['prastara'], totals = {} as Record<AvPlanet, number>
  AV_PLANETS.forEach((p) => {
    bav[p] = Array(12).fill(0); prastara[p] = {} as Record<AvSource, number[]>
    AV_SOURCES.forEach((s) => {
      const row = Array(12).fill(0)
      TABLE[p][s].forEach((h) => { const sign = (signOf(s) + h - 1) % 12; row[sign] = 1; bav[p][sign] += 1 })
      prastara[p][s] = row
    })
    totals[p] = bav[p].reduce((a, b) => a + b, 0)
  })
  const sav = Array.from({ length: 12 }, (_, i) => AV_PLANETS.reduce((a, p) => a + bav[p][i], 0))
  const grand = sav.reduce((a, b) => a + b, 0)
  return { bav, sav, prastara, totals, grand, ok: grand === 337 && AV_PLANETS.every((p) => totals[p] === AV_TOTAL[p]) }
}