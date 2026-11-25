import * as Astronomy from 'astronomy-engine'
import { GRAHAS, GrahaId, RASHIS } from './constants'
import { BirthInput, ChartData } from './chart'
import { midheaven } from './chalit'
import { lahiriAyanamsa, moonSidAt, siderealAt } from './engine'
import { norm360 } from './math'
import { vargaPos } from './vargas'

/**
 * SHADBALA ("six strengths") of the seven planets Sun..Saturn, in virupas (shashtiamsa; 60 virupas = 1 rupa), after Brihat Parashara Hora Shastra ch. 27.
 *   1 Sthana (position)  2 Dig (direction)  3 Kala (time)  4 Chesta (motion)  5 Naisargika (natural)  6 Drik (aspects)
 * Conventions chosen where books and software differ are listed in SHADBALA_NOTES; expect small differences from other programs.
 */
export const SB_PLANETS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'] as const
export type SbPlanet = (typeof SB_PLANETS)[number]
export const SB_MIN: Record<SbPlanet, number> = { sun: 390, moon: 360, mars: 300, mercury: 420, jupiter: 390, venus: 330, saturn: 300 }
const NAISARGIKA: Record<SbPlanet, number> = { sun: 60, moon: 51.43, venus: 42.85, jupiter: 34.28, mercury: 25.71, mars: 17.14, saturn: 8.57 }
const DEBIL_PT: Record<SbPlanet, number> = { sun: 190, moon: 213, mars: 118, mercury: 345, jupiter: 275, venus: 177, saturn: 20 }
const MOOLA: Record<SbPlanet, [number, number, number]> = { sun: [4, 0, 20], moon: [1, 3, 30], mars: [0, 0, 12], mercury: [5, 15, 20], jupiter: [8, 0, 10], venus: [6, 0, 15], saturn: [10, 0, 20] }
const BENEFIC: SbPlanet[] = ['moon', 'mercury', 'jupiter', 'venus']
const WEEKDAY: GrahaId[] = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn']
const HORA_SEQ: GrahaId[] = ['sun', 'venus', 'mercury', 'moon', 'saturn', 'jupiter', 'mars']
const BODY: Record<SbPlanet, Astronomy.Body> = { sun: Astronomy.Body.Sun, moon: Astronomy.Body.Moon, mars: Astronomy.Body.Mars, mercury: Astronomy.Body.Mercury, jupiter: Astronomy.Body.Jupiter, venus: Astronomy.Body.Venus, saturn: Astronomy.Body.Saturn }

export interface Sthana { uchcha: number; saptavarga: number; ojha: number; kendra: number; drekkana: number; total: number }
export interface Kala { nata: number; paksha: number; tribhaga: number; abda: number; masa: number; vara: number; hora: number; ayana: number; total: number }
export interface SbRow {
  id: SbPlanet; sthana: Sthana; dig: number; kala: Kala; chesta: number; naisargika: number; drik: number
  total: number; rupas: number; min: number; ratio: number
}
export interface ShadbalaResult { rows: SbRow[]; times: { dayBirth: boolean; sunrise: number; sunset: number; vara: GrahaId; hora: GrahaId; abda: GrahaId; masa: GrahaId } }

export const SHADBALA_NOTES = [
  'Sun, Moon, Mars, Mercury, Jupiter, Venus and Saturn only. Rahu and Ketu have no Shadbala.',
  'Sthana: Moolatrikona is judged by degree in the Rashi (D1) chart only; the other six vargas (D2, D3, D7, D9, D12, D30) count own sign / friend / enemy by sign.',
  'Friendship is the five-fold (compound) one: natural friendship plus temporary friendship from the planets\' houses in D1.',
  'Kala: the Moon is counted as a benefic for Paksha bala (as are Mercury, Jupiter, Venus); Sun, Mars, Saturn are malefics. The Sun\'s Ayana bala is doubled.',
  'Sunrise and sunset come from the astronomy engine for your birth place (upper limb, with refraction). Weekday and hora run from sunrise.',
  'Abda lord = lord of the weekday on which the Sun last entered sidereal Aries. Masa lord = lord of the weekday of the last new moon. Both use the local calendar day.',
  'Chesta: Sun uses its Ayana bala, Moon its Paksha bala. Mars to Saturn use the Chesta-kendra (mean Sun / mean heliocentric longitude method).',
  'Drik: general aspect-strength curve, with full strength at the special aspects of Mars (4th, 8th), Jupiter (5th, 9th) and Saturn (3rd, 10th). Benefic aspects add, malefic subtract, then divide by 4.',
  'Not included: Yuddha bala (planetary war) and the equation of time in the day/night strength.',
]

const sdiff = (a: number, b: number) => ((a - b + 540) % 360) - 180          // signed a - b in (-180, 180]
const adist = (a: number, b: number) => Math.abs(sdiff(a, b))                // 0..180
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

