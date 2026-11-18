import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ToggleGroup } from './OverallByPeriod.jsx'
import { ExperimentList } from './CombinationViews.jsx'
import { buildComparison, comparisonCell, comparisonDimensions, SIGNAL_COMBINATIONS } from '../utils/comparisons.js'

function VariableMenu({ dimensions, value, other, label, onChange }) {
  const groups = [...new Set(dimensions.map(d => d.group))]
  return <label className="block min-w-0 text-[12px] text-inkmid font-medium">{label}
    <select aria-label={label} value={value} onChange={e => onChange(e.target.value)}
      className="mt-2 block min-w-0 w-full max-w-full border border-line rounded bg-white px-3 py-2.5 text-[14px] font-normal text-ink">
      {groups.map(group => <optgroup key={group} label={group}>
        {dimensions.filter(d => d.group === group).map(d => <option key={d.key} value={d.key} disabled={d.key === other}>{d.label}</option>)}
      </optgroup>)}
    </select>
  </label>
}

export default function ComparisonExplorer({ explorer, studies }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const dimensions = useMemo(() => comparisonDimensions(explorer), [explorer])
  const available = key => dimensions.some(d => d.key === key)
  const rowKey = available(searchParams.get('rows')) ? searchParams.get('rows') : 'signals'
  const requestedColumn = searchParams.get('columns')
  const columnKey = available(requestedColumn) && requestedColumn !== rowKey ? requestedColumn : rowKey === 'setting' ? 'signals' : 'setting'
  const [mode, setMode] = useState('count')
  const [showAll, setShowAll] = useState(false)
  const [selected, setSelected] = useState(null)
  const [columnPage, setColumnPage] = useState(0)
  const [tableWidth, setTableWidth] = useState(960)
  const frame = useRef(null)
  useEffect(() => {
    const element = frame.current
    const update = () => setTableWidth(Math.floor(element.getBoundingClientRect().width))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const matrix = useMemo(() => buildComparison(explorer, rowKey, columnKey), [explorer, rowKey, columnKey])
  const rows = showAll ? matrix.rows : matrix.rows.slice(0, 12)
  const availableColumns = showAll ? matrix.columns : matrix.columns.slice(0, 8)
  // Reserve space for the vertical scrollbar, then fit complete columns.
  // Wide comparisons use pages instead of squeezing labels or scrolling sideways.
  const usableWidth = Math.max(0, tableWidth - 16)
  const rowLabelWidth = Math.min(rowKey === SIGNAL_COMBINATIONS ? 384 : 240, Math.max(96, usableWidth * 0.36), usableWidth * 0.55)
  const minColumnWidth = columnKey === SIGNAL_COMBINATIONS ? 160 : 72
  const columnsPerPage = Math.max(1, Math.floor((usableWidth - rowLabelWidth) / minColumnWidth))
  const pageCount = Math.max(1, Math.ceil(availableColumns.length / columnsPerPage))
  const currentPage = Math.min(columnPage, pageCount - 1)
  const columnStart = currentPage * columnsPerPage
  const columns = availableColumns.slice(columnStart, columnStart + columnsPerPage)
  useEffect(() => setColumnPage(page => Math.min(page, pageCount - 1)), [pageCount])
  const change = (row, column) => {
    setSearchParams({ rows: row, columns: column }, { replace: true })
    setSelected(null)
    setShowAll(false)
    setColumnPage(0)
  }
  const swap = () => change(columnKey, rowKey)
  const changePage = page => { setColumnPage(page); setSelected(null) }
  const colour = fraction => {
    const t = Math.min(Math.max(fraction, 0), 1)
    return `rgb(${Math.round(239 - 148 * t)}, ${Math.round(239 - 148 * t)}, ${Math.round(239 + 16 * t)})`
  }
  return <div className="w-full min-w-0 max-w-6xl">
    <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-5 items-end mb-6">
      <VariableMenu dimensions={dimensions} value={rowKey} other={columnKey} label="First variable (rows)" onChange={value => change(value, columnKey)} />
      <VariableMenu dimensions={dimensions} value={columnKey} other={rowKey} label="Second variable (columns)" onChange={value => change(rowKey, value)} />
      <button type="button" onClick={swap} className="border border-line rounded px-3 py-2.5 text-[12px] hover:bg-line/40">Swap axes</button>
    </div>
    <div className="mb-5 max-w-3xl space-y-1 text-[12px] text-inkmid leading-relaxed">
      <p><strong className="text-ink">{matrix.rowDimension.label}:</strong> {matrix.rowDimension.description}</p>
      <p><strong className="text-ink">{matrix.columnDimension.label}:</strong> {matrix.columnDimension.description}</p>
    </div>
    <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
      <h3 className="text-[15px] font-medium">{matrix.rowDimension.label} × {matrix.columnDimension.label}</h3>
      <div className="flex items-center gap-2" role="group" aria-label="Comparison cell values">
        <span className="font-data text-[10.5px] text-inkfaint">matrix cells:</span>
        <ToggleGroup value={mode} onChange={setMode} options={[
          { value: 'count', label: 'count' }, { value: 'column', label: '% of column' }, { value: 'row', label: '% of row' },
        ]} />
      </div>
    </div>
    <p className="font-data text-[11px] text-inkfaint mb-4">{matrix.exactSets ? `${matrix.n} experiments measuring ≥2 signals (of ${matrix.totalN} in the corpus)` : `${matrix.n} experiments`} · {matrix.rows.length} row categories · {matrix.columns.length} column categories</p>
    {matrix.exactSets && <p className="text-[12px] text-inkmid mb-4 max-w-3xl">All category totals and percentages in this view use the experiments measuring at least two signals. Each complete set includes every coded physiological signal in the experiment.</p>}
    {pageCount > 1 && <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-[11px] text-inkmid" role="group" aria-label="Column pages">
      <span>Columns {columnStart + 1}–{columnStart + columns.length} of {availableColumns.length}</span>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Previous columns" disabled={currentPage === 0} onClick={() => changePage(currentPage - 1)} className="px-2 py-1 border border-line rounded disabled:opacity-30 hover:bg-line/40">Previous</button>
        <span className="font-data text-[10px]">{currentPage + 1}/{pageCount}</span>
        <button type="button" aria-label="Next columns" disabled={currentPage === pageCount - 1} onClick={() => changePage(currentPage + 1)} className="px-2 py-1 border border-line rounded disabled:opacity-30 hover:bg-line/40">Next</button>
      </div>
    </div>}
    <div ref={frame} className="min-w-0 overflow-y-auto max-h-[680px] border-y border-line">
      <table className="table-fixed border-collapse text-[11px] w-full [overflow-wrap:anywhere]" aria-label={`${matrix.rowDimension.label} by ${matrix.columnDimension.label}`}>
        <colgroup><col style={{ width: rowLabelWidth }} /><col span={columns.length} /></colgroup>
        <thead className="sticky top-0 z-20 bg-paper"><tr>
          <th scope="col" className="bg-paper text-left pr-4 py-3 font-medium text-inkmid">{matrix.rowDimension.label}</th>
          {columns.map(column => <th scope="col" key={column.label} className="px-2 py-3 font-medium text-center text-inkmid">
            {column.label}<span className="block font-data text-[10px] text-inkfaint font-normal mt-1">n={column.n}</span>
          </th>)}
        </tr></thead>
        <tbody>{rows.map(row => <tr key={row.label}>
          <th scope="row" className="bg-paper font-normal text-left pr-4 py-2 text-[12px] leading-snug">
            {row.label}<span className="font-data text-[10px] text-inkfaint ml-2">n={row.n}</span>
          </th>
          {columns.map(column => {
            const cell = comparisonCell(matrix, row.label, column.label)
            const denominator = mode === 'row' ? row.n : column.n
            const percent = denominator ? cell.count / denominator * 100 : 0
            const fraction = mode === 'count' ? cell.count / matrix.max : percent / 100
            const active = selected?.row === row.label && selected?.column === column.label
            return <td key={column.label} className="p-px">
              <button type="button" aria-pressed={active}
                aria-label={`${row.label}, ${column.label}: ${cell.count} experiment${cell.count === 1 ? '' : 's'}`}
                title={`${cell.count} experiment${cell.count === 1 ? '' : 's'}; ${(cell.count / row.n * 100).toFixed(1)}% of row (n=${row.n}); ${(cell.count / column.n * 100).toFixed(1)}% of column (n=${column.n}). Select to inspect experiments.`}
                onClick={() => setSelected({ row: row.label, column: column.label, ...cell })}
                className={`font-data text-[10.5px] block w-full h-9 px-0.5 hover:outline hover:outline-1 hover:outline-ink hover:outline-offset-[-1px] focus-visible:outline-offset-[-2px] ${active ? 'outline outline-2 outline-ink outline-offset-[-2px]' : ''}`}
                style={{ background: colour(fraction), color: fraction > 0.55 ? '#FFFFFF' : '#0A0A0A' }}>
                {mode === 'count' ? cell.count || '–' : cell.count ? `${percent.toFixed(1)}%` : '–'}
              </button>
            </td>
          })}
        </tr>)}</tbody>
      </table>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 mt-3 text-[11px] text-inkfaint">
      <span>Showing {rows.length} of {matrix.rows.length} row categories and {columns.length} of {matrix.columns.length} column categories.</span>
      {(matrix.rows.length > 12 || matrix.columns.length > 8) && <button type="button" onClick={() => { setShowAll(!showAll); setColumnPage(0); setSelected(null) }} className="text-coreaccent hover:underline">
        {showAll ? 'Show leading categories' : 'Show all categories'}
      </button>}
    </div>
    <p className="font-data text-[10.5px] text-inkfaint mt-3">Cell shading: {mode === 'count' ? `experiment count, 0–${matrix.max}` : `percentage of the ${mode} total, 0–100%`}. A dash indicates zero experiments.</p>
    <div className="text-[12px] leading-relaxed text-inkmid max-w-3xl mt-5 space-y-2">
      <p>{matrix.linked
        ? 'Both variables describe physiological measurements. Each cell requires the two categories on the same coded measurement row and counts each contributing experiment once.'
        : 'Each cell counts distinct experiments containing both categories. An experiment can contribute to several rows or columns, so cell counts and percentages may not sum to the corpus total or 100%.'}</p>
      <p>Category totals (n) use the full selected cohort, including categories outside the displayed subset or on other pages. Missing-code categories remain visible. “No listed item reported” describes missing positive reporting; it does not establish that an item was absent in practice. Select a cell to inspect its experiment IDs.</p>
    </div>
    {selected && <div className="mt-6 border-l-2 border-coreaccent pl-5" aria-live="polite">
      <p className="text-[13px] font-medium">{selected.row} × {selected.column}: {selected.count} experiment{selected.count === 1 ? '' : 's'}</p>
      <ExperimentList key={JSON.stringify([selected.row, selected.column])} ids={selected.ids} studies={studies} label="Contributing experiments" initiallyOpen />
    </div>}
  </div>
}
