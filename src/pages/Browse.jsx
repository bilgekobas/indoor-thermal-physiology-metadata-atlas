import { useState, useMemo } from 'react'
import PageHeader from '../components/PageHeader.jsx'

function uniqueSorted(arr) {
  return [...new Set(arr.filter(Boolean))].sort()
}

export default function Browse({ data }) {
  const { studies } = data
  const [query, setQuery] = useState('')
  const [expType, setExpType] = useState('')
  const [country, setCountry] = useState('')
  const [yearMin, setYearMin] = useState('')
  const [yearMax, setYearMax] = useState('')

  const expTypes = useMemo(() => uniqueSorted(studies.map((s) => s['exp-type'])), [studies])
  const countries = useMemo(() => uniqueSorted(studies.map((s) => s['id-country'])), [studies])

  const filtered = useMemo(() => {
    return studies.filter((s) => {
      if (expType && s['exp-type'] !== expType) return false
      if (country && s['id-country'] !== country) return false
      if (yearMin && s['pub-year'] < Number(yearMin)) return false
      if (yearMax && s['pub-year'] > Number(yearMax)) return false
      if (query) {
        const q = query.toLowerCase()
        const hay = `${s['id-title']} ${s['id-authors']} ${s['pub-name']}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [studies, query, expType, country, yearMin, yearMax])

  return (
    <div>
      <PageHeader
        eyebrow="Explore"
        title="Browse studies"
        description="Filter the corpus by experiment type, country, or publication year. Each row is one publication-experiment unit."
      />

      <div className="px-10 py-5 border-b border-line flex flex-wrap gap-3 items-center bg-white/30">
        <input
          type="text"
          placeholder="Search title, author, journal…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="px-3 py-1.5 rounded border border-line text-[13px] w-64 bg-white"
        />
        <select
          value={expType}
          onChange={(e) => setExpType(e.target.value)}
          className="px-3 py-1.5 rounded border border-line text-[13px] bg-white"
        >
          <option value="">All experiment types</option>
          {expTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="px-3 py-1.5 rounded border border-line text-[13px] bg-white"
        >
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            placeholder="From"
            value={yearMin}
            onChange={(e) => setYearMin(e.target.value)}
            className="px-2 py-1.5 rounded border border-line text-[13px] w-20 bg-white font-data"
          />
          <span className="text-inkfaint text-[12px]">–</span>
          <input
            type="number"
            placeholder="To"
            value={yearMax}
            onChange={(e) => setYearMax(e.target.value)}
            className="px-2 py-1.5 rounded border border-line text-[13px] w-20 bg-white font-data"
          />
        </div>
        <span className="font-data text-[12px] text-inkfaint ml-auto">
          {filtered.length} of {studies.length} experiments
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-inkfaint font-data text-[11px] uppercase tracking-wide">
              <th className="px-4 py-2.5 font-medium">ID</th>
              <th className="px-4 py-2.5 font-medium">Title</th>
              <th className="px-4 py-2.5 font-medium">Year</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Country</th>
              <th className="px-4 py-2.5 font-medium">n</th>
              <th className="px-4 py-2.5 font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map((s) => (
              <tr key={s.id} className="border-b border-line/60 hover:bg-white/60 transition-colors">
                <td className="px-4 py-2.5 font-data text-inkfaint">{s.id}</td>
                <td className="px-4 py-2.5 max-w-md">
                  <div className="line-clamp-1">{s['id-title']}</div>
                  <div className="text-[11.5px] text-inkfaint line-clamp-1">{s['pub-name']}</div>
                </td>
                <td className="px-4 py-2.5 font-data">{s['pub-year']}</td>
                <td className="px-4 py-2.5">{s['exp-type']}</td>
                <td className="px-4 py-2.5">{s['id-country']}</td>
                <td className="px-4 py-2.5 font-data">{s['pop-no-tot']}</td>
                <td className="px-4 py-2.5 text-[11.5px] text-inkmid">{s['data-avail']}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 200 && (
          <div className="px-4 py-3 font-data text-[11.5px] text-inkfaint">
            Showing first 200 of {filtered.length} matches — refine filters to narrow further.
          </div>
        )}
      </div>
    </div>
  )
}
