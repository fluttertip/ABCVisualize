import { CITIES } from './constants'

/** one place the person can pick */
export interface Place {
  id: string
  /** "Kathmandu, Bagmati, Nepal" */
  label: string
  lat: number
  lon: number
  /** IANA zone name, e.g. "Asia/Kathmandu" (may be empty if the service did not give one) */
  tzName: string
  /** "Capital · pop. 1,442,271" style hint shown under the name */
  hint?: string
}

const GEO = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST = 'https://api.open-meteo.com/v1/forecast'

interface RawResult {
  id?: number; name?: string; latitude?: number; longitude?: number; timezone?: string
  admin1?: string; admin2?: string; country?: string; population?: number; feature_code?: string
}

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)

/** turns the service's JSON into Places; anything without a usable name or coordinates is dropped */
export function parseGeocode(json: unknown): Place[] {
  const results = (json as { results?: RawResult[] } | null)?.results
  if (!Array.isArray(results)) return []
  const out: Place[] = []
  for (const r of results) {
    if (!r || typeof r.name !== 'string' || !isNum(r.latitude) || !isNum(r.longitude)) continue
    if (Math.abs(r.latitude) > 90 || Math.abs(r.longitude) > 180) continue
    const parts: string[] = [r.name]
    for (const x of [r.admin1, r.country]) if (x && !parts.includes(x)) parts.push(x)
    const hint = [r.admin2 && r.admin2 !== r.admin1 ? r.admin2 : '', isNum(r.population) && r.population > 0 ? `pop. ${r.population.toLocaleString('en-US')}` : '']
      .filter(Boolean).join(' · ')
    out.push({ id: String(r.id ?? `${r.latitude},${r.longitude}`), label: parts.join(', '), lat: r.latitude, lon: r.longitude, tzName: r.timezone ?? '', hint: hint || undefined })
  }
  return out
}

/** online search as you type (GeoNames data via Open-Meteo). Throws on network / service errors. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const url = `${GEO}?name=${encodeURIComponent(q)}&count=10&language=en&format=json`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Search service answered ${res.status}`)
  return parseGeocode(await res.json())
}

/** built-in list, used when the online search cannot be reached */
export function searchOffline(query: string): Place[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return CITIES.filter((c) => c.label.toLowerCase().includes(q))
    .map((c) => ({ id: `builtin-${c.key}`, label: c.label, lat: c.lat, lon: c.lon, tzName: c.tzName }))
}

/** time-zone name for a pair of coordinates (online). Returns '' if the service does not give one. */
export async function detectZone(lat: number, lon: number, signal?: AbortSignal): Promise<string> {
  const url = `${FORECAST}?latitude=${lat}&longitude=${lon}&current=temperature_2m&timezone=auto`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Time-zone service answered ${res.status}`)
  const j = (await res.json()) as { timezone?: unknown }
  return typeof j.timezone === 'string' ? j.timezone : ''
}
