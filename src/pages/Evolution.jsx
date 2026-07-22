import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'

const SENSOR_PALETTE = ['#D94F6E', '#4855C8', '#E07820', '#B8C020', '#8A8A86', '#C9698A', '#C9C6BC']

function SensorStackChart({ signalData, periods }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const [scaleMode, setScaleMode] = useState('relative')
  const { data, sensor_order, period_totals } = signalData
  const byPeriod = useMemo(() => {
    const map = {}
    periods.forEach((p) => { map[p] = {} })
    data.forEach((r) => { if (map[r.period]) map[r.period][r.sensor_grp] = r.count })
    return map
  }, [data, periods])
  const maxCount = Math.max(...data.map((r) => r.count || 0), 1)
  return (
    <div>
      <div className="font-data text-[10px] text-inkfaint mb-2">
        Each method is an independent prevalence. Studies using multiple methods contribute to multiple bars; values within a period need not sum to 100%.
      </div>
      <div className="flex gap-3 items-end h-40 mb-2">
        {periods.map((p) => {
          const total = period_totals[p] || 0
          const m = byPeriod[p]
          return (
            <div key={p} className="flex-1 flex flex-col items-center">
              <div className="w-full h-30 flex items-end justify-center gap-[2px] bg-line/25 rounded-sm px-1">
                {sensor_order.map((sensor, si) => {
                  const c = m[sensor] || 0
                  const pct = total ? (c / total) * 100 : 0
                  const h = scaleMode === 'relative' ? pct : (c / maxCount) * 100
                  return <div key={sensor} className="flex-1 min-w-[3px] cursor-default hover:brightness-110 rounded-t-sm"
                    style={{ height: `${h}%`, background: SENSOR_PALETTE[si % SENSOR_PALETTE.length] }}
                    onMouseEnter={(e) => showTip(e, `${sensor}, ${p}: ${c} of ${total} signal-measuring experiments · ${pct.toFixed(1)}%`)}
                    onMouseMove={moveTip} onMouseLeave={hideTip} />
                })}
              </div>
              <div className="font-data text-[10px] text-inkfaint mt-1.5">{p}</div>
              <div className="font-data text-[9px] text-inkfaint/70">n={total}</div>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {sensor_order.map((s, i) => <div key={s} className="flex items-center gap-1.5 text-[11px] text-inkmid"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: SENSOR_PALETTE[i % SENSOR_PALETTE.length] }} />{s}</div>)}
      </div>
      <div className="flex gap-1.5 mt-4">
        {['relative','absolute'].map((m) => <button key={m} onClick={() => setScaleMode(m)} className={`px-3 py-1 rounded text-[11px] font-data transition-colors ${scaleMode === m ? 'bg-ink text-paper' : 'bg-line/50 text-inkmid hover:bg-line'}`}>{m}</button>)}
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
        description="For each major signal, which sensor types researchers use and how that mix has changed across the decade. Bars show method prevalence among experiments measuring that signal in each period. Experiments using multiple methods contribute to multiple bars."
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
