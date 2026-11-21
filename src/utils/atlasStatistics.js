export function percent(count, total, digits = 0) {
  return total > 0 ? `${(100 * count / total).toFixed(digits)}%` : '—'
}

// Heights in metres used as reference positions in the sensor-placement figures.
export const referenceHeights = [0.1, 0.6, 1.1, 1.7]
export const referenceHeightList = new Intl.ListFormat('en', { type: 'disjunction' })
  .format(referenceHeights.map(String))

export function referenceHeightShare(rows, digits = 0) {
  const matches = rows.filter(({ height }) => referenceHeights.includes(height)).length
  return percent(matches, rows.length, digits)
}
