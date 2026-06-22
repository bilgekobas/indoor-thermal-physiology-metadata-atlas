import { ChapterHeader, ChapterSection } from '../components/Chapter.jsx'
import FigureCard from '../components/FigureCard.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'

const DOMAIN_PALETTE = {
  'Performance task — arithmetic': '#D94F6E',
  'Performance task — working memory': '#4855C8',
  'Performance task — inhibition/attention': '#E07820',
  'Performance task — sustained attention': '#B8C020',
  'Performance task — psychomotor speed': '#8A8A86',
  'Performance task — memory': '#C9698A',
  'Performance task — attention': '#7A8FD9',
  'Performance task — reasoning': '#E0A020',
  'Performance task — multi-domain battery': '#5F5E58',
  'Performance task — cue utilization/attention': '#A8A59C',
  'Performance task — creativity': '#C9C6BC',
  'Performance task — executive function': '#9B6B8F',
  'Performance task — perception': '#6E8FD9',
  'Performance task — planning': '#4B6B33',
  'Subjective scale — sleepiness/alertness': '#D9B3BE',
  'Subjective scale — work performance': '#B3BEDC',
  'Subjective scale — workload': '#E0C9A0',
  'Subjective scale — mood': '#C9D9A0',
  'Subjective scale — fatigue': '#E0D0D0',
  'Subjective scale — attention': '#D0D0E0',
  'Stress induction protocol': '#1A1A18',
}
function domainColor(d) { return DOMAIN_PALETTE[d] || '#BBBBBB' }
const isSubjective = (d) => d.startsWith('Subjective scale')

