// Shared distribution summaries and explicit histogram boundary conventions.
export function quantileSorted(sorted, probability) {
  if (!sorted.length) return null
  const position = (sorted.length - 1) * probability
  const index = Math.floor(position)
  const fraction = position - index
  return sorted[index + 1] === undefined
    ? sorted[index]
    : sorted[index] + fraction * (sorted[index + 1] - sorted[index])
}

export function describeValues(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return null
  return {
    n: sorted.length, min: sorted[0], max: sorted[sorted.length - 1],
    q25: quantileSorted(sorted, 0.25), median: quantileSorted(sorted, 0.5),
    q75: quantileSorted(sorted, 0.75),
  }
}

export function buildHistogram(values, { binWidth = 1, overflowAt = null } = {}) {
  if (!(binWidth > 0) || !Number.isFinite(binWidth)) throw new Error('A positive finite bin width is required')
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  const stats = describeValues(sorted)
  if (!stats) return { values: [], stats: null, bins: [] }
  const hasOverflow = overflowAt !== null
  if (hasOverflow && (!(overflowAt > 0) || !Number.isFinite(overflowAt))) throw new Error('A positive finite overflow boundary is required')
  const min = hasOverflow ? 0 : Math.floor(stats.min / binWidth) * binWidth
  const max = hasOverflow ? overflowAt : Math.ceil(stats.max / binWidth) * binWidth
  const nBins = Math.max(1, Math.ceil((max - min) / binWidth))
  const bins = Array.from({ length: nBins }, (_, index) => ({
    start: min + index * binWidth,
    end: hasOverflow ? Math.min(min + (index + 1) * binWidth, max) : min + (index + 1) * binWidth,
    count: 0, overflow: false, endClosed: !hasOverflow && index === nBins - 1,
  }))
  if (hasOverflow) bins.push({ start: overflowAt, end: Infinity, count: 0, overflow: true, endClosed: false })
  for (const value of sorted) {
    const index = hasOverflow && value >= overflowAt
      ? bins.length - 1
      : Math.max(0, Math.min(Math.floor((value - min) / binWidth), nBins - 1))
    bins[index].count += 1
  }
  let cumulativeCount = 0
  for (const bin of bins) {
    cumulativeCount += bin.count
    bin.cumulativeCount = cumulativeCount
    bin.cumulativeFraction = cumulativeCount / sorted.length
  }
  return { values: sorted, stats, bins }
}

export function binInterval(bin, format = String) {
  return bin.overflow
    ? `${format(bin.start)} and above`
    : `${format(bin.start)} to ${bin.endClosed ? '' : 'less than '}${format(bin.end)}`
}

export function cumulativeDescription(bin, format = String) {
  return bin.overflow
    ? 'all experiments, including the overflow bin'
    : `experiments with values ${bin.endClosed ? '≤' : '<'} ${format(bin.end)}`
}
