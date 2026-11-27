import { useState } from 'react'
import { RASHIS } from '../lib/constants'
import { SavedSky, SkyKind, useAnalysis } from '../store/useAnalysis'

const KINDS: { k: SkyKind; label: string; cls: string }[] = [
  { k: 'ancient', label: 'Ancient', cls: 'bg-amber-400/15 text-amber-200' },
  { k: 'good', label: 'Good', cls: 'bg-emerald-400/15 text-emerald-300' },
  { k: 'bad', label: 'Bad', cls: 'bg-rose-400/15 text-rose-300' },
  { k: 'other', label: 'Other', cls: 'bg-white/10 text-slate-300' },
]
const kindOf = (k: SkyKind) => KINDS.find((x) => x.k === k)!

/** Charts saved only for the Analysis tab: name them, tag them (ancient / good / bad), pull them back with one click. */
export function SavedSkies({ onFind }: { onFind: () => void }) {
  const skies = useAnalysis((s) => s.savedSkies)
  const saveSky = useAnalysis((s) => s.saveSky)
  const loadSky = useAnalysis((s) => s.loadSky)
  const deleteSky = useAnalysis((s) => s.deleteSky)
  const [name, setName] = useState(''), [kind, setKind] = useState<SkyKind>('ancient'), [filter, setFilter] = useState<SkyKind | 'all'>('all'), [flash, setFlash] = useState(false)
  const list = filter === 'all' ? skies : skies.filter((s) => s.kind === filter)
  const save = () => { saveSky(name, kind); setName(''); setFlash(true); setTimeout(() => setFlash(false), 2500) }
  const summary = (s: SavedSky) => `Lagna ${RASHIS[s.lagna.sign].name} · Moon ${RASHIS[s.planets.moon.sign].name} · Sun ${RASHIS[s.planets.sun.sign].name}`

  return (
    <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 text-[13px] font-semibold text-white">Analysis charts <span className="font-normal text-slate-500">· kept in this browser, only for this tab</span></div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto]">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save() }} placeholder="Name, e.g. Lord Ram, or Good Dhana sky" />
        <select className="input" value={kind} onChange={(e) => setKind(e.target.value as SkyKind)}>{KINDS.map((k) => <option key={k.k} value={k.k}>{k.label}</option>)}</select>
        <button type="button" className="btn-primary" onClick={save}>Save this chart</button>
      </div>
      {flash && <div className="mt-1 text-[11.5px] text-emerald-300">Saved. It is in the list below.</div>}
      {skies.length > 0 && (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(['all', ...KINDS.map((k) => k.k)] as const).map((k) => (
              <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-full border px-2.5 py-0.5 text-[11.5px] ${filter === k ? 'border-white/40 bg-white/10 text-white' : 'border-white/12 text-slate-400 hover:text-white'}`}>{k === 'all' ? `All (${skies.length})` : `${kindOf(k).label} (${skies.filter((s) => s.kind === k).length})`}</button>
            ))}
          </div>
          <ul className="mt-2 divide-y divide-white/5">
            {list.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-slate-100">{s.name} <span className={`ml-1 rounded-full px-2 py-0.5 text-[10.5px] ${kindOf(s.kind).cls}`}>{kindOf(s.kind).label}</span></div>
                  <div className="text-[11px] text-slate-500">{summary(s)}</div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" className="btn !py-1" onClick={() => loadSky(s.id)}>Load</button>
                  <button type="button" className="btn !py-1" onClick={() => { loadSky(s.id); onFind() }}>Load and find when</button>
                  <button type="button" className="btn !py-1 hover:!text-rose-300" onClick={() => { if (window.confirm(`Delete "${s.name}"?`)) deleteSky(s.id) }}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}