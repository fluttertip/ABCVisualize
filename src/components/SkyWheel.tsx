import { useEffect, useRef, useState } from 'react'
import { ChartData } from '../lib/chart'
import { GrahaId } from '../lib/constants'
import { SkyHits, drawSky, hitTest } from '../lib/drawSky'

interface Props {
  chart: ChartData; morphT: number; focusHouse: number | null; focusGraha: GrahaId | null
  showNak: boolean; showAyanamsa: boolean; maxSize: number; onPick?: (house: number, graha: GrahaId | null) => void
}

export function SkyWheel({ chart, morphT, focusHouse, focusGraha, showNak, showAyanamsa, maxSize, onPick }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const hits = useRef<SkyHits>({ sectors: [], planets: [] })
  const [w, setW] = useState(560)

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)))
    if (wrap.current) ro.observe(wrap.current)
    return () => ro.disconnect()
  }, [])
  const size = Math.max(260, Math.min(w, maxSize))

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    // resizing a canvas wipes and reallocates it: only do that when the size really changed, never once per animation frame
    if (c.width !== Math.round(size * dpr)) { c.width = size * dpr; c.height = size * dpr; c.style.width = `${size}px`; c.style.height = `${size}px` }
    const ctx = c.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    hits.current = drawSky(ctx, size, chart, { morphT, focusHouse, focusGraha, showNak, showAyanamsa })
  }, [chart, morphT, focusHouse, focusGraha, showNak, showAyanamsa, size])

  return (
    <div ref={wrap} className="flex w-full justify-center">
      <canvas
        ref={canvas}
        className={onPick ? 'cursor-pointer' : ''}
        onClick={(e) => {
          if (!onPick) return
          const r = e.currentTarget.getBoundingClientRect()
          const hit = hitTest(hits.current, e.clientX - r.left, e.clientY - r.top)
          if (hit) onPick(hit.house, hit.type === 'planet' ? hit.id : null)
        }}
      />
    </div>
  )
}