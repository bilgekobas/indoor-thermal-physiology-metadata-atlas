import { useMemo } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'

// ── Fig 5: Time-of-day occupancy ─────────────────────────────────────────
function TimeOfDayChart({ sessions }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()

  // Build fractional occupancy: for each 15-min bucket, count studies active
  const TOTAL_HOURS = 24
  const SLOT_MINS = 15
  const N_SLOTS = (TOTAL_HOURS * 60) / SLOT_MINS
  const nStudies = new Set(sessions.map((s) => s.id)).size

  const occupancy = useMemo(() => {
    const slots = new Array(N_SLOTS).fill(0)
    sessions.forEach(({ start, end }) => {
      const startSlot = Math.floor(start * (60 / SLOT_MINS))
      const endSlot = Math.min(Math.ceil(end * (60 / SLOT_MINS)), N_SLOTS - 1)
      for (let i = startSlot; i <= endSlot; i++) slots[i]++
    })
    return slots.map((v) => v / nStudies)
  }, [sessions, nStudies])

  const maxOcc = occupancy.reduce((m, v) => (v > m ? v : m), 0.001)
  const W = 640
  const H_TOP = 80
  const H_BOT = 120
  const slotW = W / N_SLOTS

  const hourLabel = (h) => `${String(h).padStart(2, '0')}:00`

  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H_TOP + H_BOT + 30} className="font-data block">
        {/* Top: fractional occupancy area */}
        <text x={0} y={10} fontSize={10} fill="#A8A59C">Fraction of studies active</text>
        {occupancy.map((v, i) => {
          const x = i * slotW
          const barH = (v / maxOcc) * (H_TOP - 14)
          const hour = (i * SLOT_MINS) / 60
          return (
            <rect
              key={i} x={x} y={H_TOP - barH} width={slotW + 0.5} height={barH}
              fill="#D94F6E" opacity={0.7}
              className="cursor-default"
              onMouseEnter={(e) => showTip(e, `${hourLabel(Math.floor(hour))}: ${(v * 100).toFixed(1)}% of studies active (${Math.round(v * nStudies)} of ${nStudies})`)}
              onMouseMove={moveTip}
              onMouseLeave={hideTip}
            />
          )
        })}

        {/* Bottom: session gantt, one line per session */}
        {sessions.map((s, i) => {
          const x1 = (s.start / TOTAL_HOURS) * W
          const x2 = (s.end / TOTAL_HOURS) * W
          const y = H_TOP + 10 + i * (H_BOT / sessions.length)
          return (
            <line key={i} x1={x1} x2={x2} y1={y} y2={y}
              stroke="#A8A59C" strokeWidth={1} opacity={0.6}
              className="cursor-default"
              onMouseEnter={(e) => showTip(e, `${s.id}: ${s.start.toFixed(2)}h–${s.end.toFixed(2)}h`)}
              onMouseMove={moveTip}
              onMouseLeave={hideTip}
            />
          )
        })}

        {/* X-axis hour ticks */}
        {Array.from({ length: 9 }, (_, i) => i * 3).map((h) => (
          <g key={h}>
            <line x1={(h / TOTAL_HOURS) * W} x2={(h / TOTAL_HOURS) * W} y1={H_TOP + H_BOT + 8} y2={H_TOP + H_BOT + 14} stroke="#E2DED4" />
            <text x={(h / TOTAL_HOURS) * W} y={H_TOP + H_BOT + 24} fontSize={10} fill="#A8A59C" textAnchor="middle">
              {hourLabel(h)}
            </text>
          </g>
        ))}
      </svg>
      <TooltipPortal tip={tip} />
    </div>
  )
}

// ── Fig 13: Sensor heights ────────────────────────────────────────────────
const VAR_COLORS = {
  'Air temperature': '#D94F6E',
  'Relative humidity': '#4855C8',
  'Air velocity': '#E07820',
  'Globe temperature': '#B8C020',
}

function SensorHeightChart({ data, variables }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const W = 640
  const H = 200
  const domainMin = 0
  const domainMax = 3.5
  const xScale = (v) => ((v - domainMin) / (domainMax - domainMin)) * W

  const byVar = useMemo(() => {
    const m = {}
    variables.forEach((v) => { m[v] = [] })
    data.forEach((r) => { if (m[r.variable]) m[r.variable].push(r.height) })
    return m
  }, [data, variables])

  // Standard heights reference lines
  const refHeights = [
    { h: 0.1, label: '0.1m (ankle)' },
    { h: 0.6, label: '0.6m (abdomen)' },
    { h: 1.1, label: '1.1m (head seated)' },
    { h: 1.7, label: '1.7m (head standing)' },
  ]

  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H + 24} className="font-data block">
        {/* Reference height gridlines */}
        {refHeights.map((r) => (
          <g key={r.h}>
            <line x1={xScale(r.h)} x2={xScale(r.h)} y1={0} y2={H} stroke="#E2DED4" strokeWidth={1} strokeDasharray="4 2" />
            <text x={xScale(r.h)} y={H + 18} fontSize={9} fill="#C9C6BC" textAnchor="middle">{r.h}m</text>
          </g>
        ))}

        {/* Jittered dots per variable row */}
        {variables.map((v, vi) => {
          const rowH = H / variables.length
          const rowY = vi * rowH + rowH / 2
          const color = VAR_COLORS[v] || '#8A8A86'
          return byVar[v].map((h, i) => (
            <circle
              key={i}
              cx={xScale(h)}
              cy={rowY + (Math.sin(i * 7.3) * rowH * 0.35)}
              r={3.5}
              fill={color}
              opacity={0.55}
              className="cursor-default"
              onMouseEnter={(e) => showTip(e, `${v}: ${h}m`)}
              onMouseMove={moveTip}
              onMouseLeave={hideTip}
            />
          ))
        })}

        {/* Row labels */}
        {variables.map((v, vi) => {
          const rowH = H / variables.length
          return (
            <text key={v} x={-4} y={vi * rowH + rowH / 2 + 4} fontSize={11} fill="#5F5E58" textAnchor="end">
              {v}
            </text>
          )
        })}
      </svg>
      <TooltipPortal tip={tip} />
    </div>
  )
}

export default function Environment({ data }) {
  const { fig05_time_of_day, fig13_sensor_heights } = data

  return (
    <div>
      <PageHeader
        eyebrow="Analysis · Appendix Fig. 5, 13"
        title="Timing & environmental sensors"
        description="When experiments happen across the day, and at what heights environmental sensors are placed."
      />

      {/* Fig 5 */}
      <div className="px-10 py-8 border-b border-line">
        <h2 className="text-[16px] font-semibold mb-1">Time of day distribution</h2>
        <p className="text-[13px] text-inkmid mb-2 max-w-2xl">
          Top: fractional occupancy across the 24-hour clock (share of studies active at each 15-minute slot).
          Bottom: each session's start–end window.{' '}
          {fig05_time_of_day.n_reporting} of studies report explicit session times.
        </p>
        <TimeOfDayChart sessions={fig05_time_of_day.sessions} />
      </div>

      {/* Fig 13 */}
      <div className="px-10 py-8">
        <h2 className="text-[16px] font-semibold mb-1">Environmental sensor heights</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          Reported measurement heights (metres) for the four core environmental variables.
          Dashed lines show the four standard heights used by ISO 7726 / ASHRAE 55.
        </p>
        <SensorHeightChart
          data={fig13_sensor_heights.data}
          variables={fig13_sensor_heights.variables}
        />
      </div>
    </div>
  )
}
