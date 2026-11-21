import { useMemo, useState } from 'react'
import { ChapterHeader, ChapterSection } from '../components/Chapter.jsx'
import FigureCard from '../components/FigureCard.jsx'
import { figNum } from '../figureRegistry.js'
import InteractiveBarChart from '../components/InteractiveBarChart.jsx'
import CooccurrenceMatrix from '../components/CooccurrenceMatrix.jsx'
import BodySiteMap from '../components/BodySiteMap.jsx'
import OverallByPeriod, { PeriodHeatmap, ToggleGroup } from '../components/OverallByPeriod.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'
import { CodeChip } from '../components/CodeChip.jsx'
import { ChoiceButtons } from '../components/CombinationViews.jsx'

function SensorEvolutionToggle({ signals, evoData, periods }) {
  const [activeSignal, setActiveSignal] = useState(signals[0] || '')
  if (!signals.length || !activeSignal) return <div className="text-[12px] text-inkfaint">No data available.</div>
  const signalData = evoData.signals[activeSignal]
  const { data, sensor_order, period_totals } = signalData
  const countsBySensor = useMemo(() => {
    const m = {}
    sensor_order.forEach((s) => { m[s] = {} })
    data.forEach((r) => { if (m[r.sensor_grp]) m[r.sensor_grp][r.period] = r.count })
    return m
  }, [data, sensor_order])
  const rowTotals = Object.fromEntries(
    sensor_order.map((s) => [s, periods.reduce((sum, p) => sum + (countsBySensor[s]?.[p] || 0), 0)])
  )
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-4" data-toggle-group="content">
        {signals.map((sig) => (
          <button
            key={sig}
            onClick={() => setActiveSignal(sig)}
            className={`px-3 py-1 rounded text-[11.5px] font-data transition-colors ${activeSignal === sig ? 'bg-ink text-paper' : 'bg-line/50 text-inkmid hover:bg-line'}`}
          >
            {sig}
          </button>
        ))}
      </div>
      <PeriodHeatmap
        rows={sensor_order}
        periods={periods}
        periodN={period_totals}
        rowTotals={rowTotals}
        getCount={(sensor, p) => countsBySensor[sensor]?.[p] || 0}
        labelWidth={150}
        cellWidth={78}
      />
    </div>
  )

}

function OtherSignalSiteToggle({ siteData, core }) {
  const [signal, setSignal] = useState('heart')
  const hr = siteData['Heart/Pulse rate']
  return <div>
    <ChoiceButtons label="Other physiological measurement sites" value={signal} onChange={setSignal}
      options={[{ key: 'heart', label: 'Heart/pulse rate' }, { key: 'core', label: 'Core/body temperature' }]} />
    {signal === 'core' ? <PeriodHeatmap
      rows={core.sites.map(r => r.label)} periods={core.periods} periodN={core.period_n}
      rowTotals={Object.fromEntries(core.sites.map(r => [r.label, r.count]))}
      getCount={(site, p) => core.site_by_period.find(r => r.label === site && r.period === p)?.count || 0}
      labelWidth={220} cellWidth={78} /> : <PeriodHeatmap
      rows={hr.site_totals.map(r => r.site)} periods={hr.by_period.periods} periodN={hr.by_period.period_n}
      rowTotals={Object.fromEntries(hr.site_totals.map(r => [r.site, r.count]))}
      getCount={(site, p) => hr.by_period.data.find(r => r.site === site && r.period === p)?.count || 0}
      labelWidth={220} cellWidth={78} />}
  </div>
}

