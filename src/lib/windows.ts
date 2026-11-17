import { ChartData, aspectTargets } from './chart'
import { GRAHAS, GrahaId, HOUSES, RASHIS } from './constants'
import { siderealAt } from './engine'
import { DPeriod, houseFrom, stackAt, subPeriods } from './timing'

/**
 * EVENT WINDOWS. What is verified and what is a convention of this app:
 *  - VERIFIED (consistent across many sources): which houses / planets signify each theme, and that timing = Vimshottari period lords
 *    connected to those houses, confirmed by transits.
 *  - CONVENTION OF THIS APP (not a classical number): the "activation points" below (a plain count of how many of the three levels
 *    Maha / Antar / Pratyantar are connected to the theme), and the A/B/C grades. They make the checklist countable; they are not a prediction of an event.
 */
export interface Trigger { planets: GrahaId[]; houses: number[]; from: 'lagna' | 'moon'; label: string }
export interface Theme {
  id: string; label: string; vedic: string; primary: number[]; support: number[]; karakas: GrahaId[]; triggers: Trigger[]; caution: string
}
export const THEMES: Theme[] = [
  { id: 'accident', label: 'Accident / injury risk', vedic: 'Aristha · Ayurbhava · Randhra-Ripu (8H, 6H), Mangala-Rahu-Shani', primary: [8, 6, 1], support: [12, 3, 4], karakas: ['mars', 'rahu', 'saturn', 'ketu'],
    triggers: [{ planets: ['mars', 'saturn', 'rahu', 'ketu'], houses: [1, 6, 8, 12], from: 'lagna', label: 'malefic gochar over 1/6/8/12' }],
    caution: 'This marks periods of higher exposure only. No chart can say that an accident will happen or when.' },
  { id: 'loss', label: 'Loss / expense', vedic: 'Vyaya (12H), Randhra (8H), Ripu (6H) · Shani, Rahu, Ketu', primary: [12, 8, 6], support: [2, 5], karakas: ['saturn', 'rahu', 'ketu'],
    triggers: [{ planets: ['saturn', 'rahu', 'ketu', 'mars'], houses: [12, 8, 6], from: 'lagna', label: 'malefic gochar over 6/8/12' }, { planets: ['saturn'], houses: [12, 1, 2], from: 'moon', label: 'Sade Sati (Saturn 12/1/2 from Moon)' }],
    caution: 'Loss themes are also expenses you choose (travel, investment, charity). The chart cannot tell which.' },
  { id: 'gain', label: 'Gains / income', vedic: 'Dhana (2H), Labha (11H), Putra (5H), Dharma (9H) · Guru, Budha', primary: [11, 2], support: [5, 9, 10], karakas: ['jupiter'],
    triggers: [{ planets: ['jupiter'], houses: [2, 5, 7, 9, 11], from: 'moon', label: 'Guru gochar in 2/5/7/9/11 from Moon' }, { planets: ['jupiter'], houses: [2, 11, 5, 9], from: 'lagna', label: 'Guru gochar over 2/11/5/9' }],
    caution: 'Shows supportive periods for income themes, not amounts.' },
  { id: 'foreign', label: 'Foreign travel / settlement', vedic: 'Vyaya (12H), Dharma (9H), Sahaja (3H), Sukha (4H), Yuvati (7H) · Rahu, Guru, Shani', primary: [12, 9], support: [3, 4, 7], karakas: ['rahu', 'jupiter', 'saturn'],
    triggers: [{ planets: ['jupiter', 'rahu'], houses: [9, 12], from: 'lagna', label: 'Guru / Rahu gochar over 9H or 12H' }],
    caution: '3H/9H give journeys that return; settlement needs the 12H active with a loosened 4H.' },
  { id: 'edu', label: 'Higher education', vedic: 'Sukha (4H), Putra (5H), Dharma (9H) · Guru, Budha', primary: [5, 9, 4], support: [2, 12], karakas: ['jupiter', 'mercury'],
    triggers: [{ planets: ['jupiter'], houses: [4, 5, 9], from: 'lagna', label: 'Guru gochar over 4/5/9' }],
    caution: 'Add the 12H if the study is abroad.' },
  { id: 'mind', label: 'Mental fatigue / stress', vedic: 'Chandra (mind), Budha (nerves), Sukha (4H) · Shani, Rahu · Sade Sati', primary: [4, 6, 12], support: [8, 1], karakas: ['moon', 'mercury', 'saturn', 'rahu'],
    triggers: [{ planets: ['saturn'], houses: [12, 1, 2], from: 'moon', label: 'Sade Sati (Saturn 12/1/2 from Moon)' }, { planets: ['rahu'], houses: [1], from: 'moon', label: 'Rahu gochar over natal Moon' }],
    caution: 'Astrological tendency only, not a diagnosis. If stress or low mood is real, a doctor or counsellor is the right place.' },
]

