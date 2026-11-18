import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildComparison, comparisonCell, comparisonDimensions, SIGNAL_COMBINATIONS } from '../src/utils/comparisons.js'
import { figNum } from '../src/figureRegistry.js'

const dimensions = [
  { key: 'signals', kind: 'measurement' }, { key: 'methods', kind: 'measurement' },
  { key: 'setting', kind: 'experiment' }, { key: 'domains', kind: 'experiment' },
]
const record = {
  id: 'a', values: { signals: ['Skin', 'Core'], methods: ['Thermocouple', 'Pill'],
    setting: ['Lab'], domains: ['Thermal', 'Humidity'] },
  measurements: [{ signals: 'Skin', methods: 'Thermocouple' },
    { signals: 'Skin', methods: 'Thermocouple' }, { signals: 'Core', methods: 'Pill' }],
}

test('measurement pairs follow the same measurement row and count each experiment once', () => {
  const matrix = buildComparison({ dimensions, records: [record, record] }, 'signals', 'methods')
  assert.equal(matrix.linked, true)
  assert.equal(matrix.n, 1)
  assert.equal(comparisonCell(matrix, 'Skin', 'Thermocouple').count, 1)
  assert.equal(comparisonCell(matrix, 'Skin', 'Pill').count, 0)
  assert.equal(comparisonCell(matrix, 'Core', 'Thermocouple').count, 0)
  assert.equal(matrix.rows.find(r => r.label === 'Skin').n, 1)
})

test('experiment-level pairs allow several categories without inflating their marginal totals', () => {
  const matrix = buildComparison({ dimensions, records: [record, record] }, 'signals', 'domains')
  assert.equal(matrix.linked, false)
  assert.equal(comparisonCell(matrix, 'Skin', 'Thermal').count, 1)
  assert.equal(comparisonCell(matrix, 'Skin', 'Humidity').count, 1)
  assert.equal(matrix.rows.find(r => r.label === 'Skin').n, 1)
  assert.equal(matrix.columns.find(r => r.label === 'Humidity').n, 1)
})

test('swapping axes transposes linked counts and preserves experiment IDs', () => {
  const source = { dimensions, records: [record] }
  const forward = buildComparison(source, 'signals', 'methods')
  const reverse = buildComparison(source, 'methods', 'signals')
  assert.deepEqual(comparisonCell(forward, 'Skin', 'Thermocouple'), comparisonCell(reverse, 'Thermocouple', 'Skin'))
  assert.throws(() => buildComparison(source, 'signals', 'signals'), /two different/)
})

test('the default explorer reproduces every established signal-by-setting count', () => {
  const read = name => JSON.parse(readFileSync(new URL(`../public/data/${name}.json`, import.meta.url), 'utf8'))
  const matrix = buildComparison(read('comparison_explorer'), 'signals', 'setting')
  const established = read('combination_views').signal_setting
  assert.equal(matrix.n, 295)
  for (const row of established.rows) {
    assert.equal(matrix.rows.find(r => r.label === row.label).n, row.count)
    for (const cell of row.cells) {
      const column = cell.setting === 'Setting unspecified' ? 'Not reported' : cell.setting
      assert.equal(comparisonCell(matrix, row.label, column).count, cell.count)
    }
  }
})

test('original figure numbers remain stable and the explorer has no numbered figure', () => {
  assert.equal(figNum('participant-metadata-collected'), '20')
  assert.equal(figNum('signals-cooccurrence'), '22')
  assert.equal(figNum('sensor-choice-by-signal'), '25')
  assert.equal(figNum('hr-measurement-site'), '27')
  assert.equal(figNum('env-cooccurrence'), '31')
  assert.equal(figNum('reporting-fields'), '37')
  assert.throws(() => figNum('signal-by-setting'), /unknown figure key/)
})

test('complete sets exclude single-signal experiments and keep larger batteries separate', () => {
  const single = { ...record, id: 'single', values: { ...record.values, signals: ['Skin'] } }
  const missing = { ...single, id: 'missing', values: { ...single.values, signals: ['Skin', 'Not reported'] } }
  const larger = { ...record, id: 'larger', values: { ...record.values, signals: ['Skin', 'Core', 'BP'], setting: ['Field'] } }
  const source = { dimensions, records: [record, record, single, missing, larger] }
  const matrix = buildComparison(source, SIGNAL_COMBINATIONS, 'setting')
  assert.equal(matrix.n, 2)
  assert.equal(matrix.totalN, 4)
  assert.equal(matrix.rows.length, 2)
  assert.equal(matrix.rows.reduce((sum, row) => sum + row.n, 0), 2)
  assert.equal(matrix.columns.find(c => c.label === 'Lab').n, 1)
  const pair = matrix.rows.find(row => row.label.split(' + ').length === 2)
  assert.deepEqual(comparisonCell(matrix, pair.label, 'Lab').ids, ['a'])
  assert.equal(comparisonCell(matrix, pair.label, 'Field').count, 0)
  const reverse = buildComparison(source, 'setting', SIGNAL_COMBINATIONS)
  assert.equal(reverse.n, 2)
  assert.deepEqual(comparisonCell(reverse, 'Lab', pair.label), comparisonCell(matrix, pair.label, 'Lab'))
})

test('the corpus has 176 multi-signal experiments in 81 mutually exclusive complete sets', () => {
  const explorer = JSON.parse(readFileSync(new URL('../public/data/comparison_explorer.json', import.meta.url), 'utf8'))
  const options = comparisonDimensions(explorer)
  assert.equal(options[0].key, 'signals')
  assert.equal(options[1].key, SIGNAL_COMBINATIONS)
  const matrix = buildComparison(explorer, SIGNAL_COMBINATIONS, 'setting')
  assert.equal(matrix.n, 176)
  assert.equal(matrix.totalN, 295)
  assert.equal(matrix.rows.length, 81)
  assert.equal(matrix.rows.reduce((sum, row) => sum + row.n, 0), 176)
  assert.equal(matrix.columns.reduce((sum, column) => sum + column.n, 0), 176)
  assert.equal(matrix.rows.find(row => row.label === 'Skin temperature + Heart/Pulse rate').n, 19)
})

test('every available pair covers its eligible cohort without exceeding either category total', () => {
  const explorer = JSON.parse(readFileSync(new URL('../public/data/comparison_explorer.json', import.meta.url), 'utf8'))
  const options = comparisonDimensions(explorer)
  for (const row of options) for (const column of options) {
    if (row.key === column.key) continue
    const matrix = buildComparison(explorer, row.key, column.key)
    const rowTotals = new Map(matrix.rows.map(r => [r.label, r.n]))
    const columnTotals = new Map(matrix.columns.map(c => [c.label, c.n]))
    const covered = new Set()
    for (const [key, cell] of matrix.cells) {
      const [r, c] = JSON.parse(key)
      assert.equal(cell.count, new Set(cell.ids).size)
      assert.ok(cell.count <= rowTotals.get(r))
      assert.ok(cell.count <= columnTotals.get(c))
      cell.ids.forEach(id => covered.add(id))
    }
    const eligibleN = row.key === SIGNAL_COMBINATIONS || column.key === SIGNAL_COMBINATIONS ? 176 : 295
    assert.equal(matrix.n, eligibleN)
    assert.equal(covered.size, eligibleN, `${row.label} × ${column.label}`)
  }
})
