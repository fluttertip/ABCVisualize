import { GRAHAS } from './constants'
import { Pick, SearchPlanet } from './customChart'
import { Slot } from '../store/useAnalysis'

/** sign distance on the zodiac circle (0 to 6) */
const dist = (a: number, b: number) => { const d = Math.abs(a - b) % 12; return Math.min(d, 12 - d) }

/**
 * Sky rules that no date can break. Checked BEFORE searching so you do not wait for an answer that cannot exist.
 *  - Mercury is never more than ~28° from the Sun, so it is in the Sun's sign or the next one on either side.
 *  - Venus is never more than ~47° from the Sun, so at most 2 signs away.
 *  (Rahu and Ketu are always opposite: the builder already enforces that.)
 * Each broken rule means "this item will always count as a miss".
 */
export function impossibles(planets: Record<SearchPlanet, Pick>, use: Record<Slot, boolean>): string[] {
  const out: string[] = []
  if (use.sun && use.mercury && dist(planets.sun.sign, planets.mercury.sign) > 1) out.push(`${GRAHAS.mercury.name} can be at most 1 sign away from the ${GRAHAS.sun.name} (about 28°). Here it is ${dist(planets.sun.sign, planets.mercury.sign)} signs away, so this can never happen in the real sky.`)
  if (use.sun && use.venus && dist(planets.sun.sign, planets.venus.sign) > 2) out.push(`${GRAHAS.venus.name} can be at most 2 signs away from the ${GRAHAS.sun.name} (about 47°). Here it is ${dist(planets.sun.sign, planets.venus.sign)} signs away, so this can never happen in the real sky.`)
  return out
}