export interface Signif { level: 0 | 1 | 2; lordOf: number[]; house: number; aspects: number[]; karaka: boolean; why: string }
const lagnaHouseLord = (chart: ChartData, h: number) => RASHIS[(chart.lagnaIdx + h - 1) % 12].lord

export function signify(p: GrahaId, th: Theme, chart: ChartData): Signif {
  const pl = chart.placements[p], house = pl.house
  const lordOf = Array.from({ length: 12 }, (_, i) => i + 1).filter((h) => lagnaHouseLord(chart, h) === p)
  // Rahu / Ketu own no sign: they give the results of their sign-lord (dispositor) and of what they sit with
  const via = (p === 'rahu' || p === 'ketu') ? RASHIS[pl.rashiIdx].lord : null
  const viaHouses = via ? Array.from({ length: 12 }, (_, i) => i + 1).filter((h) => lagnaHouseLord(chart, h) === via) : []
  const aspects = aspectTargets(p, house).map((a) => a.toHouse)
  const karaka = th.karakas.includes(p)
  const hitP = lordOf.some((h) => th.primary.includes(h)) || th.primary.includes(house) || karaka
  const hitS = lordOf.some((h) => th.support.includes(h)) || th.support.includes(house) || aspects.some((h) => th.primary.includes(h)) || viaHouses.some((h) => th.primary.includes(h))
  const level: 0 | 1 | 2 = hitP ? 2 : hitS ? 1 : 0
  const hn = (h: number) => `${h}H ${HOUSES[h - 1].sanskrit.split(' ')[0]}`
  const bits = [
    lordOf.length ? `lord of ${lordOf.map(hn).join(', ')}` : (via ? `no sign of its own, acts through ${GRAHAS[via].name} (lord of ${viaHouses.map((h) => h + 'H').join(', ') || '-'})` : ''),
    `sits in ${hn(house)} (${RASHIS[pl.rashiIdx].en}, ${pl.dignity.label.toLowerCase()}${pl.retro ? ', retrograde' : ''}${pl.combust ? ', combust' : ''})`,
    `aspects ${aspects.map((h) => h + 'H').join(', ')}`,
    karaka ? 'natural karaka for this theme' : '',
  ].filter(Boolean)
  return { level, lordOf, house, aspects, karaka, why: `${GRAHAS[p].name}: ${bits.join('; ')}` }
}

export const points = (path: GrahaId[], th: Theme, chart: ChartData) => path.slice(0, 3).reduce((s, g) => s + signify(g, th, chart).level, 0)

export interface Win { th: Theme; pd: DPeriod; pts: number; levels: number[]; gochar: string[]; peaks: DPeriod[] }

function gocharTags(th: Theme, chart: ChartData, midMs: number): string[] {
  const sid = siderealAt(midMs / 86400000 + 2440587.5), moonSign = chart.placements.moon.rashiIdx, out: string[] = []
  th.triggers.forEach((tr) => tr.planets.forEach((g) => {
    const sign = Math.floor(sid[g] / 30), h = houseFrom(sign, tr.from === 'moon' ? moonSign : chart.lagnaIdx)
    if (tr.houses.includes(h)) out.push(`${GRAHAS[g].name} in ${h}H from ${tr.from === 'moon' ? 'Moon' : 'Lagna'} (${tr.label})`)
  }))
  return out
}

/** every Pratyantardasha in [from, to] whose Maha/Antar/Pratyantar lords connect to the theme, with Sookshma peaks and gochar confirmation */
export function findWindows(th: Theme, chart: ChartData, mahas: DPeriod[], from: number, to: number, minPts: number): Win[] {
  const out: Win[] = []
  mahas.filter((m) => m.end > from && m.start < to).forEach((md) => subPeriods(md).filter((a) => a.end > from && a.start < to).forEach((ad) => subPeriods(ad).filter((p) => p.end > from && p.start < to).forEach((pd) => {
    const levels: number[] = pd.path.map((g) => signify(g, th, chart).level), pts = levels.reduce((s, x) => s + x, 0)
    if (pts < minPts) return
    const peaks = subPeriods(pd).filter((sd) => signify(sd.lord, th, chart).level === 2)
    out.push({ th, pd, pts, levels, gochar: gocharTags(th, chart, (pd.start + pd.end) / 2), peaks })
  })))
  return out
}

export const currentStack = (t: number, mahas: DPeriod[]) => stackAt(t, mahas, 5)
