import { Navigate, Routes, Route, useLocation } from 'react-router-dom'
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
import ChapterCombinations from './pages/ChapterCombinations.jsx'
import Methodology from './pages/Methodology.jsx'
import VariableDictionary from './pages/VariableDictionary.jsx'

// Mount with the routed content so anchors also work on a slow first load.
function ScrollToHash() {
  const location = useLocation()
  useEffect(() => {
    const section = document.getElementById(location.hash.slice(1))
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname, location.hash])
  return null
}

function RoutedPages({ data }) {
  const location = useLocation()
  return (
    <ErrorBoundary key={location.pathname}>
      <Routes>
        <Route path="/overview" element={<Overview data={data} />} />
        <Route path="/methodology" element={<Methodology data={data} />} />
        <Route path="/dictionary" element={<VariableDictionary data={data} />} />
        <Route path="/browse" element={<Browse data={data} />} />
        <Route path="/context" element={<ChapterContext data={data} />} />
        <Route path="/population" element={<ChapterPopulation data={data} />} />
        <Route path="/body" element={<ChapterBody data={data} />} />
        <Route path="/environment" element={<ChapterEnvironment data={data} />} />
        <Route path="/questionnaires" element={<ChapterQuestionnaires data={data} />} />
        <Route path="/cognitive" element={<ChapterCognitive data={data} />} />
        <Route path="/combinations" element={<ChapterCombinations data={data} />} />
        <Route path="/reporting" element={<ChapterReporting data={data} />} />
        <Route path="/about" element={<Navigate replace to={{ pathname: '/overview', search: location.search, hash: location.hash }} />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default function Atlas() {
  const { data, error, loading } = useCorpusData()
  const updatedOn = import.meta.env.VITE_ATLAS_UPDATED_ON || data?.summary?.generated_at?.slice(0, 10)

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink md:flex-row">
      {data && <ScrollToHash />}
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
        <footer className="border-t border-line px-5 py-6 text-inkmid sm:px-10">
          <p className="max-w-4xl text-[13px] leading-relaxed">
            Kobas, B., Kramer, T., Pan, J., Ly, C., &amp; Favero, M. (2026).{' '}
            <cite>Indoor Thermal-Physiology Metadata Atlas</cite> (v1.0.0) [Software]. Zenodo.{' '}
            <a className="break-words underline underline-offset-2 hover:text-ink" href="https://doi.org/10.5281/zenodo.21516763">
              https://doi.org/10.5281/zenodo.21516763
            </a>
          </p>
          {updatedOn && (
            <p className="mt-2 font-data text-[11px] leading-relaxed">
              Last updated: <time dateTime={updatedOn}>{updatedOn.split('-').reverse().join('.')}</time>
            </p>
          )}
        </footer>
      </main>
    </div>
  )
}
