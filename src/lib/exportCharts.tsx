import { renderToStaticMarkup } from 'react-dom/server'
import { KundaliChart } from '../components/KundaliChart'
import { BirthInput, ChartData, effectiveDateTime, placeLabel } from './chart'
import { RASHIS } from './constants'
import { MOON_CHART, STANDARD, CONVENTION, SUN_CHART, computeVarga, kindOf } from './vargas'
import { vargaLabel } from './vargaInfo'
import { fmtUtc } from './tz'
import { makeZip } from './zip'

/**
 * What gets exported: D1, Moon chart, Sun chart, the other 15 classical (BPHS) vargas, and D5, D6, D8, D11.
 * Harmonic-only charts (no Vedic rule) are deliberately left out.
 */
export const EXPORT_SET: number[] = [1, MOON_CHART, SUN_CHART, ...STANDARD.filter((n) => n !== 1), ...CONVENTION].sort((a, b) => {
  const rank = (n: number) => (n === 1 ? 0 : n === MOON_CHART ? 1 : n === SUN_CHART ? 2 : 3 + n)
  return rank(a) - rank(b)
})

const BG = '#0a0e16'
const FONT = 'JetBrains Mono, ui-monospace, Menlo, Consolas, monospace'
const NO_ARROWS = { out: false, in: false, lord: false }

interface Meta { birth: BirthInput; effective: string; style: 'north' | 'south'; frame: string }

function chartSvg(chart: ChartData, n: number, style: 'north' | 'south'): string {
  const v = computeVarga(chart, n)
  const body = renderToStaticMarkup(<KundaliChart chart={v} style={style} focusH={0} focusG={null} toggles={NO_ARROWS} reveal={false} onPick={() => {}} />)
  // standalone SVG needs the namespace and an explicit size; the dark background is drawn on the canvas
  return body.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" ')
}

const loadSvg = (svg: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  const img = new Image()
  img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not render a chart')) }
  img.src = url
})

/** shortens text with an ellipsis so it never runs off the page */
function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}

function header(ctx: CanvasRenderingContext2D, W: number, m: Meta, scale: number, y: number) {
  const b = m.birth
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'; ctx.font = `700 ${26 * scale}px ${FONT}`
  ctx.fillText(`${b.name.trim() || 'Untitled'} · Divisional charts`, 40 * scale, y)
  ctx.fillStyle = '#94a3b8'; ctx.font = `${14 * scale}px ${FONT}`
  ctx.fillText(fit(ctx, `Born ${b.dob} ${b.tob} · ${placeLabel(b)} · lat ${b.lat.toFixed(3)}, lon ${b.lon.toFixed(3)} · ${fmtUtc(b.tz)}`, W - 80 * scale), 40 * scale, y + 22 * scale)
  ctx.fillText(`Chart time ${m.effective} · ${m.frame === 'sidereal' ? 'Sidereal (Lahiri)' : 'Tropical'} · ${m.style === 'north' ? 'North' : 'South'} style`, 40 * scale, y + 42 * scale)
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = scale
  ctx.beginPath(); ctx.moveTo(40 * scale, y + 56 * scale); ctx.lineTo(W - 40 * scale, y + 56 * scale); ctx.stroke()
}

function cell(ctx: CanvasRenderingContext2D, img: HTMLImageElement, n: number, lagnaIdx: number, x: number, y: number, size: number, scale: number) {
  const label = vargaLabel(n)
  const tag = kindOf(n) === 'convention' ? ' (convention)' : ''
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#e6e9ef'; ctx.font = `700 ${14 * scale}px ${FONT}`
  ctx.fillText(label + tag, x, y + 14 * scale)
  const r = RASHIS[lagnaIdx]
  ctx.textAlign = 'right'; ctx.fillStyle = r.color; ctx.font = `${12 * scale}px ${FONT}`
  ctx.fillText(`${n < 0 ? (n === MOON_CHART ? 'Moon in' : 'Sun in') : 'Lagna'} ${r.name}`, x + size, y + 14 * scale)
  ctx.drawImage(img, x, y + 22 * scale, size, size)
}

async function renderAll(chart: ChartData, style: 'north' | 'south') {
  const imgs = await Promise.all(EXPORT_SET.map((n) => loadSvg(chartSvg(chart, n, style))))
  return EXPORT_SET.map((n, i) => ({ n, img: imgs[i], lagnaIdx: computeVarga(chart, n).lagnaIdx }))
}

function sheetMeta(birth: BirthInput, chart: ChartData, controls: Parameters<typeof effectiveDateTime>[1], style: 'north' | 'south'): Meta {
  return { birth, effective: effectiveDateTime(birth, controls), style, frame: chart.frame }
}

/** ONE tall PNG with all charts (4 per row). */
export async function buildPng(chart: ChartData, birth: BirthInput, controls: Parameters<typeof effectiveDateTime>[1], style: 'north' | 'south'): Promise<Blob> {
  const items = await renderAll(chart, style)
  const meta = sheetMeta(birth, chart, controls, style)
  const cols = 4, size = 560, gapX = 30, gapY = 34, pad = 40, headH = 120, capH = 22
  const rows = Math.ceil(items.length / cols)
  const W = pad * 2 + cols * size + (cols - 1) * gapX
  const H = headH + pad + rows * (size + capH + gapY)
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H)
  header(ctx, W, meta, 1.4, 52)
  items.forEach((it, i) => {
    const c = i % cols, r = Math.floor(i / cols)
    cell(ctx, it.img, it.n, it.lagnaIdx, pad + c * (size + gapX), headH + 20 + r * (size + capH + gapY), size, 1.3)
  })
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('PNG failed'))), 'image/png'))
}

