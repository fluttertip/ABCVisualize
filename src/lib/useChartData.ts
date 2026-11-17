import { useMemo } from 'react'
import { useChart } from '../store/useChart'
import { birthMinute, computeChart } from './chart'

/** Before generate: live preview of the form. After: the committed birth + controls. */
export function useChartData() {
  const { draft, committed, generated, controls, frame } = useChart()
  const birth = generated && committed ? committed : draft
  const { minuteOfDay, dayOffset, yearOffset, hourOffset, minuteOffset } = controls
  const chart = useMemo(
    () => computeChart(birth, generated ? { minuteOfDay, dayOffset, yearOffset, hourOffset, minuteOffset } : { minuteOfDay: birthMinute(birth), dayOffset: 0, yearOffset: 0, hourOffset: 0, minuteOffset: 0 }, frame),
    [birth, generated, minuteOfDay, dayOffset, yearOffset, hourOffset, minuteOffset, frame],
  )
  // the natal moment itself (dasha is always counted from birth, not from the scrubbed time)
  const birthChart = useMemo(() => computeChart(birth, { minuteOfDay: birthMinute(birth), dayOffset: 0, yearOffset: 0, hourOffset: 0, minuteOffset: 0 }, frame), [birth, frame])
  return { birth, chart, birthChart }
}