/** compound (five-fold) friendship points for the saptavargaja table */
function relPoints(p: SbPlanet, lord: GrahaId, chart: ChartData): number {
  const nat = GRAHAS[p].friends.includes(lord) ? 1 : GRAHAS[p].enemies.includes(lord) ? -1 : 0
  const hf = ((chart.placements[lord].house - chart.placements[p].house + 12) % 12) + 1
  const temp = [2, 3, 4, 10, 11, 12].includes(hf) ? 1 : -1
  return ({ 2: 22.5, 1: 15, 0: 7.5, '-1': 3.75, '-2': 1.875 } as Record<string, number>)[String(nat + temp)]
}

/** last sunrise at/before the birth, the sunset after it and the next sunrise (ms). Falls back to 6:00 / 18:00 local mean time near the poles. */
function sunTimes(birthMs: number, b: BirthInput) {
  const obs = new Astronomy.Observer(b.lat, b.lon, 0)
  const find = (dir: 1 | -1, from: number) => { const r = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, dir, new Date(from), 2); return r ? r.date.getTime() : null }
  let rise = find(1, birthMs - 36 * 3600e3)
  for (let i = 0; rise !== null && i < 3; i++) { const n = find(1, rise + 60e3); if (n !== null && n <= birthMs) rise = n; else break }
  const set = rise !== null ? find(-1, rise + 60e3) : null
  const next = rise !== null ? find(1, rise + 60e3) : null
  if (rise === null || set === null || next === null) {
    const lmt = (((birthMs / 3600e3 + b.lon / 15) % 24) + 24) % 24
    const r0 = birthMs - (lmt >= 6 ? lmt - 6 : lmt + 18) * 3600e3
    return { rise: r0, set: r0 + 12 * 3600e3, next: r0 + 24 * 3600e3 }
  }
  return { rise, set, next }
}

const weekdayLord = (ms: number, tz: number): GrahaId => WEEKDAY[new Date(ms + tz * 3600e3).getUTCDay()]
const jdToMs = (jd: number) => (jd - 2440587.5) * 86400000

/** instant (JD) of the last Sun entry into sidereal Aries */
function lastMesha(jd: number, sunLon: number) {
  let j = jd - sunLon / 0.9856
  for (let i = 0; i < 6; i++) j -= sdiff(siderealAt(j).sun, 0) / 0.9856
  return j
}
/** instant (JD) of the last new moon */
function lastNewMoon(jd: number, moonLon: number, sunLon: number) {
  let j = jd - norm360(moonLon - sunLon) / 12.19
  for (let i = 0; i < 6; i++) j -= sdiff(moonSidAt(j), siderealAt(j).sun) / 12.19
  return j
}

// Meeus table 31.A mean longitudes of the planets (degrees, equinox of date), T = Julian centuries from J2000
const MEAN: Record<string, [number, number]> = {
  mercury: [252.250906, 149474.0722491], venus: [181.979801, 58519.2130302], earth: [100.466457, 36000.7698278],
  mars: [355.433, 19141.6964471], jupiter: [34.351519, 3036.3027748], saturn: [50.077444, 1223.5110686],
}
const meanLon = (k: string, T: number, ayan: number) => norm360(MEAN[k][0] + MEAN[k][1] * T - ayan)

/** aspect strength in virupas of planet A on a point `d` degrees ahead of it */
function aspectVirupa(d: number, A: SbPlanet): number {
  let v = 0
  if (d >= 30 && d < 60) v = (d - 30) / 2
  else if (d >= 60 && d < 90) v = d - 45
  else if (d >= 90 && d < 120) v = 30 + (120 - d) / 2
  else if (d >= 120 && d < 150) v = 150 - d
  else if (d >= 150 && d < 180) v = (d - 150) * 2
  else if (d >= 180 && d < 300) v = (300 - d) / 2
  const special: Record<string, number[]> = { mars: [90, 210], jupiter: [120, 240], saturn: [60, 270] }
  ;(special[A] ?? []).forEach((x) => { v = Math.max(v, 60 - 2 * adist(d, x)) })
  return Math.max(0, v)
}

