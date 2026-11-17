import { DIAMOND_CELLS, GRAHAS, GRAHA_ORDER, GrahaId, NAKSHATRAS, RASHIS } from './constants'
import { ChartData } from './chart'

export interface SkyHits {
  sectors: { house: number; pts: { x: number; y: number }[] }[]
  planets: { id: GrahaId; x: number; y: number; r: number; house: number }[]
}
export interface SkyOpts { morphT: number; focusHouse: number | null; focusGraha: GrahaId | null; showNak: boolean; showAyanamsa: boolean }

const rad = (d: number) => (-d * Math.PI) / 180
/** short nakshatra labels so they fit the ring at a readable size */
const NAK_SHORT = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'P.Phalguni', 'U.Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'P.Ashadha', 'U.Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'P.Bhadra', 'U.Bhadra', 'Revati']
/** text with a dark halo so it stays readable on top of lines, fills and planet orbits */
function label(ctx: CanvasRenderingContext2D, txt: string, x: number, y: number, font: string, fill: string, halo = 3.2) {
  ctx.font = font; ctx.lineJoin = 'round'; ctx.lineWidth = halo; ctx.strokeStyle = 'rgba(8,11,18,0.92)'
  ctx.strokeText(txt, x, y); ctx.fillStyle = fill; ctx.fillText(txt, x, y)
}

