import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { isCurrentSaved, useChart } from '../store/useChart'

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
)

/**
 * One clear button. Saving stores the chart exactly as it is on screen right now (stored in this browser only).
 * The list of saved charts lives under "Saved charts" in the top bar, so there is no second button here.
 */
export function SaveActions({ canSave }: { canSave: boolean }) {
  const saveCurrent = useChart((s) => s.saveCurrent)
  const isSaved = useChart(isCurrentSaved)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(false), 6000)
    return () => clearTimeout(id)
  }, [flash])

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={!canSave || isSaved}
        onClick={() => { saveCurrent(); setFlash(true) }}
        title={canSave ? 'Saves this chart exactly as it is on screen now (time, selections, Section 4 picks). Kept in this browser only.' : 'Generate a chart first, then you can save it.'}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-[0.98] disabled:cursor-default disabled:opacity-50 disabled:hover:bg-white/[0.06]"
      >
        {isSaved ? <Icon d="M20 6 9 17l-5-5" /> : <Icon d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2ZM17 21v-8H7v8M7 3v5h8" />}
        {isSaved ? 'Saved' : 'Save this chart'}
      </button>
      {flash
        ? <span className="text-[11.5px] text-emerald-300">Saved on this device. <Link to="/saved" className="underline underline-offset-2 hover:text-emerald-200">Open Saved charts →</Link></span>
        : !canSave ? <span className="text-[11px] text-mute">Generate a chart to enable saving</span>
        : isSaved ? <Link to="/saved" className="text-[11px] text-mute underline-offset-2 hover:text-white hover:underline">This view is in Saved charts</Link> : null}
    </div>
  )
}