import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

function displayValue(value) {
  const v = String(value ?? '').trim()
  return v && v !== '-' ? v : '—'
}

export default function VariableDictionary({ data }) {
  const fields = data.variable_dictionary?.data || []
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [dataType, setDataType] = useState('')
  const [expanded, setExpanded] = useState(null)

  const categories = useMemo(
    () => uniqueSorted(fields.map((field) => field.category_pretty_names)),
    [fields],
  )
  const dataTypes = useMemo(
    () => uniqueSorted(fields.map((field) => field.data_type)),
    [fields],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return fields.filter((field) => {
      if (category && field.category_pretty_names !== category) return false
      if (dataType && field.data_type !== dataType) return false
      if (!q) return true
      const haystack = [
        field.col_name,
        field.col_pretty_name,
        field.category_pretty_names,
        field.data_type,
        field.unit,
        field.allowed_values,
        field.description,
      ].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [fields, query, category, dataType])

  return (
    <div>
      <PageHeader
        eyebrow="Reference"
        title="Variable dictionary"
        description="Browse the coded metadata fields, their human-readable labels, data types, permitted values, units, and extraction definitions."
      />

      <div className="px-10 py-5 border-b border-line flex flex-wrap gap-3 items-center bg-white/30">
        <input
          type="search"
          placeholder="Search variable, label, definition, or allowed value…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="px-3 py-1.5 rounded border border-line text-[13px] w-[420px] max-w-full bg-white"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="px-3 py-1.5 rounded border border-line text-[13px] bg-white"
        >
          <option value="">All categories</option>
          {categories.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select
          value={dataType}
          onChange={(event) => setDataType(event.target.value)}
          className="px-3 py-1.5 rounded border border-line text-[13px] bg-white"
        >
          <option value="">All data types</option>
          {dataTypes.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <span className="font-data text-[12px] text-inkfaint ml-auto">
          {filtered.length} of {fields.length} fields
        </span>
      </div>

      <div className="no-horizontal-scroll">
        <table className="w-full text-[13px] table-fixed">
          <thead>
            <tr className="border-b border-line text-left text-inkfaint font-data text-[11px] uppercase tracking-wide">
              <th className="px-4 py-2.5 font-medium w-[8%]">ID</th>
              <th className="px-4 py-2.5 font-medium w-[18%]">Variable</th>
              <th className="px-4 py-2.5 font-medium w-[20%]">Field name</th>
              <th className="px-4 py-2.5 font-medium w-[14%]">Category</th>
              <th className="px-4 py-2.5 font-medium w-[11%]">Type</th>
              <th className="px-4 py-2.5 font-medium w-[11%]">Unit</th>
              <th className="px-4 py-2.5 font-medium w-[18%]">Allowed values</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((field) => {
              const isExpanded = expanded === field.col_id
              return (
                <tr
                  key={field.col_id}
                  className="border-b border-line/60 hover:bg-white/60 transition-colors align-top cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : field.col_id)}
                >
                  <td className="px-4 py-3 font-data text-inkfaint">{field.col_id}</td>
                  <td className="px-4 py-3 font-data text-[11.5px] break-words text-coreaccent">{field.col_name}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{field.col_pretty_name}</div>
                    <div className={`${isExpanded ? '' : 'line-clamp-2'} text-[12px] leading-relaxed text-inkmid mt-1`}>
                      {field.description}
                    </div>
                    <button
                      type="button"
                      className="font-data text-[10.5px] text-inkfaint hover:text-coreaccent mt-1"
                      onClick={(event) => {
                        event.stopPropagation()
                        setExpanded(isExpanded ? null : field.col_id)
                      }}
                    >
                      {isExpanded ? 'Collapse definition ↑' : 'Expand definition ↓'}
                    </button>
                  </td>
                  <td className="px-4 py-3">{field.category_pretty_names}</td>
                  <td className="px-4 py-3 font-data text-[11.5px]">{field.data_type}</td>
                  <td className="px-4 py-3 font-data text-[11.5px]">{displayValue(field.unit)}</td>
                  <td className="px-4 py-3 text-[11.5px] text-inkmid break-words">{displayValue(field.allowed_values)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
