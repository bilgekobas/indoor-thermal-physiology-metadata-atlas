import { useMemo } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'

// Domain groupings, in mechanism order matching the appendix (peripheral exchange
// → cardiovascular transport → central state → sudomotor → neuro-muscular → metabolic).
// This fixed order also defines the top-to-bottom signal ordering within the chart.
const DOMAIN_ORDER = [
  'PERIPHERAL THERMAL EXCHANGE',
  'CARDIOVASCULAR HEAT TRANSPORT',
  'CENTRAL THERMAL STATE',
  'SUDOMOTOR / ELECTRODERMAL',
  'NEURO-MUSCULAR ELECTROPHYSIOLOGY',
  'METABOLIC & BIOCHEMICAL',
]
const DOMAIN_GROUPS = {
  'PERIPHERAL THERMAL EXCHANGE': {
    color: '#D94F6E',
    signals: ['Skin temperature', 'Near body temperature', 'Heat flux', 'Skin blood flow'],
  },
  'CARDIOVASCULAR HEAT TRANSPORT': {
    color: '#4855C8',
    signals: ['Heart/Pulse rate', 'Blood pressure', 'Oxygen saturation'],
  },
  'CENTRAL THERMAL STATE': {
    color: '#E07820',
    signals: ['Core/Body temperature', 'Exhaled breath temperature'],
  },
  'SUDOMOTOR / ELECTRODERMAL': {
    color: '#B8C020',
    signals: ['Sweat indicators', 'Skin conductance'],
  },
  'NEURO-MUSCULAR ELECTROPHYSIOLOGY': {
    color: '#8A8A86',
    signals: ['EEG', 'EMG', 'EOG', 'Movement', 'Respiration'],
  },
  'METABOLIC & BIOCHEMICAL': {
    color: '#BBBBBB',
    signals: ['Metabolic rate/Gas exchange', 'Biomarkers'],
  },
}

// ---- Layout engine: proper Sankey-style stacking -------------------------
// Heights are computed first (proportional to flow), THEN stacked with a
// fixed gap — never independently positioned — so nodes cannot overlap
// regardless of how skewed the count distribution is.
function layoutColumn(entries, { x, gap, pxPerUnit, minH }) {
  let y = 0
  const positioned = []
  entries.forEach((e) => {
    const h = Math.max(minH, e.total * pxPerUnit)
    positioned.push({ ...e, x, y, h })
    y += h + gap
  })
  return { nodes: positioned, totalHeight: y - gap }
}

