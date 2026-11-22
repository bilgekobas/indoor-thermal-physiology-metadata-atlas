import { lazy, Suspense } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import DataStory from './pages/DataStory.jsx'

const Atlas = lazy(() => import('./Atlas.jsx'))
const overviewAnchors = new Set([
  '#what-the-atlas-records', '#why-we-built-it', '#what-we-found',
  '#team', '#citing-and-reusing-this-work',
])

export default function App() {
  const location = useLocation()
  if (location.pathname === '/') {
    if (overviewAnchors.has(location.hash)) {
      return <Navigate replace to={{ pathname: '/overview', search: location.search, hash: location.hash }} />
    }
    return <DataStory />
  }
  return (
    <Suspense fallback={<p className="p-10 font-data text-sm text-inkmid">Loading the Atlas…</p>}>
      <Atlas />
    </Suspense>
  )
}
