import { useEffect, useMemo, useState } from 'react'
import { placeLabel } from '../lib/chart'
import { Place, detectZone, searchOffline, searchPlaces } from '../lib/geocode'
import { allZones, fmtOffset, fmtUtc, isValidZone, resolveOffset } from '../lib/tz'
import { useChart, useChartLite } from '../store/useChart'
import { SaveActions } from './SaveActions'
import { TimeField } from './TimeField'

const fmt12 = (tob: string) => { const [h, m] = tob.split(':').map(Number); return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}` }
const fmtLat = (v: number) => `${Math.abs(v).toFixed(4)}°${v >= 0 ? 'N' : 'S'}`
const fmtLon = (v: number) => `${Math.abs(v).toFixed(4)}°${v >= 0 ? 'E' : 'W'}`

/** type-ahead city search. Online (GeoNames via Open-Meteo); falls back to the built-in cities if offline. */
function PlaceSearch({ value, onPick }: { value: string; onPick: (p: Place) => void }) {
  const [text, setText] = useState(value)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Place[]>([])
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState('')
  const [hi, setHi] = useState(0)

  useEffect(() => { setText(value) }, [value])

  useEffect(() => {
    const q = text.trim()
    if (!open || q.length < 2 || q === value) { setItems([]); setNote(''); setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const r = await searchPlaces(q, ac.signal)
        if (ac.signal.aborted) return
        setItems(r); setHi(0)
        setNote(r.length ? '' : 'No places found. Check the spelling, or switch to Custom lat/long.')
      } catch {
        if (ac.signal.aborted) return
        const off = searchOffline(q)
        setItems(off); setHi(0)
        setNote(off.length ? 'Could not reach the online search. Showing the built-in cities only.' : 'Could not reach the online search (check your internet). Use Custom lat/long instead.')
      }
      setLoading(false)
    }, 300)
    return () => { clearTimeout(t); ac.abort() }
  }, [text, open, value])

  const pick = (p: Place) => { onPick(p); setText(p.label); setOpen(false) }
  const showList = open && text.trim().length >= 2 && text.trim() !== value

  return (
    <div className="relative">
      <input
        className="input" value={text} placeholder="Type a city, town or village…" autoComplete="off" spellCheck={false}
        role="combobox" aria-expanded={showList} aria-autocomplete="list"
        onFocus={(e) => { e.target.select(); setOpen(true) }}
        onBlur={() => { setOpen(false); setText(value) }}                       // what is shown is always what is used
        onChange={(e) => { setText(e.target.value); setOpen(true) }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(items.length - 1, h + 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)) }
          else if (e.key === 'Enter' && showList && items[hi]) { e.preventDefault(); pick(items[hi]) }
          else if (e.key === 'Escape') { setOpen(false); setText(value); (e.target as HTMLInputElement).blur() }
        }}
      />
      {showList && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-lg border border-white/15 bg-[#131a29] shadow-2xl slim-scroll" role="listbox">
          {loading && items.length === 0 && <div className="px-3 py-2 text-xs text-mute">Searching…</div>}
          {items.map((p, i) => (
            <button
              key={p.id} type="button" role="option" aria-selected={i === hi}
              onMouseDown={(e) => { e.preventDefault(); pick(p) }} onMouseEnter={() => setHi(i)}
              className={`block w-full px-3 py-2 text-left transition ${i === hi ? 'bg-white/10' : ''}`}
            >
              <div className="text-sm text-white">{p.label}</div>
              <div className="font-mono text-[10.5px] text-mute">
                {fmtLat(p.lat)}, {fmtLon(p.lon)}{p.tzName ? ` · ${p.tzName}` : ''}{p.hint ? ` · ${p.hint}` : ''}
              </div>
            </button>
          ))}
          {note && <div className="border-t border-white/10 px-3 py-2 text-[11px] text-amber-300">{note}</div>}
          <div className="border-t border-white/5 px-3 py-1 text-[10px] text-slate-500">Place data: GeoNames via Open-Meteo</div>
        </div>
      )}
    </div>
  )
}

/** decimal-degree box that keeps what you type and only passes on values that are really valid */
function CoordField({ label, hint, value, min, max, onValid, onInvalid }: {
  label: string; hint: string; value: number; min: number; max: number; onValid: (n: number) => void; onInvalid: (bad: boolean) => void
}) {
  const [text, setText] = useState(String(value))
  const parse = (t: string) => { const n = Number(t.trim().replace(',', '.')); return t.trim() !== '' && Number.isFinite(n) && n >= min && n <= max ? n : null }
  const bad = parse(text) === null
  useEffect(() => { const n = parse(text); if (n !== value) setText(String(value)) }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => onInvalid(false), []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className={`input font-mono ${bad ? '!border-rose-400/70' : ''}`} inputMode="decimal" value={text}
        onChange={(e) => { const t = e.target.value; setText(t); const n = parse(t); onInvalid(n === null); if (n !== null) onValid(n) }}
      />
      <div className={`mt-0.5 text-[10px] ${bad ? 'text-rose-400' : 'text-slate-500'}`}>{bad ? `Enter a number from ${min} to ${max}` : hint}</div>
    </div>
  )
}

export function BirthForm({ onGenerate }: { onGenerate: () => void }) {
  const { draft, setDraft, frame, setFrame, generated, committed } = useChartLite()
  const [editing, setEditing] = useState(false)
  const [badCoord, setBadCoord] = useState<Record<string, boolean>>({})
  const [detecting, setDetecting] = useState(false)
  const [detectMsg, setDetectMsg] = useState('')
  const expanded = !generated || editing
  const b = committed ?? draft
  const custom = draft.cityKey === 'custom'

  // ---- time zone: the offset is worked out from the zone AND the birth date/time, never a fixed number per city ----
  const zoneKnown = !!draft.tzName && isValidZone(draft.tzName)
  const resolved = useMemo(() => (zoneKnown ? resolveOffset(draft.tzName!, draft.dob, draft.tob) : null), [zoneKnown, draft.tzName, draft.dob, draft.tob])
  useEffect(() => { if (resolved && resolved.hours !== draft.tz) setDraft({ tz: resolved.hours }) }, [resolved, draft.tz]) // eslint-disable-line react-hooks/exhaustive-deps
  const manualTz = !draft.tzName
  const manualBad = manualTz && !(Number.isFinite(draft.tz) && draft.tz >= -12 && draft.tz <= 14)
  const zones = useMemo(() => allZones(draft.tzName), [draft.tzName])

  const problem =
    Object.values(badCoord).some(Boolean) ? 'Fix the latitude / longitude first.'
    : !custom && !draft.place ? 'Pick a place from the search list (or use Custom lat/long).'
    : draft.tzName && !zoneKnown ? `This browser does not know the time zone “${draft.tzName}”. Choose one from the list or enter the offset manually.`
    : manualBad ? 'Choose the time zone from the list, or enter a UTC offset between -12 and +14 hours.'
    : ''

  // no zone from the service -> blank the offset too, so a previous place's offset can never be used by accident
  const pickPlace = (p: Place) => { setDetectMsg(''); setDraft({ place: p.label, lat: p.lat, lon: p.lon, cityKey: 'search', tzName: p.tzName || undefined, ...(p.tzName ? {} : { tz: NaN }) }) }
  const setMode = (m: 'search' | 'custom') => {
    setDetectMsg('')
    if (m === 'custom') setDraft({ cityKey: 'custom' })
    else setDraft({ cityKey: 'search', place: undefined })   // back to search: a place has to be picked again, so the label always matches the coordinates
  }
  const coord = (k: 'lat' | 'lon') => (n: number) => setDraft({ ...(k === 'lat' ? { lat: n } : { lon: n }), place: undefined, cityKey: 'custom' })
  const onBad = (k: string) => (bad: boolean) => setBadCoord((x) => (x[k] === bad ? x : { ...x, [k]: bad }))

  const detect = async () => {
    setDetecting(true); setDetectMsg('')
    try {
      const z = await detectZone(draft.lat, draft.lon)
      if (!z) setDetectMsg('The service did not return a time zone for these coordinates. Pick one from the list.')
      else if (!isValidZone(z)) { setDraft({ tzName: z }); setDetectMsg(`Service says “${z}”, which this browser does not know. Pick a zone from the list.`) }
      else { setDraft({ tzName: z }); setDetectMsg(`Detected ${z} from the coordinates.`) }
    } catch { setDetectMsg('Could not reach the time-zone service (check your internet). Pick the zone from the list instead.') }
    setDetecting(false)
  }

  const FrameToggle = (
    <div className="flex flex-col items-end gap-1">
      <div className="seg">
        <button data-on={frame === 'sidereal'} onClick={() => setFrame('sidereal')}>Sidereal · Lahiri</button>
        <button data-on={frame === 'tropical'} onClick={() => setFrame('tropical')}>Tropical · Western</button>
      </div>
      <span className="text-[11px] text-mute">{frame === 'sidereal' ? 'Used in Nepal, India & most of Asia (Vedic)' : 'Used in Western astrology'}</span>
    </div>
  )

  if (!expanded) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 py-1">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-mute">Step 1</div>
          <div className="truncate text-sm text-white">
            <span className="font-semibold">{b.name.trim() || 'Untitled'}</span>
            <span className="ml-3 font-mono text-xs text-slate-300">{b.dob} · {fmt12(b.tob)}</span>
            <span className="mt-1 block break-words text-xs text-mute sm:ml-3 sm:mt-0 sm:inline">{placeLabel(b)} · {b.lat.toFixed(3)}, {b.lon.toFixed(3)} · {fmtUtc(b.tz)}{b.tzName ? ` (${b.tzName})` : ''}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {FrameToggle}
          <button className="btn" onClick={() => setEditing(true)}>Edit details</button>
          <SaveActions canSave />
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-mute">Step 1</div>
          <h2 className="text-sm font-semibold text-white">Birth moment & place</h2>
          {!generated && <p className="mt-0.5 text-[12px] text-amber-200/80">Enter the birth details below, then press <b className="text-amber-200">Generate chart</b>.</p>}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {FrameToggle}
          <SaveActions canSave={generated} />
        </div>
      </div>

      <form
        className={`space-y-3 ${generated ? '' : 'form-first'}`}
        onSubmit={(e) => {
          e.preventDefault()
          if (problem) return
          if (resolved) setDraft({ tz: resolved.hours })           // never generate with a stale offset
          setEditing(false); onGenerate()
        }}
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto]">
          <div className="col-span-2 md:col-span-1"><label className="label">Name (optional)</label><input className="input" value={draft.name} onChange={(e) => setDraft({ name: e.target.value })} placeholder="e.g. Aarav" /></div>
          <div><label className="label">Date of birth</label><input className="input font-mono" type="date" value={draft.dob} onChange={(e) => e.target.value && setDraft({ dob: e.target.value })} /></div>
          <div><label className="label">Exact time (local clock)</label><TimeField value={draft.tob} onChange={(tob) => setDraft({ tob })} /></div>
          <div className="col-span-2 flex items-end md:col-span-1"><button type="submit" disabled={!!problem} className={`btn-primary w-full whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40 md:w-auto ${problem ? '' : 'btn-glow'}`}>{generated ? 'Update chart' : 'Generate chart'}</button></div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-white">Birth place</div>
            <div className="seg" role="tablist">
              <button type="button" data-on={!custom} onClick={() => setMode('search')}>Search city</button>
              <button type="button" data-on={custom} onClick={() => setMode('custom')}>Custom lat / long</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-12">
            {custom ? (
              <>
                <div className="col-span-1 md:col-span-3"><CoordField label="Latitude °" hint="+ North / − South" value={draft.lat} min={-90} max={90} onValid={coord('lat')} onInvalid={onBad('lat')} /></div>
                <div className="col-span-1 md:col-span-3"><CoordField label="Longitude °" hint="+ East / − West" value={draft.lon} min={-180} max={180} onValid={coord('lon')} onInvalid={onBad('lon')} /></div>
              </>
            ) : (
              <div className="col-span-2 md:col-span-6">
                <label className="label">City / town (start typing)</label>
                <PlaceSearch value={draft.place ?? ''} onPick={pickPlace} />
                <div className="mt-0.5 font-mono text-[10px] text-slate-500">
                  {draft.place ? <>{fmtLat(draft.lat)}, {fmtLon(draft.lon)} · need exact coordinates? <button type="button" className="text-sky-300 underline-offset-2 hover:underline" onClick={() => setMode('custom')}>use Custom lat / long</button></> : 'Suggestions appear as you type; click one.'}
                </div>
              </div>
            )}

            <div className="col-span-2 md:col-span-4">
              <label className="label">Time zone</label>
              <select className="input" value={zoneKnown ? draft.tzName : draft.tzName ? '' : '__manual'}
                onChange={(e) => { setDetectMsg(''); setDraft({ tzName: e.target.value === '__manual' ? undefined : e.target.value }) }}>
                {draft.tzName && !zoneKnown && <option value="" disabled>Choose a time zone…</option>}
                <option value="__manual">Manual UTC offset…</option>
                {zones.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>

            <div className="col-span-2 md:col-span-2">
              {manualTz ? (
                <>
                  <label className="label">UTC offset (hours)</label>
                  <input className={`input font-mono ${manualBad ? '!border-rose-400/70' : ''}`} type="number" step="0.25" min={-12} max={14} value={Number.isFinite(draft.tz) ? draft.tz : ''}
                    onChange={(e) => setDraft({ tz: e.target.value === '' ? NaN : Number(e.target.value) })} />
                  <div className="mt-0.5 text-[10px] text-slate-500">{Number.isFinite(draft.tz) ? `= UTC${fmtOffset(draft.tz)}` : ''}</div>
                </>
              ) : custom ? (
                <>
                  <label className="label">&nbsp;</label>
                  <button type="button" className="btn w-full !py-2" disabled={detecting || Object.values(badCoord).some(Boolean)} onClick={detect}
                    title="Looks the time zone up from the coordinates (needs internet)">{detecting ? 'Detecting…' : 'Detect zone'}</button>
                </>
              ) : null}
            </div>
          </div>

          {custom && manualTz && (
            <div className="mt-2"><button type="button" className="btn !py-1" disabled={detecting || Object.values(badCoord).some(Boolean)} onClick={detect}>{detecting ? 'Detecting…' : 'Detect time zone from these coordinates'}</button></div>
          )}
          {detectMsg && <div className="mt-2 text-[11px] text-sky-300">{detectMsg}</div>}

          {/* the offset that will really be used, and why */}
          <div className="mt-2 rounded-lg bg-white/[0.03] px-3 py-2 text-[11.5px] leading-relaxed text-slate-300">
            {resolved ? (
              <>
                <span className="font-mono text-white">{fmtUtc(resolved.hours)}</span> was in force in <span className="font-mono">{draft.tzName}</span> on {draft.dob} at {draft.tob.slice(0, 5)}.
                {' '}<span className="text-slate-500">Worked out from the time-zone database in your browser, including daylight saving and past law changes.</span>
                {resolved.status === 'gap' && (
                  <div className="mt-1 text-amber-300">{draft.tob.slice(0, 5)} never existed on that date here (clocks jumped forward). Using {fmtUtc(resolved.hours)}, the offset just before the jump. Check the birth time. After the jump it would be {fmtUtc(resolved.alt!)}.</div>
                )}
                {resolved.status === 'ambiguous' && (
                  <div className="mt-1 text-amber-300">{draft.tob.slice(0, 5)} happened twice that day (clocks went back). Using the first one, {fmtUtc(resolved.hours)}. If the birth was in the second hour, it is {fmtUtc(resolved.alt!)}: choose “Manual UTC offset” and enter {fmtOffset(resolved.alt!)}.</div>
                )}
              </>
            ) : manualTz ? (
              <>Using the fixed offset <span className="font-mono text-white">{Number.isFinite(draft.tz) ? fmtUtc(draft.tz) : '—'}</span> exactly as entered. Pick a time zone from the list instead if you want daylight saving and historical changes handled for you.</>
            ) : (
              <span className="text-amber-300">Time zone not recognised by this browser. Choose one from the list.</span>
            )}
          </div>
          {problem && <div className="mt-2 text-[11px] text-rose-400">{problem}</div>}
        </div>
      </form>
    </section>
  )
}