/** A4 portrait pages, 2 x 3 charts per page, packed into a PDF with no library. */
export async function buildPdf(chart: ChartData, birth: BirthInput, controls: Parameters<typeof effectiveDateTime>[1], style: 'north' | 'south'): Promise<Blob> {
  const items = await renderAll(chart, style)
  const meta = sheetMeta(birth, chart, controls, style)
  const PW = 1654, PH = 2339            // A4 at 200 dpi
  const cols = 2, perPage = 6, pad = 70
  const colW = (PW - pad * 2) / cols, size = 630   // 3 rows must fit under the page-1 header
  const pages = Math.ceil(items.length / perPage)
  const jpegs: Uint8Array[] = []
  for (let p = 0; p < pages; p++) {
    const cv = document.createElement('canvas'); cv.width = PW; cv.height = PH
    const ctx = cv.getContext('2d')!
    ctx.fillStyle = BG; ctx.fillRect(0, 0, PW, PH)
    const top = p === 0 ? 200 : 90
    if (p === 0) header(ctx, PW, meta, 2, 70)
    items.slice(p * perPage, (p + 1) * perPage).forEach((it, i) => {
      const c = i % cols, r = Math.floor(i / cols)
      cell(ctx, it.img, it.n, it.lagnaIdx, pad + c * colW + (colW - size) / 2, top + r * (size + 62), size, 2)
    })
    ctx.textAlign = 'center'; ctx.fillStyle = '#64748b'; ctx.font = `24px ${FONT}`
    ctx.fillText(`Page ${p + 1} of ${pages}`, PW / 2, PH - 40)
    const blob: Blob = await new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('JPEG failed'))), 'image/jpeg', 0.92))
    jpegs.push(new Uint8Array(await blob.arrayBuffer()))
  }

  // ---- minimal PDF writer: one full-page JPEG per page ----
  const enc = new TextEncoder()
  const parts: Uint8Array[] = []
  const offsets: number[] = []
  let len = 0
  const push = (d: Uint8Array | string) => { const u = typeof d === 'string' ? enc.encode(d) : d; parts.push(u); len += u.length }
  const obj = (id: number, body: () => void) => { offsets[id] = len; push(`${id} 0 obj\n`); body(); push('\nendobj\n') }

  const W_PT = 595.28, H_PT = 841.89
  const total = 2 + pages * 3
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'))
  obj(2, () => push(`<< /Type /Pages /Count ${pages} /Kids [${Array.from({ length: pages }, (_, i) => `${3 + i * 3} 0 R`).join(' ')}] >>`))
  jpegs.forEach((jpg, i) => {
    const pageId = 3 + i * 3, contentId = pageId + 1, imgId = pageId + 2
    obj(pageId, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W_PT} ${H_PT}] /Resources << /XObject << /Im0 ${imgId} 0 R >> >> /Contents ${contentId} 0 R >>`))
    const stream = `q ${W_PT} 0 0 ${H_PT} 0 0 cm /Im0 Do Q`
    obj(contentId, () => push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`))
    obj(imgId, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${PW} /Height ${PH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`)
      push(jpg); push('\nendstream')
    })
  })
  const xref = len
  push(`xref\n0 ${total + 1}\n0000000000 65535 f \n`)
  for (let i = 1; i <= total; i++) push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`)
  return new Blob(parts as BlobPart[], { type: 'application/pdf' })
}

/** ZIP with one PNG per chart (the same 22), each with its own title strip and the birth details. */
export async function buildZip(chart: ChartData, birth: BirthInput, controls: Parameters<typeof effectiveDateTime>[1], style: 'north' | 'south'): Promise<Blob> {
  const items = await renderAll(chart, style)
  const meta = sheetMeta(birth, chart, controls, style)
  const size = 1000, pad = 50, W = size + pad * 2, H = 150 + size + pad
  const files: { name: string; data: Uint8Array }[] = []
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H
    const ctx = cv.getContext('2d')!
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H)
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'
    ctx.fillStyle = '#94a3b8'; ctx.font = `15px ${FONT}`
    ctx.fillText(fit(ctx, `${birth.name.trim() || 'Untitled'} · Born ${birth.dob} ${birth.tob} · ${placeLabel(birth)}`, W - pad * 2), pad, 34)
    ctx.fillText(`${fmtUtc(birth.tz)} · chart time ${meta.effective} · ${meta.frame === 'sidereal' ? 'Sidereal (Lahiri)' : 'Tropical'} · ${style === 'north' ? 'North' : 'South'} style`, pad, 56)
    cell(ctx, it.img, it.n, it.lagnaIdx, pad, 78, size, 1.6)
    const blob: Blob = await new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('PNG failed'))), 'image/png'))
    const slug = vargaLabel(it.n).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '')
    files.push({ name: `${String(i + 1).padStart(2, '0')}_${slug}.png`, data: new Uint8Array(await blob.arrayBuffer()) })
  }
  return makeZip(files)
}

export function download(blob: Blob, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}