// ── Sankey (signal -> sensor type -> brand) ────────────────────────────
const DOMAIN_ORDER = [
  'PERIPHERAL THERMAL EXCHANGE',
  'CARDIOVASCULAR HEAT TRANSPORT',
  'CENTRAL THERMAL STATE',
  'SUDOMOTOR / ELECTRODERMAL',
  'NEURO-MUSCULAR ELECTROPHYSIOLOGY',
  'METABOLIC & BIOCHEMICAL',
]
const DOMAIN_GROUPS = {
  'PERIPHERAL THERMAL EXCHANGE': { color: '#5B5BFF', signals: ['Skin temperature', 'Near body temperature', 'Heat flux', 'Skin blood flow'] },
  'CARDIOVASCULAR HEAT TRANSPORT': { color: '#FF4DA6', signals: ['Heart/Pulse rate', 'Blood pressure', 'Oxygen saturation'] },
  'CENTRAL THERMAL STATE': { color: '#F1FF71', signals: ['Core/Body temperature', 'Exhaled breath temperature'] },
  'SUDOMOTOR / ELECTRODERMAL': { color: '#79FFFB', signals: ['Sweat indicators', 'Skin conductance'] },
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

function SignalSensorBrandSankey({ overall, signalTotals, signalInstanceTotals, brandData, nExperiments }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  // Selection state for click-to-isolate: null = nothing selected (show
  // everything at normal opacity). Otherwise { level: 'signal'|'sensor'|'brand', name }.
  const [selected, setSelected] = useState(null)
  // 'bySensor' = brand's real parent is its sensor type, so the same brand
  // name can appear as several separate nodes if it's sold under more than
  // one sensor type (e.g. a brand making both wrist PPG and chest-strap ECG
  // devices). 'collapsed' merges those into a single node per brand name,
  // trading the sensor-type-accurate parentage for an at-a-glance "which
  // brands dominate overall" view.
  const [brandMode, setBrandMode] = useState('bySensor')
  const COLLAPSED_TOP_N = 15

  const layout = useMemo(() => {
    // True per-signal totals: distinct experiments, not summed across
    // sensing methods (see build_data.py comment on signal_totals for why
    // summing 'overall' inflates signals with multi-method experiments).
    // Flow totals use experiment–signal–method instances so link widths remain
    // conservative. Displayed signal counts use unique experiments, which is
    // the appropriate denominator for prevalence in the 295-experiment corpus.
    const sigFlowTotals = {}
    signalInstanceTotals.forEach((r) => { sigFlowTotals[r.signal] = r.count })
    const sigStudyTotals = {}
    signalTotals.forEach((r) => { sigStudyTotals[r.signal] = r.count })
    const activeSignalNames = Object.keys(sigFlowTotals).filter((s) => sigStudyTotals[s] >= 5)
    const signalEntries = []
    DOMAIN_ORDER.forEach((domain) => {
      const group = DOMAIN_GROUPS[domain]
      group.signals.filter((s) => activeSignalNames.includes(s)).sort((a, b) => sigStudyTotals[b] - sigStudyTotals[a])
        .forEach((s) => signalEntries.push({
          name: s, total: sigFlowTotals[s], studyTotal: sigStudyTotals[s], color: group.color, domain,
        }))
    })

    const sensorTotals = {}
    overall.forEach((r) => { if (sigStudyTotals[r.signal] >= 5) sensorTotals[r['physio-sensing-method']] = (sensorTotals[r['physio-sensing-method']] || 0) + r.count })
    const sensorDomain = {}
    overall.forEach((r) => {
      const sig = signalEntries.find((s) => s.name === r.signal)
      if (!sig) return
      const key = r['physio-sensing-method']
      if (!sensorDomain[key]) sensorDomain[key] = {}
      sensorDomain[key][sig.domain] = (sensorDomain[key][sig.domain] || 0) + r.count
    })
    const sensorParents = {}
    overall.forEach((r) => {
      if (sigStudyTotals[r.signal] < 5) return
      const method = r['physio-sensing-method']
      if (!sensorParents[method]) sensorParents[method] = []
      sensorParents[method].push({
        signal: r.signal,
        count: r.count,
        denominator: sigStudyTotals[r.signal],
      })
    })
    const sensorEntries = Object.entries(sensorTotals).map(([name, total]) => {
      const domainCounts = sensorDomain[name] || {}
      const primaryDomain = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
      return {
        name,
        total,
        parentSignals: sensorParents[name] || [],
        color: DOMAIN_GROUPS[primaryDomain]?.color || '#8A8A8A',
        domain: primaryDomain,
      }
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
    brandData.forEach((r) => {
      const method = r['physio-sensing-method']
      const brand = r.brand
      if (!activeSensorNames.includes(method)) return
      if (!brandsBySensorType[method]) brandsBySensorType[method] = {}
      brandsBySensorType[method][brand] = (brandsBySensorType[method][brand] || 0) + r.count
      brandSensorSignalRows.push(r)
    })

    // Top-3-per-sensor-type, no "Other" bucket (per request) — sensor types
    // with more than 3 brands simply show their top 3; the rest are not
    // shown as a node, but remain visible via the sensor-type node's own
    // total and the chapter's brand reference table (/devices) for anyone
    // who needs the full list.
    let brandEntries = []
    let brandLinksRaw = [] // { sensorType, brandKey, count }

    if (brandMode === 'bySensor') {
      sensorEntries.forEach((sen) => {
        const brands = brandsBySensorType[sen.name] || {}
        const sorted = Object.entries(brands).sort((a, b) => b[1] - a[1]).slice(0, 3)
        sorted.forEach(([name, count]) => {
          const key = `${sen.name}::${name}`
          brandEntries.push({ key, name, total: count, sensorType: sen.name, color: sen.color })
          brandLinksRaw.push({ sensorType: sen.name, brandKey: key, count })
        })
      })
    } else {
      // Collapsed: same underlying per-(sensor type, brand) counts, but now
      // summed across ALL sensor types a brand appears under before ranking
      // -- this is the whole point of the toggle, so a brand split across
      // several sensor-type paths (e.g. a wearable maker selling both PPG
      // and skin-temperature devices) shows up as one node sized by its
      // true combined total, not fragmented into several smaller ones.
      const collapsedTotals = {} // brand -> total across all sensor types
      Object.values(brandsBySensorType).forEach((brands) => {
        Object.entries(brands).forEach(([name, count]) => {
          collapsedTotals[name] = (collapsedTotals[name] || 0) + count
        })
      })
      const topBrandNames = Object.entries(collapsedTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, COLLAPSED_TOP_N)
        .map(([name]) => name)

      topBrandNames.forEach((name) => {
        // Colour/primary sensor type: whichever sensor type contributes the
        // largest share of this brand's total (matches the same
        // "primary domain" convention already used for sensorEntries above).
        const perSensor = sensorEntries
          .map((sen) => ({ sen, count: (brandsBySensorType[sen.name] || {})[name] || 0 }))
          .filter((r) => r.count > 0)
          .sort((a, b) => b.count - a.count)
        const primarySensor = perSensor[0]?.sen
        const key = `collapsed::${name}`
        brandEntries.push({
          key, name, total: collapsedTotals[name], color: primarySensor?.color || '#8A8A8A',
          sensorType: primarySensor?.name, contributingSensors: perSensor.map((r) => r.sen.name),
        })
        // One link per contributing sensor type, so the fan-in is visible
        // rather than collapsing the incoming paths too.
        perSensor.forEach(({ sen, count }) => {
          brandLinksRaw.push({ sensorType: sen.name, brandKey: key, count })
        })
      })
    }

    // brandKey -> [contributing sensor type names]. Built from the actual
    // links rather than by parsing the key string, since collapsed keys
    // ('collapsed::Brand') don't encode a sensor type the way bySensor keys
    // ('SensorType::Brand') do -- this keeps isActive() correct in both modes.
    const brandSensorMap = {}
    brandLinksRaw.forEach((r) => {
      if (!brandSensorMap[r.brandKey]) brandSensorMap[r.brandKey] = []
      brandSensorMap[r.brandKey].push(r.sensorType)
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
      nExperiments: nExperiments || 1,
      nTotalBrands: new Set(brandData.map((r) => r.brand)).size,
      brandDenom: brandEntries.reduce((a, d) => a + d.total, 0) || 1,
      brandSensorMap,
      brandMode,
    }
  }, [overall, signalTotals, signalInstanceTotals, brandData, brandMode, nExperiments])

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
        const sensorsOfBrand = layout.brandSensorMap[obj.brandKey] || []
        return sensorsOfBrand.some((s) => connectedSensors.has(s))
      }
      return false
    }
    if (selected.level === 'sensor') {
      if (obj.sensor === selected.name) return true
      if (obj.signal) return layout.sigSenLinks.some((l) => l.sensor === selected.name && l.signal === obj.signal)
      if (obj.brandKey) return (layout.brandSensorMap[obj.brandKey] || []).includes(selected.name)
      return false
    }
    if (selected.level === 'brand') {
      const sensorsOfSelectedBrand = layout.brandSensorMap[selected.name] || []
      if (obj.brandKey === selected.name) return true
      if (obj.sensor && sensorsOfSelectedBrand.includes(obj.sensor)) return true
      if (obj.signal) return sensorsOfSelectedBrand.some((s) => layout.sigSenLinks.some((l) => l.sensor === s && l.signal === obj.signal))
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
    const parentDenominator = link.from.studyTotal || link.from.total || link.count
    return (
      <path d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} fill="none" stroke={color}
        strokeWidth={strokeW} opacity={active ? 0.32 : 0.06}
        className="cursor-default transition-opacity duration-150"
        onMouseEnter={(e) => showTip(e, `${link.label}: ${link.count} instances (${((link.count / Math.max(parentDenominator, 1)) * 100).toFixed(1)}% of ${link.from.name})`)} onMouseMove={moveTip} onMouseLeave={hideTip} />
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
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10.5px] text-inkfaint font-data">brand column:</span>
        <div className="flex gap-1" data-toggle-group="content">
          <button
            onClick={() => { setBrandMode('bySensor'); setSelected(null) }}
            className={`px-2 py-0.5 rounded text-[10.5px] font-data transition-colors ${
              brandMode === 'bySensor' ? 'bg-ink text-paper' : 'bg-line/50 text-inkmid hover:bg-line'
            }`}
          >
            by sensor type
          </button>
          <button
            onClick={() => { setBrandMode('collapsed'); setSelected(null) }}
            className={`px-2 py-0.5 rounded text-[10.5px] font-data transition-colors ${
              brandMode === 'collapsed' ? 'bg-ink text-paper' : 'bg-line/50 text-inkmid hover:bg-line'
            }`}
          >
            collapsed by brand
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mb-4">
        {DOMAIN_ORDER.map((name) => (
          <div key={name} className="flex items-center gap-1.5 text-[11px] text-inkmid">
            <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: DOMAIN_GROUPS[name].color }} />
            <span>{name}</span>
          </div>
        ))}
      </div>
      <div className="no-horizontal-scroll">
        <svg width={layout.W} height={layout.H + 24} className="font-data block">
          {/* Column headers, given their own row above the chart so they
              never overlap the topmost node regardless of column height. */}
          <text x={190} y={14} fontSize={10} fill="#8A8A8A" fontWeight="600">SIGNAL</text>
          <text x={440} y={14} fontSize={10} fill="#8A8A8A" fontWeight="600">SENSOR TYPE</text>
          <text x={700} y={14} fontSize={10} fill="#8A8A8A" fontWeight="600">
            {brandMode === 'bySensor' ? 'SENSOR BRAND (top 3 per sensor type)' : `SENSOR BRAND (top ${COLLAPSED_TOP_N}, collapsed across sensor types)`}
          </text>
          <g transform="translate(0, 24)">
            {layout.sigSenLinks.map((l, i) => (<FlowPath key={`ss-${i}`} link={l} color={l.color} maxFlow={layout.maxFlow} />))}
            {layout.senBrandLinks.map((l, i) => (<FlowPath key={`sb-${i}`} link={l} color={l.color} maxFlow={layout.maxFlow} />))}
            {layout.signal.map((n) => {
              const active = isActive({ signal: n.name })
              return (
                <g key={n.name}
                  onClick={() => setSelected(selected?.level === 'signal' && selected.name === n.name ? null : { level: 'signal', name: n.name })}
                  onMouseEnter={(e) => showTip(e, `${n.name}: ${n.studyTotal} of ${layout.nExperiments} experiments (${((n.studyTotal / layout.nExperiments) * 100).toFixed(1)}%); flows represent ${n.total} experiment–signal–method instances — click to isolate`)} onMouseMove={moveTip} onMouseLeave={hideTip}
                  className="cursor-pointer" style={{ opacity: active ? 1 : 0.2 }}>
                  <rect x={n.x} y={n.y} width={14} height={n.h} fill={n.color} rx={2} />
                  <text x={n.x - 8} y={n.y + n.h / 2 + 3.5} fontSize={10.5} fill="#0A0A0A" textAnchor="end">{`${n.name}, ${n.studyTotal} (${((n.studyTotal / layout.nExperiments) * 100).toFixed(0)}%)`}</text>
                </g>
              )
            })}
            {layout.sensor.map((n) => {
              const active = isActive({ sensor: n.name })
              const parentSignals = n.parentSignals || []
              const dominant = parentSignals.length ? [...parentSignals].sort((a, b) => b.count - a.count)[0] : null
              const isMixed = parentSignals.length > 1
              const pct = dominant ? (dominant.count / Math.max(dominant.denominator, 1)) * 100 : 0
              const label = isMixed ? `${n.name}, ${n.total}` : `${n.name}, ${n.total} (${pct.toFixed(0)}%)`
              const parentDetail = !dominant
                ? `${n.total} experiment–signal–method instances`
                : isMixed
                ? `${n.total} total (${dominant.count} of ${dominant.denominator} ${dominant.signal} experiments, ${pct.toFixed(1)}% — its dominant signal; ${n.total - dominant.count} more instance${n.total - dominant.count === 1 ? '' : 's'} come from ${parentSignals.length - 1} other signal${parentSignals.length - 1 === 1 ? '' : 's'}, see incoming links)`
                : `${n.total} of ${dominant.denominator} ${dominant.signal} experiments (${pct.toFixed(1)}%)`
              return (
                <g key={n.name}
                  onClick={() => setSelected(selected?.level === 'sensor' && selected.name === n.name ? null : { level: 'sensor', name: n.name })}
                  onMouseEnter={(e) => showTip(e, `${n.name}: ${parentDetail} — click to isolate connected signals and brands`)} onMouseMove={moveTip} onMouseLeave={hideTip}
                  className="cursor-pointer" style={{ opacity: active ? 1 : 0.2 }}>
                  <rect x={n.x} y={n.y} width={14} height={n.h} fill={n.color} rx={2} />
                  <text x={n.x + 18} y={n.y + n.h / 2 + 3.5} fontSize={10} fill="#0A0A0A">{label}</text>
                </g>
              )
            })}
            {layout.brand.map((n) => {
              const active = isActive({ sensor: n.sensorType, brandKey: n.key })
              const sensorsOfBrand = layout.brandSensorMap[n.key] || []
              const pct = brandMode === 'bySensor'
                ? (() => {
                    const senTotal = layout.sensor.find((s) => s.name === n.sensorType)?.total || n.total
                    return ((n.total / senTotal) * 100).toFixed(0)
                  })()
                : ((n.total / layout.brandDenom) * 100).toFixed(0)
              const tipText = brandMode === 'bySensor'
                ? `${n.name}: ${n.total} instances (${pct}% of ${n.sensorType}) — click to isolate`
                : `${n.name}: ${n.total} instances across ${sensorsOfBrand.length} sensor type${sensorsOfBrand.length === 1 ? '' : 's'} (${sensorsOfBrand.join(', ')}) — click to isolate`
              return (
                <g key={n.key}
                  onClick={() => setSelected(selected?.level === 'brand' && selected.name === n.key ? null : { level: 'brand', name: n.key })}
                  onMouseEnter={(e) => showTip(e, tipText)}
                  onMouseMove={moveTip} onMouseLeave={hideTip}
                  className="cursor-pointer" style={{ opacity: active ? 1 : 0.2 }}>
                  <rect x={n.x} y={n.y} width={14} height={n.h} fill={n.color} rx={2} />
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
        Flow width and node height are proportional to experiment–signal–method instances; node and link colours mark physiological signal families; the central thermal-state family is highlighted in yellow. Node labels show counts and, where a single denominator applies, percentages. Signal labels show unique experiment counts and percentages of all experiments. Sensor-type counts and flow widths represent experiment–signal–method instances. When a sensor type belongs to one signal, its label percentage is calculated against the number of experiments measuring that signal; for sensor types shared by several signals, the node shows a count only and each incoming link reports its signal-specific percentage. Link hover reports the percentage relative to the immediate parent signal or sensor-type node. Click any signal, sensor type, or brand to highlight all connected paths and rows across all three columns.
        {' '}The brand-column toggle above switches between two parentages for the same underlying counts: "by sensor type" keeps each brand's node scoped to one sensor type (so a brand sold under two sensor types appears as two smaller nodes, and its brand percentage is relative to that one sensor type's total); "collapsed by brand" merges those into a single node per brand name with links fanning in from every sensor type it's used under (brand percentage is then relative to the top-{COLLAPSED_TOP_N} brands shown, not to any one sensor type).
      </p>
      <TooltipPortal tip={tip} />
    </div>
  )
}



function mstPrevalenceByPeriod(mst) {
  return mst.periods.map((period) => {
    const allStatuses = mst.calc_rate_by_period.filter((r) => r.period === period)
    // NAN denotes experiments without skin-temperature measurement and is
    // therefore outside the population at risk of calculating MST.
    const skinTempStatuses = allStatuses.filter((r) => r['physio-mst-calculated'] !== 'NAN')
    const calculated = skinTempStatuses
      .filter((r) => r['physio-mst-calculated'] === 'Y')
      .reduce((sum, r) => sum + r.count, 0)
    const skinTempTotal = skinTempStatuses.reduce((sum, r) => sum + r.count, 0)
    const allTotal = allStatuses.reduce((sum, r) => sum + r.count, 0)
    return {
      period,
      calculated,
      skinTempTotal,
      allTotal,
      calcAmongSkinTemp: skinTempTotal ? (calculated / skinTempTotal) * 100 : 0,
      skinTempAmongAll: allTotal ? (skinTempTotal / allTotal) * 100 : 0,
      calcAmongAll: allTotal ? (calculated / allTotal) * 100 : 0,
    }
  })
}

function MstCalculationPrevalence({ byPeriod }) {
  const [view, setView] = useState('allExperiments')

  return (
    <div className="max-w-[760px]">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[10.5px] text-inkfaint font-data">view:</span>
        <ToggleGroup
          value={view}
          onChange={setView}
          options={[
            { value: 'allExperiments', label: 'all experiments' },
            { value: 'skinTempOnly', label: 'within skin temperature' },
          ]}
        />
      </div>
      <div className="mb-4 font-data text-[10px] text-inkfaint">
        {view === 'allExperiments' ? (
          <>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
              <span>Each column = 100% of experiments in its period</span>
              <span>Top label: MST calculated / skin-temperature experiments</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#5B5BFF]" />MST calculated</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#0A0A0A]" />Skin temperature, no MST / NR</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#EFEFEF] border border-line" />No skin temperature</span>
            </div>
          </>
        ) : (
          <>
            <div className="mb-2">Each column = 100% of experiments measuring skin temperature in its period</div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#5B5BFF]" />MST calculated</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#0A0A0A]" />No MST / NR</span>
            </div>
          </>
        )}
      </div>
      <div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-2 gap-y-5 sm:gap-x-3 sm:gap-y-0">
          {byPeriod.map(({ period, calculated, skinTempTotal, allTotal, calcAmongSkinTemp, skinTempAmongAll, calcAmongAll }) => (
            <div key={period} className="min-w-0 text-center">
              <div className="h-5 flex items-end justify-center font-data text-[11px] text-inkmid tabular-nums">
                {calcAmongSkinTemp.toFixed(calcAmongSkinTemp === 100 ? 0 : 1)}%
              </div>
              <div
                className="relative h-32 mt-1 overflow-hidden rounded-sm border border-line bg-[#EFEFEF]"
                title={`${period}: skin temperature in ${skinTempTotal} of ${allTotal} experiments (${skinTempAmongAll.toFixed(1)}%); MST calculated in ${calculated} of ${skinTempTotal} skin-temperature experiments (${calcAmongSkinTemp.toFixed(1)}%)`}
              >
                <div
                  className="absolute inset-x-0 bottom-0 bg-[#0A0A0A]"
                  style={{ height: `${view === 'allExperiments' ? skinTempAmongAll : 100}%` }}
                />
                <div
                  className="absolute inset-x-0 bottom-0 bg-[#5B5BFF]"
                  style={{ height: `${view === 'allExperiments' ? calcAmongAll : calcAmongSkinTemp}%` }}
                />
              </div>
              <div className="mt-2 font-data text-[11px] text-inkmid">{period}</div>
              <div className="font-data text-[10px] text-inkfaint tabular-nums">Tsk {skinTempTotal}/{allTotal} ({skinTempAmongAll.toFixed(0)}%)</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MstSankey({ mst, totalExperiments }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const [selected, setSelected] = useState(null)

  const statusCounts = mst.calc_rate_by_period.reduce((acc, r) => {
    const raw = String(r['physio-mst-calculated'] || '').trim()
    const k = raw === 'Y' ? 'Y' : 'N/NR'
    acc[k] = (acc[k] || 0) + r.count
    return acc
  }, {})
  const yCount = statusCounts.Y || mst.n_mst_studies
  const nonYCount = statusCounts['N/NR'] || Math.max((totalExperiments || 0) - yCount, 0)

  // Points: exact value per study (no ranges), ordered smallest -> largest,
  // with the NR/NC bucket last. Non-exclusive: experiments using multiple configurations appear in each point category.
  const pointTotals = Object.fromEntries(mst.points_totals.map((r) => [String(r.pt_label), r.count]))
  const pointLabel = (name) => (name === 'NR/NC' ? 'Points NR/NC' : name)
  const points = mst.point_order
    .filter((name) => pointTotals[name] > 0)
    .map((name) => ({ name, total: pointTotals[name] }))

  // Formulas: every distinct formula named in the corpus, none collapsed
  // into "Other". Non-exclusive -- a study naming several formulas is
  // counted under each, so this can sum to more than yCount (see footnote).
  const formulaTotals = Object.fromEntries(mst.formula_totals.map((r) => [r.formula, r.count]))
  const formulas = Object.entries(formulaTotals).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total)
  const formulaInstanceTotal = Object.values(formulaTotals).reduce((a, v) => a + v, 0) || 1
  const formulaNrTotal = formulaTotals.NR || 0

  const pointFormulaLinks = mst.point_formula_links.map((r) => ({ point: String(r.pt_label), formula: r.formula, count: r.count }))

  const layoutNodes = (entries, x, px = 1.25, minH = 14, gap = 8) => {
    let y = 26
    return entries.map((e) => {
      const h = Math.max(minH, e.total * px)
      const n = { ...e, x, y, h }
      y += h + gap
      return n
    })
  }
  const left = layoutNodes([{ name: 'MST calculated: Y', total: yCount }, { name: 'MST calculated: N/NR', total: nonYCount }], 160, 1.05, 24, 14)
  const mid = layoutNodes(points, 430, 1.15, 14, 7)
  const right = layoutNodes(formulas, 710, 1.15, 14, 7)
  const H = Math.max(230, ...[...left, ...mid, ...right].map((n) => n.y + n.h)) + 18
  const maxFlow = Math.max(yCount, nonYCount, ...pointFormulaLinks.map((l) => l.count), 1)

  const pointBy = Object.fromEntries(mid.map((n) => [n.name, n]))
  const formulaBy = Object.fromEntries(right.map((n) => [n.name, n]))
  const yNode = left[0]
  const nonYNode = left[1]
  const links = []
  mid.forEach((p) => links.push({ from: yNode, to: p, count: p.total, kind: 'ypoint', status: 'MST calculated: Y', point: p.name, color: '#0A0A0A' }))
  pointFormulaLinks.forEach((l) => {
    const from = pointBy[l.point]
    const to = formulaBy[l.formula]
    if (from && to) links.push({ from, to, count: l.count, kind: 'formula', point: l.point, formula: l.formula, color: '#0A0A0A' })
  })

  const connected = (obj) => {
    if (!selected) return true
    if (selected.type === 'status') {
      if (selected.name === 'MST calculated: N/NR') return obj.name === selected.name || obj.status === selected.name
      return obj.name === selected.name || obj.status === selected.name || obj.kind === 'ypoint' || obj.kind === 'formula'
    }
    if (selected.type === 'point') {
      return obj.name === selected.name || obj.point === selected.name || obj.name === 'MST calculated: Y' || obj.status === 'MST calculated: Y' ||
        (obj.formula && pointFormulaLinks.some((l) => l.point === selected.name && l.formula === obj.formula))
    }
    if (selected.type === 'formula') {
      const connectedPoints = new Set(pointFormulaLinks.filter((l) => l.formula === selected.name).map((l) => l.point))
      return obj.name === selected.name || obj.formula === selected.name || obj.name === 'MST calculated: Y' || obj.status === 'MST calculated: Y' ||
        (obj.point && connectedPoints.has(obj.point))
    }
    return true
  }

  const pathFor = (l) => {
    const x1 = l.from.x + 14
    const y1 = l.from.y + l.from.h / 2
    const x2 = l.to.x
    const y2 = l.to.y + l.to.h / 2
    const mx = (x1 + x2) / 2
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
  }

  const node = (n, type, color, denom) => {
    const isOn = connected({ name: n.name, [type]: n.name })
    const pct = denom ? (n.total / denom) * 100 : 0
    const displayName = type === 'point' ? pointLabel(n.name) : n.name
    const label = `${displayName}, ${n.total} (${pct.toFixed(0)}%)`
    const unit = type === 'formula' ? 'formula instances' : 'experiments'
    const denominatorLabel = type === 'formula'
      ? `${formulaInstanceTotal} formula instances, including NR`
      : 'the parent experiment group'
    return (
      <g key={`${type}-${n.name}`} className="cursor-pointer" style={{ opacity: isOn ? 1 : 0.18 }}
        onClick={() => setSelected(selected?.type === type && selected.name === n.name ? null : { type, name: n.name })}
        onMouseEnter={(e) => showTip(e, `${displayName}: ${n.total} ${unit}${type !== 'status' ? ` (${pct.toFixed(1)}% of ${denominatorLabel})` : ''}. Click to isolate connected paths.`)} onMouseMove={moveTip} onMouseLeave={hideTip}>
        <rect x={n.x} y={n.y} width={14} height={n.h} rx={2} fill={color} />
        <text x={type === 'status' ? n.x - 8 : n.x + 20} y={n.y + n.h / 2 + 3.5} fontSize={10.5} fill="#0A0A0A" textAnchor={type === 'status' ? 'end' : 'start'}>{label}</text>
      </g>
    )
  }

  return (
    <div>
      {selected && <button onClick={() => setSelected(null)} className="mb-3 px-2.5 py-1 rounded text-[11px] font-data bg-line/60 text-inkmid hover:bg-line">✕ clear selection ({selected.name})</button>}
      <svg width={980} height={H + 24} className="font-data block overflow-visible">
        <text x={160} y={12} fontSize={10} fill="#8A8A8A" fontWeight="600" textAnchor="middle">MST STATUS</text>
        <text x={430} y={12} fontSize={10} fill="#8A8A8A" fontWeight="600">NUMBER OF POINTS</text>
        <text x={710} y={12} fontSize={10} fill="#8A8A8A" fontWeight="600">FORMULA USES (n = {formulaInstanceTotal})</text>
        {links.map((l, i) => (
          <path key={i} d={pathFor(l)} fill="none" stroke={l.color} strokeWidth={Math.max(1.2, (l.count / maxFlow) * 30)} opacity={connected(l) ? 0.24 : 0.035}
            onMouseEnter={(e) => showTip(e, `${l.kind === 'ypoint' ? 'MST calculated Y → ' + pointLabel(l.point) : pointLabel(l.point) + ' points → ' + l.formula}: ${l.count} experiments`)} onMouseMove={moveTip} onMouseLeave={hideTip} />
        ))}
        {node(yNode, 'status', '#0A0A0A', yCount + nonYCount)}
        {node(nonYNode, 'status', '#BBBBBB', yCount + nonYCount)}
        {mid.map((n) => node(n, 'point', '#0A0A0A', yCount))}
        {right.map((n) => node(n, 'formula', '#0A0A0A', formulaInstanceTotal))}
      </svg>
      <p className="font-data text-[10px] text-inkfaint mt-2">MST-specific denominator: {yCount} experiments calculated MST. Point-count nodes are experiment-level; formula nodes represent {formulaInstanceTotal} experiment–point-count–formula instances because an experiment may use or compare more than one formula.</p>
      <p className="font-data text-[10px] text-inkfaint mt-1">Formula percentages use {formulaInstanceTotal} formula instances as their denominator, including {formulaNrTotal} entries coded <CodeChip code="NR" />. Each point-to-formula connection represents a documented pairing. Single-site temperatures are not treated as MST calculations.</p>
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
      <div className="flex gap-1 mb-4" data-toggle-group="content">
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
      <div style={{ minHeight: 760 }}>
        <BodySiteMap siteData={current.siteData} totalLabel={current.totalLabel} height={690} />
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

  const mstByPeriod = mstPrevalenceByPeriod(mst)
  const coverage = mstByPeriod.filter((row) => row.allTotal > 0).map((row) => row.skinTempAmongAll)
  const skinCoverageRange = coverage.length
    ? [...new Set([Math.min(...coverage), Math.max(...coverage)].map((p) => p.toFixed(1)))].join('–') + '%'
    : '—'
  const topSignal = fig17_physio_params.data[0]
  const evoSignals = Object.keys(evo_signal_sensor.signals)
  const evoPeriods = evo_signal_sensor.periods
  const evoFirstPeriod = evoPeriods[0]
  const evoLastPeriod = evoPeriods[evoPeriods.length - 1]
  // Dynamic thermocouple/Thermochron displacement stats for the section
  // intro, normalized among skin-temperature experiments in each period (not
  // the full corpus) to match the matrix denominator.
  const skinEvo = evo_signal_sensor.signals['Skin temperature']
  const skinEvoByPeriod = useMemo(() => {
    const map = {}
    skinEvo.data.forEach((r) => { (map[r.period] ??= {})[r.sensor_grp] = r.count })
    return map
  }, [skinEvo])
  const skinSensorPct = (sensor, period) => {
    const denom = skinEvo.period_totals[period] || 0
    const c = skinEvoByPeriod[period]?.[sensor] || 0
    return denom ? ((c / denom) * 100).toFixed(0) : '0'
  }
  const thermocoupleEarlyPct = skinSensorPct('Thermocouple', evoFirstPeriod)
  const thermocoupleLatePct = skinSensorPct('Thermocouple', evoLastPeriod)
  const thermochronEarlyPct = skinSensorPct('Thermochron', evoFirstPeriod)
  const thermochronLatePct = skinSensorPct('Thermochron', evoLastPeriod)

  const topSignalPct = ((topSignal.count / summary.n_experiments) * 100).toFixed(0)
  const mstPct = ((mst.n_mst_studies / summary.n_experiments) * 100).toFixed(0)
  const brandPct = ((sensor_brands.n_studies_with_brand / summary.n_experiments) * 100).toFixed(0)

  // MST point-count choice by period (Fig 29), restricted to studies that
  // actually calculate MST (mst.n_mst_studies), normalized against how many
  // of those MST-calculating studies fall in each period (mst.period_n_mst)
  // -- not against summary.n_experiments.
  const mstPointLabel = (name) => (name === 'NR/NC' ? 'NR/NC' : `${name}-point`)
  const mstPointRows = mst.point_order.map(mstPointLabel)
  const mstPointRawByLabel = Object.fromEntries(mst.point_order.map((p) => [mstPointLabel(p), p]))
  const mstPointsTotalsMap = Object.fromEntries(mst.points_totals.map((r) => [String(r.pt_label), r.count]))
  const mstPointsByPeriod = useMemo(() => {
    const map = {}
    mst.point_order.forEach((p) => { map[p] = {} })
    mst.points_by_period.forEach((r) => { if (map[r.pt_label]) map[r.pt_label][r.period] = r.count })
    return map
  }, [mst])
  const topMstPoint = [...mst.points_totals].sort((a, b) => b.count - a.count)[0]
  const topMstPointPct = ((topMstPoint.count / mst.n_mst_studies) * 100).toFixed(0)

  const signalCounts = Object.fromEntries(fig17_physio_params.data.map(({ parameter, count }) => [parameter, count]))
  const skinTempN = signalCounts['Skin temperature'] ?? 0
  const heartRateN = signalCounts['Heart/Pulse rate'] ?? 0
  const skinTempPct = ((skinTempN / summary.n_experiments) * 100).toFixed(0)
  const heartRatePct = ((heartRateN / summary.n_experiments) * 100).toFixed(0)
  const nSensorTypesSkinTemp = new Set(
    physio_signal_sensor.overall.filter((r) => r.signal === 'Skin temperature' && !['NR', 'MNR', 'NAN', 'NC'].includes(r['physio-sensing-method'])).map((r) => r['physio-sensing-method'])
  ).size

  const cooccurLabels = fig18_physio_cooccurrence.labels
  const cooccurMatrix = fig18_physio_cooccurrence.matrix
  const iSkin = cooccurLabels.indexOf('Skin temperature')
  const iHr = cooccurLabels.indexOf('Heart/Pulse rate')
  const skinHrCooccur = cooccurMatrix[iSkin][iHr]
  // Use the matrix's own diagonal totals (not signal_totals) so the
  // percentage is self-consistent with what this specific chart shows --
  // fig18 doesn't require a sensing method to be reported, so its totals
  // differ slightly from physio_signal_sensor's method-conditioned counts.
  const cooccurSkinTotal = cooccurMatrix[iSkin][iSkin]
  const cooccurHrTotal = cooccurMatrix[iHr][iHr]
  const hrAlsoSkinPct = ((skinHrCooccur / cooccurHrTotal) * 100).toFixed(0)

  const topSkinSite = allSites[0]
  const topSkinSitePct = ((topSkinSite.total / skintemp_sites.n_studies_with_site) * 100).toFixed(0)
  const nextSkinSites = allSites.slice(1, 5)
  const nextSkinSitesLabel = nextSkinSites.map((s) => s.site.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ', and $1')
  const nextSkinSitesMin = Math.min(...nextSkinSites.map((s) => s.total))
  const nextSkinSitesMax = Math.max(...nextSkinSites.map((s) => s.total))

  const hrSites = site_by_signal['Heart/Pulse rate'].site_totals
  const hrN = site_by_signal['Heart/Pulse rate'].n_studies_with_site
  const hrChest = hrSites.find((s) => s.site === 'Chest')?.count
  const hrWrist = hrSites.find((s) => s.site === 'Wrist')?.count

  const sudoSites = site_by_signal['Sudomotor (combined)'].site_totals
  const sweatWholeBody = sudoSites.find((s) => s.site === 'Whole body')?.count
  const conductanceWrist = sudoSites.find((s) => s.site === 'Wrist')?.by_signal?.['Skin conductance'] || 0
  const conductanceFinger = sudoSites.find((s) => s.site === 'Finger')?.by_signal?.['Skin conductance'] || 0

  // Brand stats for the Signal -> sensor type -> brand caption. Counted by
  // summing each brand's appearances across signals (so a combination
  // device that reports e.g. both blood pressure and heart rate counts
  // once per signal) -- this is the metric the caption's framing already
  // assumes ("OMRON... spread across signals"), kept consistent here
  // rather than switching to a distinct-experiment count, which would
  // answer a different question and isn't comparable to it.
  const brandStats = useMemo(() => {
    const totals = {}
    data.brand_model_reference.data.forEach((r) => {
      totals[r.brand] = totals[r.brand] || {}
      totals[r.brand][r.signal] = (totals[r.brand][r.signal] || 0) + r.study_ids.length
    })
    const sumFor = (b) => Object.values(totals[b] || {}).reduce((a, c) => a + c, 0)
    const topSignalsFor = (b) => Object.entries(totals[b] || {}).sort((a, b2) => b2[1] - a[1])
    return { totals, sumFor, topSignalsFor }
  }, [data.brand_model_reference.data])
  const omronTotal = brandStats.sumFor('Omron')
  const omronBySignal = Object.fromEntries(brandStats.topSignalsFor('Omron'))
  const iButtonTotal = brandStats.sumFor('iButton')
  const iButtonSkin = brandStats.totals['iButton']?.['Skin temperature'] || 0

  return (
    <div>
      <ChapterHeader
        title="Measuring the human"
        framing={
          <>
            <p>
              This chapter covers every physiological signal in the corpus: what's measured, with what
              sensor, from which brand, and at which body site — plus the special case of mean skin
              temperature, the field's most frequently derived composite measure.
            </p>
            <p>
              We looked for sensor type, brand, model, and body site because the same signal name can
              hide very different measurement realities — "skin temperature" measured with a thermocouple, infrared camera, or wearable patch can differ in measurement principle and anatomical coverage, and the corpus lets us see which choices were coded for each experiment, including missing details and permitted device-based inferences.
            </p>
          </>
        }
        headline={[
          { value: summary.n_experiments, label: 'Experiments' },
          { value: `${topSignalPct}%`, label: `measure ${topSignal.parameter.toLowerCase()}`, color: '#FB3640' },
          { value: `${mstPct}%`, label: 'calculate MST', color: '#FB3640' },
          { value: `${brandPct}%`, label: 'have a coded brand for at least one measurement', color: '#5B5BFF' },
        ]}
      />

      <ChapterSection
        title="What's measured, and how"
        intro={`Skin temperature was recorded in ${skinTempN} experiments (${skinTempPct}%) and heart or pulse rate in ${heartRateN} (${heartRatePct}%). The figures show how often each signal was recorded and which signals were measured in the same experiment.`}
      >
        <FigureCard figNumber={figNum('signals-measured-freq')} title="Most frequently measured signals" plotWidth={980} commentary={`Of ${summary.n_experiments} experiments, ${skinTempN} recorded skin temperature, ${heartRateN} recorded heart or pulse rate, ${signalCounts['Core/Body temperature'] ?? 0} recorded core or body temperature, and ${signalCounts['Blood pressure'] ?? 0} recorded blood pressure.`}>
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

        <FigureCard figNumber={figNum('signals-cooccurrence')} title="Which signals get measured together" plotWidth={680} commentary={`Skin temperature (${cooccurSkinTotal} experiments) and heart/pulse rate (${cooccurHrTotal}) are individually the most common signals, and ${skinHrCooccur} experiments measure both together — about ${hrAlsoSkinPct}% of all heart-rate experiments also track skin temperature.`}>
          <CooccurrenceMatrix labels={fig18_physio_cooccurrence.labels} matrix={fig18_physio_cooccurrence.matrix} cellSize={38} colorScheme="blue" corpusN={summary.n_experiments} />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Signals, sensor types, and brands"
        intro="The same signal can be captured by different instruments. The flow includes signals measured in at least five experiments, with their coded sensing methods and brand status. Signals are grouped by physiological domain. The default brand view shows the three most frequent brand categories per sensing method; the alternative combines brands across methods."
      >
        <FigureCard
          figNumber={figNum('signal-sensor-brand')}
          title="Signal → sensor type → brand"
          plotWidth={1100}
          commentary={[
            `Across the ${skinTempN} experiments that measured skin temperature, the papers identify ${nSensorTypesSkinTemp} distinct sensing methods. Missing and unclear methods are shown separately.`,
            `Flow widths count experiment–signal–sensing-method instances, so one experiment can contribute more than once. Signal labels show unique-experiment prevalence. Brand categories include missing or multiple-brand status; displayed brand paths are restricted to the leading categories in the selected view. Hover to inspect counts or select a node to highlight its connections.`,
          ]}
        >
          <SignalSensorBrandSankey overall={physio_signal_sensor.overall} signalTotals={physio_signal_sensor.signal_totals} signalInstanceTotals={physio_signal_sensor.signal_instance_totals} brandData={physio_signal_sensor.signal_method_brand} nExperiments={summary.n_experiments} />
        </FigureCard>

        <FigureCard figNumber={figNum('body-site-per-signal')} title="Where on the body each signal is measured" plotWidth={900} commentary={`Skin-temperature measurements span multiple anatomical sites. Heart rate concentrates at the chest (${hrChest} of ${hrN} experiments, where ECG-based measurements are often obtained) and wrist (${hrWrist}, where optical wearables are often placed). The sudomotor signals split sharply by method: ${sweatWholeBody} sweat-indicator experiments measure the whole body at once (not shown on the diagram, see the list at right), while skin conductance is almost always local — ${conductanceWrist} experiments at the wrist, ${conductanceFinger} at the finger.`}>          <BodySiteToggle
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
        intro={`For skin temperature, thermocouples were used in ${thermocoupleEarlyPct}% of skin-temperature experiments in ${evoFirstPeriod} but only ${thermocoupleLatePct}% by ${evoLastPeriod}, while Thermochron-type dataloggers (e.g. iButton) rose from ${thermochronEarlyPct}% to ${thermochronLatePct}% over the same span in this corpus. Both this comparison and the matrix use experiments measuring the selected signal in each period as their denominator. Methods are non-exclusive: an experiment using several methods contributes to each.`}
      >
        <FigureCard figNumber={figNum('sensor-choice-by-signal')} title="Sensing methods by signal and period" size="wide" commentary="Select a signal to inspect its coded sensing methods. Percentages use experiments measuring that signal in the corresponding two-year period. Methods are non-exclusive: an experiment using several methods contributes to each.">
          <SensorEvolutionToggle signals={evoSignals} evoData={evo_signal_sensor} periods={evoPeriods} />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Skin temperature body sites"
        intro="The figure shows where skin temperature was measured in each publication period. Only near-synonymous labels are collapsed (e.g. calf/shin → lower leg); distinct face sub-sites remain separate."
      >
        <FigureCard figNumber={figNum('site-prevalence-by-period')} title="Site prevalence by period" plotWidth={980} commentary={`${topSkinSite.site} is the single most-measured site (${topSkinSite.total} of ${skintemp_sites.n_studies_with_site} skin-temperature experiments, ${topSkinSitePct}%), followed closely by ${nextSkinSitesLabel} (all ${nextSkinSitesMin}–${nextSkinSitesMax} experiments). No one site is measured in every experiment — anatomical sampling varies across the included experiments.`}>
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
        <FigureCard figNumber={figNum('hr-measurement-site')} title="Heart/pulse rate and core/body temperature sites" plotWidth={980} commentary={`Chest (${hrChest} of ${hrN} experiments) and wrist (${hrWrist}) are the two dominant heart-rate sites. Use the signal toggle to inspect anatomical sites directly. The heart-rate denominator is experiments with a coded site; core/body temperature uses all experiments measuring that signal in each period. Sites are non-exclusive, and “Mouth” is harmonised with oral cavity.`}>
          <OtherSignalSiteToggle siteData={site_by_signal} core={data.combination_views.core} />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Mean skin temperature"
        intro={`Across two-year publication periods, the share of experiments measuring skin temperature was ${skinCoverageRange}. Among those experiments, ${mst.n_mst_studies} explicitly calculated mean skin temperature. The figure distinguishes calculation from skin-temperature measurement and retains weighted and unweighted calculations as coded. The experiments that calculate MST use a wide range of point configurations and weighting formulas.`}
      >
        <FigureCard figNumber={figNum('mst-calculation-prevalence')} title="Skin-temperature measurement and MST calculation by period" plotWidth={980} commentary="In all-experiments view, each column is the full period cohort: blue shows explicit MST calculation, black skin-temperature measurement without an explicit calculation, and pale grey no skin-temperature measurement. The top percentage is MST calculation among skin-temperature experiments; the label beneath gives skin-temperature coverage of the full period. Switch to within skin temperature to normalize the same calculation choice to the eligible experiments only.">
          <MstCalculationPrevalence byPeriod={mstByPeriod} />
        </FigureCard>

        <FigureCard figNumber={figNum('mst-calc-pathway')} title="MST calculation pathway" plotWidth={980} commentary="The flow distinguishes experiments calculating mean skin temperature (MST) and, within that group, the documented number of measurement points and calculation formulas. Formula counts are experiment–point-count–formula instances rather than unique experiments, because individual experiments may compare more than one formula.">
          <MstSankey mst={mst} totalExperiments={summary.n_experiments} />
        </FigureCard>

        <FigureCard figNumber={figNum('mst-points-by-period')} title="MST body-site point count by period" plotWidth={980} commentary={`${topMstPoint.pt_label}-point is the most common choice overall (${topMstPoint.count} of ${mst.n_mst_studies} MST-calculating experiments, ${topMstPointPct}%). Percentages here are of MST-calculating experiments in that period only, not of all experiments — so they show how point-count choice has shifted among researchers who compute MST, independent of the declining calculation rate itself.`}>
          <PeriodHeatmap
            rows={mstPointRows}
            periods={mst.periods}
            periodN={mst.period_n_mst}
            rowTotals={Object.fromEntries(mstPointRows.map((label) => [label, mstPointsTotalsMap[mstPointRawByLabel[label]] || 0]))}
            getCount={(label, p) => mstPointsByPeriod[mstPointRawByLabel[label]]?.[p] || 0}
            labelWidth={100}
            cellWidth={72}
          />
        </FigureCard>
      </ChapterSection>
    </div>
  )
}
