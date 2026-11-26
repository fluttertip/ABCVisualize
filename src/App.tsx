import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { ChartPage } from './pages/ChartPage'
import { AnalysisPage } from './pages/AnalysisPage'
import { LearnPage } from './pages/LearnPage'
import { SavedPage } from './pages/SavedPage'
import { useChart } from './store/useChart'

const Ico = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" className="hidden h-4 w-4 sm:block" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
)

export default function App() {
  const count = useChart((s) => s.saved.length)
  const tab = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] font-medium transition sm:px-3 ${isActive ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-[1700px] items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2 text-sm font-semibold tracking-tight text-white">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-accent text-[11px] font-bold text-[#0a0e16]">A</span>
          <span className="hidden truncate sm:inline">AstronomicalBirthChartVisualize</span>
        </Link>
        <nav className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.03] p-0.5" aria-label="Main">
          <NavLink to="/" end className={tab}><Ico d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0v18M3 12h18" />New chart</NavLink>
          <NavLink to="/saved" className={tab}>
            <Ico d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />Saved charts
            <span className={`grid min-w-[1.2rem] place-items-center rounded-full px-1.5 text-[11px] font-semibold leading-[18px] ${count ? 'bg-accent text-[#0a0e16]' : 'bg-white/10 text-slate-300'}`}>{count}</span>
          </NavLink>
          <NavLink to="/analysis" className={tab}><Ico d="M3 3v18h18M7 15l4-4 3 3 5-6" />Analysis</NavLink>
          <NavLink to="/learn" className={tab}><Ico d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14ZM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />Learn</NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<ChartPage />} />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/learn/:house" element={<LearnPage />} />
      </Routes>
    </div>
  )
}