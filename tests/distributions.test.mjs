import test from 'node:test'
import assert from 'node:assert/strict'
import { buildHistogram, describeValues, cumulativeDescription } from '../src/utils/distributions.js'

test('sample summaries interpolate quartiles and average the two central observations', () => {
  assert.deepEqual(describeValues([8, 2, 4, 6]), { n: 4, min: 2, max: 8, q25: 3.5, median: 5, q75: 6.5 })
  assert.equal(describeValues([NaN, Infinity, -Infinity]), null)
})

test('finite histogram bins assign an internal boundary to the following bin', () => {
  const { bins, stats } = buildHistogram([0, 5, 10], { binWidth: 5 })
  assert.equal(stats.n, 3)
  assert.deepEqual(bins.map(b => b.count), [1, 2])
  assert.equal(bins[0].endClosed, false)
  assert.equal(bins[1].endClosed, true)
  assert.equal(bins[0].cumulativeFraction, 1 / 3)
  assert.equal(bins[1].cumulativeFraction, 1)
  assert.match(cumulativeDescription(bins[0]), /< 5$/)
  assert.match(cumulativeDescription(bins[1]), /≤ 10$/)
})

test('an overflow bin includes the boundary but its cumulative total includes all earlier bins', () => {
  const { bins } = buildHistogram([5, 95, 100, 120], { binWidth: 5, overflowAt: 100 })
  const overflow = bins.at(-1)
  assert.equal(bins.reduce((sum, b) => sum + b.count, 0), 4)
  assert.equal(overflow.count, 2)
  assert.equal(overflow.cumulativeCount, 4)
  assert.equal(overflow.cumulativeFraction, 1)
  assert.equal(bins.at(-2).endClosed, false)
  assert.match(cumulativeDescription(overflow), /all experiments/)
})

test('empty and constant distributions remain well defined', () => {
  assert.deepEqual(buildHistogram([], { binWidth: 5 }).bins, [])
  const { bins, stats } = buildHistogram([30, 30, 30], { binWidth: 10 })
  assert.equal(stats.median, 30)
  assert.equal(bins.length, 1)
  assert.equal(bins[0].count, 3)
  assert.equal(bins[0].cumulativeFraction, 1)
  assert.throws(() => buildHistogram([1], { binWidth: 0 }), /positive finite/)
})
