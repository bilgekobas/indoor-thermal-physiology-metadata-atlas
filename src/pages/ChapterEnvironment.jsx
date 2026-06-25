import { useMemo } from 'react'
import { ChapterHeader, ChapterSection } from '../components/Chapter.jsx'
import FigureCard from '../components/FigureCard.jsx'
import CooccurrenceMatrix from '../components/CooccurrenceMatrix.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'

function quantile(sorted, q) {
  if (!sorted.length) return null
  if (sorted.length === 1) return sorted[0]
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  const next = sorted[base + 1] ?? sorted[base]
  return sorted[base] + rest * (next - sorted[base])
}

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b)
  if (!sorted.length) return null
  const q1 = quantile(sorted, 0.25)
  const med = quantile(sorted, 0.5)
  const q3 = quantile(sorted, 0.75)
  const iqr = q3 - q1
  const loFence = q1 - 1.5 * iqr
  const hiFence = q3 + 1.5 * iqr
  const inlier = sorted.filter((v) => v >= loFence && v <= hiFence)
  return {
    min: inlier[0] ?? sorted[0],
    max: inlier[inlier.length - 1] ?? sorted[sorted.length - 1],
    q1, med, q3,
  }
}

function densityProfile(values, domainMin, domainMax, bins = 90) {
  if (!values.length) return []
  const bw = (domainMax - domainMin) / bins
  const sd = Math.max(0.06, (quantile([...values].sort((a, b) => a - b), 0.75) - quantile([...values].sort((a, b) => a - b), 0.25)) / 5 || 0.12)
  return Array.from({ length: bins + 1 }, (_, i) => {
    const xv = domainMin + i * bw
    const d = values.reduce((a, v) => a + Math.exp(-0.5 * ((xv - v) / sd) ** 2), 0)
    return { x: xv, d }
  })
}

function SensorHeightOverallChart({ heightData, variables }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const W = 780
  const left = 170
  const right = 54
  const top = 28
  const rowH = 62
  const H = top + variables.length * rowH + 58
  const domainMin = 0
  const domainMax = 3.5
  const x = (v) => left + ((v - domainMin) / (domainMax - domainMin)) * W

  const byVar = useMemo(() => {
    const map = {}
    variables.forEach((v) => { map[v] = [] })
    heightData.forEach((r) => { if (map[r.variable]) map[r.variable].push({ id: r.id, height: Number(r.height) }) })
    return map
  }, [heightData, variables])

  const refHeights = [0.1, 0.6, 1.1, 1.7]
  const ticks = Array.from({ length: 8 }, (_, i) => i * 0.5)

  return (
    <div>
      <svg width={left + W + right} height={H} className="font-data block overflow-visible">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={top - 14} y2={H - 44} stroke="#E4E4E4" strokeWidth={1} />
            <text x={x(t)} y={H - 24} fontSize={9.5} fill="#8A8A8A" textAnchor="middle">{t.toFixed(1)}</text>
          </g>
        ))}
        {refHeights.map((h) => (
          <line key={`ref-${h}`} x1={x(h)} x2={x(h)} y1={top - 14} y2={H - 44} stroke="#BBBBBB" strokeWidth={1} strokeDasharray="3 3" />
        ))}
        {variables.map((v, vi) => {
          const rowY = top + vi * rowH + rowH / 2
          const vals = byVar[v].map((d) => d.height).filter((d) => Number.isFinite(d))
          const s = stats(vals)
          const profile = densityProfile(vals, domainMin, domainMax)
          const maxD = Math.max(...profile.map((p) => p.d), 1)
          const halfMax = 15
          const upper = profile.map((p) => `${x(p.x)},${rowY - (p.d / maxD) * halfMax}`).join(' ')
          const lower = [...profile].reverse().map((p) => `${x(p.x)},${rowY + (p.d / maxD) * halfMax}`).join(' ')
          return (
            <g key={v}>
              <text x={left - 10} y={rowY + 3.5} fontSize={11} fill="#4A4A4A" textAnchor="end">{v}</text>
              <line x1={left} x2={left + W} y1={rowY} y2={rowY} stroke="#F4F4F4" />
              {vals.length > 1 && <polygon points={`${upper} ${lower}`} fill="#D9D9D9" opacity={0.55} />}
              {byVar[v].map((d, i) => (
                <circle
                  key={`${d.id}-${i}`}
                  cx={x(d.height)}
                  cy={rowY + Math.sin(i * 7.17) * 9}
                  r={2.6}
                  fill="#0A0A0A"
                  opacity={0.28}
                  className="cursor-default"
                  onMouseEnter={(e) => showTip(e, `${v}: ${d.height} m (${d.id})`)}
                  onMouseMove={moveTip}
                  onMouseLeave={hideTip}
                />
              ))}
              {s && (
                <g>
                  <line x1={x(s.min)} x2={x(s.max)} y1={rowY} y2={rowY} stroke="#0A0A0A" strokeWidth={1.25} />
                  <line x1={x(s.min)} x2={x(s.min)} y1={rowY - 7} y2={rowY + 7} stroke="#0A0A0A" strokeWidth={1.1} />
                  <line x1={x(s.max)} x2={x(s.max)} y1={rowY - 7} y2={rowY + 7} stroke="#0A0A0A" strokeWidth={1.1} />
                  <rect x={x(s.q1)} y={rowY - 10} width={Math.max(1, x(s.q3) - x(s.q1))} height={20} fill="none" stroke="#0A0A0A" strokeWidth={1.35} />
                  <line x1={x(s.med)} x2={x(s.med)} y1={rowY - 11} y2={rowY + 11} stroke="#0A0A0A" strokeWidth={1.6} />
                </g>
              )}
            </g>
          )
        })}
        <text x={left + W / 2} y={H - 4} fontSize={10.5} fill="#8A8A8A" textAnchor="middle">Sensor height (m)</text>
      </svg>
      <div className="font-data text-[10px] text-inkfaint mt-1">
        Dots are individual reported heights; the light violin estimates their distribution. Unfilled boxplots show IQR, median, and non-outlier range. Dotted vertical lines mark 0.1, 0.6, 1.1, and 1.7 m.
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

