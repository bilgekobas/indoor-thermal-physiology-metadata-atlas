import { useMemo } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { CodeChip } from '../components/CodeChip.jsx'

const FORMULA_COLORS = {
  'Ramanathan (1964)': '#4B1528',
  'Hardy & DuBois (1938)': '#D94F6E',
  'ISO 9886: 2004': '#E07820',
  'Colin & Houdas (1982)': '#B8C020',
  'Ouyang (1985)': '#4855C8',
  'McIntyre (1980)': '#8A8A86',
  'Other/Multiple': '#C9C6BC',
  'NR': '#E2DED4',
}

export default function Mst({ data }) {
  const { mst } = data
  const periods = mst.periods

  const rateByPeriod = useMemo(() => {
    const map = {}
    periods.forEach((p) => { map[p] = { Y: 0, N: 0, NAN: 0, total: 0 } })
    mst.calc_rate_by_period.forEach((r) => {
      if (!map[r.period]) return
      map[r.period][r['physio-mst-calculated']] = r.count
      map[r.period].total += r.count
    })
    return map
  }, [mst, periods])

  const formulaByPeriod = useMemo(() => {
    const map = {}
    periods.forEach((p) => { map[p] = {} })
    mst.formula_by_period.forEach((r) => {
      if (!map[r.period]) return
      map[r.period][r.formula_grp] = r.count
    })
    return map
  }, [mst, periods])

  const maxPeriodTotal = Math.max(...Object.values(formulaByPeriod).map(
    (m) => Object.values(m).reduce((a, b) => a + b, 0)
  ))

  return (
    <div>
      <PageHeader
        eyebrow="Analysis"
        title="Mean skin temperature (MST)"
        description="How often MST is calculated, with how many measurement points, and which formula — and how that has changed over time."
      />

      {/* MST calculation rate */}
      <div className="px-10 py-8 border-b border-line">
        <h2 className="text-[16px] font-semibold mb-1">Calculation rate is declining</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          Share of studies in each period that explicitly calculated mean skin temperature
          (<CodeChip code="Y" />) versus measured local sites without aggregating
          (<CodeChip code="N" />) or did not report (<CodeChip code="NAN" />).
        </p>
        <div className="flex gap-3 items-end h-40 max-w-2xl">
          {periods.map((p) => {
            const r = rateByPeriod[p]
            const total = r.total || 1
            return (
              <div key={p} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col-reverse h-32 rounded-sm overflow-hidden">
                  <div style={{ height: `${(r.Y / total) * 100}%`, background: '#D94F6E' }} title={`Y: ${r.Y}`} />
                  <div style={{ height: `${(r.N / total) * 100}%`, background: '#E2DED4' }} title={`N: ${r.N}`} />
                  <div style={{ height: `${(r.NAN / total) * 100}%`, background: '#F1EDE6' }} title={`NAN: ${r.NAN}`} />
                </div>
                <div className="font-data text-[11px] text-inkmid mt-2">{p}</div>
                <div className="font-data text-[10px] text-inkfaint">{Math.round((r.Y/total)*100)}%</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Formula usage by period */}
      <div className="px-10 py-8 border-b border-line">
        <h2 className="text-[16px] font-semibold mb-1">Formula usage by period</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          Among studies calculating MST ({mst.n_mst_studies} total): which named formula they cite.
        </p>
        <div className="flex gap-3 items-end h-48 max-w-2xl mb-4">
          {periods.map((p) => {
            const m = formulaByPeriod[p]
            const total = Object.values(m).reduce((a, b) => a + b, 0) || 1
            return (
              <div key={p} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col-reverse h-40 rounded-sm overflow-hidden">
                  {mst.formula_order.map((f) => (
                    <div
                      key={f}
                      style={{ height: `${((m[f] || 0) / total) * 100}%`, background: FORMULA_COLORS[f] }}
                      title={`${f}: ${m[f] || 0}`}
                    />
                  ))}
                </div>
                <div className="font-data text-[11px] text-inkmid mt-2">{p}</div>
              </div>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {mst.formula_order.map((f) => (
            <div key={f} className="flex items-center gap-1.5 text-[11.5px] text-inkmid">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: FORMULA_COLORS[f] }} />
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
