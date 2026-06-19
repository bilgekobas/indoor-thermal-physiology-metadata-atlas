import { useMemo } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'

const SENSOR_PALETTE = ['#D94F6E', '#4855C8', '#E07820', '#B8C020', '#8A8A86', '#C9698A', '#C9C6BC']

function SensorStackChart({ signalData, periods }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const { data, sensor_order, period_totals } = signalData

  const byPeriod = useMemo(() => {
    const map = {}
    periods.forEach((p) => { map[p] = {} })
    data.forEach((r) => { if (map[r.period]) map[r.period][r.sensor_grp] = r.count })
    return map
  }, [data, periods])

  return (
    <div>
      <div className="flex gap-3 items-end h-32 mb-2">
        {periods.map((p) => {
          const total = period_totals[p] || 0
          const m = byPeriod[p]
          return (
            <div key={p} className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col-reverse h-24 rounded-sm overflow-hidden">
                {sensor_order.map((sensor, si) => {
                  const c = m[sensor] || 0
                  if (c === 0 || total === 0) return null
                  return (
                    <div
                      key={sensor}
                      style={{ height: `${(c / total) * 100}%`, background: SENSOR_PALETTE[si % SENSOR_PALETTE.length] }}
                      className="cursor-default hover:brightness-110"
                      onMouseEnter={(e) => showTip(e, `${sensor}, ${p}: ${c} of ${total} studies · ${((c / total) * 100).toFixed(1)}%`)}
                      onMouseMove={moveTip}
                      onMouseLeave={hideTip}
                    />
                  )
                })}
              </div>
              <div className="font-data text-[10px] text-inkfaint mt-1.5">{p}</div>
              <div className="font-data text-[9px] text-inkfaint/70">n={total}</div>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {sensor_order.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5 text-[11px] text-inkmid">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: SENSOR_PALETTE[i % SENSOR_PALETTE.length] }} />
            {s}
          </div>
        ))}
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

export default function Evolution({ data }) {
  const { evo_signal_sensor } = data
  const periods = evo_signal_sensor.periods
  const signals = Object.keys(evo_signal_sensor.signals)

  return (
    <div>
      <PageHeader
        eyebrow="Analysis · Sensor displacement over time"
        title="How measurement methods have shifted"
        description="For each major signal, which sensor types researchers use and how that mix has changed across the decade. Each column is normalised to 100% of studies measuring that signal in that period."
      />
      <div className="px-10 py-8 space-y-10">
        {signals.map((sig) => (
          <div key={sig}>
            <h2 className="text-[15px] font-semibold mb-3">{sig}</h2>
            <SensorStackChart signalData={evo_signal_sensor.signals[sig]} periods={periods} />
          </div>
        ))}
      </div>
    </div>
  )
}