export default function ChapterEnvironment({ data }) {
  const { fig12_env_cooccurrence, fig13_sensor_heights, chapter_completeness } = data
  const coreTotal = fig12_env_cooccurrence.totals['Air temp.']

  return (
    <div>
      <ChapterHeader
        eyebrow="Chapter 4 of 7"
        title="Measuring the environment"
        framing={
          <>
            <p>
              Alongside the body, every study describes the room it happened in. This chapter looks
              at which environmental variables are measured, which ones tend to be measured together,
              and at what height sensors are placed — a detail that materially changes what “air
              temperature” actually means in a given study.
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
          { value: coreTotal, label: 'studies report air temperature', color: '#FB3640' },
          { value: fig13_sensor_heights.data.length, label: 'height observations parsed', color: '#5B5BFF' },
          { value: '4', label: 'standard ISO 7726 heights', color: '#FB3640' },
        ]}
      />

      <ChapterSection
        title="What gets measured together"
        intro="Air temperature, relative humidity, air velocity, and globe temperature form the field's standard environmental core. Other variables — surface temperature, CO₂, light, sound — appear much more selectively."
      >
        <FigureCard figNumber="28" title="Environmental variable co-occurrence" plotWidth={760} commentary="Air temperature is the anchor variable; relative humidity, air velocity, and globe temperature cluster tightly around it. Everything else is a minority add-on, included only when a study's specific question calls for it.">
          <CooccurrenceMatrix labels={fig12_env_cooccurrence.labels} matrix={fig12_env_cooccurrence.matrix} cellSize={28} />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Where sensors are placed"
        intro="Most reported heights sit at one of the standard ankle, abdomen, seated-head, or standing-head levels, but a substantial minority do not. The scatter view below keeps every reported value visible while showing the distribution for each core variable."
      >
        <FigureCard figNumber="29" title="Sensor heights for the core four variables" plotWidth={980} commentary="The four rows show the full distribution of reported heights for air temperature, relative humidity, air velocity, and globe temperature. Dots are individual reported values; the boxplot in each row summarizes the same distribution. Standard reference heights are marked with dotted vertical lines.">
          <SensorHeightOverallChart heightData={fig13_sensor_heights.data} variables={fig13_sensor_heights.variables} />
        </FigureCard>
      </ChapterSection>
    </div>
  )
}
