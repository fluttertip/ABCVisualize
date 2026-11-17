import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { birthMinute, computeChart, effectiveDateTime, placeLabel } from '../lib/chart'
import { RASHIS } from '../lib/constants'
import { fmtUtc } from '../lib/tz'
import { vargaLabel } from '../lib/vargaInfo'
import { SavedChart, useChart } from '../store/useChart'

const pad = (n: number) => String(n).padStart(2, '0')
const clock = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
const fmt12 = (tob: string) => { const [h, m] = tob.split(':').map(Number); return `${pad(h % 12 || 12)}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}` }

/** the three things people recognise a chart by: Lagna, Moon sign, birth star (computed once per card) */
function Identity({ s }: { s: SavedChart }) {
  const c = useMemo(() => {
    try { return computeChart(s.birth, { minuteOfDay: birthMinute(s.birth), dayOffset: 0, yearOffset: 0, hourOffset: 0, minuteOffset: 0 }, 'sidereal') } catch { return null }
  }, [s.birth])
  if (!c) return null
  const L = RASHIS[c.lagnaIdx], M = RASHIS[c.placements.moon.rashiIdx]
  const Item = ({ k, v }: { k: string; v: string }) => <div className="min-w-0"><div className="text-[10px] uppercase tracking-wider text-slate-500">{k}</div><div className="truncate text-[13px] font-medium text-slate-100">{v}</div></div>
  return (
    <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-3">
      <Item k="Lagna" v={`${L.sym} ${L.name}`} />
      <Item k="Moon sign" v={`${M.sym} ${M.name}`} />
      <Item k="Birth star" v={`${c.placements.moon.nak.name} · ${c.placements.moon.nak.pada}`} />
    </div>
  )
}

function Card({ s, onOpen, onDelete }: { s: SavedChart; onOpen: () => void; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false)
  const v = s.view
  const off = v ? v.controls.dayOffset !== 0 || v.controls.yearOffset !== 0 || v.controls.hourOffset !== 0 || v.controls.minuteOffset !== 0 : false
  const name = s.birth.name.trim() || 'Untitled'
  return (
    <li className="flex flex-col rounded-xl border border-white/10 bg-white/[0.025] p-4 transition hover:border-white/20">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-white">{name}</div>
          <div className="mt-0.5 font-mono text-[12px] text-slate-300">{s.birth.dob} · {fmt12(s.birth.tob)}</div>
          <div className="truncate text-[12px] text-mute">{placeLabel(s.birth)}</div>
        </div>
        <span className="shrink-0 text-[10.5px] text-slate-500">Saved {new Date(s.savedAt).toLocaleDateString()}</span>
      </div>
      <Identity s={s} />
      {v ? (
        <p className="mt-3 text-[11.5px] leading-relaxed text-slate-400">
          Opens on <span className="text-slate-200">{effectiveDateTime(s.birth, v.controls)}</span>{off ? ' (time moved from birth)' : ' (the birth moment)'} · {v.frame === 'sidereal' ? 'Sidereal' : 'Tropical'} · {v.chartStyle === 'north' ? 'North' : 'South'} style · House {v.selectedHouse} selected · Section 4: {v.vargaSel.slice(0, v.vargaCount).map(vargaLabel).join(', ')}
        </p>
      ) : <p className="mt-3 text-[11.5px] text-slate-500">Saved with an older version: opens at the birth moment.</p>}
      <div className="mt-4 flex items-center gap-2">
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#0a0e16] transition hover:brightness-110 active:scale-[0.98]" onClick={onOpen}>Open chart</button>
        {confirm ? (
          <div className="ml-auto flex items-center gap-2 text-[12px]">
            <span className="text-slate-300">Delete for good?</span>
            <button className="btn !border-rose-400/40 !text-rose-300 hover:!bg-rose-400/10" onClick={onDelete}>Yes, delete</button>
            <button className="btn" onClick={() => setConfirm(false)}>Keep</button>
          </div>
        ) : <button className="btn ml-auto" onClick={() => setConfirm(true)}>Delete</button>}
      </div>
    </li>
  )
}

export function SavedPage() {
  const { saved, openSaved, deleteSaved } = useChart()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const list = saved.filter((s) => `${s.birth.name} ${s.birth.dob} ${placeLabel(s.birth)}`.toLowerCase().includes(q.trim().toLowerCase()))

  const backup = () => {
    const blob = new Blob([JSON.stringify({ app: 'astronomical-birth-chart-visualize', version: 1, saved }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `saved-charts-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href)
  }
  const restore = async (f: File) => {
    try {
      const j = JSON.parse(await f.text()), items: SavedChart[] = Array.isArray(j) ? j : j.saved
      if (!Array.isArray(items) || items.some((x) => !x?.birth?.dob || !x.birth.tob)) throw new Error('bad file')
      const have = new Set(useChart.getState().saved.map((x) => x.id)), fresh = items.filter((x) => !have.has(x.id))
      useChart.getState().set({ saved: [...fresh, ...useChart.getState().saved] })
      setMsg(`Imported ${fresh.length} chart${fresh.length === 1 ? '' : 's'}${items.length - fresh.length ? ` (${items.length - fresh.length} already here)` : ''}.`)
    } catch { setMsg('That file is not a backup from this app.') }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-4 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Saved charts</h1>
          <p className="mt-0.5 text-[13px] text-mute">{saved.length ? `${saved.length} saved on this device. Open one to continue exactly where you left off.` : 'Charts you save show up here.'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {saved.length > 0 && <input className="input !w-48 !py-1.5 text-[13px]" placeholder="Search name, date, place…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search saved charts" />}
          <button className="btn" onClick={backup} disabled={!saved.length} title="Download all saved charts as a file you can keep or move to another browser">Download backup</button>
          <button className="btn" onClick={() => file.current?.click()} title="Add charts from a backup file">Import backup</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = '' }} />
        </div>
      </div>
      {msg && <p className="mt-2 text-[12px] text-sky-300" role="status">{msg}</p>}

      <div className="mt-4 flex gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[12px] leading-relaxed text-slate-400" role="note">
        <span aria-hidden className="text-amber-300">●</span>
        <p><b className="font-medium text-slate-200">Stored in this browser only.</b> Nothing is uploaded. Another browser, device, Chrome profile or incognito window won't show these charts, and clearing site data deletes them. Use <b className="font-medium text-slate-200">Download backup</b> to keep a copy.</p>
      </div>

      {saved.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-white/15 px-6 py-14 text-center">
          <div className="text-[15px] font-medium text-white">No saved charts yet</div>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-mute">Generate a chart, then press <b className="text-slate-200">Save this chart</b> at the top right of the birth details.</p>
          <Link to="/" className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#0a0e16] hover:brightness-110">Create a chart</Link>
        </div>
      ) : list.length === 0 ? (
        <p className="mt-8 text-center text-sm text-mute">No saved chart matches “{q}”.</p>
      ) : (
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {list.map((s) => <Card key={s.id} s={s} onOpen={() => { openSaved(s.id); nav('/') }} onDelete={() => deleteSaved(s.id)} />)}
        </ul>
      )}
    </main>
  )
}