export default function Sankey({ data }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const overall = data.physio_signal_sensor.overall
  const brandPairs = data.sensor_type_brand.data

  const layout = useMemo(() => {
    const sigTotals = {}
    overall.forEach((r) => { sigTotals[r.signal] = (sigTotals[r.signal] || 0) + r.count })

    // Active signals: >= 5 occurrences, ordered by fixed mechanism/domain order,
    // then by descending total within each domain (matches the appendix's layout).
    const activeSignalNames = Object.keys(sigTotals).filter((s) => sigTotals[s] >= 5)
    const signalEntries = []
    DOMAIN_ORDER.forEach((domain) => {
      const group = DOMAIN_GROUPS[domain]
      const inDomain = group.signals
        .filter((s) => activeSignalNames.includes(s))
        .sort((a, b) => sigTotals[b] - sigTotals[a])
      inDomain.forEach((s) => {
        signalEntries.push({ name: s, total: sigTotals[s], color: group.color, domain })
      })
    })

    // Sensor nodes: every distinct sensor type used by an active signal — no "Other" bucket.
    const sensorTotals = {}
    overall.forEach((r) => {
      if (sigTotals[r.signal] >= 5) {
        sensorTotals[r['physio-sensing-method']] = (sensorTotals[r['physio-sensing-method']] || 0) + r.count
      }
    })
    // Order sensors by the domain/signal they're most associated with, so related
    // sensor types cluster together vertically rather than being sorted purely by count.
    const sensorDomain = {}
    overall.forEach((r) => {
      const sig = signalEntries.find((s) => s.name === r.signal)
      if (!sig) return
      const key = r['physio-sensing-method']
      if (!sensorDomain[key]) sensorDomain[key] = {}
      sensorDomain[key][sig.domain] = (sensorDomain[key][sig.domain] || 0) + r.count
    })
    const sensorEntries = Object.entries(sensorTotals)
      .map(([name, total]) => {
        const domainCounts = sensorDomain[name] || {}
        const primaryDomain = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
        return { name, total, color: '#A8A59C', domain: primaryDomain }
      })
      .sort((a, b) => {
        const da = DOMAIN_ORDER.indexOf(a.domain)
        const db = DOMAIN_ORDER.indexOf(b.domain)
        if (da !== db) return da - db
        return b.total - a.total
      })

    // Brand nodes: every brand attached to an active sensor type, used in ≥2 studies.
    // (Single-study brands are real data but would add ~70 one-off nodes with no
    // comparative value — same "exclude the long tail" rule applied to signals.)
    const activeSensorNames = sensorEntries.map((s) => s.name)
    const brandTotalsAll = {}
    brandPairs.forEach((r) => {
      if (activeSensorNames.includes(r['physio-sensing-method'])) {
        brandTotalsAll[r['physio-sensor-brand']] = (brandTotalsAll[r['physio-sensor-brand']] || 0) + r.count
      }
    })
    const brandTotals = Object.fromEntries(Object.entries(brandTotalsAll).filter(([, v]) => v >= 2))
    const nSingleStudyBrands = Object.keys(brandTotalsAll).length - Object.keys(brandTotals).length
    const sensorOfBrand = {}
    brandPairs.forEach((r) => {
      if (!activeSensorNames.includes(r['physio-sensing-method'])) return
      const b = r['physio-sensor-brand']
      if (!sensorOfBrand[b]) sensorOfBrand[b] = {}
      sensorOfBrand[b][r['physio-sensing-method']] = (sensorOfBrand[b][r['physio-sensing-method']] || 0) + r.count
    })
    const sensorOrderIndex = {}
    sensorEntries.forEach((s, i) => { sensorOrderIndex[s.name] = i })
    const brandEntries = Object.entries(brandTotals)
      .map(([name, total]) => {
        const sensors = sensorOfBrand[name] || {}
        const primarySensor = Object.entries(sensors).sort((a, b) => b[1] - a[1])[0]?.[0]
        return { name, total, primarySensor }
      })
      .sort((a, b) => {
        const ia = sensorOrderIndex[a.primarySensor] ?? 999
        const ib = sensorOrderIndex[b.primarySensor] ?? 999
        if (ia !== ib) return ia - ib
        return b.total - a.total
      })

    // Layout: heights proportional to total, stacked with fixed gap (no overlap possible)
    const COL_DOMAIN = 16
    const COL_SIGNAL = 230
    const COL_SENSOR = 560
    const COL_BRAND = 860

    const sigLayout = layoutColumn(signalEntries, { x: COL_SIGNAL, gap: 6, pxPerUnit: 0.62, minH: 8 })
    const senLayout = layoutColumn(sensorEntries, { x: COL_SENSOR, gap: 5, pxPerUnit: 0.62, minH: 7 })
    const brandLayout = layoutColumn(brandEntries, { x: COL_BRAND, gap: 5, pxPerUnit: 0.62, minH: 7 })

    const H = Math.max(sigLayout.totalHeight, senLayout.totalHeight, brandLayout.totalHeight) + 40

    // Domain group brackets (left column), height = sum of its signals' stacked heights
    const domainLayout = []
    let dy = 0
    DOMAIN_ORDER.forEach((domain) => {
      const sigsInDomain = sigLayout.nodes.filter((n) => n.domain === domain)
      if (sigsInDomain.length === 0) return
      const top = sigsInDomain[0].y
      const bottom = sigsInDomain[sigsInDomain.length - 1].y + sigsInDomain[sigsInDomain.length - 1].h
      domainLayout.push({ name: domain, color: DOMAIN_GROUPS[domain].color, y: top, h: bottom - top })
    })

    // signal -> sensor links
    const sigSenLinks = []
    overall.forEach((r) => {
      const sig = sigLayout.nodes.find((n) => n.name === r.signal)
      const sen = senLayout.nodes.find((n) => n.name === r['physio-sensing-method'])
      if (!sig || !sen) return
      sigSenLinks.push({ from: sig, to: sen, count: r.count, label: `${r.signal} → ${r['physio-sensing-method']}` })
    })

    // sensor -> brand links
    const senBrandLinks = []
    brandPairs.forEach((r) => {
      const sen = senLayout.nodes.find((n) => n.name === r['physio-sensing-method'])
      const brand = brandLayout.nodes.find((n) => n.name === r['physio-sensor-brand'])
      if (!sen || !brand) return
      senBrandLinks.push({ from: sen, to: brand, count: r.count, label: `${r['physio-sensing-method']} → ${r['physio-sensor-brand']}` })
    })

    return {
      domain: domainLayout, signal: sigLayout.nodes, sensor: senLayout.nodes, brand: brandLayout.nodes,
      sigSenLinks, senBrandLinks,
      W: COL_BRAND + 220, H,
      maxFlow: Math.max(...overall.map((r) => r.count), 1),
      nSingleStudyBrands,
    }
  }, [overall, brandPairs])

  // Helper to draw a smooth flow ribbon between two node edges with thickness = count
  function FlowPath({ link, color, maxFlow, columnGap }) {
    const strokeW = Math.max(0.6, (link.count / maxFlow) * 22)
    const x1 = link.from.x + 14
    const y1 = link.from.y + link.from.h / 2
    const x2 = link.to.x
    const y2 = link.to.y + link.to.h / 2
    const mx = (x1 + x2) / 2
    return (
      <path
        d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeW}
        opacity={0.26}
        className="cursor-default hover:opacity-70 transition-opacity"
        onMouseEnter={(e) => showTip(e, `${link.label}: ${link.count} studies`)}
        onMouseMove={moveTip}
        onMouseLeave={hideTip}
      />
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Analysis · Appendix Fig. 19, extended"
        title="Signals, sensor types & sensor brands"
        description="Every signal measured in ≥5 experiments, every sensor type used to measure it, and every commercial brand behind that sensor type. Ordered by thermophysiological mechanism, matching the appendix. Hover any flow or node for exact counts."
      />

      <div className="px-10 py-8">
        <p className="text-[13px] text-inkmid mb-6 max-w-2xl">
          No "Other" bucket for signals or sensor types — every one reported for these ≥5-study
          signals is shown individually. Sensor brands used in only a single study
          ({layout.nSingleStudyBrands} of them) are omitted to keep the brand column readable;
          everything shown recurs across at least two studies. Flow thickness is proportional to
          the number of studies using that combination.
        </p>

        <div className="flex flex-wrap gap-3 mb-6">
          {DOMAIN_ORDER.map((name) => (
            <div key={name} className="flex items-center gap-1.5 text-[11px] text-inkmid">
              <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: DOMAIN_GROUPS[name].color }} />
              <span>{name}</span>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <svg width={layout.W} height={layout.H} className="font-data block">
            {/* Domain brackets */}
            {layout.domain.map((d) => (
              <rect key={d.name} x={0} y={d.y} width={6} height={Math.max(d.h, 4)} fill={d.color} rx={1.5} />
            ))}

            {/* signal -> sensor flows */}
            {layout.sigSenLinks.map((l, i) => (
              <FlowPath key={`ss-${i}`} link={l} color={l.from.color} maxFlow={layout.maxFlow} />
            ))}
            {/* sensor -> brand flows */}
            {layout.senBrandLinks.map((l, i) => (
              <FlowPath key={`sb-${i}`} link={l} color="#A8A59C" maxFlow={layout.maxFlow} />
            ))}

            {/* Signal nodes */}
            {layout.signal.map((n) => (
              <g key={n.name}
                onMouseEnter={(e) => showTip(e, `${n.name}: ${n.total} studies`)}
                onMouseMove={moveTip} onMouseLeave={hideTip} className="cursor-default">
                <rect x={n.x} y={n.y} width={14} height={n.h} fill={n.color} rx={2} />
                <text x={n.x + 18} y={n.y + n.h / 2 + 3.5} fontSize={10.5} fill="#1A1A18">
                  {n.name}, {n.total}
                </text>
              </g>
            ))}

            {/* Sensor nodes */}
            {layout.sensor.map((n) => (
              <g key={n.name}
                onMouseEnter={(e) => showTip(e, `${n.name}: ${n.total} studies`)}
                onMouseMove={moveTip} onMouseLeave={hideTip} className="cursor-default">
                <rect x={n.x} y={n.y} width={14} height={n.h} fill="#5F5E58" rx={2} />
                <text x={n.x + 18} y={n.y + n.h / 2 + 3.5} fontSize={10} fill="#1A1A18">
                  {n.name}
                </text>
              </g>
            ))}

            {/* Brand nodes */}
            {layout.brand.map((n) => (
              <g key={n.name}
                onMouseEnter={(e) => showTip(e, `${n.name}: ${n.total} studies`)}
                onMouseMove={moveTip} onMouseLeave={hideTip} className="cursor-default">
                <rect x={n.x} y={n.y} width={14} height={n.h} fill="#A8A59C" rx={2} />
                <text x={n.x + 18} y={n.y + n.h / 2 + 3.5} fontSize={10} fill="#1A1A18">
                  {n.name}
                </text>
              </g>
            ))}

            {/* Column labels */}
            <text x={230} y={12} fontSize={10} fill="#A8A59C" fontWeight="600">SIGNAL</text>
            <text x={560} y={12} fontSize={10} fill="#A8A59C" fontWeight="600">SENSOR TYPE</text>
            <text x={860} y={12} fontSize={10} fill="#A8A59C" fontWeight="600">SENSOR BRAND</text>
          </svg>
        </div>
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}
