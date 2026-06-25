import { useMemo } from 'react'
import { ChapterHeader, ChapterSection } from '../components/Chapter.jsx'
import FigureCard from '../components/FigureCard.jsx'
import InteractiveBarChart from '../components/InteractiveBarChart.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'

function isNeutralPoint(value, label) {
  const l = String(label || '').toLowerCase()
  return l.includes('neutral') || Math.abs(Number(value)) < 0.001 || Math.abs(Number(value)) === 0.01
}

function pointColor({ value, label, comfortPole, min, max, lowColor, highColor, poleColors }) {
  if (isNeutralPoint(value, label)) return '#0A0A0A'
  if (poleColors && comfortPole) {
    const lowIsComfort = comfortPole === 'low'
    return value <= (min + max) / 2
      ? (lowIsComfort ? poleColors.comfort : poleColors.discomfort)
      : (lowIsComfort ? poleColors.discomfort : poleColors.comfort)
  }
  return value === min ? lowColor : value === max ? highColor : '#8A8A8A'
}

function ScaleAxisPlot({ studies, domain, lowColor, highColor, poleColors, titleSuffix }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const [domainMin, domainMax] = domain
  const width = 640
  const rowHeight = 7
  const padLeft = 22
  const height = Math.max(110, studies.length * rowHeight)
  const xScale = (v) => padLeft + ((v - domainMin) / (domainMax - domainMin)) * (width - padLeft - 8)

  const ordered = useMemo(() => [...studies].sort((a, b) => {
    const amin = Math.min(...a.range)
    const bmin = Math.min(...b.range)
    if (amin !== bmin) return amin - bmin
    const amax = Math.max(...a.range)
    const bmax = Math.max(...b.range)
    return amax - bmax
  }), [studies])

  const ticks = Array.from({ length: domainMax - domainMin + 1 }, (_, i) => domainMin + i)

  return (
    <div className="no-horizontal-scroll">
      <div className="font-data text-[10px] text-inkfaint mb-1.5">
        Studies are ordered by their minimum scale value. Each row shows every coded point on that study's scale; black marks neutral points where present.
      </div>
      <svg width={width} height={height + 28} className="font-data overflow-visible">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={xScale(v)} x2={xScale(v)} y1={0} y2={height} stroke="#E4E4E4" strokeWidth={1} />
            <text x={xScale(v)} y={height + 15} fontSize={10} fill="#8A8A8A" textAnchor="middle">{v}</text>
          </g>
        ))}
        {ordered.map((s, i) => {
          const y = i * rowHeight + rowHeight / 2
          const min = Math.min(...s.range)
          const max = Math.max(...s.range)
          return (
            <g key={`${s.id}-${i}`}>
              <line x1={xScale(min)} x2={xScale(max)} y1={y} y2={y} stroke="#BBBBBB" strokeWidth={0.8} opacity={0.75} />
              {s.range.map((v, idx) => {
                const label = s.labels[idx] || String(v)
                const c = pointColor({ value: v, label, comfortPole: s.comfort_pole, min, max, lowColor, highColor, poleColors })
                return (
                  <circle
                    key={`${s.id}-${idx}`}
                    cx={xScale(v)}
                    cy={y}
                    r={2.4}
                    fill={c}
                    className="cursor-default"
                    onMouseEnter={(e) => showTip(e, `${s.id}${titleSuffix ? ` · ${titleSuffix}` : ''}: ${v} = ${label}`)}
                    onMouseMove={moveTip}
                    onMouseLeave={hideTip}
                  />
                )
              })}
            </g>
          )
        })}
      </svg>
      <TooltipPortal tip={tip} />
    </div>
  )
}

