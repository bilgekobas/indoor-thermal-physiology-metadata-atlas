import { ChapterHeader, ChapterSection } from '../components/Chapter.jsx'
import CompletenessStrip from '../components/CompletenessStrip.jsx'
import FigureCard from '../components/FigureCard.jsx'
import InteractiveBarChart from '../components/InteractiveBarChart.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'

function ScaleAxisPlot({ studies, domain, lowColor, highColor, poleColors }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const [domainMin, domainMax] = domain
  const width = 560, rowHeight = 3
  const height = studies.length * rowHeight
  const xScale = (v) => ((v - domainMin) / (domainMax - domainMin)) * width
  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height + 24} className="font-data overflow-visible">
        <line x1={xScale(0)} x2={xScale(0)} y1={0} y2={height} stroke="#D5FF99" strokeWidth={1} opacity={0.4} />
        {studies.map((s, i) => {
          const y = i * rowHeight + rowHeight / 2
          const low = Math.min(...s.range), high = Math.max(...s.range)
          // For TCV, color by semantic meaning (comfort_pole) rather than raw
          // numeric position — some studies put "comfortable" at the negative
          // end, others at the positive end. Coloring by number alone would
          // flip the meaning for ~25% of studies. TSV has no comfort_pole
          // field (its polarity is consistent, cold always negative) so it
          // falls back to the simple numeric low/high coloring.
          let lowDotColor = lowColor, highDotColor = highColor
          if (poleColors && s.comfort_pole) {
            const lowIsComfort = s.comfort_pole === 'low'
            lowDotColor = lowIsComfort ? poleColors.comfort : poleColors.discomfort
            highDotColor = lowIsComfort ? poleColors.discomfort : poleColors.comfort
          }
          return (
            <g key={i} className="cursor-default"
              onMouseEnter={(e) => showTip(e, `${s.id}: ${s.points}-point (${s.labels[0]} → ${s.labels[s.labels.length - 1]})${s.comfort_pole ? `, comfortable end: ${s.comfort_pole === 'low' ? 'low' : 'high'} numbers` : ''}`)}
              onMouseMove={moveTip} onMouseLeave={hideTip}>
              <line x1={xScale(low)} x2={xScale(high)} y1={y} y2={y} stroke="#8A8A8A" strokeWidth={0.8} opacity={0.5} />
              <circle cx={xScale(low)} cy={y} r={1.6} fill={lowDotColor} />
              <circle cx={xScale(high)} cy={y} r={1.6} fill={highDotColor} />
            </g>
          )
        })}
        {Array.from({ length: domainMax - domainMin + 1 }, (_, i) => domainMin + i).map((v) => (
          <text key={v} x={xScale(v)} y={height + 14} fontSize={10} fill="#8A8A8A" textAnchor="middle">{v}</text>
        ))}
      </svg>
      <TooltipPortal tip={tip} />
    </div>
  )
}

