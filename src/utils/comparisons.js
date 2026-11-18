const keyFor = (row, column) => JSON.stringify([row, column])
export const SIGNAL_COMBINATIONS = 'signal-combinations'
const missingSignals = new Set(['Not reported', 'Not applicable', 'Unclear', 'Measured, detail not reported', 'No listed item reported'])

export function comparisonDimensions(explorer) {
  const dimensions = explorer.dimensions.filter(d => d.key !== SIGNAL_COMBINATIONS)
  const index = dimensions.findIndex(d => d.key === 'signals')
  const combination = { key: SIGNAL_COMBINATIONS, label: 'Complete signal combinations (≥2)',
    group: 'Measurements', kind: 'experiment',
    description: 'Each category is the complete coded set of at least two physiological signals. Sets are mutually exclusive; extra sites, devices or repetitions do not add signals.' }
  dimensions.splice(index < 0 ? 0 : index + 1, 0, combination)
  return dimensions
}

function completeSignalSets(records) {
  const sets = new Map(), frequencies = new Map()
  for (const record of records) {
    if (!sets.has(record.id)) sets.set(record.id, new Set())
    for (const signal of record.values.signals || []) if (!missingSignals.has(signal)) sets.get(record.id).add(signal)
  }
  for (const signals of sets.values()) for (const signal of signals) frequencies.set(signal, (frequencies.get(signal) || 0) + 1)
  return new Map([...sets].map(([id, signals]) => [id, [...signals].sort((a, b) => frequencies.get(b) - frequencies.get(a) || a.localeCompare(b))]))
}

export function buildComparison(explorer, rowKey, columnKey) {
  const dimensions = comparisonDimensions(explorer)
  const rowDimension = dimensions.find(d => d.key === rowKey)
  const columnDimension = dimensions.find(d => d.key === columnKey)
  if (!rowDimension || !columnDimension || rowKey === columnKey) throw new Error('Choose two different available variables')
  const exactSets = rowKey === SIGNAL_COMBINATIONS || columnKey === SIGNAL_COMBINATIONS
  const signalSets = exactSets ? completeSignalSets(explorer.records) : null
  const linked = rowDimension.kind === 'measurement' && columnDimension.kind === 'measurement'
  const rowIds = new Map(), columnIds = new Map(), pairIds = new Map(), allIds = new Set()
  const add = (map, key, id) => {
    if (!map.has(key)) map.set(key, new Set())
    map.get(key).add(id)
  }
  for (const record of explorer.records) {
    if (exactSets && signalSets.get(record.id).length < 2) continue
    allIds.add(record.id)
    const values = key => key === SIGNAL_COMBINATIONS ? [signalSets.get(record.id).join(' + ')] : record.values[key] || []
    const rows = values(rowKey)
    const columns = values(columnKey)
    rows.forEach(row => add(rowIds, row, record.id))
    columns.forEach(column => add(columnIds, column, record.id))
    if (linked) {
      for (const measurement of record.measurements) {
        if (measurement[rowKey] && measurement[columnKey]) add(pairIds, keyFor(measurement[rowKey], measurement[columnKey]), record.id)
      }
    } else {
      for (const row of rows) for (const column of columns) add(pairIds, keyFor(row, column), record.id)
    }
  }
  const categories = (ids, dimension) => [...ids].map(([label, set]) => ({ label, n: set.size })).sort((a, b) => {
    if (dimension.order) {
      const position = label => dimension.order.includes(label) ? dimension.order.indexOf(label) : dimension.order.length
      const difference = position(a.label) - position(b.label)
      if (difference) return difference
    }
    return b.n - a.n || a.label.localeCompare(b.label)
  })
  const cells = new Map([...pairIds].map(([key, ids]) => [key, { count: ids.size, ids: [...ids].sort() }]))
  return { n: allIds.size, totalN: new Set(explorer.records.map(r => r.id)).size, exactSets, linked, rowDimension, columnDimension,
    rows: categories(rowIds, rowDimension), columns: categories(columnIds, columnDimension), cells,
    max: Math.max(1, ...[...cells.values()].map(cell => cell.count)) }
}

export function comparisonCell(matrix, row, column) {
  return matrix.cells.get(keyFor(row, column)) || { count: 0, ids: [] }
}
