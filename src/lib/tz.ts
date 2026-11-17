/**
 * Timezone maths for the birth moment.
 *
 * A fixed "UTC+5:45" per city is NOT accurate: offsets change with daylight-saving and with law (Nepal was UTC+5:30
 * until the end of 1985 and UTC+5:45 after; New York is -5 in winter and -4 in summer ...). So for a place we keep its
 * IANA zone name (e.g. "Asia/Kathmandu") and work out the offset that was really in force at that LOCAL date and time,
 * using the browser's built-in time-zone database (Intl). No guessing tables of our own.
 */

const dtfCache = new Map<string, Intl.DateTimeFormat>()
function dtf(tz: string) {
  let f = dtfCache.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', era: 'short',
      year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    })
    dtfCache.set(tz, f)
  }
  return f
}

/** is this a zone name the browser knows? */
export function isValidZone(tz: string): boolean {
  try { dtf(tz); return true } catch { return false }
}

/** UTC offset (in ms) of `tz` at the UTC instant `utcMs`. */
export function offsetMsAt(tz: string, utcMs: number): number {
  const p: Record<string, string> = {}
  for (const x of dtf(tz).formatToParts(new Date(utcMs))) p[x.type] = x.value
  let year = Number(p.year)
  if (p.era && /^B/i.test(p.era)) year = 1 - year          // BC/BCE years (not expected, but keep the maths right)
  const asUtc = Date.UTC(year, Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second))
  // Date.UTC maps years 0..99 to 1900..1999; irrelevant for births, but keep it exact
  return asUtc - Math.floor(utcMs / 1000) * 1000
}

export type LocalStatus = 'ok' | 'gap' | 'ambiguous'
export interface ResolvedOffset {
  /** offset in hours, east positive (e.g. 5.75) */
  hours: number
  /**
   * ok         – exactly one offset fits that wall-clock time
   * gap        – that wall-clock time never existed (clocks jumped forward over it)
   * ambiguous  – it happened twice (clocks went back); the earlier of the two is used
   */
  status: LocalStatus
  /** the other possible offset when status is 'ambiguous' / the one used before the jump when 'gap' */
  alt?: number
}

/** Offset in force in `tz` at local wall-clock date `dob` (YYYY-MM-DD) and time `tob` (HH:MM[:SS]). */
export function resolveOffset(tz: string, dob: string, tob: string): ResolvedOffset {
  const [y, m, d] = dob.split('-').map(Number)
  const [hh, mm, ss] = tob.split(':').map(Number)
  const local = Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0)
  const DAY = 86400000
  // any offset that is valid around this moment must be one in force within a day either side
  const cands = Array.from(new Set([offsetMsAt(tz, local - DAY), offsetMsAt(tz, local + DAY), offsetMsAt(tz, local)]))
  const valid = cands.filter((o) => offsetMsAt(tz, local - o) === o).sort((a, b) => b - a)   // larger offset = earlier instant
  const H = 3600000
  if (valid.length === 1) return { hours: valid[0] / H, status: 'ok' }
  if (valid.length >= 2) return { hours: valid[0] / H, status: 'ambiguous', alt: valid[valid.length - 1] / H }
  // gap: the clock skipped this time. Use the offset from BEFORE the jump (the usual convention) and say so.
  const before = offsetMsAt(tz, local - DAY), after = offsetMsAt(tz, local + DAY)
  return { hours: before / H, status: 'gap', alt: after / H }
}

/** 5.75 -> "+5:45", -3.5 -> "-3:30", 0 -> "+0:00" */
export function fmtOffset(h: number): string {
  const sign = h < 0 ? '-' : '+', a = Math.abs(Math.round(h * 60)), hh = Math.floor(a / 60), mm = a % 60
  return `${sign}${hh}:${String(mm).padStart(2, '0')}`
}
export const fmtUtc = (h: number) => `UTC${fmtOffset(h)}`

/** modern spellings of zones that ICU still lists under an older name (both resolve to the same rules) */
const MODERN_ALIASES = ['Asia/Kathmandu', 'Asia/Kolkata', 'Asia/Yangon', 'Asia/Ho_Chi_Minh', 'Europe/Kyiv', 'Asia/Dhaka', 'Asia/Thimphu']
const LEGACY_DUPES = new Set(['Asia/Katmandu', 'Asia/Calcutta', 'Asia/Rangoon', 'Asia/Saigon', 'Europe/Kiev'])

/** every zone the browser knows (plus `extra`, e.g. the one a search result gave), for the manual picker */
export function allZones(extra?: string): string[] {
  let base: string[] = []
  try {
    const f = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf
    if (f) base = f('timeZone')
  } catch { /* fall through */ }
  if (!base.length) {
    base = ['Asia/Kathmandu', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Karachi', 'Asia/Colombo', 'Asia/Thimphu', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
      'Australia/Sydney', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'UTC']
  }
  const set = new Set(base)
  const add = (z?: string) => { if (z && isValidZone(z)) set.add(z) }
  MODERN_ALIASES.forEach(add); add(extra)
  // hide the old duplicate spelling when its modern twin is present, unless it is the selected one
  LEGACY_DUPES.forEach((z) => { if (z !== extra) set.delete(z) })
  return Array.from(set).sort((a, b) => a.localeCompare(b))
}