export function shadbala(chart: ChartData, b: BirthInput): ShadbalaResult {
  const P = chart.placements, lon = (p: SbPlanet) => P[p].lon
  const birthMs = jdToMs(chart.jd)
  const { rise, set, next } = sunTimes(birthMs, b)
  const dayBirth = birthMs < set, dayLen = set - rise, nightLen = next - set
  const date = new Date(birthMs), obs = new Astronomy.Observer(b.lat, b.lon, 0)

  // ---- time lords
  const vara = weekdayLord(rise, b.tz)
  const hn = dayBirth ? Math.floor(((birthMs - rise) / dayLen) * 12) : 12 + Math.floor(((birthMs - set) / nightLen) * 12)
  const hora = HORA_SEQ[(HORA_SEQ.indexOf(vara) + clamp(hn, 0, 23)) % 7]
  const abda = weekdayLord(jdToMs(lastMesha(chart.jd, lon('sun'))), b.tz)
  const masa = weekdayLord(jdToMs(lastNewMoon(chart.jd, lon('moon'), lon('sun'))), b.tz)
  const trib = dayBirth ? ['mercury', 'sun', 'saturn'][clamp(Math.floor(((birthMs - rise) / dayLen) * 3), 0, 2)] : ['moon', 'venus', 'mars'][clamp(Math.floor(((birthMs - set) / nightLen) * 3), 0, 2)]
  // distance from the nearest midnight, in hours (0 at midnight, 12 at noon)
  const midNight = set + nightLen / 2, prevMid = rise - nightLen / 2
  const hMid = clamp((dayBirth ? Math.min(birthMs - prevMid, midNight - birthMs) : Math.abs(birthMs - midNight)) / 3600e3, 0, 12)

  const mc = midheaven(chart), asc = chart.lagnaLon
  const power: Record<SbPlanet, number> = { sun: norm360(mc + 180), mars: norm360(mc + 180), moon: mc, venus: mc, mercury: norm360(asc + 180), jupiter: norm360(asc + 180), saturn: asc }
  const elong = adist(lon('moon'), lon('sun'))
  const T = (chart.jd - 2451545) / 36525, ayan = lahiriAyanamsa(chart.jd)
  const meanSun = norm360(meanLon('earth', T, ayan) + 180)

  const rows = SB_PLANETS.map((p): SbRow => {
    const pl = P[p]
    // ---- 1 Sthana
    const uchcha = adist(lon(p), DEBIL_PT[p]) / 3
    const vs = [1, 2, 3, 7, 9, 12, 30].map((n) => {
      const sign = vargaPos(lon(p), n).sign
      const [ms, lo, hi] = MOOLA[p]
      if (n === 1 && sign === ms && pl.degInSign >= lo && pl.degInSign < hi) return 45
      const lord = RASHIS[sign].lord
      return lord === p ? 30 : relPoints(p, lord, chart)
    })
    const saptavarga = vs.reduce((a, c) => a + c, 0)
    const wantsEven = p === 'moon' || p === 'venus'
    const ojhaHit = (s: number) => ((s % 2 === 1) === wantsEven ? 15 : 0)
    const ojha = ojhaHit(pl.rashiIdx) + ojhaHit(vargaPos(lon(p), 9).sign)
    const kendra = [1, 4, 7, 10].includes(pl.house) ? 60 : [2, 5, 8, 11].includes(pl.house) ? 30 : 15
    const dk = Math.floor(pl.degInSign / 10)                                  // 0,1,2
    const drekkana = (p === 'sun' || p === 'mars' || p === 'jupiter' ? dk === 0 : p === 'moon' || p === 'venus' ? dk === 2 : dk === 1) ? 15 : 0
    const sthana: Sthana = { uchcha, saptavarga, ojha, kendra, drekkana, total: uchcha + saptavarga + ojha + kendra + drekkana }
    // ---- 2 Dig
    const dig = adist(lon(p), power[p]) / 3
    // ---- 3 Kala
    const diurnal = (hMid / 12) * 60
    const nata = p === 'mercury' ? 60 : p === 'sun' || p === 'jupiter' || p === 'venus' ? diurnal : 60 - diurnal
    const pk = elong / 3
    const paksha = BENEFIC.includes(p) ? pk : 60 - pk
    const tribhaga = p === 'jupiter' ? 60 : trib === p ? 60 : 0
    const dec = Astronomy.Equator(BODY[p], date, obs, true, true).dec
    const ayBase = clamp(((p === 'moon' || p === 'saturn' ? 23.45 - dec : p === 'mercury' ? 23.45 + Math.abs(dec) : 23.45 + dec) / 46.9) * 60, 0, 60)
    const ayana = p === 'sun' ? ayBase * 2 : ayBase
    const kala: Kala = { nata, paksha, tribhaga, abda: abda === p ? 15 : 0, masa: masa === p ? 30 : 0, vara: vara === p ? 45 : 0, hora: hora === p ? 60 : 0, ayana, total: 0 }
    kala.total = nata + paksha + tribhaga + kala.abda + kala.masa + kala.vara + kala.hora + ayana
    // ---- 4 Chesta
    let chesta: number
    if (p === 'sun') chesta = ayBase
    else if (p === 'moon') chesta = paksha
    else {
      const outer = p === 'mars' || p === 'jupiter' || p === 'saturn'
      const own = meanLon(p, T, ayan), seeghra = outer ? meanSun : own, madhya = outer ? own : meanSun
      const adj = norm360(lon(p) + sdiff(madhya, lon(p)) / 2)
      chesta = adist(seeghra, adj) / 3
    }
    // ---- 6 Drik
    let drik = 0
    SB_PLANETS.forEach((a) => { if (a !== p) drik += (BENEFIC.includes(a) ? 1 : -1) * aspectVirupa(norm360(lon(p) - lon(a)), a) })
    drik /= 4
    const total = sthana.total + dig + kala.total + chesta + NAISARGIKA[p] + drik
    return { id: p, sthana, dig, kala, chesta, naisargika: NAISARGIKA[p], drik, total, rupas: total / 60, min: SB_MIN[p], ratio: total / SB_MIN[p] }
  })
  return { rows, times: { dayBirth, sunrise: rise, sunset: set, vara, hora, abda, masa } }
}