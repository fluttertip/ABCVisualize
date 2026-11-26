import { SearchReq, SkyHit, searchSky } from '../lib/skyMatch'

/** Runs the long time-scan off the main thread so the page stays smooth. */
export type WorkerIn = { type: 'start'; req: SearchReq } | { type: 'cancel' }
export type WorkerOut =
  | { type: 'progress'; frac: number; found: number; jd: number }
  | { type: 'hit'; hit: SkyHit }
  | { type: 'done'; truncated: boolean; cancelled: boolean }
  | { type: 'error'; message: string }

const ctx = self as unknown as { postMessage: (m: WorkerOut) => void; onmessage: ((e: MessageEvent<WorkerIn>) => void) | null }
let stop = false
ctx.onmessage = async (e) => {
  if (e.data.type === 'cancel') { stop = true; return }
  stop = false
  try {
    const r = await searchSky(e.data.req, {
      progress: (frac, found, jd) => ctx.postMessage({ type: 'progress', frac, found, jd }),
      hit: (hit) => ctx.postMessage({ type: 'hit', hit }),
      cancelled: () => stop,
      yieldNow: () => new Promise((res) => setTimeout(res, 0)),
    })
    ctx.postMessage({ type: 'done', truncated: r.truncated, cancelled: r.cancelled })
  } catch (err) { ctx.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) }) }
}