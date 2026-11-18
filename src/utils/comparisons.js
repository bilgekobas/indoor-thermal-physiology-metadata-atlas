const keyFor = (row, column) => JSON.stringify([row, column])

export function buildComparison(explorer, rowKey, columnKey) {
  const rowDimension = explorer.dimensions.find(d => d.key === rowKey)
  const columnDimension = explorer.dimensions.find(d => d.key === columnKey)
  if (!rowDimension || !columnDimension || rowKey === columnKey) throw new Error('Choose two different available variables')
  const linked = rowDimension.kind === 'measurement' && columnDimension.kind === 'measurement'
  const rowIds = new Map(), columnIds = new Map(), pairIds = new Map(), allIds = new Set()
  const add = (map, key, id) => {
    if (!map.has(key)) map.set(key, new Set())
    map.get(key).add(id)
  }
  for (const record of explorer.records) {
    allIds.add(record.id)
    const rows = record.values[rowKey] || []
    const columns = record.values[columnKey] || []
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
  return { n: allIds.size, linked, rowDimension, columnDimension,
    rows: categories(rowIds, rowDimension), columns: categories(columnIds, columnDimension), cells,
    max: Math.max(1, ...[...cells.values()].map(cell => cell.count)) }
}

export function comparisonCell(matrix, row, column) {
  return matrix.cells.get(keyFor(row, column)) || { count: 0, ids: [] }
}
