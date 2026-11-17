import { CITIES, GRAHAS, GRAHA_ORDER, GrahaId, NAKSHATRAS, RASHIS } from './constants'
import { computeEphemeris, computeJD } from './engine'
import { norm360 } from './math'

export type Frame = 'sidereal' | 'tropical'
/**
 * `tz` is the UTC offset in hours that the engine uses. When `tzName` (IANA zone, e.g. "Asia/Kathmandu") is present the form
 * works `tz` out from it for the exact birth date and time (daylight saving and historical changes included); charts saved by
 * older versions have no `tzName` and keep the fixed offset they were saved with.
 */
export interface BirthInput { name: string; dob: string; tob: string; lat: number; lon: number; tz: number; cityKey: string; tzName?: string; place?: string }
export interface Controls { minuteOfDay: number; dayOffset: number; yearOffset: number; hourOffset: number; minuteOffset: number; morphT: number }

export interface NakInfo { idx: number; name: string; lord: GrahaId; pada: number; akshar: string }
export interface Dignity { label: string; short: string; tone: 'good' | 'bad' | 'own' | 'neutral' }
export interface Placement {
  id: GrahaId; house: number; rashiIdx: number; lon: number; degInSign: number
  nak: NakInfo; dignity: Dignity; retro: boolean; combust: boolean; speed: number
}
export interface ChartData {
  jd: number; ayanamsa: number; frame: Frame; lagnaLon: number; lagnaIdx: number; lagnaDeg: number
  lagnaNak: NakInfo; moonSid: number; ut: number; audit: { T: number; gst: number; lst: number; epsDeg: number; yAsc: number; xAsc: number; lagnaTrop: number; lagnaSid: number }; placements: Record<GrahaId, Placement>; byHouse: GrahaId[][]
}

export const rashiOf = (deg: number) => Math.floor(norm360(deg) / 30)
export const houseOf = (rashiIdx: number, lagnaIdx: number) => ((rashiIdx - lagnaIdx + 12) % 12) + 1

export function nakshatraOf(sid: number): NakInfo {
  const span = 360 / 27, s = norm360(sid), idx = Math.floor(s / span), rem = s - idx * span
  const pada = Math.floor(rem / (span / 4)) + 1
  const n = NAKSHATRAS[idx]
  return { idx, name: n.name, lord: n.lord, pada, akshar: n.padas[pada - 1] }
}

export function dignityOf(id: GrahaId, rashiIdx: number): Dignity {
  const g = GRAHAS[id]
  if (rashiIdx === g.exalted) return { label: 'Exalted', short: '↑', tone: 'good' }
  if (rashiIdx === g.debilitated) return { label: 'Debilitated', short: '↓', tone: 'bad' }
  if (g.own.includes(rashiIdx)) return { label: 'Own sign', short: '★', tone: 'own' }
  const sl = RASHIS[rashiIdx].lord
  if (g.friends.includes(sl)) return { label: 'Friendly sign', short: '', tone: 'neutral' }
  if (g.enemies.includes(sl)) return { label: 'Enemy sign', short: '', tone: 'neutral' }
  return { label: 'Neutral sign', short: '', tone: 'neutral' }
}

export function aspectTargets(id: GrahaId, fromHouse: number) {
  const ord: Record<number, string> = { 3: '3rd', 4: '4th', 5: '5th', 7: '7th', 8: '8th', 9: '9th', 10: '10th' }
  return [7, ...GRAHAS[id].special].map((off) => ({ offset: off, ordinal: ord[off] ?? `${off}th`, angleDeg: (off - 1) * 30, toHouse: ((fromHouse - 1 + off - 1) % 12) + 1 }))
}

/** readable place name for a birth record (charts saved by older versions only have a built-in city key) */
export const placeLabel = (b: BirthInput) => b.place || (b.cityKey !== 'custom' ? CITIES.find((c) => c.key === b.cityKey)?.label : undefined) || 'Custom location'

export const birthSig = (b: BirthInput) => [b.dob, b.tob, b.lat, b.lon, b.tz].join('|')
export const birthMinute = (b: BirthInput) => {
  const [h, m] = b.tob.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function effectiveDateTime(b: BirthInput, c: Omit<Controls, 'morphT'>) {
  const [y, m, d] = b.dob.split('-').map(Number)
  const ms = Date.UTC(y || 2000, (m || 1) - 1, d || 1) + c.minuteOfDay * 60000 + (c.yearOffset * 365.2425 + c.dayOffset) * 86400000 + (c.hourOffset * 60 + c.minuteOffset) * 60000
  return new Date(ms).toISOString().slice(0, 16).replace('T', ' ')
}

export function computeChart(b: BirthInput, c: Omit<Controls, 'morphT'>, frame: Frame): ChartData {
  const [y, mo, d] = b.dob.split('-').map(Number)
  const sec = Number(b.tob.split(':')[2] || 0)
  const ut = c.minuteOfDay / 60 + sec / 3600 - b.tz
  const jd = computeJD(y || 2000, mo || 1, d || 1, ut) + c.dayOffset + c.yearOffset * 365.2425 + (c.hourOffset * 60 + c.minuteOffset) / 1440
  const e = computeEphemeris(jd, b.lat, b.lon)
  const lagnaLon = frame === 'sidereal' ? e.lagna.sid : e.lagna.trop
  const lagnaIdx = rashiOf(lagnaLon)
  const placements = {} as Record<GrahaId, Placement>
  const byHouse: GrahaId[][] = Array.from({ length: 13 }, () => [])
  GRAHA_ORDER.forEach((id) => {
    const bd = e.bodies[id]
    const lon = frame === 'sidereal' ? bd.sid : bd.trop
    const ri = rashiOf(lon), h = houseOf(ri, lagnaIdx)
    placements[id] = {
      id, house: h, rashiIdx: ri, lon, degInSign: norm360(lon) % 30, nak: nakshatraOf(bd.sid), dignity: dignityOf(id, ri),
      retro: bd.isRetro && id !== 'rahu' && id !== 'ketu', combust: bd.isCombust, speed: bd.speed,
    }
    byHouse[h].push(id)
  })
  return { jd, ayanamsa: e.ayanamsa, frame, lagnaLon, lagnaIdx, lagnaDeg: norm360(lagnaLon) % 30, lagnaNak: nakshatraOf(e.lagna.sid), moonSid: e.bodies.moon.sid, ut, audit: { T: e.T, gst: e.gst, lst: e.lst, epsDeg: e.epsDeg, yAsc: e.yAsc, xAsc: e.xAsc, lagnaTrop: e.lagna.trop, lagnaSid: e.lagna.sid }, placements, byHouse }
}

/** The exact birth instant in UTC milliseconds (date + time incl. seconds, minus the birth time-zone offset). */
export function birthInstantMs(b: BirthInput): number {
  const [y, m, d] = b.dob.split('-').map(Number)
  const [hh, mm, ss] = b.tob.split(':').map(Number)
  return Date.UTC(y || 2000, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0) - b.tz * 3600000
}
