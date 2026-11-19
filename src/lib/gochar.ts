import * as Astronomy from 'astronomy-engine'
import { lahiriAyanamsa } from './engine'
import { norm360 } from './math'

const DAY = 86400000

/** sidereal (Lahiri) sign index 0-11 of Saturn at a moment */
export function saturnSign(ms: number): number {
  const jd = ms / DAY + 2440587.5
  const trop = norm360(Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Saturn, new Date(ms), true)).elon)
  return Math.floor(norm360(trop - lahiriAyanamsa(jd)) / 30)
}

/** moment (to about a minute) at which `test` flips between a (test false) and b (test true or the reverse) */
function bisect(a: number, b: number, test: (ms: number) => boolean): number {
  const ta = test(a)
  for (let i = 0; i < 13; i++) { const m = (a + b) / 2; if (test(m) === ta) a = m; else b = m }
  return b
}

/** the stretch of time around `ref` during which Saturn stays in the same sign (retrograde dips back into the old sign are not counted as a new stay) */
export function saturnStay(ref: number) {
  const sign = saturnSign(ref), step = 6 * DAY
  let a = ref, b = ref
  const same = (ms: number) => saturnSign(ms) === sign
  for (let i = 0; i < 260 && same(a - step); i++) a -= step
  for (let i = 0; i < 260 && same(b + step); i++) b += step
  return { sign, start: bisect(a - step, a, same), end: bisect(b, b + step, same) }
}

export interface Episode { start: number; end: number }
/**
 * Stretches of time in which Saturn is in one of `zoneSigns`, found by walking Saturn's sign every 6 days from `ref - 12y` to `ref + 32y`.
 * Short gaps caused by retrograde dips out of the zone (under 2 years) are merged into one episode.
 *  - SADE SATI = Saturn in the 12th, 1st and 2nd sign from the natal Moon sign (about 7.5 years).
 *  - DHAIYA (small Panoti / Ashtama Shani) = Saturn in the 4th or the 8th sign from the Moon (about 2.5 years each).
 */
export function saturnEpisodes(zoneSigns: number[], ref: number): Episode[] {
  const zone = new Set(zoneSigns.map((x) => ((x % 12) + 12) % 12))
  const inZone = (ms: number) => zone.has(saturnSign(ms))
  const step = 6 * DAY, t0 = ref - 12 * 365.25 * DAY, t1 = ref + 32 * 365.25 * DAY
  const runs: Episode[] = []
  let prev = inZone(t0), start = prev ? t0 : 0, last = t0
  for (let t = t0 + step; t <= t1; t += step) {
    const cur = inZone(t)
    if (cur !== prev) {
      const edge = bisect(last, t, inZone)
      if (cur) start = edge
      else runs.push({ start, end: edge })
      prev = cur
    }
    last = t
  }
  if (prev) runs.push({ start, end: t1 })
  const merged: Episode[] = []
  runs.forEach((r) => { const m = merged[merged.length - 1]; if (m && r.start - m.end < 2 * 365.25 * DAY) m.end = r.end; else merged.push({ ...r }) })
  return merged
}

export const sadeSatiEpisodes = (moonSign: number, ref: number) => saturnEpisodes([moonSign + 11, moonSign, moonSign + 1], ref)