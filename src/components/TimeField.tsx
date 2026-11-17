import { useRef } from 'react'

const pad = (n: number) => String(n).padStart(2, '0')

function parse(tob: string) {
  const [h = '0', m = '0'] = tob.split(':')
  const H = Number(h) || 0, M = Number(m) || 0
  return { h12: H % 12 === 0 ? 12 : H % 12, m: Math.min(59, M), pm: H >= 12 }
}
const build = (h12: number, m: number, pm: boolean) => `${pad((h12 % 12) + (pm ? 12 : 0))}:${pad(m)}:00`

/** 12-hour time entry that behaves like a quick keypad: no waiting for a second digit when none is needed. */
export function TimeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = parse(value)
  const mRef = useRef<HTMLInputElement>(null)
  const apRef = useRef<HTMLButtonElement>(null)
  const hBuf = useRef<number | null>(null)   // first digit already typed in the hour field (waiting for a 2nd)
  const mBuf = useRef<number | null>(null)
  const commit = (h12: number, m: number, pm: boolean) => onChange(build(h12, m, pm))
  const focusNext = (el: HTMLElement | null) => requestAnimationFrame(() => el?.focus())

  const typed = (e: React.ChangeEvent<HTMLInputElement>) => {
    const it = (e.nativeEvent as InputEvent).inputType ?? ''
    if (it.startsWith('delete')) return
    const ch = e.target.value.slice(-1)
    return /\d/.test(ch) ? Number(ch) : undefined
  }

  const onHour = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = typed(e)
    if (d === undefined) return
    if (hBuf.current === null) {
      if (d === 0) { commit(12, t.m, t.pm); focusNext(mRef.current); return }            // 0 -> 12, skip ahead
      if (d >= 2) { commit(d, t.m, t.pm); focusNext(mRef.current); return }              // 2-9 can only be a single digit
      hBuf.current = 1; commit(1, t.m, t.pm)                                             // 1 may become 10/11/12
    } else {
      const v = 10 + d
      hBuf.current = null
      if (v <= 12) commit(v, t.m, t.pm); else commit(v - 12, t.m, true)                  // 13-19 -> 1-7 PM
      focusNext(mRef.current)
    }
  }

  const onMin = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = typed(e)
    if (d === undefined) return
    if (mBuf.current === null) {
      if (d === 0 || d >= 6) { commit(t.h12, d, t.pm); focusNext(apRef.current); return } // 0 and 6-9 are final -> go to AM/PM
      mBuf.current = d; commit(t.h12, d, t.pm)                                           // 1-5 may continue to 10-59
    } else {
      const v = mBuf.current * 10 + d
      mBuf.current = null
      commit(t.h12, v, t.pm); focusNext(apRef.current)
    }
  }

  const arrows = (kind: 'h' | 'm') => (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const up = e.key === 'ArrowUp'
    if (kind === 'h') commit(up ? (t.h12 % 12) + 1 : ((t.h12 + 10) % 12) + 1, t.m, t.pm)
    else commit(t.h12, (t.m + (up ? 1 : 59)) % 60, t.pm)
  }
  const reset = () => { hBuf.current = null; mBuf.current = null }
  const sel = (e: React.FocusEvent<HTMLInputElement>) => { reset(); e.target.select() }

  const cell = 'w-[1.7rem] bg-transparent p-0 text-center font-mono text-sm text-slate-100 caret-transparent outline-none selection:bg-amber-400/30'
  return (
    <div className="input flex items-center gap-0.5 !px-2 focus-within:border-white/30" role="group" aria-label="Birth time">
      <input className={cell} inputMode="numeric" aria-label="Hour" value={pad(t.h12)} onChange={onHour} onKeyDown={arrows('h')} onFocus={sel} onBlur={reset} />
      <span className="text-slate-500">:</span>
      <input ref={mRef} className={cell} inputMode="numeric" aria-label="Minute" value={pad(t.m)} onChange={onMin} onKeyDown={arrows('m')} onFocus={sel} onBlur={reset} />
      <button
        ref={apRef} type="button" aria-label="AM or PM"
        className="ml-1 rounded-md bg-amber-400/15 px-1.5 py-0.5 font-mono text-xs font-semibold text-amber-300 outline-none transition hover:bg-amber-400/25 focus:ring-1 focus:ring-amber-300/60"
        onClick={() => commit(t.h12, t.m, !t.pm)}
        onKeyDown={(e) => {
          if (/^a$/i.test(e.key)) { e.preventDefault(); commit(t.h12, t.m, false) }
          else if (/^p$/i.test(e.key)) { e.preventDefault(); commit(t.h12, t.m, true) }
          else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); commit(t.h12, t.m, !t.pm) }
        }}
      >{t.pm ? 'PM' : 'AM'}</button>
    </div>
  )
}
