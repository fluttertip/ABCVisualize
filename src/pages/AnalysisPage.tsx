import { SavedSkies } from '../components/SavedSkies'
import { SkyBuilder } from '../components/SkyBuilder'
import { SkyClock } from '../components/SkyClock'
import { SkyFinder } from '../components/SkyFinder'

const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

export function AnalysisPage() {
  return (
    <main className="mx-auto max-w-[1700px] px-4 pb-20 sm:px-6">
      <div className="mb-6 flex flex-wrap gap-2 text-[12px]">
        <button type="button" className="btn" onClick={() => go('builder')}>1 · Build any sky</button>
        <button type="button" className="btn" onClick={() => go('finder')}>2 · Find when it happens</button>
        <button type="button" className="btn" onClick={() => go('clock')}>3 · Move through time</button>
      </div>
      <SavedSkies onFind={() => setTimeout(() => go('finder'), 50)} />
      <SkyBuilder />
      <SkyFinder />
      <SkyClock />
    </main>
  )
}