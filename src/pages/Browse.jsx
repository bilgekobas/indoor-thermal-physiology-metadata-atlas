import { useState, useMemo } from 'react'
import PageHeader from '../components/PageHeader.jsx'

function uniqueSorted(arr) {
  return [...new Set(arr.filter(Boolean))].sort()
}

const COLUMNS = [
  { key: 'id', label: 'ID', numeric: false },
  { key: 'id-title', label: 'Title', numeric: false },
  { key: 'pub-year', label: 'Year', numeric: true },
  { key: 'pub-doi', label: 'DOI', numeric: false },
  { key: 'signals_measured', label: 'Signals', numeric: false },
  { key: 'exp-type', label: 'Type', numeric: false },
  { key: 'id-country', label: 'Country', numeric: false },
  { key: 'pop-no-tot', label: 'n', numeric: true },
  { key: 'data-avail', label: 'Data', numeric: false },
]

function SortIcon({ direction }) {
  if (!direction) return <span className="text-inkfaint/40 ml-1">↕</span>
  return <span className="text-coreaccent ml-1">{direction === 'asc' ? '↑' : '↓'}</span>
}

function doiUrl(value) {
  if (!value) return ''
  const v = String(value).trim()
  if (v.startsWith('http')) return v
  if (v.toLowerCase().startsWith('doi:')) return `https://doi.org/${v.slice(4).trim()}`
  if (v.includes('/')) return `https://doi.org/${v}`
  return v
}

export default function Browse({ data }) {
  const { studies } = data
  const [query, setQuery] = useState('')
  const [expType, setExpType] = useState('')
  const [country, setCountry] = useState('')
  const [signal, setSignal] = useState('')
  const [yearMin, setYearMin] = useState('')
  const [yearMax, setYearMax] = useState('')
  const [sortKey, setSortKey] = useState('id-pub-id')
  const [sortDir, setSortDir] = useState('asc')

  const expTypes = useMemo(() => uniqueSorted(studies.map((s) => s['exp-type'])), [studies])
  const countries = useMemo(() => uniqueSorted(studies.map((s) => s['id-country'])), [studies])
  const signals = useMemo(() => uniqueSorted(studies.flatMap((s) => String(s.signals_measured || '').split(',').map((x) => x.trim()).filter(Boolean))), [studies])

  const filtered = useMemo(() => {
    return studies.filter((s) => {
      if (expType && s['exp-type'] !== expType) return false
      if (country && s['id-country'] !== country) return false
      if (signal) {
        const sigs = String(s.signals_measured || '').split(',').map((x) => x.trim())
        if (!sigs.includes(signal)) return false
      }
      if (yearMin && s['pub-year'] < Number(yearMin)) return false
      if (yearMax && s['pub-year'] > Number(yearMax)) return false
      if (query) {
        const q = query.toLowerCase()
        const hay = `${s['id-title']} ${s['id-authors']} ${s['pub-name']} ${s['pub-doi']} ${s.signals_measured}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [studies, query, expType, country, signal, yearMin, yearMax])

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortKey)
    const arr = [...filtered]
    arr.sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey]
      if (col?.numeric) {
        av = av == null || av === '' ? -Infinity : Number(av)
        bv = bv == null || bv === '' ? -Infinity : Number(bv)
      } else {
        av = (av ?? '').toString().toLowerCase()
        bv = (bv ?? '').toString().toLowerCase()
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [filtered, sortKey, sortDir])

  function handleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Explore"
        title="Browse studies"
        description="Filter the corpus by experiment type, country, signal, or publication year. Each row is one publication-experiment unit."
      />

      <div className="px-10 py-5 border-b border-line flex flex-wrap gap-3 items-center bg-white/30">
        <input type="text" placeholder="Search title, author, journal, DOI, signal…" value={query} onChange={(e) => setQuery(e.target.value)} className="px-3 py-1.5 rounded border border-line text-[13px] w-80 bg-white" />
        <select value={expType} onChange={(e) => setExpType(e.target.value)} className="px-3 py-1.5 rounded border border-line text-[13px] bg-white"><option value="">All experiment types</option>{expTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        <select value={country} onChange={(e) => setCountry(e.target.value)} className="px-3 py-1.5 rounded border border-line text-[13px] bg-white"><option value="">All countries</option>{countries.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        <select value={signal} onChange={(e) => setSignal(e.target.value)} className="px-3 py-1.5 rounded border border-line text-[13px] bg-white"><option value="">All signals</option>{signals.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <div className="flex items-center gap-1.5">
          <input type="number" placeholder="From" value={yearMin} onChange={(e) => setYearMin(e.target.value)} className="px-2 py-1.5 rounded border border-line text-[13px] w-20 bg-white font-data" />
          <span className="text-inkfaint text-[12px]">–</span>
          <input type="number" placeholder="To" value={yearMax} onChange={(e) => setYearMax(e.target.value)} className="px-2 py-1.5 rounded border border-line text-[13px] w-20 bg-white font-data" />
        </div>
        <span className="font-data text-[12px] text-inkfaint ml-auto">{filtered.length} of {studies.length} experiments</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-inkfaint font-data text-[11px] uppercase tracking-wide">
              {COLUMNS.map((col) => (
                <th key={col.key} className="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-ink transition-colors" onClick={() => handleSort(col.key)} title={`Sort by ${col.label}`}>
                  {col.label}<SortIcon direction={sortKey === col.key ? sortDir : null} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 200).map((s) => (
              <tr key={s.id} className="border-b border-line/60 hover:bg-white/60 transition-colors align-top">
                <td className="px-4 py-2.5 font-data text-inkfaint whitespace-nowrap">{s.id}</td>
                <td className="px-4 py-2.5 min-w-[300px] max-w-md"><div className="line-clamp-2">{s['id-title']}</div><div className="text-[11.5px] text-inkfaint line-clamp-1">{s['pub-name']}</div></td>
                <td className="px-4 py-2.5 font-data">{s['pub-year']}</td>
                <td className="px-4 py-2.5 max-w-[160px] truncate font-data text-[11px]">{doiUrl(s['pub-doi']) ? <a href={doiUrl(s['pub-doi'])} target="_blank" rel="noopener noreferrer" className="text-coreaccent hover:underline">DOI</a> : <span className="text-inkfaint">—</span>}</td>
                <td className="px-4 py-2.5 max-w-[280px] text-[11.5px] text-inkmid">{s.signals_measured || '—'}</td>
                <td className="px-4 py-2.5">{s['exp-type']}</td>
                <td className="px-4 py-2.5">{s['id-country']}</td>
                <td className="px-4 py-2.5 font-data">{s['pop-no-tot']}</td>
                <td className="px-4 py-2.5 text-[11.5px] text-inkmid">{s['data-avail']}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length > 200 && <div className="px-4 py-3 font-data text-[11.5px] text-inkfaint">Showing first 200 of {sorted.length} matches — refine filters to narrow further.</div>}
      </div>
    </div>
  )
}