function CognitiveInstrumentChart({ instrumentTotals, nStudies }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const top = instrumentTotals.slice(0, 20)
  const max = top.reduce((m, r) => (r.count > m ? r.count : m), 1)
  return (
    <div>
      <div className="font-data text-[10px] text-inkfaint mb-1.5">
        Bar length relative to the largest value shown. n = {nStudies} cognitive-testing studies total (a study can use more than one instrument).
      </div>
      <div className="space-y-1.5">
        {top.map((r) => (
          <div key={r.instrument} className="flex items-center gap-3 group">
            <span className="text-[12px] w-52 shrink-0 truncate" title={r.instrument}>{r.instrument}</span>
            <div className="flex-1 h-4 rounded bg-line/50 overflow-hidden cursor-default"
              onMouseEnter={(e) => showTip(e, `${r.instrument}: ${r.count} of ${nStudies} cognitive-test studies (${r.domain})`)}
              onMouseMove={moveTip} onMouseLeave={hideTip}>
              <div className="h-full group-hover:brightness-110" style={{ width: `${(r.count / max) * 100}%`, background: domainColor(r.domain) }} />
            </div>
            <span className="font-data text-[11px] w-16 text-right text-inkmid">{r.count} ({((r.count / nStudies) * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

function CognitiveDomainChart({ domainTotals, nStudies }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const max = domainTotals.reduce((m, r) => (r.count > m ? r.count : m), 1)
  return (
    <div>
      <div className="font-data text-[10px] text-inkfaint mb-1.5">
        Bar length relative to the largest value shown. n = {nStudies} cognitive-testing studies total (a study can touch more than one domain).
      </div>
      <div className="space-y-1.5">
        {domainTotals.map((r) => (
          <div key={r.domain} className="flex items-center gap-3 group">
            <span className="text-[12px] w-56 shrink-0 truncate" title={r.domain}>{r.domain}</span>
            <div className="flex-1 h-4 rounded bg-line/50 overflow-hidden cursor-default"
              onMouseEnter={(e) => showTip(e, `${r.domain}: ${r.count} of ${nStudies} cognitive-test studies`)}
              onMouseMove={moveTip} onMouseLeave={hideTip}>
              <div className="h-full group-hover:brightness-110" style={{ width: `${(r.count / max) * 100}%`, background: domainColor(r.domain) }} />
            </div>
            <span className="font-data text-[11px] w-16 text-right text-inkmid">{r.count} ({((r.count / nStudies) * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

// How many instruments the typical cognitive-test study applies — a quick
// indication of whether studies run one targeted task or a full battery.
function BatterySizeChart({ studyInstruments }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const counts = studyInstruments.map((s) => s.instrument.length)
  const nStudies = counts.length
  const buckets = {}
  counts.forEach((c) => {
    const key = c >= 6 ? '6+' : String(c)
    buckets[key] = (buckets[key] || 0) + 1
  })
  const order = ['1', '2', '3', '4', '5', '6+']
  // Bug fix: use reduce instead of Math.max(...spread)
  const max = Object.values(buckets).reduce((m, v) => (v > m ? v : m), 1)
  return (
    <div>
      <div className="font-data text-[10px] text-inkfaint mb-1.5">n = {nStudies} cognitive-testing studies total.</div>
      <div className="space-y-1.5">
        {order.filter((k) => buckets[k]).map((k) => (
          <div key={k} className="flex items-center gap-3 group">
            <span className="text-[12px] w-28 shrink-0 font-data">{k} instrument{k !== '1' ? 's' : ''}</span>
            <div className="flex-1 h-4 rounded bg-line/50 overflow-hidden cursor-default"
              onMouseEnter={(e) => showTip(e, `${buckets[k]} studies use ${k} instrument${k !== '1' ? 's' : ''}`)}
              onMouseMove={moveTip} onMouseLeave={hideTip}>
              <div className="h-full group-hover:brightness-110" style={{ width: `${(buckets[k] / max) * 100}%`, background: '#4855C8' }} />
            </div>
            <span className="font-data text-[11px] w-16 text-right text-inkmid">{buckets[k]} ({((buckets[k] / nStudies) * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

export default function ChapterCognitive({ data }) {
  const { cognitive_tests } = data
  const subjectiveCount = cognitive_tests.domain_totals.filter((d) => isSubjective(d.domain)).reduce((a, d) => a + d.count, 0)
  const performanceCount = cognitive_tests.domain_totals.filter((d) => !isSubjective(d.domain)).reduce((a, d) => a + d.count, 0)
  const pct = ((cognitive_tests.n_studies_with_cognitive_test / cognitive_tests.n_total_studies) * 100).toFixed(0)

  return (
    <div>
      <ChapterHeader
        eyebrow="Chapter 6 of 8"
        title="Cognitive and mental-load testing"
        framing={
          <>
            <p>
              A minority of studies pair physiological measurement with a cognitive or mental-load
              test — asking not just how the body responds to a thermal condition, but how the mind
              performs under it. This chapter looks at which instruments are used and what they
              actually measure.
            </p>
            <p>
              The raw corpus field is free text with no controlled vocabulary — the same task appears
              as "n-back", "N-back", and "n-back tasks" across different studies, and some entries are
              full prose descriptions of a multi-part battery rather than a single instrument name. We
              harmonised every entry into a canonical instrument and, separately, classified each one
              into an actual performance task (something the participant <em>does</em>, like Stroop or
              mental arithmetic) versus a subjective self-report scale (something the participant{' '}
              <em>rates about themselves</em>, like NASA-TLX or the Karolinska Sleepiness Scale) — a
              distinction the raw field does not make, but that matters for interpreting what
              "cognitive performance" results actually mean.
            </p>
          </>
        }
        headline={[
          { value: `${pct}%`, label: 'of studies apply a cognitive test', color: '#4855C8' },
          { value: cognitive_tests.instrument_totals.length, label: 'canonical instruments after harmonisation', color: '#D94F6E' },
          { value: performanceCount, label: 'performance-task uses', color: '#E07820' },
          { value: subjectiveCount, label: 'subjective-scale uses', color: '#8A8A86' },
        ]}
      />

      <ChapterSection
        title="What kind of measure is actually used"
        intro="Performance tasks and subjective self-report scales are lumped into one field in the raw corpus, but they measure fundamentally different things. Arithmetic, working memory, and inhibition/attention tasks are the most common performance domains; subjective workload and sleepiness scales appear almost as often as any single performance domain."
      >
        <FigureCard title="Cognitive domain measured" plotWidth={680} commentary='Domains prefixed "Performance task" are something the participant does; domains prefixed "Subjective scale" are something the participant rates about themselves.'>
          <CognitiveDomainChart domainTotals={cognitive_tests.domain_totals} nStudies={cognitive_tests.n_studies_with_cognitive_test} />
        </FigureCard>

        <FigureCard title="Specific instruments used" plotWidth={680} commentary="Mental arithmetic is the single most-used instrument (18 of 56 cognitive-testing studies, 32%), followed by the Stroop task. Color matches the domain chart above. After harmonising casing and naming variants (e.g. 'n-back', 'N-back', 'n-back tasks' → one entry), the field still hasn't converged on a standard battery — most of the 20 instruments shown appear in fewer than 12 studies each.">
          <CognitiveInstrumentChart instrumentTotals={cognitive_tests.instrument_totals} nStudies={cognitive_tests.n_studies_with_cognitive_test} />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="One task, or a full battery?"
        intro="Some studies run a single targeted task; others apply a long battery covering several domains at once."
      >
        <FigureCard title="Instruments applied per study" commentary="13 of 56 studies (23%) use a single targeted instrument, but an equal number (13, 23%) apply six or more in one session — a full battery rather than a focused test. The rest fall in between.">
          <BatterySizeChart studyInstruments={cognitive_tests.study_instruments} />
        </FigureCard>
      </ChapterSection>
    </div>
  )
}
