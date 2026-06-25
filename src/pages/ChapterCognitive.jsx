import { useMemo, useState } from 'react'
import { ChapterHeader, ChapterSection } from '../components/Chapter.jsx'
import FigureCard from '../components/FigureCard.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'

const TYPE_COLORS = {
  'Performance task': '#0A0A0A',
  'Subjective scale': '#0A0A0A',
  'Stress induction': '#0A0A0A',
}

function domainColor() { return '#0A0A0A' }

function CognitiveSankey({ cognitive }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const [selected, setSelected] = useState(null)

  const leftNodes = useMemo(() => {
    const totals = {}
    cognitive.flow_type_domain.forEach((r) => { totals[r.measure_type] = (totals[r.measure_type] || 0) + r.count })
    return Object.entries(totals).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total)
  }, [cognitive])

  const midNodes = useMemo(() => {
    const totals = {}
    cognitive.flow_type_domain.forEach((r) => { totals[r.domain_short] = (totals[r.domain_short] || 0) + r.count })
    return Object.entries(totals).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total)
  }, [cognitive])

  const rightNodes = useMemo(() => {
    const totals = {}
    cognitive.flow_domain_instrument.forEach((r) => { totals[r.instrument] = (totals[r.instrument] || 0) + r.count })
    return Object.entries(totals).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total)
  }, [cognitive])

  const layoutNodes = (entries, x, px, minH, gap) => {
    let y = 26
    return entries.map((e) => {
      const h = Math.max(minH, e.total * px)
      const node = { ...e, x, y, h }
      y += h + gap
      return node
    })
  }

  const left = layoutNodes(leftNodes, 170, 4.2, 24, 14)
  const mid = layoutNodes(midNodes, 470, 2.3, 14, 7)
  const right = layoutNodes(rightNodes, 790, 1.5, 12, 6)
  const leftBy = Object.fromEntries(left.map((n) => [n.name, n]))
  const midBy = Object.fromEntries(mid.map((n) => [n.name, n]))
  const rightBy = Object.fromEntries(right.map((n) => [n.name, n]))
  const links = [
    ...cognitive.flow_type_domain.map((r) => ({ from: leftBy[r.measure_type], to: midBy[r.domain_short], count: r.count, a: r.measure_type, b: r.domain_short, type: 'type-domain' })),
    ...cognitive.flow_domain_instrument.map((r) => ({ from: midBy[r.domain_short], to: rightBy[r.instrument], count: r.count, a: r.domain_short, b: r.instrument, type: 'domain-instrument' })),
  ].filter((l) => l.from && l.to)
  const H = Math.max(240, ...[...left, ...mid, ...right].map((n) => n.y + n.h)) + 18
  const maxFlow = Math.max(...links.map((l) => l.count), 1)

  const domainToType = {}
  cognitive.flow_type_domain.forEach((r) => { domainToType[r.domain_short] = r.measure_type })
  const instrumentToDomains = {}
  cognitive.flow_domain_instrument.forEach((r) => {
    if (!instrumentToDomains[r.instrument]) instrumentToDomains[r.instrument] = []
    instrumentToDomains[r.instrument].push(r.domain_short)
  })

  const isConnected = (obj) => {
    if (!selected) return true
    if (selected.kind === 'type') {
      return obj.name === selected.name || obj.a === selected.name || obj.measure_type === selected.name ||
        domainToType[obj.name] === selected.name || domainToType[obj.a] === selected.name ||
        (instrumentToDomains[obj.name] || []).some((d) => domainToType[d] === selected.name)
    }
    if (selected.kind === 'domain') {
      return obj.name === selected.name || obj.a === selected.name || obj.b === selected.name ||
        (instrumentToDomains[obj.name] || []).includes(selected.name) || domainToType[obj.name] === selected.name
    }
    if (selected.kind === 'instrument') {
      const domains = instrumentToDomains[selected.name] || []
      const types = new Set(domains.map((d) => domainToType[d]))
      return obj.name === selected.name || obj.b === selected.name || domains.includes(obj.name) || domains.includes(obj.a) || domains.includes(obj.b) || types.has(obj.name) || types.has(obj.a)
    }
    return true
  }

  const nodeLabel = (name, total) => `${name} ${total}`
  const pathFor = (l) => {
    const x1 = l.from.x + 14
    const y1 = l.from.y + l.from.h / 2
    const x2 = l.to.x
    const y2 = l.to.y + l.to.h / 2
    const cx = (x1 + x2) / 2
    return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`
  }

  const renderNode = (n, kind, color, labelSide = 'right') => {
    const on = isConnected({ name: n.name, [kind]: n.name, measure_type: n.name })
    return (
      <g key={`${kind}-${n.name}`} className="cursor-pointer" style={{ opacity: on ? 1 : 0.14 }}
        onClick={() => setSelected(selected?.kind === kind && selected.name === n.name ? null : { kind, name: n.name })}
        onMouseEnter={(e) => showTip(e, `${n.name}: ${n.total} study uses. Click to highlight connected paths.`)}
        onMouseMove={moveTip} onMouseLeave={hideTip}>
        <rect x={n.x} y={n.y} width={14} height={n.h} rx={2} fill={color} />
        <text x={labelSide === 'left' ? n.x - 8 : n.x + 20} y={n.y + n.h / 2 + 3.5} fontSize={10.5} textAnchor={labelSide === 'left' ? 'end' : 'start'} fill="#0A0A0A">{nodeLabel(n.name, n.total)}</text>
      </g>
    )
  }

  return (
    <div>
      {selected && <button onClick={() => setSelected(null)} className="mb-3 px-2.5 py-1 rounded text-[11px] font-data bg-line/60 text-inkmid hover:bg-line">✕ clear selection ({selected.name})</button>}
      <svg width={1080} height={H + 24} className="font-data block overflow-visible">
        <text x={170} y={12} fontSize={10} fill="#8A8A8A" fontWeight="600" textAnchor="middle">MEASURE TYPE</text>
        <text x={470} y={12} fontSize={10} fill="#8A8A8A" fontWeight="600">DOMAIN</text>
        <text x={790} y={12} fontSize={10} fill="#8A8A8A" fontWeight="600">INSTRUMENT</text>
        {links.map((l, i) => (
          <path key={i} d={pathFor(l)} fill="none" stroke="#0A0A0A" strokeWidth={Math.max(1.2, (l.count / maxFlow) * 22)} opacity={isConnected(l) ? 0.22 : 0.03}
            onMouseEnter={(e) => showTip(e, `${l.type === 'type-domain' ? `${l.a} → ${l.b}` : `${l.a} → ${l.b}`}: ${l.count} studies`)}
            onMouseMove={moveTip} onMouseLeave={hideTip} />
        ))}
        {left.map((n) => renderNode(n, 'type', TYPE_COLORS[n.name] || '#0A0A0A', 'left'))}
        {mid.map((n) => renderNode(n, 'domain', domainColor(n.name), 'right'))}
        {right.map((n) => renderNode(n, 'instrument', '#0A0A0A', 'right'))}
      </svg>
      <p className="font-data text-[10px] text-inkfaint mt-2">Each flow is counted in unique-study uses. Click a node in any column to isolate all connected paths.</p>
      <TooltipPortal tip={tip} />
    </div>
  )
}

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
              <div className="h-full group-hover:brightness-110" style={{ width: `${(buckets[k] / Math.max(nStudies, 1)) * 100}%`, background: '#5B5BFF' }} />
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
  const subjectiveCount = cognitive_tests.domain_totals.filter((d) => String(d.domain).startsWith('Subjective scale')).reduce((a, d) => a + d.count, 0)
  const performanceCount = cognitive_tests.domain_totals.filter((d) => String(d.domain).startsWith('Performance task')).reduce((a, d) => a + d.count, 0)
  const pct = ((cognitive_tests.n_studies_with_cognitive_test / cognitive_tests.n_total_studies) * 100).toFixed(0)

  return (
    <div>
      <ChapterHeader
        eyebrow="Chapter 6 of 7"
        title="Measuring the mental-load"
        framing={
          <>
            <p>
              A minority of studies pair physiological measurement with a cognitive or mental-load
              test — asking not just how the body responds to a thermal condition, but how the mind
              performs under it.
            </p>
            <p>
              The raw corpus field is free text with no controlled vocabulary. We harmonised every
              entry into a canonical instrument and then classified it as a performance task, a
              subjective self-report scale, or a stress-induction protocol.
            </p>
          </>
        }
        headline={[
          { value: `${pct}%`, label: 'of studies apply a cognitive test', color: '#5B5BFF' },
          { value: cognitive_tests.instrument_totals.length, label: 'canonical instruments after harmonisation', color: '#FB3640' },
          { value: performanceCount, label: 'performance-task uses', color: '#FB3640' },
          { value: subjectiveCount, label: 'subjective-scale uses', color: '#8A8A8A' },
        ]}
      />

      <ChapterSection
        title="What kind of measure is actually used"
        intro="Performance tasks and subjective scales are mixed in one raw dataset field, but they are not the same type of evidence. The Sankey makes that split explicit, then shows which domains and instruments each branch contains. Colours are intentionally not used as a second encoding; all nodes are black and links scale only by count."
      >
        <FigureCard figNumber="33" title="Cognitive measure type → domain → instrument" plotWidth={1080} commentary="The first column distinguishes what the participant does (performance task), what they rate about themselves (subjective scale), or whether the entry is a deliberate stress-induction protocol. Flow width is proportional to unique-study use count.">
          <CognitiveSankey cognitive={cognitive_tests} />
        </FigureCard>
      </ChapterSection>


    </div>
  )
}
