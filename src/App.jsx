import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import { useCorpusData } from './useCorpusData.js'

import Overview from './pages/Overview.jsx'
import Browse from './pages/Browse.jsx'
import Devices from './pages/Devices.jsx'
import ChapterContext from './pages/ChapterContext.jsx'
import ChapterPopulation from './pages/ChapterPopulation.jsx'
import ChapterBody from './pages/ChapterBody.jsx'
import ChapterEnvironment from './pages/ChapterEnvironment.jsx'
import ChapterQuestionnaires from './pages/ChapterQuestionnaires.jsx'
import ChapterCognitive from './pages/ChapterCognitive.jsx'
import ChapterProtocol from './pages/ChapterProtocol.jsx'
import ChapterReporting from './pages/ChapterReporting.jsx'
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
            <Route path="/devices" element={<Devices data={data} />} />
            <Route path="/context" element={<ChapterContext data={data} />} />
            <Route path="/population" element={<ChapterPopulation data={data} />} />
            <Route path="/body" element={<ChapterBody data={data} />} />
            <Route path="/environment" element={<ChapterEnvironment data={data} />} />
            <Route path="/questionnaires" element={<ChapterQuestionnaires data={data} />} />
            <Route path="/cognitive" element={<ChapterCognitive data={data} />} />
            <Route path="/protocol" element={<ChapterProtocol data={data} />} />
            <Route path="/reporting" element={<ChapterReporting data={data} />} />
            <Route path="/about" element={<About data={data} />} />
          </Routes>
        )}
      </main>
    </div>
  )
}
