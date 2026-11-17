import { GrahaId } from './constants'
import { DASHA_SEQ, DASHA_YEARS, YEAR_MS, mahadashas, subPeriods } from './timing'

export { DASHA_SEQ, DASHA_YEARS }
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)
export function addYears(date: string, years: number) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) + years * YEAR_MS).toISOString().slice(0, 10)
}

export interface Antar { lord: GrahaId; start: string; end: string; years: number }
export interface Maha { lord: GrahaId; start: string; end: string; years: number; antars: Antar[] }

/**
 * Vimshottari Mahadashas with Antardashas, dates only. `birthMs` is the exact birth instant (UTC ms).
 * The first Mahadasha shows only the balance left at birth, but its Antardashas use the FULL Mahadasha length:
 * those already over at birth are dropped and the running one is clipped (earlier builds squeezed all nine into the balance, which was wrong).
 */
export function vimshottari(moonSid: number, birthMs: number) {
  const { startLord, balanceYears, periods } = mahadashas(moonSid, birthMs)
  const mahas: Maha[] = periods.map((p, i) => {
    const from = i === 0 ? birthMs : p.start
    const antars: Antar[] = subPeriods(p).filter((a) => a.end > from).map((a) => {
      const s = Math.max(a.start, from)
      return { lord: a.lord, start: iso(s), end: iso(a.end), years: (a.end - s) / YEAR_MS }
    })
    return { lord: p.lord, start: iso(from), end: iso(p.end), years: (p.end - from) / YEAR_MS, antars }
  })
  return { startLord, balanceYears, mahas }
}
