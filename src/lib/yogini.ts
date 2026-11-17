import { GrahaId, NAKSHATRAS } from './constants'
import { YEAR_MS } from './timing'
import { norm360 } from './math'

/**
 * Yogini dasha: a second 36-year timing cycle, started by the Moon's nakshatra.
 *   nakshatra number n (1..27): (n + 3) mod 8 -> which of the 8 yoginis starts (0 means the 8th).
 *   Each yogini rules 1..8 years; sub-periods = parent length x sub years / 36, in the same fixed order starting from the parent.
 * Like the Vimshottari code in timing.ts, the first period is only partly left at birth, but its sub-periods are laid out on the
 * FULL period (those already over at birth are dropped).
 */
export const YOGINIS: { name: string; lord: GrahaId; years: number }[] = [
  { name: 'Mangala', lord: 'moon', years: 1 },
  { name: 'Pingala', lord: 'sun', years: 2 },
  { name: 'Dhanya', lord: 'jupiter', years: 3 },
  { name: 'Bhramari', lord: 'mars', years: 4 },
  { name: 'Bhadrika', lord: 'mercury', years: 5 },
  { name: 'Ulka', lord: 'saturn', years: 6 },
  { name: 'Siddha', lord: 'venus', years: 7 },
  { name: 'Sankata', lord: 'rahu', years: 8 },
]
export const YOGINI_CYCLE = 36

export interface YPeriod { idx: number; name: string; lord: GrahaId; years: number; start: number; end: number; level: 1 | 2 }

export function yoginiMahas(moonSid: number, birthMs: number, cycles = 3) {
  const span = 360 / 27, s = norm360(moonSid), nakIdx = Math.floor(s / span), nakNo = nakIdx + 1
  const rem = 1 - (s - nakIdx * span) / span
  const m = (nakNo + 3) % 8, startIdx = m === 0 ? 7 : m - 1
  const full = YOGINIS[startIdx].years, balanceYears = full * rem
  let cur = birthMs - (full - balanceYears) * YEAR_MS     // virtual start of the first period (before birth)
  const periods: YPeriod[] = []
  for (let i = 0; i < 8 * cycles + 1; i++) {
    const idx = (startIdx + i) % 8, y = YOGINIS[idx], end = cur + y.years * YEAR_MS
    periods.push({ idx, name: y.name, lord: y.lord, years: y.years, start: cur, end, level: 1 })
    cur = end
  }
  return { startIdx, nakNo, nakName: NAKSHATRAS[nakIdx].name, balanceYears, periods }
}

export function yoginiSubs(p: YPeriod): YPeriod[] {
  const len = p.end - p.start
  let cur = p.start
  return Array.from({ length: 8 }, (_, j) => {
    const idx = (p.idx + j) % 8, y = YOGINIS[idx], end = j === 7 ? p.end : cur + (len * y.years) / YOGINI_CYCLE
    const q: YPeriod = { idx, name: y.name, lord: y.lord, years: y.years, start: cur, end, level: 2 }
    cur = end
    return q
  })
}