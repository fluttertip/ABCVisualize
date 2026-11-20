import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useChart, useChartLite } from '../store/useChart'
import { birthMinute, computeChart } from './chart'

/** Before generate: live preview of the form. After: the committed birth + controls. */
export function useChartData() {
  // field-level reads: `morphT` changes every animation frame and must not re-render everything that needs the chart
  const { draft, committed, generated, frame } = useChartLite()
  const { minuteOfDay, dayOffset, yearOffset, hourOffset, minuteOffset } = useChart(useShallow((s) => { const c = s.controls; return { minuteOfDay: c.minuteOfDay, dayOffset: c.dayOffset, yearOffset: c.yearOffset, hourOffset: c.hourOffset, minuteOffset: c.minuteOffset } }))
  const birth = generated && committed ? committed : draft
  const chart = useMemo(
    () => computeChart(birth, generated ? { minuteOfDay, dayOffset, yearOffset, hourOffset, minuteOffset } : { minuteOfDay: birthMinute(birth), dayOffset: 0, yearOffset: 0, hourOffset: 0, minuteOffset: 0 }, frame),
    [birth, generated, minuteOfDay, dayOffset, yearOffset, hourOffset, minuteOffset, frame],
  )
  // the natal moment itself (dasha is always counted from birth, not from the scrubbed time)
  const birthChart = useMemo(() => computeChart(birth, { minuteOfDay: birthMinute(birth), dayOffset: 0, yearOffset: 0, hourOffset: 0, minuteOffset: 0 }, frame), [birth, frame])
  return { birth, chart, birthChart }
}