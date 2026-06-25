import { useState, useMemo } from 'react'
import PageHeader from '../components/PageHeader.jsx'

function uniqueSorted(arr) {
  return [...new Set(arr.filter(Boolean))].sort()
}

// Searchable brand+model reference table — the deliberate alternative to
// cramming 241 distinct model names into a third Sankey column. Built for
// a specific use case: checking which physical devices were used to
// measure a given signal, for an agreeability/validation-tier review,
// where the answer needs to be a scannable list with study IDs to follow
// up on, not a diagram.
export default function Devices({ data }) {
  const { brand_model_reference } = data
  const rows = brand_model_reference.data
  const [query, setQuery] = useState('')
  const [signal, setSignal] = useState('')
  const [sortDesc, setSortDesc] = useState(true)

  const signals = useMemo(() => uniqueSorted(rows.map((r) => r.signal)), [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (signal && r.signal !== signal) return false
      if (query) {
        const q = query.toLowerCase()
        const hay = `${r.signal} ${r.sensing_method} ${r.brand} ${r.model}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rows, query, signal])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => (sortDesc ? b.count - a.count : a.count - b.count))
    return arr
  }, [filtered, sortDesc])

  return (
    <div>
      <PageHeader
        eyebrow="Explore"
        title="Sensor brands & models"
        description={`${brand_model_reference.n_models} distinct device models across the corpus — too many for a readable Sankey column, so this is a searchable reference instead. Filter by signal to compare which specific devices (and which underlying measurement mechanism) were used to capture it — useful for checking agreeability across studies that report the same signal from different hardware.`}
      />

      <div className="px-10 py-5 border-b border-line flex flex-wrap gap-3 items-center bg-white/30">
        <input
          type="text"
          placeholder="Search signal, method, brand, or model…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="px-3 py-1.5 rounded border border-line text-[13px] w-72 bg-white"
        />
        <select
          value={signal}
          onChange={(e) => setSignal(e.target.value)}
          className="px-3 py-1.5 rounded border border-line text-[13px] bg-white"
        >
          <option value="">All signals</option>
          {signals.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={() => setSortDesc((d) => !d)}
          className="px-3 py-1.5 rounded border border-line text-[13px] bg-white hover:bg-line/40 transition-colors font-data"
        >
          Sort by count {sortDesc ? '↓' : '↑'}
        </button>
        <span className="font-data text-[12px] text-inkfaint ml-auto">
          {filtered.length} of {rows.length} device entries
        </span>
      </div>

      <div className="no-horizontal-scroll">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-inkfaint font-data text-[11px] uppercase tracking-wide">
              <th className="px-4 py-2.5 font-medium">Signal</th>
              <th className="px-4 py-2.5 font-medium">Sensing method</th>
              <th className="px-4 py-2.5 font-medium">Brand</th>
              <th className="px-4 py-2.5 font-medium">Model</th>
              <th className="px-4 py-2.5 font-medium">Studies</th>
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 300).map((r, i) => (
              <tr key={`${r.signal}-${r.brand}-${r.model}-${i}`} className="border-b border-line/60 hover:bg-white/60 transition-colors">
                <td className="px-4 py-2.5">{r.signal}</td>
                <td className="px-4 py-2.5 text-inkmid">{r.sensing_method}</td>
                <td className="px-4 py-2.5 font-medium">{r.brand}</td>
                <td className="px-4 py-2.5 font-data text-[12.5px]">{r.model}</td>
                <td className="px-4 py-2.5">
                  <span className="font-data text-[12px] text-inkmid" title={r.study_ids.join(', ')}>
                    {r.count} ({r.study_ids.slice(0, 4).join(', ')}{r.study_ids.length > 4 ? '…' : ''})
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length > 300 && (
          <div className="px-4 py-3 font-data text-[11.5px] text-inkfaint">
            Showing first 300 of {sorted.length} matches — refine filters to narrow further.
          </div>
        )}
      </div>
    </div>
  )
}