export function drawSky(ctx: CanvasRenderingContext2D, size: number, chart: ChartData, o: SkyOpts): SkyHits {
  const hits: SkyHits = { sectors: [], planets: [] }
  const cx = size / 2, cy = size / 2, t = o.morphT
  const lagna = chart.lagnaLon
  const showNak = o.showNak && chart.frame === 'sidereal'
  const nakOuter = size * 0.495
  const rOuter = showNak ? size * 0.445 : size * 0.48
  const rInner = size * 0.33                       // a slightly thicker rashi ring leaves room for bigger labels
  // font sizes grow with the canvas (never below 85% of the base size)
  const u = size / 560, fp = (px: number) => Math.max(px * 0.85, px * u)
  const ft = 1 - 0.22 * t                          // labels shrink a little while the wheel morphs into the small diamond cells
  ctx.clearRect(0, 0, size, size)

  if (showNak && t < 0.85) {
    ctx.save(); ctx.globalAlpha = 1 - t / 0.85
    const span = 360 / 27
    for (let i = 0; i < 27; i++) {
      const a1 = rad(90 + (i * span - lagna)), a2 = rad(90 + ((i + 1) * span - lagna)), am = (a1 + a2) / 2
      ctx.beginPath(); ctx.arc(cx, cy, nakOuter, a1, a2, true); ctx.arc(cx, cy, rOuter, a2, a1, false); ctx.closePath()
      ctx.fillStyle = i % 2 ? 'rgba(148,163,184,0.05)' : 'rgba(148,163,184,0.09)'; ctx.fill()
      ctx.strokeStyle = 'rgba(148,163,184,0.22)'; ctx.lineWidth = 0.6; ctx.stroke()
      const lr = (nakOuter + rOuter) / 2
      ctx.save(); ctx.translate(cx + lr * Math.cos(am), cy + lr * Math.sin(am)); ctx.rotate(am + Math.PI / 2)
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      label(ctx, NAK_SHORT[i] ?? NAKSHATRAS[i].name, 0, 0, `600 ${fp(9.5).toFixed(1)}px Inter, sans-serif`, '#b4bdcd', 2.4); ctx.restore()
    }
    ctx.restore()
  }

  DIAMOND_CELLS.forEach((cell, idx) => {
    const house = idx + 1, ri = (chart.lagnaIdx + idx) % 12, rashi = RASHIS[ri]
    const c = 90 + idx * 30
    const a0 = rad(c - 15), a1 = rad(c + 15)
    const circ = [
      { x: cx + rInner * Math.cos(a0), y: cy + rInner * Math.sin(a0) },
      { x: cx + rOuter * Math.cos(a0), y: cy + rOuter * Math.sin(a0) },
      { x: cx + rOuter * Math.cos(a1), y: cy + rOuter * Math.sin(a1) },
      { x: cx + rInner * Math.cos(a1), y: cy + rInner * Math.sin(a1) },
    ]
    const raw = cell.poly.split(' ').map((p) => { const [x, y] = p.split(',').map(Number); return { x: (x / 500) * size, y: (y / 500) * size } })
    const dia = raw.length === 4 ? raw : [raw[0], raw[1], raw[2], raw[2]]
    const pts = circ.map((p, i) => ({ x: p.x * (1 - t) + dia[i].x * t, y: p.y * (1 - t) + dia[i].y * t }))
    hits.sectors.push({ house, pts })
    const focus = o.focusHouse === house, card = [1, 4, 7, 10].includes(house)
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y)); ctx.closePath()
    ctx.fillStyle = focus ? rashi.color + '33' : card ? rashi.color + '14' : rashi.color + '0a'; ctx.fill()
    ctx.strokeStyle = focus ? rashi.color : rashi.color + '70'; ctx.lineWidth = focus ? 1.8 : 0.9; ctx.stroke()

    const mid = rad(c), lr = (rInner + rOuter) / 2
    const lx = (cx + lr * Math.cos(mid)) * (1 - t) + (cell.cx / 500) * size * t
    const ly = (cy + lr * Math.sin(mid)) * (1 - t) + (cell.cy / 500) * size * t
    const lord = GRAHAS[rashi.lord], k = fp(1) * ft, lh = 15.5 * k
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    label(ctx, `${rashi.sym} ${rashi.name}`, lx, ly - lh, `700 ${(13.5 * k).toFixed(1)}px Inter, sans-serif`, rashi.color)
    label(ctx, `H${house}${card ? ' ◆' : ''} · ${rashi.style}`, lx, ly, `600 ${(11 * k).toFixed(1)}px JetBrains Mono, monospace`, card ? '#fbbf24' : '#c3cada')
    label(ctx, `Lord ${lord.sym} ${lord.name}`, lx, ly + lh, `600 ${(11.5 * k).toFixed(1)}px Inter, sans-serif`, lord.color)
  })

  if (t < 0.75) {
    ctx.save(); ctx.globalAlpha = 1 - t / 0.75
    ctx.beginPath(); ctx.arc(cx, cy, rInner, -Math.PI / 2, Math.PI / 2, true); ctx.closePath(); ctx.fillStyle = 'rgba(2,6,23,0.35)'; ctx.fill()
    ctx.setLineDash([4, 4]); ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(cx, cy - rInner); ctx.lineTo(cx, cy + rInner); ctx.strokeStyle = 'rgba(245,176,65,0.55)'; ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx - rInner, cy); ctx.lineTo(cx + rInner, cy); ctx.strokeStyle = 'rgba(167,139,250,0.4)'; ctx.stroke()
    ctx.setLineDash([])
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    label(ctx, 'ABOVE · VISIBLE', cx + rInner * 0.5, cy - rInner * 0.62, `600 ${fp(10).toFixed(1)}px Inter, sans-serif`, 'rgba(203,213,225,0.85)', 2.6)
    label(ctx, 'BELOW · HIDDEN', cx - rInner * 0.5, cy - rInner * 0.62, `600 ${fp(10).toFixed(1)}px Inter, sans-serif`, 'rgba(203,213,225,0.85)', 2.6)
    if (o.showAyanamsa && chart.frame === 'sidereal') {
      ctx.beginPath(); ctx.arc(cx, cy, rInner * 0.93, -Math.PI / 2, -Math.PI / 2 + (chart.ayanamsa * Math.PI) / 180); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.stroke()
    }
    const df = `700 ${fp(10.5).toFixed(1)}px JetBrains Mono, monospace`
    ctx.font = df
    const wz = ctx.measureText('ZENITH · H10').width, wn = ctx.measureText('NADIR · H4').width, gap = fp(7)
    ;[
      { l: 'EAST · H1', x: cx, y: cy - rInner + fp(13), c: '#f5b041' }, { l: 'WEST · H7', x: cx, y: cy + rInner - fp(13), c: '#fb7185' },
      { l: 'ZENITH · H10', x: cx + rInner - wz / 2 - gap, y: cy - fp(11), c: '#a78bfa' }, { l: 'NADIR · H4', x: cx - rInner + wn / 2 + gap, y: cy - fp(11), c: '#38bdf8' },
    ].forEach((k) => label(ctx, k.l, k.x, k.y, df, k.c, 3))

    const pr = Math.max(11.5, size * 0.0215)          // planet marker radius
    const order = [...GRAHA_ORDER].sort((x, y) => (x === o.focusGraha ? 1 : 0) - (y === o.focusGraha ? 1 : 0)) // selected planet is drawn on top
    order.forEach((id) => {
      const g = GRAHAS[id], p = chart.placements[id]
      const r = rad(90 + (p.lon - lagna))
      const d = rInner * g.orbitR, px = cx + d * Math.cos(r), py = cy + d * Math.sin(r)
      const foc = o.focusGraha === id, rr = foc ? pr + 2.5 : pr
      ctx.beginPath(); ctx.arc(cx, cy, d, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(148,163,184,0.16)'; ctx.lineWidth = 0.7; ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + rInner * Math.cos(r), cy + rInner * Math.sin(r))
      ctx.strokeStyle = foc ? g.color : g.color + '66'; ctx.lineWidth = foc ? 1.6 : 0.8; ctx.stroke()
      ctx.beginPath(); ctx.arc(cx + rInner * Math.cos(r), cy + rInner * Math.sin(r), 3, 0, Math.PI * 2); ctx.fillStyle = g.color; ctx.fill()
      ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2); ctx.fillStyle = '#0a0e16'; ctx.fill()
      ctx.strokeStyle = foc ? '#fff' : g.color; ctx.lineWidth = foc ? 2.4 : 1.8; ctx.stroke()
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillStyle = g.color; ctx.font = `800 ${(pr * 0.95).toFixed(1)}px JetBrains Mono, monospace`; ctx.fillText(g.short, px, py + 0.5)
      if (p.retro) label(ctx, 'R', px + rr * 0.95, py - rr * 0.95, `800 ${fp(10).toFixed(1)}px JetBrains Mono, monospace`, '#fb7185', 2.6)
      hits.planets.push({ id, x: px, y: py, r: rr + 4, house: p.house })
    })
    const er = Math.max(17, size * 0.034)
    ctx.beginPath(); ctx.arc(cx, cy, er, 0, Math.PI * 2); ctx.fillStyle = '#1d4ed8'; ctx.fill(); ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 1.4; ctx.stroke()
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.font = `800 ${fp(8.5).toFixed(1)}px Inter, sans-serif`; ctx.fillText('EARTH', cx, cy + 0.5)
    ctx.restore()
  }
  return hits
}

export function hitTest(hits: SkyHits, x: number, y: number) {
  for (const p of hits.planets) if (Math.hypot(x - p.x, y - p.y) <= p.r) return { type: 'planet' as const, id: p.id, house: p.house }
  for (const s of hits.sectors) {
    let inside = false
    const q = s.pts
    for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
      if (q[i].y > y !== q[j].y > y && x < ((q[j].x - q[i].x) * (y - q[i].y)) / (q[j].y - q[i].y + 1e-9) + q[i].x) inside = !inside
    }
    if (inside) return { type: 'house' as const, house: s.house }
  }
  return null
}