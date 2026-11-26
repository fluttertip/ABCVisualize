/**
 * Dates for very old / far-future moments.
 * Years use ASTRONOMICAL numbering (… 2 BCE = -1, 1 BCE = 0, 1 CE = 1 …) inside the code; people see "5114 BCE".
 * Calendar rule (the one historians use): Julian calendar up to 4 Oct 1582, Gregorian from 15 Oct 1582.
 */
const SHIFT_YEARS = 12000, SHIFT_DAYS = 4383000   // 12000 Julian years = exactly 4,383,000 days: keeps every JD positive for the formulas below

export const fmtYear = (y: number) => (y <= 0 ? `${1 - y} BCE` : `${y} CE`)
export const toAstroYear = (year: number, era: 'CE' | 'BCE') => (era === 'BCE' ? 1 - year : year)

/** Julian Day (UT) of a calendar date, Julian calendar when `julian` is true (Meeus, Astronomical Algorithms ch.7) */
function calToJd(year: number, month: number, day: number, julian: boolean): number {
  let Y = year + (julian ? SHIFT_YEARS : 0), M = month
  if (M <= 2) { Y -= 1; M += 12 }
  const A = Math.floor(Y / 100), B = julian ? 0 : 2 - A + Math.floor(A / 4)
  const jd = Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + day + B - 1524.5
  return julian ? jd - SHIFT_DAYS : jd
}
/** JD at 00:00 UT on 1 January of an astronomical year (Julian calendar before 1582, Gregorian after) */
export const yearStartJd = (y: number) => calToJd(y, 1, 1, y < 1583)

export interface CalDate { year: number; month: number; day: number; hour: number; minute: number; julian: boolean }
/** Calendar date + UT clock time of a Julian Day (rounded to the minute) */
export function jdToCal(jdIn: number, offsetHours = 0): CalDate {
  const julian = jdIn < 2299160.5
  let jd = (jdIn + offsetHours / 24) + (julian ? SHIFT_DAYS : 0) + 0.5 / 1440   // + half a minute: round to the nearest minute
  const Z = Math.floor(jd + 0.5), F = jd + 0.5 - Z
  let A = Z
  if (!julian) { const al = Math.floor((Z - 1867216.25) / 36524.25); A = Z + 1 + al - Math.floor(al / 4) }
  const B = A + 1524, C = Math.floor((B - 122.1) / 365.25), D = Math.floor(365.25 * C), E = Math.floor((B - D) / 30.6001)
  const day = B - D - Math.floor(30.6001 * E), month = E < 14 ? E - 1 : E - 13
  const year = (month > 2 ? C - 4716 : C - 4715) - (julian ? SHIFT_YEARS : 0)
  const mins = Math.floor(F * 1440)
  return { year, month, day, hour: Math.floor(mins / 60), minute: mins % 60, julian }
}
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const p2 = (n: number) => String(n).padStart(2, '0')
/** "14 Mar 5114 BCE, 06:32" (+ " (Julian)" for old dates) */
export function fmtCal(jd: number, offsetHours = 0, withCalendar = true): string {
  const c = jdToCal(jd, offsetHours)
  return `${c.day} ${MON[c.month - 1]} ${fmtYear(c.year)}, ${p2(c.hour)}:${p2(c.minute)}${withCalendar ? (c.julian ? ' (Julian)' : ' (Gregorian)') : ''}`
}
/** "14 Mar 5114 BCE" (date only) */
export function fmtDate(jd: number, offsetHours = 0): string {
  const c = jdToCal(jd, offsetHours)
  return `${c.day} ${MON[c.month - 1]} ${fmtYear(c.year)}`
}
/** "06:32" */
export function fmtClock(jd: number, offsetHours = 0): string {
  const c = jdToCal(jd, offsetHours)
  return `${p2(c.hour)}:${p2(c.minute)}`
}