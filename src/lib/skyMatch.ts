import * as Astronomy from 'astronomy-engine'
import { GrahaId } from './constants'
import { lahiriAyanamsa } from './engine'
import { norm360, DEG2RAD, RAD2DEG } from './math'
import { NAK_SPAN, Pick, SEARCH_PLANETS, SearchPlanet } from './customChart'

/**
 * SKY MATCH: find the moments when the real sky looks like a chart you placed by hand.
 *
 * What is compared (per item): the SIGN, and the nakshatra / pada too if you chose them. Exalted / own / debilitated are just
 * signs, so they are covered automatically. Items = the planets you ticked + the Lagna (rising sign) if you ticked it.
 * The two nodes are one item (Ketu is always exactly opposite Rahu).
 *
 * How it stays fast (all positions are the app's own ephemeris: astronomy-engine, apparent places, Lahiri):
 *   1. every 4 days: Rahu (a simple formula), Saturn, Jupiter. If more than `maxMiss` of them are wrong, the whole slot is dropped.
 *   2. each surviving day: Sun, Mars, Mercury, Venus as well.
 *   3. each surviving day, every 10 min (60 min without Lagna): Moon and Lagna. Window edges are then refined by bisection.
 * A match window is a stretch of time in which at most `maxMiss` items are wrong. maxMiss = 0 is an exact match.
 */
export interface SearchReq {
  picks: Partial<Record<SearchPlanet, Pick>>   // the planets to match (others are ignored)
  lagna: Pick | null                            // null = ignore the rising sign (no place needed)
  lat: number; lon: number
  ayanamsaShift: number                         // degrees added to Lahiri (0 = plain Lahiri)
  jdFrom: number; jdTo: number
  maxMiss: number
  maxResults: number
}
/** bestJd = the middle of the best-matching stretch inside the window (the moment to look at) */
export interface SkyHit { startJd: number; endJd: number; bestJd: number; misses: number; missed: string[]; total: number }
export interface Hooks { progress: (frac: number, found: number, jd: number) => void; hit: (h: SkyHit) => void; cancelled: () => boolean; yieldNow: () => Promise<void> }

const BODY: Record<string, Astronomy.Body> = { sun: Astronomy.Body.Sun, mercury: Astronomy.Body.Mercury, venus: Astronomy.Body.Venus, mars: Astronomy.Body.Mars, jupiter: Astronomy.Body.Jupiter, saturn: Astronomy.Body.Saturn }
const toDate = (jd: number) => new Date((jd - 2440587.5) * 86400000)

/** tropical longitude of one graha: the same formulas as lib/engine.ts, one body at a time */
function tropLon(id: SearchPlanet, jd: number): number {
  if (id === 'rahu') { const T = (jd - 2451545) / 36525; return norm360(125.04452 - 1934.136261 * T + 0.0020708 * T * T) }
  const d = toDate(jd)
  if (id === 'moon') return norm360(Astronomy.EclipticGeoMoon(d).lon)
  return norm360(Astronomy.Ecliptic(Astronomy.GeoVector(BODY[id], d, true)).elon)
}
/** rising sign (sidereal longitude): same formula as lib/engine.ts */
function lagnaSid(jd: number, lat: number, lon: number, ay: number): number {
  const T = (jd - 2451545) / 36525
  const gst = norm360(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T)
  const lr = norm360(gst + lon) * DEG2RAD, la = lat * DEG2RAD, eps = (23.43929111 - 0.013004167 * T) * DEG2RAD
  const y = Math.cos(lr), x = -(Math.sin(lr) * Math.cos(eps) + Math.tan(la) * Math.sin(eps))
  return norm360(Math.atan2(y, x) * RAD2DEG - ay)
}
function matches(lon: number, p: Pick): boolean {
  if (Math.floor(lon / 30) !== p.sign) return false
  if (p.nak !== null) {
    const k = Math.floor(lon / NAK_SPAN)
    if (k !== p.nak) return false
    if (p.pada !== null && Math.floor((lon - k * NAK_SPAN) / (NAK_SPAN / 4)) + 1 !== p.pada) return false
  }
  return true
}

