import { GrahaId, NAKSHATRAS } from './constants'
import { moonSidAt } from './engine'
import { norm360 } from './math'

/**
 * Vimshottari timing core. One proportional rule at every level (verified against several sources, see the app's "How it works" tab):
 *   sub-period length = parent length x sub-lord's years / 120, sub-lords start from the parent's own lord, in the fixed order below.
 * Five levels: Mahadasha > Antardasha (Bhukti) > Pratyantardasha > Sookshma > Prana.
 * The first Mahadasha is only partly left at birth, but its sub-periods are laid out on the FULL Mahadasha (those already over at birth are dropped).
 */
export const YEAR_DAYS = 365.25            // common convention; software also uses 360 or 365.2425, which moves dates by days
export const YEAR_MS = YEAR_DAYS * 86400000
export const DASHA_YEARS: Record<GrahaId, number> = { sun: 6, moon: 10, mars: 7, mercury: 17, jupiter: 16, venus: 20, saturn: 19, rahu: 18, ketu: 7 }
export const DASHA_SEQ: GrahaId[] = ['ketu', 'venus', 'sun', 'moon', 'mars', 'rahu', 'jupiter', 'saturn', 'mercury']
export const LEVEL_NAMES = ['', 'Mahadasha', 'Antardasha (Bhukti)', 'Pratyantardasha', 'Sookshma dasha', 'Prana dasha']

export interface DPeriod { lord: GrahaId; start: number; end: number; level: number; path: GrahaId[] }

export function mahadashas(moonSid: number, birthMs: number) {
  const span = 360 / 27, s = norm360(moonSid), idx = Math.floor(s / span), remaining = 1 - (s - idx * span) / span
  const startLord = NAKSHATRAS[idx].lord, full = DASHA_YEARS[startLord], balanceYears = full * remaining
  const si = DASHA_SEQ.indexOf(startLord)
  let cur = birthMs - (full - balanceYears) * YEAR_MS     // virtual start of the first Mahadasha (before birth)
  const periods: DPeriod[] = []
  for (let i = 0; i < 10; i++) {
    const lord = DASHA_SEQ[(si + i) % 9], end = cur + DASHA_YEARS[lord] * YEAR_MS
    periods.push({ lord, start: cur, end, level: 1, path: [lord] })
    cur = end
  }
  return { startLord, balanceYears, periods }
}

export function subPeriods(p: DPeriod): DPeriod[] {
  const li = DASHA_SEQ.indexOf(p.lord), len = p.end - p.start
  let cur = p.start
  return Array.from({ length: 9 }, (_, j) => {
    const lord = DASHA_SEQ[(li + j) % 9], end = j === 8 ? p.end : cur + (len * DASHA_YEARS[lord]) / 120
    const q: DPeriod = { lord, start: cur, end, level: p.level + 1, path: [...p.path, lord] }
    cur = end
    return q
  })
}

/** the running period at every level (1..depth) at time t */
export function stackAt(t: number, mahas: DPeriod[], depth = 5): DPeriod[] {
  let cur = mahas.find((m) => t >= m.start && t < m.end)
  const out: DPeriod[] = []
  while (cur && out.length < depth) {
    out.push(cur)
    if (out.length === depth) break
    cur = subPeriods(cur).find((m) => t >= m.start && t < m.end)
  }
  return out
}

// ---------- Gochar (transit) from the natal Moon: Phaladeepika lists, matched across several sources ----------
export const GOOD_FROM_MOON: Record<GrahaId, number[]> = {
  sun: [3, 6, 10, 11], moon: [1, 3, 6, 7, 10, 11], mars: [3, 6, 11], mercury: [2, 4, 6, 8, 10, 11], jupiter: [2, 5, 7, 9, 11],
  venus: [1, 2, 3, 4, 5, 8, 9, 11, 12], saturn: [3, 6, 11], rahu: [3, 6, 11], ketu: [3, 6, 11],
}
export const houseFrom = (sign: number, base: number) => ((sign - base + 12) % 12) + 1

// ---------- Tara Bala (Navatara): count birth nakshatra -> day's nakshatra inclusive, fold on 9 ----------
export const TARAS = [
  { name: 'Janma', good: null as boolean | null, note: 'birth star itself: mixed, avoid fresh starts' },
  { name: 'Sampat', good: true, note: 'wealth, gain' },
  { name: 'Vipat', good: false, note: 'danger, obstacles' },
  { name: 'Kshema', good: true, note: 'well-being, safety' },
  { name: 'Pratyari', good: false, note: 'opposition, hindrance' },
  { name: 'Sadhaka', good: true, note: 'accomplishment' },
  { name: 'Vadha', good: false, note: 'destruction, strain (also called Naidhana)' },
  { name: 'Mitra', good: true, note: 'friendly, cooperative' },
  { name: 'Parama Mitra', good: true, note: 'best friend, most supportive' },
]
export function taraOf(birthNak: number, dayNak: number) {
  const count = ((dayNak - birthNak + 27) % 27) + 1, t = ((count - 1) % 9) + 1
  return { count, n: t, ...TARAS[t - 1] }
}

// ---------- Moon timeline (nakshatra / sign changes found to the minute) ----------
export interface MoonSeg { start: number; end: number; nak: number; pada: number; sign: number }
const jdOf = (ms: number) => ms / 86400000 + 2440587.5
const keyAt = (ms: number) => { const m = moonSidAt(jdOf(ms)), nak = Math.floor(m / (360 / 27)), pada = Math.floor((m % (360 / 27)) / (360 / 108)); return { nak, pada, sign: Math.floor(m / 30) } }
export function moonSegments(startMs: number, endMs: number): MoonSeg[] {
  const out: MoonSeg[] = [], STEP = 20 * 60000
  let a = startMs, ka = keyAt(a), segStart = a
  for (let t = startMs + STEP; t <= endMs + STEP; t += STEP) {
    const kt = keyAt(Math.min(t, endMs))
    if (kt.nak !== ka.nak || kt.sign !== ka.sign) {
      let lo = a, hi = Math.min(t, endMs)                    // bisect to ~1 minute
      while (hi - lo > 30000) { const mid = (lo + hi) / 2, km = keyAt(mid); if (km.nak !== ka.nak || km.sign !== ka.sign) hi = mid; else lo = mid }
      const cut = Math.round(hi / 60000) * 60000
      out.push({ start: segStart, end: cut, ...ka }); segStart = cut; ka = kt
    }
    a = Math.min(t, endMs)
    if (a >= endMs) break
  }
  out.push({ start: segStart, end: endMs, ...ka })
  return out
}
