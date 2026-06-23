import { useMemo, useState } from 'react'
import { ChapterHeader, ChapterSection } from '../components/Chapter.jsx'
import CompletenessStrip from '../components/CompletenessStrip.jsx'
import FigureCard from '../components/FigureCard.jsx'
import InteractiveBarChart from '../components/InteractiveBarChart.jsx'
import CooccurrenceMatrix from '../components/CooccurrenceMatrix.jsx'
import BodySiteMap from '../components/BodySiteMap.jsx'
import OverallByPeriod, { PeriodHeatmap } from '../components/OverallByPeriod.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'

const SENSOR_PALETTE = ['#5B5BFF', '#0A0A0A', '#FB3640', '#8A8A8A', '#BBBBBB', '#4A4A4A', '#BBBBBB']

function SensorStackChart({ signalData, periods }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const { data, sensor_order, period_totals } = signalData
  const byPeriod = useMemo(() => {
    const map = {}
    periods.forEach((p) => { map[p] = {} })
    data.forEach((r) => { if (map[r.period]) map[r.period][r.sensor_grp] = r.count })
    return map
  }, [data, periods])
  return (
    <div>
      <div className="font-data text-[10px] text-inkfaint mb-1">y-axis: % of that period's studies (measuring this signal) using each sensor type</div>
      <div className="flex gap-3 items-end h-28 mb-2">
        {periods.map((p) => {
          const total = period_totals[p] || 0
          const m = byPeriod[p]
          return (
            <div key={p} className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col-reverse h-20 rounded-sm overflow-hidden">
                {sensor_order.map((sensor, si) => {
                  const c = m[sensor] || 0
                  if (c === 0 || total === 0) return null
                  return (
                    <div key={sensor} style={{ height: `${(c / total) * 100}%`, background: SENSOR_PALETTE[si % SENSOR_PALETTE.length] }}
                      className="cursor-default hover:brightness-110"
                      onMouseEnter={(e) => showTip(e, `${sensor}, ${p}: ${c} of ${total} · ${((c / total) * 100).toFixed(1)}%`)}
                      onMouseMove={moveTip} onMouseLeave={hideTip} />
                  )
                })}
              </div>
              <div className="font-data text-[10px] text-inkfaint mt-1.5">{p}</div>
              <div className="font-data text-[9px] text-inkfaint/70">n={total}</div>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {sensor_order.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5 text-[11px] text-inkmid">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: SENSOR_PALETTE[i % SENSOR_PALETTE.length] }} />{s}
          </div>
        ))}
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}


function SensorEvolutionToggle({ signals, evoData, periods }) {
  const [active, setActive] = useState(signals[0] || '')
  if (!signals.length || !active) return <div className="text-[12px] text-inkfaint">No data available.</div>
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {signals.map((sig) => (
          <button
            key={sig}
            onClick={() => setActive(sig)}
            className={`px-3 py-1 rounded text-[11.5px] font-data transition-colors ${active === sig ? 'bg-ink text-paper' : 'bg-line/50 text-inkmid hover:bg-line'}`}
          >
            {sig}
          </button>
        ))}
      </div>
      <SensorStackChart signalData={evoData.signals[active]} periods={periods} />
    </div>
  )
}

// ── Sankey (signal -> sensor type -> brand) ────────────────────────────
const DOMAIN_ORDER = [
  'PERIPHERAL THERMAL EXCHANGE', 'CARDIOVASCULAR HEAT TRANSPORT', 'CENTRAL THERMAL STATE',
  'SUDOMOTOR / ELECTRODERMAL', 'NEURO-MUSCULAR ELECTROPHYSIOLOGY', 'METABOLIC & BIOCHEMICAL',
]
const DOMAIN_GROUPS = {
  'PERIPHERAL THERMAL EXCHANGE': { color: '#5B5BFF', signals: ['Skin temperature', 'Near body temperature', 'Heat flux', 'Skin blood flow'] },
  'CARDIOVASCULAR HEAT TRANSPORT': { color: '#FF4DA6', signals: ['Heart/Pulse rate', 'Blood pressure', 'Oxygen saturation'] },
  'CENTRAL THERMAL STATE': { color: '#FB3640', signals: ['Core/Body temperature', 'Exhaled breath temperature'] },
  'SUDOMOTOR / ELECTRODERMAL': { color: '#8A63FF', signals: ['Sweat indicators', 'Skin conductance'] },
  'NEURO-MUSCULAR ELECTROPHYSIOLOGY': { color: '#4A4A4A', signals: ['EEG', 'EMG', 'EOG', 'Movement', 'Respiration'] },
  'METABOLIC & BIOCHEMICAL': { color: '#BBBBBB', signals: ['Metabolic rate/Gas exchange', 'Biomarkers'] },
}
function layoutColumn(entries, { x, gap, pxPerUnit, minH }) {
  let y = 0
  const nodes = entries.map((e) => {
    const h = Math.max(minH, e.total * pxPerUnit)
    const n = { ...e, x, y, h }
    y += h + gap
    return n
  })
  return { nodes, totalHeight: y - gap }
}

function SignalSensorBrandSankey({ overall, brandModelData }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  // Selection state for click-to-isolate: null = nothing selected (show
  // everything at normal opacity). Otherwise { level: 'signal'|'sensor'|'brand', name }.
  const [selected, setSelected] = useState(null)

  const layout = useMemo(() => {
    const sigTotals = {}
    overall.forEach((r) => { sigTotals[r.signal] = (sigTotals[r.signal] || 0) + r.count })
    const activeSignalNames = Object.keys(sigTotals).filter((s) => sigTotals[s] >= 5)
    const signalEntries = []
    DOMAIN_ORDER.forEach((domain) => {
      const group = DOMAIN_GROUPS[domain]
      group.signals.filter((s) => activeSignalNames.includes(s)).sort((a, b) => sigTotals[b] - sigTotals[a])
        .forEach((s) => signalEntries.push({ name: s, total: sigTotals[s], color: group.color, domain }))
    })

    const sensorTotals = {}
    overall.forEach((r) => { if (sigTotals[r.signal] >= 5) sensorTotals[r['physio-sensing-method']] = (sensorTotals[r['physio-sensing-method']] || 0) + r.count })
    const sensorDomain = {}
    overall.forEach((r) => {
      const sig = signalEntries.find((s) => s.name === r.signal)
      if (!sig) return
      const key = r['physio-sensing-method']
      if (!sensorDomain[key]) sensorDomain[key] = {}
      sensorDomain[key][sig.domain] = (sensorDomain[key][sig.domain] || 0) + r.count
    })
    const sensorEntries = Object.entries(sensorTotals).map(([name, total]) => {
      const domainCounts = sensorDomain[name] || {}
      const primaryDomain = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
      return { name, total, color: DOMAIN_GROUPS[primaryDomain]?.color || '#8A8A8A', domain: primaryDomain }
    }).sort((a, b) => {
      const da = DOMAIN_ORDER.indexOf(a.domain), db = DOMAIN_ORDER.indexOf(b.domain)
      return da !== db ? da - db : b.total - a.total
    })
    const activeSensorNames = sensorEntries.map((s) => s.name)

    // Brand totals are derived directly from brand_model_reference (signal +
    // sensing_method + brand from the raw rows). Brands connect to SENSOR
    // TYPE here, not to signal — but a sensor type can be shared by more
    // than one signal (e.g. 'Digital sphygmomanometer' is used for both
    // Blood pressure and Heart/Pulse rate; 'Infrared thermometer' for both
    // Core/Body temperature and Skin temperature), so brand counts are
    // aggregated per (signal, sensor type) pair first and only THEN summed
    // up to one sensor-type total for display — summing brand totals
    // directly by sensor-type name alone would silently double-count a
    // brand wherever its sensor type is shared across signals (this is the
    // exact OMRON bug from before, recurring one level over).
    const brandsBySensorType = {} // sensorType -> { brand -> total count }
    const brandSensorSignalRows = [] // flat rows for tooltip-level detail
    brandModelData.forEach((r) => {
      if (r.brand === 'NR' || !activeSensorNames.includes(r.sensing_method)) return
      if (!brandsBySensorType[r.sensing_method]) brandsBySensorType[r.sensing_method] = {}
      brandsBySensorType[r.sensing_method][r.brand] = (brandsBySensorType[r.sensing_method][r.brand] || 0) + r.count
      brandSensorSignalRows.push(r)
    })

    // Top-3-per-sensor-type, no "Other" bucket (per request) — sensor types
    // with more than 3 brands simply show their top 3; the rest are not
    // shown as a node, but remain visible via the sensor-type node's own
    // total and the chapter's brand reference table (/devices) for anyone
    // who needs the full list.
    const brandEntries = []
    const brandLinksRaw = [] // { sensorType, brandKey, count }
    sensorEntries.forEach((sen) => {
      const brands = brandsBySensorType[sen.name] || {}
      const sorted = Object.entries(brands).sort((a, b) => b[1] - a[1]).slice(0, 3)
      sorted.forEach(([name, count]) => {
        const key = `${sen.name}::${name}`
        brandEntries.push({ key, name, total: count, sensorType: sen.name, color: sen.color })
        brandLinksRaw.push({ sensorType: sen.name, brandKey: key, count })
      })
    })

    const COL_SIGNAL = 190, COL_SENSOR = 440, COL_BRAND = 700
    const sigLayout = layoutColumn(signalEntries, { x: COL_SIGNAL, gap: 6, pxPerUnit: 0.62, minH: 8 })
    const senLayout = layoutColumn(sensorEntries, { x: COL_SENSOR, gap: 5, pxPerUnit: 0.62, minH: 7 })
    // Brand column is grouped by SENSOR TYPE (matching brand's actual
    // parent in this Sankey), laid out as one continuous stacked column
    // ordered to match sensor-type order so a sensor type's brands cluster
    // near its row.
    const brandBySensorOrder = []
    sensorEntries.forEach((sen) => {
      brandEntries.filter((b) => b.sensorType === sen.name).forEach((b) => brandBySensorOrder.push(b))
    })
    const brandLayout = layoutColumn(brandBySensorOrder, { x: COL_BRAND, gap: 4, pxPerUnit: 0.62, minH: 7 })

    const H = Math.max(sigLayout.totalHeight, senLayout.totalHeight, brandLayout.totalHeight) + 40

    const sigSenLinks = []
    overall.forEach((r) => {
      const sig = sigLayout.nodes.find((n) => n.name === r.signal)
      const sen = senLayout.nodes.find((n) => n.name === r['physio-sensing-method'])
      if (!sig || !sen) return
      sigSenLinks.push({ from: sig, to: sen, count: r.count, label: `${r.signal} → ${r['physio-sensing-method']}`, signal: r.signal, sensor: r['physio-sensing-method'], color: sig.color })
    })
    // Sensor type -> brand: brand's real parent in the data.
    const senBrandLinks = []
    brandLinksRaw.forEach((r) => {
      const sen = senLayout.nodes.find((n) => n.name === r.sensorType)
      const brand = brandLayout.nodes.find((n) => n.key === r.brandKey)
      if (!sen || !brand) return
      senBrandLinks.push({ from: sen, to: brand, count: r.count, label: `${r.sensorType} → ${brand.name}`, sensor: r.sensorType, brandKey: r.brandKey, color: sen.color })
    })

    return {
      signal: sigLayout.nodes, sensor: senLayout.nodes, brand: brandLayout.nodes,
      sigSenLinks, senBrandLinks, W: COL_BRAND + 190, H,
      maxFlow: Math.max(...overall.map((r) => r.count), 1),
      signalDenom: signalEntries.reduce((a, d) => a + d.total, 0) || 1,
      sensorDenom: sensorEntries.reduce((a, d) => a + d.total, 0) || 1,
      nTotalBrands: new Set(brandModelData.filter((r) => r.brand !== 'NR').map((r) => r.brand)).size,
    }
  }, [overall, brandModelData])

  // Is a given link/node "active" under the current selection? Returns
  // true if nothing is selected (show everything normally) or if the
  // link/node touches the selected signal/sensor/brand. Selecting a brand
  // also keeps its parent sensor type's signal->sensor link active, so the
  // full path back to signal stays traceable, not just the one brand edge.
  const isActive = (obj) => {
    if (!selected) return true
    if (selected.level === 'signal') {
      const connectedSensors = new Set(layout.sigSenLinks.filter((l) => l.signal === selected.name).map((l) => l.sensor))
      if (obj.signal === selected.name) return true
      if (obj.sensor && connectedSensors.has(obj.sensor)) return true
      if (obj.brandKey) {
        const sensorOfBrand = obj.brandKey.split('::')[0]
        return connectedSensors.has(sensorOfBrand)
      }
      return false
    }
    if (selected.level === 'sensor') {
      if (obj.sensor === selected.name) return true
      if (obj.signal) return layout.sigSenLinks.some((l) => l.sensor === selected.name && l.signal === obj.signal)
      if (obj.brandKey) return obj.brandKey.split('::')[0] === selected.name
      return false
    }
    if (selected.level === 'brand') {
      const sensorOfBrand = selected.name.split('::')[0]
      if (obj.brandKey === selected.name) return true
      if (obj.sensor === sensorOfBrand) return true
      if (obj.signal) return layout.sigSenLinks.some((l) => l.sensor === sensorOfBrand && l.signal === obj.signal)
      return false
    }
    return true
  }

  function FlowPath({ link, color, maxFlow }) {
    const strokeW = Math.max(0.6, (link.count / maxFlow) * 22)
    const x1 = link.from.x + 14, y1 = link.from.y + link.from.h / 2
    const x2 = link.to.x, y2 = link.to.y + link.to.h / 2
    const mx = (x1 + x2) / 2
    const active = isActive(link)
    return (
      <path d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} fill="none" stroke={color}
        strokeWidth={strokeW} opacity={active ? 0.32 : 0.06}
        className="cursor-default transition-opacity duration-150"
        onMouseEnter={(e) => showTip(e, `${link.label}: ${link.count} studies (${((link.count / Math.max(link.from.total || link.count, 1)) * 100).toFixed(1)}% of ${link.from.name})`)} onMouseMove={moveTip} onMouseLeave={hideTip} />
    )
  }

  return (
    <div>
      {selected && (
        <button
          onClick={() => setSelected(null)}
          className="mb-3 px-2.5 py-1 rounded text-[11px] font-data bg-line/60 text-inkmid hover:bg-line"
        >
          ✕ clear selection ({selected.name})
        </button>
      )}
      <div className="flex flex-wrap gap-3 mb-4">
        {DOMAIN_ORDER.map((name) => (
          <div key={name} className="flex items-center gap-1.5 text-[11px] text-inkmid">
            <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: DOMAIN_GROUPS[name].color }} />
            <span>{name}</span>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg width={layout.W} height={layout.H + 24} className="font-data block">
          {/* Column headers, given their own row above the chart so they
              never overlap the topmost node regardless of column height. */}
          <text x={190} y={14} fontSize={10} fill="#8A8A8A" fontWeight="600">SIGNAL</text>
          <text x={440} y={14} fontSize={10} fill="#8A8A8A" fontWeight="600">SENSOR TYPE</text>
          <text x={700} y={14} fontSize={10} fill="#8A8A8A" fontWeight="600">SENSOR BRAND (top 3 per sensor type)</text>
          <g transform="translate(0, 24)">
            {layout.sigSenLinks.map((l, i) => (<FlowPath key={`ss-${i}`} link={l} color={l.color || l.from.color} maxFlow={layout.maxFlow} />))}
            {layout.senBrandLinks.map((l, i) => (<FlowPath key={`sb-${i}`} link={l} color={l.color || '#8A8A8A'} maxFlow={layout.maxFlow} />))}
            {layout.signal.map((n) => {
              const active = isActive({ signal: n.name })
              return (
                <g key={n.name}
                  onClick={() => setSelected(selected?.level === 'signal' && selected.name === n.name ? null : { level: 'signal', name: n.name })}
                  onMouseEnter={(e) => showTip(e, `${n.name}: ${n.total} studies — click to isolate all connected sensor types and brands`)} onMouseMove={moveTip} onMouseLeave={hideTip}
                  className="cursor-pointer" style={{ opacity: active ? 1 : 0.2 }}>
                  <rect x={n.x} y={n.y} width={14} height={n.h} fill={n.color} rx={2} />
                  <text x={n.x - 8} y={n.y + n.h / 2 + 3.5} fontSize={10.5} fill="#0A0A0A" textAnchor="end">{n.name}</text>
                  <text x={n.x + 18} y={n.y + n.h / 2 + 3.5} fontSize={10} fill="#8A8A8A">{n.total}</text>
                </g>
              )
            })}
            {layout.sensor.map((n) => {
              const active = isActive({ sensor: n.name })
              return (
                <g key={n.name}
                  onClick={() => setSelected(selected?.level === 'sensor' && selected.name === n.name ? null : { level: 'sensor', name: n.name })}
                  onMouseEnter={(e) => showTip(e, `${n.name}: ${n.total} studies total; hover links for % of parent signal — click to isolate connected signals and brands`)} onMouseMove={moveTip} onMouseLeave={hideTip}
                  className="cursor-pointer" style={{ opacity: active ? 1 : 0.2 }}>
                  <rect x={n.x} y={n.y} width={14} height={n.h} fill={n.color || '#4A4A4A'} rx={2} />
                  <text x={n.x + 18} y={n.y + n.h / 2 + 3.5} fontSize={10} fill="#0A0A0A">{n.name}, {n.total}</text>
                </g>
              )
            })}
            {layout.brand.map((n) => {
              const active = isActive({ sensor: n.sensorType, brandKey: n.key })
              const senTotal = layout.sensor.find((s) => s.name === n.sensorType)?.total || n.total
              const pct = ((n.total / senTotal) * 100).toFixed(0)
              return (
                <g key={n.key}
                  onClick={() => setSelected(selected?.level === 'brand' && selected.name === n.key ? null : { level: 'brand', name: n.key })}
                  onMouseEnter={(e) => showTip(e, `${n.name}: ${n.total} studies (${pct}% of ${n.sensorType}) — click to isolate`)}
                  onMouseMove={moveTip} onMouseLeave={hideTip}
                  className="cursor-pointer" style={{ opacity: active ? 1 : 0.2 }}>
                  <rect x={n.x} y={n.y} width={14} height={n.h} fill={n.color || '#8A8A8A'} rx={2} />
                  <text x={n.x + 18} y={n.y + n.h / 2 + 3.5} fontSize={10} fill="#0A0A0A">
                    {n.name}, {n.total} ({pct}%)
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
      </div>
      <p className="font-data text-[10px] text-inkfaint mt-2">
        Flow width and node height are proportional to study count. Signal labels show absolute counts only. Link hover reports the percentage relative to the parent node (signal → sensor uses the signal total; sensor → brand uses the sensor-type total). Brand labels also show percentage of their parent sensor type. Click any signal, sensor type, or brand to highlight all connected paths and rows across all three columns.
      </p>
      <TooltipPortal tip={tip} />
    </div>
  )
}



function MstSankey({ mst, totalExperiments }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const [selected, setSelected] = useState(null)
  const statusCounts = mst.calc_rate_by_period.reduce((acc, r) => {
    const k = r['physio-mst-calculated'] === 'Y' ? 'Y' : 'N/NR'
    acc[k] = (acc[k] || 0) + r.count
    return acc
  }, {})
  const yCount = statusCounts.Y || mst.n_mst_studies
  const nonYCount = statusCounts['N/NR'] || Math.max((totalExperiments || 0) - yCount, 0)
  const pointTotals = {}
  const formulaTotals = {}
  const pointFormulaLinks = []
  mst.points_by_formula.forEach((r) => {
    pointTotals[r.pt_bucket] = (pointTotals[r.pt_bucket] || 0) + r.count
    formulaTotals[r.formula_grp] = (formulaTotals[r.formula_grp] || 0) + r.count
    pointFormulaLinks.push({ point: r.pt_bucket, formula: r.formula_grp, count: r.count })
  })
  const missingPoint = Math.max(yCount - Object.values(pointTotals).reduce((a, v) => a + v, 0), 0)
  if (missingPoint > 0) pointTotals['NR points'] = (pointTotals['NR points'] || 0) + missingPoint

  const points = Object.entries(pointTotals)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
  const formulas = Object.entries(formulaTotals)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)

  const layoutNodes = (entries, x, px = 2.0, minH = 12, gap = 7) => {
    let y = 8
    return entries.map((e) => {
      const h = Math.max(minH, e.total * px)
      const n = { ...e, x, y, h }
      y += h + gap
      return n
    })
  }
  const left = layoutNodes([{ name: 'MST calculated: Y', total: yCount }, { name: 'MST not calculated / NR', total: nonYCount }], 120, 1.0, 24, 12)
  const mid = layoutNodes(points, 410, 1.35, 14, 6)
  const right = layoutNodes(formulas, 700, 1.35, 14, 6)
  const h = Math.max(210, ...[...left, ...mid, ...right].map((n) => n.y + n.h)) + 20
  const maxFlow = Math.max(yCount, nonYCount, ...pointFormulaLinks.map((l) => l.count), 1)

  const midBy = Object.fromEntries(mid.map((n) => [n.name, n]))
  const rightBy = Object.fromEntries(right.map((n) => [n.name, n]))
  const yNode = left[0]
  const nonYNode = left[1]
  const pointOffsets = {}
  const formulaOffsets = {}
  const links = []
  let yOff = 0
  mid.forEach((p) => {
    links.push({ from: yNode, to: p, count: p.total, kind: 'ypoint', point: p.name, color: '#5B5BFF', sourceOffset: yOff, targetOffset: 0 })
    yOff += p.total * 1.0
  })
  pointFormulaLinks.forEach((l) => {
    const from = midBy[l.point]
    const to = rightBy[l.formula]
    if (!from || !to) return
    const sourceOffset = pointOffsets[l.point] || 0
    const targetOffset = formulaOffsets[l.formula] || 0
    links.push({ from, to, count: l.count, kind: 'formula', point: l.point, formula: l.formula, color: '#5B5BFF', sourceOffset, targetOffset })
    pointOffsets[l.point] = sourceOffset + l.count * 1.35
    formulaOffsets[l.formula] = targetOffset + l.count * 1.35
  })

  const active = (obj) => {
    if (!selected) return true
    if (selected.type === 'status') return obj.status === selected.name || obj.kind === 'ypoint' || obj.kind === 'formula'
    if (selected.type === 'point') return obj.point === selected.name || obj.name === selected.name
    if (selected.type === 'formula') return obj.formula === selected.name || obj.name === selected.name
    return true
  }
  const path = (l) => {
    const x1 = l.from.x + 14
    const y1 = l.from.y + (l.sourceOffset || 0) + Math.max(1, (l.count / maxFlow) * 22) / 2
    const x2 = l.to.x
    const y2 = l.to.y + (l.targetOffset || 0) + Math.max(1, (l.count / maxFlow) * 22) / 2
    const mx = (x1 + x2) / 2
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
  }
  const node = (n, type, color, denom) => {
    const isOn = !selected || active({ name: n.name, [type]: n.name })
    return (
      <g key={`${type}-${n.name}`} className="cursor-pointer" style={{ opacity: isOn ? 1 : 0.18 }}
        onClick={() => setSelected(selected?.type === type && selected.name === n.name ? null : { type, name: n.name })}
        onMouseEnter={(e) => showTip(e, `${n.name}: ${n.total} (${((n.total / denom) * 100).toFixed(0)}%)`)} onMouseMove={moveTip} onMouseLeave={hideTip}>
        <rect x={n.x} y={n.y} width={14} height={n.h} rx={2} fill={color} />
        <text x={n.x + 20} y={n.y + n.h / 2 + 3.5} fontSize={10.5} fill="#0A0A0A">{n.name}, {n.total} ({((n.total / denom) * 100).toFixed(0)}%)</text>
      </g>
    )
  }

  return (
    <div>
      {selected && <button onClick={() => setSelected(null)} className="mb-3 px-2.5 py-1 rounded text-[11px] font-data bg-line/60 text-inkmid hover:bg-line">✕ clear selection ({selected.name})</button>}
      <svg width={920} height={h + 28} className="font-data block overflow-visible">
        <text x={120} y={10} fontSize={10} fill="#8A8A8A" fontWeight="600">MST STATUS</text>
        <text x={410} y={10} fontSize={10} fill="#8A8A8A" fontWeight="600">NUMBER OF POINTS</text>
        <text x={700} y={10} fontSize={10} fill="#8A8A8A" fontWeight="600">FORMULA</text>
        <g transform="translate(0,18)">
          {links.map((l, i) => (
            <path key={i} d={path(l)} fill="none" stroke={l.color} strokeWidth={Math.max(1, (l.count / maxFlow) * 28)} opacity={active(l) ? 0.28 : 0.04}
              onMouseEnter={(e) => showTip(e, `${l.kind === 'ypoint' ? 'MST calculated Y → ' + l.point : l.point + ' points → ' + l.formula}: ${l.count} studies`)} onMouseMove={moveTip} onMouseLeave={hideTip} />
          ))}
          {node(yNode, 'status', '#5B5BFF', yCount + nonYCount)}
          {node(nonYNode, 'status', '#BBBBBB', yCount + nonYCount)}
          {mid.map((n) => node(n, 'point', '#5B5BFF', yCount))}
          {right.map((n) => node(n, 'formula', '#8A63FF', Object.values(formulaTotals).reduce((a, v) => a + v, 0) || 1))}
        </g>
      </svg>
      <p className="font-data text-[10px] text-inkfaint mt-2">MST-specific denominator: {yCount} studies with MST calculated. One study can be missing the number-of-points or formula detail, so downstream totals can be slightly lower than the MST-Y total.</p>
      <TooltipPortal tip={tip} />
    </div>
  )
}

const FORMULA_COLORS = {
  'Ramanathan (1964)': '#FB3640', 'Hardy & DuBois (1938)': '#FB3640', 'ISO 9886: 2004': '#FB3640',
  'Colin & Houdas (1982)': '#D5FF99', 'Ouyang (1985)': '#5B5BFF', 'McIntyre (1980)': '#8A8A8A',
  'Other/Multiple': '#BBBBBB', 'NR': '#E4E4E4',
}
function MstCharts({ mst }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const periods = mst.periods
  const rateByPeriod = useMemo(() => {
    const map = {}
    periods.forEach((p) => { map[p] = { Y: 0, N: 0, NAN: 0, total: 0 } })
    mst.calc_rate_by_period.forEach((r) => {
      if (!map[r.period]) return
      map[r.period][r['physio-mst-calculated']] = r.count
      map[r.period].total += r.count
    })
    return map
  }, [mst, periods])
  const formulaByPeriod = useMemo(() => {
    const map = {}
    periods.forEach((p) => { map[p] = {} })
    mst.formula_by_period.forEach((r) => { if (map[r.period]) map[r.period][r.formula_grp] = r.count })
    return map
  }, [mst, periods])
  return (
    <div className="grid grid-cols-2 gap-10">
      <div>
        <div className="font-data text-[10px] text-inkfaint mb-1">y-axis: % of studies in that period calculating MST</div>
        <div className="flex gap-2 items-end h-32 mb-1">
          {periods.map((p) => {
            const r = rateByPeriod[p], total = r.total || 1
            return (
              <div key={p} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col-reverse h-24 rounded-sm overflow-hidden">
                  <div
                    style={{ height: `${(r.Y / total) * 100}%`, background: '#FB3640' }}
                    className="cursor-default"
                    onMouseEnter={(e) => showTip(e, `${p}: ${r.Y} of ${total} studies calculate MST (Y) · ${((r.Y / total) * 100).toFixed(0)}%`)}
                    onMouseMove={moveTip} onMouseLeave={hideTip}
                  />
                  <div
                    style={{ height: `${(r.N / total) * 100}%`, background: '#E4E4E4' }}
                    className="cursor-default"
                    onMouseEnter={(e) => showTip(e, `${p}: ${r.N} of ${total} studies measure sites but don't aggregate (N) · ${((r.N / total) * 100).toFixed(0)}%`)}
                    onMouseMove={moveTip} onMouseLeave={hideTip}
                  />
                  <div
                    style={{ height: `${(r.NAN / total) * 100}%`, background: '#EFEFEF' }}
                    className="cursor-default"
                    onMouseEnter={(e) => showTip(e, `${p}: ${r.NAN} of ${total} studies don't measure skin temperature at all (NAN)`)}
                    onMouseMove={moveTip} onMouseLeave={hideTip}
                  />
                </div>
                <div className="font-data text-[10px] text-inkmid mt-1.5">{p}</div>
                <div className="font-data text-[9px] text-inkfaint">{Math.round((r.Y / total) * 100)}% · n={total}</div>
              </div>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[10.5px] text-inkmid">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#FB3640' }} /> calculates MST</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#E4E4E4' }} /> measures sites, no MST</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#EFEFEF' }} /> no skin temp measured</span>
        </div>
      </div>
      <div>
        <div className="font-data text-[10px] text-inkfaint mb-1">y-axis: % of MST-calculating studies in that period using each formula</div>
        <div className="flex gap-2 items-end h-32 mb-1">
          {periods.map((p) => {
            const m = formulaByPeriod[p]
            const total = Object.values(m).reduce((a, b) => a + b, 0) || 1
            return (
              <div key={p} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col-reverse h-24 rounded-sm overflow-hidden">
                  {mst.formula_order.map((f) => (
                    <div
                      key={f}
                      style={{ height: `${((m[f] || 0) / total) * 100}%`, background: FORMULA_COLORS[f] }}
                      className="cursor-default"
                      onMouseEnter={(e) => showTip(e, `${f}, ${p}: ${m[f] || 0} of ${total} MST-calculating studies · ${(((m[f] || 0) / total) * 100).toFixed(0)}%`)}
                      onMouseMove={moveTip} onMouseLeave={hideTip}
                    />
                  ))}
                </div>
                <div className="font-data text-[10px] text-inkmid mt-1.5">{p}</div>
                <div className="font-data text-[9px] text-inkfaint">n={total}</div>
              </div>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
          {mst.formula_order.map((f) => (
            <div key={f} className="flex items-center gap-1 text-[10.5px] text-inkmid">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: FORMULA_COLORS[f] }} />{f}
            </div>
          ))}
        </div>
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

function BodySiteToggle({ skinTempSites, skinTempN, hrSites, hrN, sudomotorSites, sudomotorN }) {
  const [mode, setMode] = useState('skin')
  const tabs = [
    { key: 'skin', label: 'Skin temperature' },
    { key: 'hr', label: 'Heart/pulse rate' },
    { key: 'sudomotor', label: 'Sweat & skin conductance' },
  ]
  const current = mode === 'skin'
    ? { siteData: skinTempSites, totalLabel: { n: skinTempN } }
    : mode === 'hr'
      ? { siteData: hrSites, totalLabel: { n: hrN } }
      : { siteData: sudomotorSites, totalLabel: { n: sudomotorN } }
  return (
    <div>
      <div className="flex gap-1 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setMode(t.key)}
            className={`px-3 py-1 rounded text-[11.5px] font-data transition-colors ${
              mode === t.key ? 'bg-ink text-paper' : 'bg-line/50 text-inkmid hover:bg-line'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ minHeight: 480 }}>
        <BodySiteMap siteData={current.siteData} totalLabel={current.totalLabel} />
      </div>
    </div>
  )
}

export default function ChapterBody({ data }) {
  const { physio_signal_sensor, skintemp_sites, fig17_physio_params, fig18_physio_cooccurrence,
    evo_signal_sensor, sensor_brands, mst, signal_freq_by_period, site_by_signal, chapter_completeness, summary } = data

  const allSites = useMemo(() => [...skintemp_sites.site_totals].sort((a, b) => b.total - a.total), [skintemp_sites])
  const periods = skintemp_sites.periods
  const siteByPeriod = useMemo(() => {
    const map = {}
    allSites.forEach((s) => { map[s.site] = {} })
    skintemp_sites.site_period_counts.forEach((r) => { if (map[r.site]) map[r.site][r.period] = r.count })
    return map
  }, [allSites, skintemp_sites])
  const periodN = useMemo(() => {
    const m = {}
    skintemp_sites.period_n.forEach((r) => { m[r.period] = r.n_studies })
    return m
  }, [skintemp_sites])

  const topSignal = fig17_physio_params.data[0]
  const evoSignals = Object.keys(evo_signal_sensor.signals)
  const mstCompletenessNames = new Set(['Number of MST points', 'MST formula used', 'Full formula text', 'Weighting factors per region'])
  const bodyCompletenessFields = chapter_completeness.physio_measurement.fields.filter((f) => !mstCompletenessNames.has(f.field))
  const mstCompletenessFields = chapter_completeness.physio_measurement.fields
    .filter((f) => mstCompletenessNames.has(f.field))
    .map((f) => ({ ...f, pct: Number(((f.count / Math.max(mst.n_mst_studies, 1)) * 100).toFixed(1)) }))

  return (
    <div>
      <ChapterHeader
        eyebrow="Chapter 3 of 8"
        title="Measurements from the body"
        framing={
          <>
            <p>
              This chapter covers every physiological signal in the corpus: what's measured, with what
              sensor, from which brand, and at which body site — plus the special case of mean skin
              temperature, the field's most frequently derived composite measure.
            </p>
            <p>
              We looked for sensor type, brand, model, and body site because the same signal name can
              hide very different measurement realities — "skin temperature" via thermocouple, infrared
              camera, or wearable patch are not interchangeable, and the corpus lets us see exactly which
              choice each study made.
            </p>
          </>
        }
        headline={[
          { value: summary.n_experiments, label: 'Experiments' },
          { value: topSignal.count, label: `studies measure ${topSignal.parameter.toLowerCase()}`, color: '#FB3640' },
          { value: mst.n_mst_studies, label: 'studies calculate MST', color: '#FB3640' },
          { value: sensor_brands.n_studies_with_brand, label: 'report a sensor brand', color: '#5B5BFF' },
        ]}
      />

      <CompletenessStrip fields={bodyCompletenessFields} nStudies={chapter_completeness.physio_measurement.n_studies} title="Data completeness for physiological signals" />
      <CompletenessStrip fields={mstCompletenessFields} nStudies={mst.n_mst_studies} title="MST-specific completeness, among studies where MST is calculated" />

      <ChapterSection
        title="What's measured, and how"
        intro="Skin temperature (218 studies, 81%) and heart rate (135, 50%) dominate by a wide margin over every other signal. Other signals appear far less often and are typically paired with skin temperature or heart rate rather than measured in isolation."
      >
        <FigureCard figNumber="17" title="Most frequently measured signals" plotWidth={980} commentary="Skin temperature dominates at 218 of 269 experiments (81%) — more than triple the next most common signal, heart/pulse rate at 135 (50%). After that the field thins out fast: core/body temperature and blood pressure each appear in well under a fifth of experiments.">
          <PeriodHeatmap
            rows={fig17_physio_params.data.map((d) => d.parameter)}
            periods={signal_freq_by_period.periods}
            periodN={signal_freq_by_period.period_n}
            rowTotals={Object.fromEntries(fig17_physio_params.data.map((d) => [d.parameter, d.count]))}
            getCount={(sig, p) => signal_freq_by_period.data.find((r) => r.signal === sig && r.period === p)?.count || 0}
            labelWidth={200}
            cellWidth={88}
          />
        </FigureCard>

        <FigureCard figNumber="18" title="Which signals get measured together" plotWidth={680} commentary="Skin temperature (218 studies) and heart/pulse rate (135) are individually the most common signals, and 103 studies measure both together — about half of all heart-rate studies also track skin temperature.">
          <CooccurrenceMatrix labels={fig18_physio_cooccurrence.labels} matrix={fig18_physio_cooccurrence.matrix} colorScheme="blue" />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Signals, sensor types, and brands"
        intro="The same signal can be captured by very different instruments. This flow covers 15 signals measured in ≥5 studies, 53 distinct sensor types used across them, and every commercial brand behind those sensors — ordered by thermophysiological mechanism."
      >
        <FigureCard figNumber="19" title="Signal → sensor type → brand" plotWidth={1100} commentary="OMRON is the most-cited brand overall (65 studies), but spread across signals — it makes combination devices covering blood pressure (30), heart rate (20), and core temperature (12). iButton (49 studies) is the opposite pattern: concentrated almost entirely in one signal, skin temperature (44 of its 49). Flow and node thickness are proportional to study count — hover for the exact number, or click any signal, sensor type, or brand to isolate its paths.">
          <SignalSensorBrandSankey overall={physio_signal_sensor.overall} brandModelData={data.brand_model_reference.data} />
        </FigureCard>

        <FigureCard title="Where on the body each signal is measured" plotWidth={900} commentary="Skin temperature is measured across the body fairly evenly (no single dominant site). Heart rate concentrates at the chest (44 of 99 studies, ECG-strap territory) and wrist (25, optical wearables). The sudomotor signals split sharply by method: 27 sweat-indicator studies measure the whole body at once (not shown on the diagram, see the list at right), while skin conductance is almost always local — 11 studies at the wrist, 9 at the finger.">
          <BodySiteToggle
            skinTempSites={skintemp_sites.site_totals}
            skinTempN={skintemp_sites.n_studies_with_site}
            hrSites={site_by_signal['Heart/Pulse rate'].site_totals}
            hrN={site_by_signal['Heart/Pulse rate'].n_studies_with_site}
            sudomotorSites={site_by_signal['Sudomotor (combined)'].site_totals}
            sudomotorN={site_by_signal['Sudomotor (combined)'].n_studies_with_site}
          />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="How sensor choice has shifted over time"
        intro="For skin temperature, thermocouples made up 55% of sensors in 2013–14 but only 25% by 2023–24, while Thermochron-type dataloggers (e.g. iButton) rose from 18% to 52% over the same span — the field's main displacement story. Each column below is normalised to 100% of that period's studies measuring the signal."
      >
        <FigureCard title="Sensor choice by signal" plotWidth={980} commentary="Use the signal toggles to compare how sensor-type composition changed over time. Each column is normalized within the studies measuring the selected signal in that 2-year period.">
          <SensorEvolutionToggle signals={evoSignals} evoData={evo_signal_sensor} periods={evo_signal_sensor.periods} />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Skin temperature body sites"
        intro="Where on the body skin temperature is measured, and how that has shifted across the decade. Only near-synonymous labels are collapsed (e.g. calf/shin → lower leg); distinct face sub-sites remain separate."
      >
        <FigureCard title="Site prevalence by period" plotWidth={980} commentary="Lower leg is the single most-measured site (136 of 218 skin-temperature studies, 62%), followed closely by hand, thigh, chest, and forehead (all 123–130 studies). No one site is measured in every study — choice of body site is still inconsistent across the field.">
          <PeriodHeatmap
            rows={allSites.map((s) => s.site)}
            periods={periods}
            periodN={periodN}
            rowTotals={Object.fromEntries(allSites.map((s) => [s.site, s.total]))}
            getCount={(site, p) => siteByPeriod[site]?.[p] || 0}
            labelWidth={170}
            cellWidth={88}
          />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Where other signals are measured"
        intro="Skin temperature isn't the only signal where measurement site reflects a real methodological choice. Heart rate's site splits roughly along sensor modality (chest straps vs. wrist/finger optical sensors); skin conductance follows electrode-placement convention; sweat is measured either at a local site or, more often, across the whole body at once — two fundamentally different kinds of measurement sharing one field name."
      >
        <FigureCard title="Heart/pulse rate measurement site" plotWidth={980} commentary="Chest (44 of 99 studies) and wrist (25) are the two dominant sites — roughly, ECG-strap vs. optical-wearable territory. The matrix below shows the full site distribution over time.">
          {(() => {
            const hr = site_by_signal['Heart/Pulse rate'].by_period
            const hrSites = site_by_signal['Heart/Pulse rate'].site_totals.map((d) => d.site)
            const totals = Object.fromEntries(site_by_signal['Heart/Pulse rate'].site_totals.map((d) => [d.site, d.count]))
            return (
              <PeriodHeatmap
                rows={hrSites}
                periods={hr.periods}
                periodN={hr.period_n}
                rowTotals={totals}
                getCount={(site, p) => hr.data.find((r) => r.site === site && r.period === p)?.count || 0}
                labelWidth={150}
                cellWidth={88}
              />
            )
          })()}
        </FigureCard>

        <FigureCard title="Skin conductance measurement site" commentary="Wrist (11 of 25 studies) and finger (8) — the classic GSR electrode sites — dominate, with a long tail of one-off placements (thigh, shin, temple) reflecting study-specific designs.">
          <InteractiveBarChart
            data={site_by_signal['Skin conductance'].site_totals.map((d) => ({ label: d.site, count: d.count }))}
            total={site_by_signal['Skin conductance'].n_studies_with_site}
            color="#0A0A0A"
          />
        </FigureCard>

        <FigureCard title="Sweat indicator measurement site" commentary="27 of 35 studies (77%) measure sweat across the whole body rather than at a local site — typically via mass-loss methods, not a local sensor. This is a fundamentally different kind of measurement from the local placements (forearm, finger, back) making up the rest, even though both share the 'sweat indicators' label.">
          <InteractiveBarChart
            data={site_by_signal['Sweat indicators'].site_totals.map((d) => ({ label: d.site, count: d.count }))}
            total={site_by_signal['Sweat indicators'].n_studies_with_site}
            color="#0A0A0A"
          />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Mean skin temperature"
        intro={`${mst.n_mst_studies} studies explicitly calculate a weighted mean skin temperature. The calculation rate has declined over the decade even as formula choice has diversified beyond the classic Ramanathan formula.`}
      >
        <FigureCard title="MST calculation pathway" plotWidth={980} commentary="The Sankey separates whether MST is calculated at all from the details that only become meaningful once MST is calculated: number of skin-temperature points and formula label.">
          <MstSankey mst={mst} totalExperiments={summary.n_experiments} />
        </FigureCard>
      </ChapterSection>
    </div>
  )
}
