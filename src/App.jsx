import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import { useCorpusData } from './useCorpusData.js'

import Overview from './pages/Overview.jsx'
import Browse from './pages/Browse.jsx'
import StudyDesign from './pages/StudyDesign.jsx'
import Measurement from './pages/Measurement.jsx'
import Mst from './pages/Mst.jsx'
import Questionnaires from './pages/Questionnaires.jsx'
import Reporting from './pages/Reporting.jsx'
import About from './pages/About.jsx'

export default function App() {
  const { data, error, loading } = useCorpusData()

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      <Sidebar summary={data?.summary} />
      <main className="flex-1 min-w-0">
        {loading && (
          <div className="p-10 font-data text-sm text-inkmid">Loading corpus data…</div>
        )}
        {error && (
          <div className="p-10 font-data text-sm text-coreaccent">
            Could not load corpus data: {error}
          </div>
        )}
        {data && (
          <Routes>
            <Route path="/" element={<Overview data={data} />} />
            <Route path="/browse" element={<Browse data={data} />} />
            <Route path="/study-design" element={<StudyDesign data={data} />} />
            <Route path="/measurement" element={<Measurement data={data} />} />
            <Route path="/mst" element={<Mst data={data} />} />
            <Route path="/questionnaires" element={<Questionnaires data={data} />} />
            <Route path="/reporting" element={<Reporting data={data} />} />
            <Route path="/about" element={<About data={data} />} />
          </Routes>
        )}
      </main>
    </div>
  )
}
