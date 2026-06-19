import { useMemo } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'

// Domain groupings matching the appendix's Figure 19 layout
const DOMAIN_GROUPS = {
  'PERIPHERAL THERMAL\nEXCHANGE': {
    color: '#D94F6E',
    signals: ['Skin temperature', 'Near body temperature', 'Heat flux', 'Skin blood flow'],
  },
  'CARDIOVASCULAR\nHEAT TRANSPORT': {
    color: '#4855C8',
    signals: ['Heart/Pulse rate', 'Blood pressure', 'Oxygen saturation'],
  },
  'CENTRAL THERMAL\nSTATE': {
    color: '#E07820',
    signals: ['Core/Body temperature', 'Exhaled breath temperature'],
  },
  'SUDOMOTOR /\nELECTRODERMAL': {
    color: '#B8C020',
    signals: ['Sweat indicators', 'Skin conductance'],
  },
  'NEURO-MUSCULAR\nELECTROPHYSIOLOGY': {
    color: '#8A8A86',
    signals: ['EEG', 'EMG', 'EOG', 'Movement', 'Respiration'],
  },
  'METABOLIC &\nBIOCHEMICAL': {
    color: '#BBBBBB',
    signals: ['Metabolic rate/Gas exchange', 'Biomarkers'],
  },
}

// Sensors to highlight; everything else is grouped into 'Other'
const TOP_SENSORS = [
  'Thermochron', 'Thermocouple', 'Infrared camera', 'Infrared thermometer', 'Dermal patch', 'RTD',
  'ECG', 'OHR/PPG', 'Digital sphygmomanometer', 'Pulse oximeter', 'Analog sphygmomanometer',
  'Ingestible pill', 'Thermistor', 'Probe', 'Infrared thermometer',
  'High precision scale', 'GSR/EDA', 'Hygrochron', 'Tewameter',
  '16-channel EEG', '4-channel EEG', '8-channel EEG', '2-channel EEG', '14-channel EEG',
  'Accelerometer', 'Respiration belt',
  'Indirect calorimetry', 'Blood', 'Saliva',
]

