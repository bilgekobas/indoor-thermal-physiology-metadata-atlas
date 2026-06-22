import { useMemo } from 'react'
import { ChapterHeader, ChapterSection } from '../components/Chapter.jsx'
import CompletenessStrip from '../components/CompletenessStrip.jsx'
import FigureCard from '../components/FigureCard.jsx'
import CooccurrenceMatrix from '../components/CooccurrenceMatrix.jsx'
import OverallByPeriod from '../components/OverallByPeriod.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'

const VAR_COLORS = {
  'Air temperature': '#D94F6E', 'Relative humidity': '#4855C8', 'Air velocity': '#E07820', 'Globe temperature': '#B8C020',
}
function SensorHeightChart({ heightData, variables }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const W = 600, H = 180, domainMin = 0, domainMax = 3.5
  const xScale = (v) => ((v - domainMin) / (domainMax - domainMin)) * W
  const byVar = useMemo(() => {
    const m = {}
    variables.forEach((v) => { m[v] = [] })
    heightData.forEach((r) => { if (m[r.variable]) m[r.variable].push(r.height) })
    return m
  }, [heightData, variables])
  const refHeights = [{ h: 0.1, l: '0.1m' }, { h: 0.6, l: '0.6m' }, { h: 1.1, l: '1.1m' }, { h: 1.7, l: '1.7m' }]
  return (
    <div className="overflow-x-auto">
      <div className="font-data text-[10px] text-inkfaint mb-1">
        Each dot is one reported height value, in metres (x-axis). Dots are jittered vertically within their row only to avoid overlap — vertical position carries no meaning.
      </div>
      <svg width={W} height={H + 24} className="font-data block">
        {refHeights.map((r) => (
          <g key={r.h}>
            <line x1={xScale(r.h)} x2={xScale(r.h)} y1={0} y2={H} stroke="#E2DED4" strokeWidth={1} strokeDasharray="4 2" />
            <text x={xScale(r.h)} y={H + 18} fontSize={9} fill="#C9C6BC" textAnchor="middle">{r.l}</text>
          </g>
        ))}
        {variables.map((v, vi) => {
          const rowH = H / variables.length, rowY = vi * rowH + rowH / 2
          const color = VAR_COLORS[v] || '#8A8A86'
          return byVar[v].map((h, i) => (
            <circle key={i} cx={xScale(h)} cy={rowY + Math.sin(i * 7.3) * rowH * 0.35} r={3.5} fill={color} opacity={0.55}
              className="cursor-default" onMouseEnter={(e) => showTip(e, `${v}: ${h}m`)} onMouseMove={moveTip} onMouseLeave={hideTip} />
          ))
        })}
        {variables.map((v, vi) => {
          const rowH = H / variables.length
          return (<text key={v} x={-4} y={vi * rowH + rowH / 2 + 4} fontSize={11} fill="#5F5E58" textAnchor="end">{v}</text>)
        })}
      </svg>
      <TooltipPortal tip={tip} />
    </div>
  )
}

