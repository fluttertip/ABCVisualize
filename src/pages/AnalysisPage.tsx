import { SkyBuilder } from '../components/SkyBuilder'
import { SkyFinder } from '../components/SkyFinder'

export function AnalysisPage() {
  const toBuilder = () => document.getElementById('builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return (
    <main className="mx-auto max-w-[1700px] px-4 pb-20 sm:px-6">
      <div className="mb-6 flex flex-wrap gap-2 text-[12px]">
        <button type="button" className="btn" onClick={toBuilder}>1 · Build any sky</button>
        <button type="button" className="btn" onClick={() => document.getElementById('finder')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>2 · Find when it happens</button>
      </div>
      <SkyBuilder />
      <SkyFinder onAnalyse={toBuilder} />
    </main>
  )
}