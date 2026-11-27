import * as Astronomy from 'astronomy-engine'

/**
 * Apparent geocentric position of a body, safe for very far dates.
 * astronomy-engine corrects for light travel time by repeating a calculation until it settles to ~1e-9 days.
 * Thousands of years from today a Julian day number is so large that the computer cannot store a change that small
 * (the smallest step is about 2e-9 days), so the loop can never settle and throws "Light-travel time solver did not converge".
 * That error stopped whole searches. In that case we fall back to the position without the light-time correction:
 * it differs by about 20 arc-seconds (0.006°), far smaller than the accuracy of the planet tables that far from today.
 */
export function geoVec(body: Astronomy.Body, date: Date): Astronomy.Vector {
  try { return Astronomy.GeoVector(body, date, true) } catch { return Astronomy.GeoVector(body, date, false) }
}