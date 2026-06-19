import { useMemo } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import HistogramECDF from '../components/HistogramECDF.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'

const RIGOR_COLORS = {
  'Randomisation': '#D94F6E',
  'Balanced order': '#4855C8',
  'Blinding': '#E07820',
  'Circadian control': '#B8C020',
  'Menstrual timing control': '#8A8A86',
  'Time between sessions controlled': '#C9698A',
}

function RigorLines({ rigorData, fields }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const periods = rigorData.map((d) => d.period)
  const W = 600, H = 180
  const xStep = W / (periods.length - 1)
  const yScale = (pct) => H - (pct / 100) * H

  return (
    <div>
      <svg width={W + 20} height={H + 24} className="font-data overflow-visible">
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={0} x2={W} y1={yScale(g)} y2={yScale(g)} stroke="#E2DED4" strokeWidth={1} />
            <text x={W + 4} y={yScale(g) + 3} fontSize={9} fill="#A8A59C">{g}%</text>
          </g>
        ))}
        {fields.map((field) => {
          const points = rigorData.map((d, i) => ({ x: i * xStep, y: yScale(d[field].pct), pct: d[field].pct, count: d[field].count, n: d.n_studies }))
          return (
            <g key={field}>
              <polyline
                points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none" stroke={RIGOR_COLORS[field]} strokeWidth={1.8}
              />
              {points.map((p, i) => (
                <circle
                  key={i} cx={p.x} cy={p.y} r={3} fill={RIGOR_COLORS[field]}
                  className="cursor-default"
                  onMouseEnter={(e) => showTip(e, `${field}, ${periods[i]}: ${p.count} of ${p.n} studies · ${p.pct}%`)}
                  onMouseMove={moveTip}
                  onMouseLeave={hideTip}
                />
              ))}
            </g>
          )
        })}
        {periods.map((p, i) => (
          <text key={p} x={i * xStep} y={H + 16} fontSize={10} fill="#A8A59C" textAnchor="middle">{p}</text>
        ))}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {fields.map((f) => (
          <div key={f} className="flex items-center gap-1.5 text-[11px] text-inkmid">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: RIGOR_COLORS[f] }} />
            {f}
          </div>
        ))}
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

function SettingStackChart({ settingByPeriod, periods }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const COLORS = { Lab: '#1A1A18', Field: '#D94F6E', 'Living Lab': '#E07820', Mixed: '#8A8A86' }
  const types = [...new Set(settingByPeriod.map((r) => r['exp-type']))]

  const byPeriod = useMemo(() => {
    const map = {}
    periods.forEach((p) => { map[p] = {} })
    settingByPeriod.forEach((r) => { if (map[r.period]) map[r.period][r['exp-type']] = r.count })
    return map
  }, [settingByPeriod, periods])

  return (
    <div>
      <div className="flex gap-3 items-end h-32 mb-2">
        {periods.map((p) => {
          const m = byPeriod[p]
          const total = Object.values(m).reduce((a, b) => a + b, 0)
          return (
            <div key={p} className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col-reverse h-24 rounded-sm overflow-hidden">
                {types.map((t) => {
                  const c = m[t] || 0
                  if (c === 0 || total === 0) return null
                  return (
                    <div
                      key={t}
                      style={{ height: `${(c / total) * 100}%`, background: COLORS[t] || '#BBBBBB' }}
                      className="cursor-default hover:brightness-110"
                      onMouseEnter={(e) => showTip(e, `${t}, ${p}: ${c} of ${total} studies · ${total > 0 ? ((c / total) * 100).toFixed(1) : 0}%`)}
                      onMouseMove={moveTip}
                      onMouseLeave={hideTip}
                    />
                  )
                })}
              </div>
              <div className="font-data text-[10px] text-inkfaint mt-1.5">{p}</div>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {types.map((t) => (
          <div key={t} className="flex items-center gap-1.5 text-[11px] text-inkmid">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: COLORS[t] || '#BBBBBB' }} />
            {t}
          </div>
        ))}
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

export default function Trends({ data }) {
  const { evo_protocol_rigor, evo_size_setting } = data
  const periods = evo_size_setting.periods

  return (
    <div>
      <PageHeader
        eyebrow="Analysis · Methodological trends"
        title="Rigor, scale, and setting over time"
        description="Whether protocol controls, sample sizes, and experimental settings have shifted as the field has grown."
      />

      <div className="px-10 py-8 border-b border-line">
        <h2 className="text-[16px] font-semibold mb-1">Protocol controls reported, by period</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          Share of studies in each period explicitly reporting each control. None of these
          controls show a clear upward trend despite the field's growth in publication volume.
        </p>
        <RigorLines rigorData={evo_protocol_rigor.data} fields={evo_protocol_rigor.fields} />
      </div>

      <div className="px-10 py-8 border-b border-line">
        <h2 className="text-[16px] font-semibold mb-1">Experimental setting, by period</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          Lab studies dominate throughout; Field and Living Lab settings appear but do not show a sustained rise in share.
        </p>
        <SettingStackChart settingByPeriod={evo_size_setting.setting_by_period} periods={periods} />
      </div>

      <div className="px-10 py-8">
        <h2 className="text-[16px] font-semibold mb-1">Sample size distribution</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          Log-scale distribution of total participants per study, across the full corpus.
        </p>
        <HistogramECDF
          values={evo_size_setting.sample_sizes.map((s) => Math.log10(s.n))}
          binWidth={0.15}
          xLabel="log₁₀(n)"
        />
      </div>
    </div>
  )
}