export default function Sankey({ data }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const overall = data.physio_signal_sensor.overall

  const { nodes, links, W, H } = useMemo(() => {
    const sigTotals = {}
    const sensorTotals = {}
    overall.forEach((r) => {
      sigTotals[r.signal] = (sigTotals[r.signal] || 0) + r.count
      const sen = TOP_SENSORS.includes(r['physio-sensing-method']) ? r['physio-sensing-method'] : 'Other sensors'
      sensorTotals[sen] = (sensorTotals[sen] || 0) + r.count
    })

    // Filter to signals with ≥ 5 occurrences
    const activeSignals = Object.keys(sigTotals).filter((s) => sigTotals[s] >= 5)

    // Build domain nodes
    const domainEntries = Object.entries(DOMAIN_GROUPS).map(([name, g]) => ({
      name, color: g.color,
      total: g.signals.reduce((sum, s) => sum + (sigTotals[s] || 0), 0),
    })).filter((d) => d.total > 0)

    // Build signal nodes (within active)
    const signalEntries = activeSignals.map((s) => {
      const domain = Object.entries(DOMAIN_GROUPS).find(([, g]) => g.signals.includes(s))
      return { name: s, total: sigTotals[s], color: domain ? domain[1].color : '#BBBBBB', domain: domain?.[0] }
    }).sort((a, b) => b.total - a.total)

    // Build sensor nodes, sorted by total
    const sensorEntries = Object.entries(sensorTotals)
      .map(([name, total]) => ({ name, total, color: '#A8A59C' }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 28) // top 28

    // Layout constants
    const W = 900
    const H = Math.max(600, signalEntries.length * 20)
    const NODE_W = 14
    const COL_DOMAIN = 20
    const COL_SIGNAL = 220
    const COL_SENSOR = 680

    // Vertical positioning: distribute evenly
    const totalSigH = H - 40
    const totalSenH = H - 40

    let y = 20
    const domainNodes = {}
    let domainY = 20
    domainEntries.forEach((d, i) => {
      const h = Math.max(18, (d.total / Math.max(...domainEntries.map(e => e.total))) * 140)
      domainNodes[d.name] = { ...d, x: COL_DOMAIN, y: domainY, h }
      domainY += h + 8
    })

    const sigNodes = {}
    signalEntries.forEach((s, i) => {
      const nodeH = Math.max(10, (s.total / signalEntries[0].total) * 40)
      sigNodes[s.name] = { ...s, x: COL_SIGNAL, y: 20 + i * (totalSigH / signalEntries.length), h: nodeH }
    })

    const senNodes = {}
    sensorEntries.forEach((s, i) => {
      const nodeH = Math.max(8, (s.total / sensorEntries[0].total) * 40)
      senNodes[s.name] = { ...s, x: COL_SENSOR, y: 20 + i * (totalSenH / sensorEntries.length), h: nodeH }
    })

    // Build links from signal → sensor
    const links = []
    overall.forEach((r) => {
      if (!sigNodes[r.signal]) return
      const senName = TOP_SENSORS.includes(r['physio-sensing-method']) ? r['physio-sensing-method'] : 'Other sensors'
      if (!senNodes[senName]) return
      links.push({
        signal: r.signal, sensor: senName, count: r.count,
        sigColor: sigNodes[r.signal].color,
      })
    })

    return {
      nodes: { domain: Object.values(domainNodes), signal: Object.values(sigNodes), sensor: Object.values(senNodes) },
      links, W, H,
    }
  }, [overall])

  return (
    <div>
      <PageHeader
        eyebrow="Analysis · Appendix Fig. 19"
        title="Signals & sensor types"
        description="How frequently each physiological signal is measured with each sensor type. Signals grouped by thermophysiological domain. Hover any flow for the exact count."
      />

      <div className="px-10 py-8">
        <p className="text-[13px] text-inkmid mb-6 max-w-2xl">
          Only signals measured in ≥5 experiments are shown. Each flow's thickness is proportional to
          the number of studies using that signal–sensor combination.
        </p>

        {/* Domain color legend */}
        <div className="flex flex-wrap gap-3 mb-6">
          {Object.entries(DOMAIN_GROUPS).map(([name, g]) => (
            <div key={name} className="flex items-center gap-1.5 text-[11px] text-inkmid">
              <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: g.color }} />
              <span>{name.replace('\n', ' ')}</span>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <svg width={W} height={H} className="font-data block">
            {/* Flow paths */}
            {links.map((l, i) => {
              const sig = nodes.signal.find((n) => n.name === l.signal)
              const sen = nodes.sensor.find((n) => n.name === l.sensor)
              if (!sig || !sen) return null
              const strokeW = Math.max(0.5, (l.count / 218) * 24)
              const x1 = sig.x + 14
              const y1 = sig.y + sig.h / 2
              const x2 = sen.x
              const y2 = sen.y + sen.h / 2
              const mx = (x1 + x2) / 2
              return (
                <path
                  key={i}
                  d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={l.sigColor}
                  strokeWidth={strokeW}
                  opacity={0.28}
                  className="cursor-default hover:opacity-70 transition-opacity"
                  onMouseEnter={(e) => showTip(e, `${l.signal} → ${l.sensor}: ${l.count} studies`)}
                  onMouseMove={moveTip}
                  onMouseLeave={hideTip}
                />
              )
            })}

            {/* Signal nodes */}
            {nodes.signal.map((n) => (
              <g key={n.name}
                onMouseEnter={(e) => showTip(e, `${n.name}: ${n.total} studies`)}
                onMouseMove={moveTip}
                onMouseLeave={hideTip}
                className="cursor-default"
              >
                <rect x={n.x} y={n.y} width={14} height={Math.max(n.h, 6)} fill={n.color} rx={2} />
                <text x={n.x + 18} y={n.y + Math.max(n.h, 6) / 2 + 4} fontSize={10.5} fill="#1A1A18">
                  {n.name}, {n.total}
                </text>
              </g>
            ))}

            {/* Sensor nodes */}
            {nodes.sensor.map((n) => (
              <g key={n.name}
                onMouseEnter={(e) => showTip(e, `${n.name}: ${n.total} studies`)}
                onMouseMove={moveTip}
                onMouseLeave={hideTip}
                className="cursor-default"
              >
                <rect x={n.x} y={n.y} width={14} height={Math.max(n.h, 6)} fill="#A8A59C" rx={2} />
                <text x={n.x + 18} y={n.y + Math.max(n.h, 6) / 2 + 4} fontSize={10.5} fill="#1A1A18">
                  {n.name}
                </text>
              </g>
            ))}

            {/* Column labels */}
            <text x={220} y={12} fontSize={10} fill="#A8A59C" fontWeight="600">SIGNAL</text>
            <text x={680} y={12} fontSize={10} fill="#A8A59C" fontWeight="600">SENSOR TYPE</text>
          </svg>
        </div>
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}