const STEP = 4          // days between the first (slow planets) checks
export async function searchSky(req: SearchReq, hooks: Hooks): Promise<{ truncated: boolean; cancelled: boolean }> {
  const picks = req.picks
  const has = (id: SearchPlanet) => !!picks[id]
  const slow = (['rahu', 'saturn', 'jupiter'] as SearchPlanet[]).filter(has)
  const med = (['sun', 'mars', 'mercury', 'venus'] as SearchPlanet[]).filter(has)
  const slowMed = [...slow, ...med]
  const useMoon = has('moon'), useLagna = !!req.lagna
  const total = SEARCH_PLANETS.filter(has).length + (useLagna ? 1 : 0)
  if (total === 0) return { truncated: false, cancelled: false }
  const M = Math.max(0, Math.min(req.maxMiss, total - 1))
  const ayAt = (jd: number) => lahiriAyanamsa(jd) + req.ayanamsaShift
  const sid = (id: SearchPlanet, jd: number) => norm360(tropLon(id, jd) - ayAt(jd))
  const ok = (id: SearchPlanet, jd: number) => matches(sid(id, jd), picks[id]!)
  const lagnaOk = (jd: number) => matches(lagnaSid(jd, req.lat, req.lon, ayAt(jd)), req.lagna!)

  /** labels of everything that does not match at this instant */
  const missedAt = (jd: number): string[] => {
    const out: string[] = []
    SEARCH_PLANETS.forEach((id) => { if (has(id) && !ok(id, jd)) out.push(id) })
    if (useLagna && !lagnaOk(jd)) out.push('lagna')
    return out
  }
  const okFull = (jd: number) => missedAt(jd).length <= M

  const slowPass = (jd: number) => { let m = 0; for (const id of slow) if (!ok(id, jd) && ++m > M) return false; return true }
  const dayState = (jd: number) => { const st = slowMed.map((id) => ok(id, jd)); return { st, miss: st.filter((v) => !v).length } }

  let found = 0, truncated = false, cancelled = false
  let open: { start: number; last: number; best: number; bestMissed: string[]; bFirst: number; bLast: number } | null = null
  let scannedUntil = -1e12
  const dt = useLagna ? 10 / 1440 : useMoon ? 1 / 24 : 1

  const bisect = (bad: number, good: number) => { for (let i = 0; i < 11; i++) { const mid = (bad + good) / 2; if (okFull(mid)) good = mid; else bad = mid } return good }
  const closeOpen = () => {
    if (!open) return
    const startLo = open.start - dt
    const start = okFull(startLo) ? startLo : bisect(startLo, open.start)
    const endHi = open.last + dt
    let end = endHi
    if (!okFull(endHi)) { let good = open.last, bad = endHi; for (let i = 0; i < 11; i++) { const mid = (good + bad) / 2; if (okFull(mid)) good = mid; else bad = mid } end = good }
    hooks.hit({ startJd: start, endJd: Math.max(end, start), bestJd: (open.bFirst + open.bLast) / 2, misses: open.best, missed: open.bestMissed, total })
    found++
    open = null
    if (found >= req.maxResults) truncated = true
  }

  const scanDay = (a: number, sa: boolean[], sb: boolean[]) => {
    if (Math.abs(a - scannedUntil) > 1e-9) closeOpen()
    const constant = sa.every((v, i) => v === sb[i])
    const base = sa.filter((v) => !v).length
    scannedUntil = a + 1
    if (constant && base > M) { closeOpen(); return }
    for (let t = a; t < a + 1 - 1e-9; t += dt) {
      let miss: number
      if (constant) {
        miss = base
        if (miss <= M && useMoon && !ok('moon', t)) miss++
        if (miss <= M && useLagna && !lagnaOk(t)) miss++
      } else miss = missedAt(t).length
      if (miss <= M) {
        if (!open) open = { start: t, last: t, best: 99, bestMissed: [], bFirst: t, bLast: t }
        open.last = t
        if (miss < open.best) { open.best = miss; open.bestMissed = miss === 0 ? [] : missedAt(t); open.bFirst = t; open.bLast = t } else if (miss === open.best) open.bLast = t
      } else closeOpen()
      if (truncated) return
    }
  }

  const slots = Math.ceil((req.jdTo - req.jdFrom) / STEP)
  let t = req.jdFrom, passA = slowPass(t), tick = performance.now()
  for (let i = 0; i < slots && !truncated; i++) {
    const t2 = t + STEP, passB = slowPass(t2)
    if (passA || passB) {
      let d = t, ds = dayState(d)
      while (d < Math.min(t2, req.jdTo) && !truncated) {
        const dn = dayState(d + 1)
        if (ds.miss <= M || dn.miss <= M) scanDay(d, ds.st, dn.st)
        d += 1; ds = dn
      }
    }
    t = t2; passA = passB
    if (performance.now() - tick > 60) {
      hooks.progress((i + 1) / slots, found, t)
      await hooks.yieldNow()
      tick = performance.now()
      if (hooks.cancelled()) { cancelled = true; break }
    }
  }
  closeOpen()
  hooks.progress(1, found, req.jdTo)
  return { truncated, cancelled }
}