function PointsBar({ distribution, total, color }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const max = distribution.reduce((m, d) => (d.count > m ? d.count : m), 1)
  return (
    <div className="space-y-1.5">
      {distribution.map((d) => (
        <div key={d.points} className="flex items-center gap-3 group">
          <span className="text-[12px] w-20 shrink-0 font-data">{d.points}-point</span>
          <div className="flex-1 h-5 rounded bg-line/50 overflow-hidden cursor-default"
            onMouseEnter={(e) => showTip(e, `${d.points}-point: ${d.count} of ${total} · ${((d.count / total) * 100).toFixed(1)}%`)}
            onMouseMove={moveTip} onMouseLeave={hideTip}>
            <div className="h-full group-hover:brightness-110" style={{ width: `${(d.count / max) * 100}%`, background: color }} />
          </div>
          <span className="font-data text-[11px] w-10 text-right text-inkmid">{d.count}</span>
        </div>
      ))}
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
        eyebrow="Chapter 5 of 8"
        title="What people were asked"
        framing={
          <>
            <p>
              Subjective questionnaires sit alongside physiological measurement in almost every study.
              This chapter looks at which questionnaire domains are used, and — for the two most common,
              thermal sensation and thermal comfort — exactly how their scales are worded and structured.
            </p>
            <p>
              We looked at scale structure specifically because two studies both reporting "TSV = +2" are
              not necessarily reporting the same thing if their underlying scales differ in point count,
              labels, or polarity. That heterogeneity is invisible unless the scales are laid side by side.
            </p>
          </>
        }
        headline={[
          { value: `${tsvPct}%`, label: 'of studies use a thermal sensation scale', color: '#5B5BFF' },
          { value: '77.8%', label: 'of TSV scales are the standard 7-point', color: '#FB3640' },
          { value: fig16_tcv_scales.n_total, label: 'distinct comfort-scale studies, no dominant format', color: '#FB3640' },
        ]}
      />

      <CompletenessStrip fields={chapter_completeness.questionnaires.fields} nStudies={chapter_completeness.questionnaires.n_studies} />

      <ChapterSection
        title="Questionnaire usage by domain"
        intro="251 of 269 experiments (93%) include at least one thermal questionnaire. Every other domain is far less common — humidity questionnaires appear in 23 experiments, air movement in 19 — included only when the study's specific focus calls for them."
      >
        <div className="grid grid-cols-2 gap-x-10 gap-y-8 max-w-4xl">
          {Object.entries(fig14_questionnaire_domains).map(([domain, d]) => (
            <FigureCard key={domain} title={`${domain} (n=${d.n_any})`} commentary={null}>
              <InteractiveBarChart data={d.fields.map((f) => ({ label: f.field, count: f.count }))} total={summary.n_experiments} color="#5B5BFF" maxBars={6} height={16} />
            </FigureCard>
          ))}
        </div>
      </ChapterSection>

      <ChapterSection
        title="Scale heterogeneity: sensation vs. comfort"
        intro="77.8% of thermal sensation scales use the standard 7-point format — one number accounts for most of the field. Thermal comfort has no equivalent: the most common point-count (6-point) covers only 33 of 114 studies (29%), with 4-, 5-, and 7-point scales each close behind. Point count, labels, and even the direction of the scale vary widely."
      >
        <FigureCard figNumber="15" title="Thermal Sensation Vote (TSV)" plotWidth={780} commentary={`${fig15_tsv_scales.n_total} studies' scales mapped onto a common axis (cold → hot). One line per study.`}>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2"><ScaleAxisPlot studies={fig15_tsv_scales.studies} domain={[-4, 8]} lowColor="#5B5BFF" highColor="#FB3640" /></div>
            <div><h4 className="text-[11.5px] font-medium mb-2 text-inkmid">Points per scale</h4><PointsBar distribution={fig15_tsv_scales.points_distribution} total={fig15_tsv_scales.n_total} color="#5B5BFF" /></div>
          </div>
        </FigureCard>

        <FigureCard figNumber="16" title="Thermal Comfort Vote (TCV)" plotWidth={780} commentary={`${fig16_tcv_scales.n_total} studies' scales mapped the same way (most comfortable → least), colored by what each endpoint actually means rather than its raw number — about a quarter of studies put "comfortable" at the negative end, the rest at the positive end, so numeric position alone would mislabel them.`}>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2"><ScaleAxisPlot studies={fig16_tcv_scales.studies} domain={[-4, 6]} poleColors={{ comfort: '#FB3640', discomfort: '#FB3640' }} /></div>
            <div><h4 className="text-[11.5px] font-medium mb-2 text-inkmid">Points per scale</h4><PointsBar distribution={fig16_tcv_scales.points_distribution} total={fig16_tcv_scales.n_total} color="#FB3640" /></div>
          </div>
        </FigureCard>
      </ChapterSection>
    </div>
  )
}