function median(arr) {
  if (!arr.length) return null
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function SensorHeightByPeriod({ heightByPeriodData, variables, periods }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const byVarPeriod = useMemo(() => {
    const m = {}
    variables.forEach((v) => {
      m[v] = {}
      periods.forEach((p) => { m[v][p] = [] })
    })
    heightByPeriodData.forEach((r) => { if (m[r.variable] && m[r.variable][r.period]) m[r.variable][r.period].push(r.height) })
    return m
  }, [heightByPeriodData, variables, periods])

  const W = 560, rowH = 30
  const domainMin = 0, domainMax = 2
  const xScale = (v) => ((v - domainMin) / (domainMax - domainMin)) * W

  return (
    <div className="overflow-x-auto">
      <svg width={W + 100} height={variables.length * rowH + 24} className="font-data block">
        {[0, 0.5, 1, 1.5, 2].map((v) => (
          <line key={v} x1={xScale(v) + 90} x2={xScale(v) + 90} y1={0} y2={variables.length * rowH} stroke="#E2DED4" strokeWidth={1} />
        ))}
        {variables.map((v, vi) => {
          const y = vi * rowH + rowH / 2
          const points = periods.map((p) => ({ p, med: median(byVarPeriod[v][p]), n: byVarPeriod[v][p].length }))
          const valid = points.filter((pt) => pt.med !== null)
          return (
            <g key={v}>
              <text x={0} y={y + 4} fontSize={10.5} fill="#5F5E58">{v}</text>
              {valid.length > 1 && (
                <polyline points={valid.map((pt) => `${xScale(pt.med) + 90},${y}`).join(' ')} fill="none" stroke="#C9C6BC" strokeWidth={1} />
              )}
              {valid.map((pt) => (
                <circle key={pt.p} cx={xScale(pt.med) + 90} cy={y} r={4} fill={VAR_COLORS[v] || '#8A8A86'}
                  className="cursor-default"
                  onMouseEnter={(e) => showTip(e, `${v}, ${pt.p}: median height ${pt.med}m (n=${pt.n})`)}
                  onMouseMove={moveTip} onMouseLeave={hideTip} />
              ))}
            </g>
          )
        })}
        {[0, 0.5, 1, 1.5, 2].map((v) => (
          <text key={v} x={xScale(v) + 90} y={variables.length * rowH + 16} fontSize={9} fill="#A8A59C" textAnchor="middle">{v}m</text>
        ))}
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-inkmid">
        {periods.map((p) => <span key={p} className="font-data">{p}</span>)}
      </div>
      <p className="text-[11px] text-inkfaint mt-1">Each dot is the median reported height for that variable in that period; line connects periods chronologically.</p>
      <TooltipPortal tip={tip} />
    </div>
  )
}

export default function ChapterEnvironment({ data }) {
  const { fig12_env_cooccurrence, fig13_sensor_heights, sensor_heights_by_period, chapter_completeness, summary } = data
  const coreFour = ['Air temp.', 'Relative humidity', 'Air velocity', 'Globe temp.']
  const coreTotal = fig12_env_cooccurrence.totals['Air temp.']

  return (
    <div>
      <ChapterHeader
        eyebrow="Chapter 4 of 8"
        title="Measurements from the environment"
        framing={
          <>
            <p>
              Alongside the body, every study describes the room it happened in. This chapter looks
              at which environmental variables are measured, which ones tend to be measured together,
              and at what height sensors are placed — a detail that materially changes what "air
              temperature" actually means in a given study.
            </p>
            <p>
              We looked for these fields because thermal comfort and heat-balance models depend on a
              specific quartet of variables (air temperature, humidity, air velocity, globe temperature);
              whether a study reports all four, and at a standard height, determines whether its
              environment can be reconstructed and compared at all.
            </p>
          </>
        }
        headline={[
          { value: coreTotal, label: 'studies report air temperature', color: '#D94F6E' },
          { value: fig13_sensor_heights.data.length, label: 'height observations parsed', color: '#4855C8' },
          { value: '4', label: 'standard ISO 7726 heights', color: '#E07820' },
        ]}
      />

      <CompletenessStrip fields={chapter_completeness.env_measurement.fields} nStudies={chapter_completeness.env_measurement.n_studies} />

      <ChapterSection
        title="What gets measured together"
        intro="Air temperature (151 studies), relative humidity (124), air velocity (105), and globe temperature (84) form a standard core that's usually measured together. Other variables — surface temperature, CO2, light, sound — appear in fewer than 30 studies each, added selectively depending on the study's specific focus."
      >
        <FigureCard figNumber="12" title="Environmental variable co-occurrence" plotWidth={760} commentary="Air temperature is measured in 151 studies, relative humidity in 124 — and every one of those 124 also measures air temperature. Air velocity (105 studies) and globe temperature (84) overlap nearly as tightly with the other three. Surface temperature, wet-bulb temperature, sound, and light each appear in fewer than 30 studies, usually added only when a study's specific question calls for them.">
          <CooccurrenceMatrix labels={fig12_env_cooccurrence.labels} matrix={fig12_env_cooccurrence.matrix} cellSize={28} />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Where sensors are placed"
        intro="74% of reported heights (537 of 722) sit exactly at one of the four standard positions matching ankle, abdomen, seated head, and standing head level — but the remaining quarter fall in between or omit height entirely."
      >
        <FigureCard figNumber="13" title="Sensor heights for the core four variables" commentary="537 of 722 reported heights (74%) sit exactly at one of the four ISO 7726 / ASHRAE 55 standard heights (0.1, 0.6, 1.1, 1.7m). The remaining quarter fall in between or at non-standard positions, which is enough divergence that two studies' 'air temperature' readings aren't always describing the same point in the room.">
          <OverallByPeriod
            renderOverall={() => (
              <SensorHeightChart heightData={fig13_sensor_heights.data} variables={fig13_sensor_heights.variables} />
            )}
            renderByPeriod={() => (
              <SensorHeightByPeriod heightByPeriodData={sensor_heights_by_period.data} variables={fig13_sensor_heights.variables} periods={sensor_heights_by_period.periods} />
            )}
          />
        </FigureCard>
      </ChapterSection>
    </div>
  )
}