function PointsBar({ distribution, total, color = '#0A0A0A' }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  return (
    <div className="space-y-1.5">
      {distribution.map((d) => (
        <div key={d.points} className="flex items-center gap-3 group">
          <span className="text-[12px] w-20 shrink-0 font-data">{d.points}-point</span>
          <div className="flex-1 h-5 rounded bg-line/50 overflow-hidden cursor-default"
            onMouseEnter={(e) => showTip(e, `${d.points}-point: ${d.count} of ${total} · ${((d.count / total) * 100).toFixed(1)}%`)}
            onMouseMove={moveTip} onMouseLeave={hideTip}>
            <div className="h-full group-hover:brightness-110" style={{ width: `${(d.count / Math.max(total, 1)) * 100}%`, background: '#0A0A0A' }} />
          </div>
          <span className="font-data text-[11px] w-16 text-right text-inkmid">{d.count} ({((d.count / total) * 100).toFixed(0)}%)</span>
        </div>
      ))}
      <div className="font-data text-[10px] text-inkfaint mt-1">n = {total} scales</div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

export default function ChapterQuestionnaires({ data }) {
  const { fig14_questionnaire_domains, fig15_tsv_scales, fig16_tcv_scales, chapter_completeness, summary } = data
  const tsvPct = ((fig15_tsv_scales.n_total / summary.n_experiments) * 100).toFixed(0)

  return (
    <div>
      <ChapterHeader
        eyebrow="Chapter 5 of 7"
        title="Measuring the perception"
        framing={
          <>
            <p>
              Subjective questionnaires sit alongside physiological measurement in most studies.
              This chapter looks at which questionnaire domains are used, and — for the two most common,
              thermal sensation and thermal comfort — exactly how their scales are worded and structured.
            </p>
            <p>
              We looked at scale structure specifically because two studies both reporting “TSV = +2” are
              not necessarily reporting the same thing if their underlying scales differ in point count,
              labels, or polarity. That heterogeneity is invisible unless the scales are laid side by side.
            </p>
          </>
        }
        headline={[
          { value: `${tsvPct}%`, label: 'of studies use a thermal sensation scale', color: '#5B5BFF' },
          { value: '77.8%', label: 'of TSV scales are the standard 7-point', color: '#FB3640' },
          { value: fig16_tcv_scales.n_total, label: 'comfort-scale studies, with no dominant format', color: '#FB3640' },
        ]}
      />

      <ChapterSection
        title="Questionnaire usage by domain"
        intro="Thermal sensation, comfort, preference, and acceptability dominate, but the full dataset includes a broader tail of domain-specific questionnaire types. Counts and percentages are shown within each questionnaire domain."
      >
        <div className="grid grid-cols-2 gap-x-10 gap-y-8 max-w-5xl">
          {Object.entries(fig14_questionnaire_domains).map(([domain, d], i) => (
            <FigureCard key={domain} figNumber={`30${String.fromCharCode(97 + i)}`} title={`${domain} (n=${d.n_any})`} commentary={null}>
              <InteractiveBarChart data={d.fields.map((f) => ({ label: f.field, count: f.count }))} total={d.n_any} color="#0A0A0A" height={16} />
            </FigureCard>
          ))}
        </div>
      </ChapterSection>

      <ChapterSection
        title="Scale heterogeneity: sensation vs. comfort"
        intro="TSV has a dominant standard format, but the precise point sets still vary. TCV is much more heterogeneous: point count, verbal anchors, and comfort polarity all shift between studies."
      >
        <FigureCard figNumber="31" title="Thermal Sensation Vote (TSV)" plotWidth={900} commentary={`${fig15_tsv_scales.n_total} studies' scales mapped onto a common cold → hot axis. Each row now shows every coded point entered in the dataset, ordered by the row's minimum value.`}>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2"><ScaleAxisPlot studies={fig15_tsv_scales.studies} domain={[-4, 8]} lowColor="#5B5BFF" highColor="#FB3640" titleSuffix="TSV" /></div>
            <div><h4 className="text-[11.5px] font-medium mb-2 text-inkmid">Points per scale</h4><PointsBar distribution={fig15_tsv_scales.points_distribution} total={fig15_tsv_scales.n_total} color="#0A0A0A" /></div>
          </div>
        </FigureCard>

        <FigureCard figNumber="32" title="Thermal Comfort Vote (TCV)" plotWidth={900} commentary={`${fig16_tcv_scales.n_total} studies' scales mapped onto a common axis. Endpoint colours follow meaning rather than raw number; neutral or near-neutral points are black.`}>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2"><ScaleAxisPlot studies={fig16_tcv_scales.studies} domain={[-4, 6]} poleColors={{ comfort: '#5B5BFF', discomfort: '#FB3640' }} titleSuffix="TCV" /></div>
            <div><h4 className="text-[11.5px] font-medium mb-2 text-inkmid">Points per scale</h4><PointsBar distribution={fig16_tcv_scales.points_distribution} total={fig16_tcv_scales.n_total} color="#0A0A0A" /></div>
          </div>
        </FigureCard>
      </ChapterSection>
    </div>
  )
}
