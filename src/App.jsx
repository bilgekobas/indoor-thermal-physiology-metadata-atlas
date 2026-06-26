import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { useCorpusData } from './useCorpusData.js'

import Overview from './pages/Overview.jsx'
import Browse from './pages/Browse.jsx'
import ChapterContext from './pages/ChapterContext.jsx'
import ChapterPopulation from './pages/ChapterPopulation.jsx'
import ChapterBody from './pages/ChapterBody.jsx'
import ChapterEnvironment from './pages/ChapterEnvironment.jsx'
import ChapterQuestionnaires from './pages/ChapterQuestionnaires.jsx'
import ChapterCognitive from './pages/ChapterCognitive.jsx'
import ChapterReporting from './pages/ChapterReporting.jsx'
import About from './pages/About.jsx'
import Methodology from './pages/Methodology.jsx'

// React Router doesn't scroll to a #hash on navigation by itself, and the
// chapter content this hash points into loads asynchronously (the bundle
// fetch in useCorpusData), so the target section's DOM node may not exist
// yet at the instant this effect first runs. Retries briefly rather than
// giving up after one failed lookup, since "the data hasn't arrived yet"
// is the common case on a fresh page load via a sidebar subtitle link.
function ScrollToHash() {
  const location = useLocation()
  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: 'auto' })
      return
    }
    const id = location.hash.slice(1)
    let attempts = 0
    const tryScroll = () => {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (attempts < 20) {
        attempts += 1
        setTimeout(tryScroll, 100)
      }
    }
    tryScroll()
  }, [location.pathname, location.hash])
  return null
}

function RoutedPages({ data }) {
  const location = useLocation()
  return (
    <ErrorBoundary key={location.pathname}>
      <Routes>
        <Route path="/" element={<Overview data={data} />} />
        <Route path="/browse" element={<Browse data={data} />} />
        <Route path="/context" element={<ChapterContext data={data} />} />
        <Route path="/population" element={<ChapterPopulation data={data} />} />
        <Route path="/body" element={<ChapterBody data={data} />} />
        <Route path="/environment" element={<ChapterEnvironment data={data} />} />
        <Route path="/questionnaires" element={<ChapterQuestionnaires data={data} />} />
        <Route path="/cognitive" element={<ChapterCognitive data={data} />} />
        <Route path="/reporting" element={<ChapterReporting data={data} />} />
        <Route path="/about" element={<About data={data} />} />
        <Route path="/methodology" element={<Methodology data={data} />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default function App() {
  const { data, error, loading } = useCorpusData()

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      <ScrollToHash />
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
        {data && <RoutedPages data={data} />}
        {data && (
          <footer className="px-10 pt-8 pb-16 border-t border-line text-[11px] font-data text-inkfaint leading-relaxed">
            Indoor Thermal Physiology Corpus · Living atlas · Counts update from the current corpus bundle.
          </footer>
        )}
      </main>
    </div>
  )
}
