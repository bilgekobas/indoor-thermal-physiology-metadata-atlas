import { useMemo } from 'react'
import { ChapterHeader, ChapterSection } from '../components/Chapter.jsx'
import CompletenessStrip from '../components/CompletenessStrip.jsx'
import FigureCard from '../components/FigureCard.jsx'
import InteractiveBarChart from '../components/InteractiveBarChart.jsx'
import CooccurrenceMatrix from '../components/CooccurrenceMatrix.jsx'
import SignalMethodSiteSankey from '../components/SignalMethodSiteSankey.jsx'
import OverallByPeriod, { PeriodBarGroup } from '../components/OverallByPeriod.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'

const SENSOR_PALETTE = ['#D94F6E', '#4855C8', '#E07820', '#B8C020', '#8A8A86', '#C9698A', '#C9C6BC']

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

// ── Sankey (signal -> sensor -> brand) ─────────────────────────────────
const DOMAIN_ORDER = [
  'PERIPHERAL THERMAL EXCHANGE', 'CARDIOVASCULAR HEAT TRANSPORT', 'CENTRAL THERMAL STATE',
  'SUDOMOTOR / ELECTRODERMAL', 'NEURO-MUSCULAR ELECTROPHYSIOLOGY', 'METABOLIC & BIOCHEMICAL',
]
const DOMAIN_GROUPS = {
  'PERIPHERAL THERMAL EXCHANGE': { color: '#D94F6E', signals: ['Skin temperature', 'Near body temperature', 'Heat flux', 'Skin blood flow'] },
  'CARDIOVASCULAR HEAT TRANSPORT': { color: '#4855C8', signals: ['Heart/Pulse rate', 'Blood pressure', 'Oxygen saturation'] },
  'CENTRAL THERMAL STATE': { color: '#E07820', signals: ['Core/Body temperature', 'Exhaled breath temperature'] },
  'SUDOMOTOR / ELECTRODERMAL': { color: '#B8C020', signals: ['Sweat indicators', 'Skin conductance'] },
  'NEURO-MUSCULAR ELECTROPHYSIOLOGY': { color: '#8A8A86', signals: ['EEG', 'EMG', 'EOG', 'Movement', 'Respiration'] },
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
function SignalSensorBrandSankey({ overall, brandPairs }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
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
      return { name, total, color: '#A8A59C', domain: primaryDomain }
    }).sort((a, b) => {
      const da = DOMAIN_ORDER.indexOf(a.domain), db = DOMAIN_ORDER.indexOf(b.domain)
      return da !== db ? da - db : b.total - a.total
    })
    const activeSensorNames = sensorEntries.map((s) => s.name)
    const brandTotalsAll = {}
    brandPairs.forEach((r) => { if (activeSensorNames.includes(r['physio-sensing-method'])) brandTotalsAll[r['physio-sensor-brand']] = (brandTotalsAll[r['physio-sensor-brand']] || 0) + r.count })
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
    const brandEntries = Object.entries(brandTotals).map(([name, total]) => {
      const sensors = sensorOfBrand[name] || {}
      const primarySensor = Object.entries(sensors).sort((a, b) => b[1] - a[1])[0]?.[0]
      return { name, total, primarySensor }
    }).sort((a, b) => {
      const ia = sensorOrderIndex[a.primarySensor] ?? 999, ib = sensorOrderIndex[b.primarySensor] ?? 999
      return ia !== ib ? ia - ib : b.total - a.total
    })
    const COL_SIGNAL = 230, COL_SENSOR = 560, COL_BRAND = 860
    const sigLayout = layoutColumn(signalEntries, { x: COL_SIGNAL, gap: 6, pxPerUnit: 0.62, minH: 8 })
    const senLayout = layoutColumn(sensorEntries, { x: COL_SENSOR, gap: 5, pxPerUnit: 0.62, minH: 7 })
    const brandLayout = layoutColumn(brandEntries, { x: COL_BRAND, gap: 5, pxPerUnit: 0.62, minH: 7 })
    const H = Math.max(sigLayout.totalHeight, senLayout.totalHeight, brandLayout.totalHeight) + 40
    const domainLayout = []
    DOMAIN_ORDER.forEach((domain) => {
      const sigsInDomain = sigLayout.nodes.filter((n) => n.domain === domain)
      if (sigsInDomain.length === 0) return
      const top = sigsInDomain[0].y
      const bottom = sigsInDomain[sigsInDomain.length - 1].y + sigsInDomain[sigsInDomain.length - 1].h
      domainLayout.push({ name: domain, color: DOMAIN_GROUPS[domain].color, y: top, h: bottom - top })
    })
    const sigSenLinks = []
    overall.forEach((r) => {
      const sig = sigLayout.nodes.find((n) => n.name === r.signal)
      const sen = senLayout.nodes.find((n) => n.name === r['physio-sensing-method'])
      if (!sig || !sen) return
      sigSenLinks.push({ from: sig, to: sen, count: r.count, label: `${r.signal} → ${r['physio-sensing-method']}` })
    })
    const senBrandLinks = []
    brandPairs.forEach((r) => {
      const sen = senLayout.nodes.find((n) => n.name === r['physio-sensing-method'])
      const brand = brandLayout.nodes.find((n) => n.name === r['physio-sensor-brand'])
      if (!sen || !brand) return
      senBrandLinks.push({ from: sen, to: brand, count: r.count, label: `${r['physio-sensing-method']} → ${r['physio-sensor-brand']}` })
    })
    return {
      domain: domainLayout, signal: sigLayout.nodes, sensor: senLayout.nodes, brand: brandLayout.nodes,
      sigSenLinks, senBrandLinks, W: COL_BRAND + 220, H,
      maxFlow: Math.max(...overall.map((r) => r.count), 1), nSingleStudyBrands,
    }
  }, [overall, brandPairs])

  function FlowPath({ link, color, maxFlow }) {
    const strokeW = Math.max(0.6, (link.count / maxFlow) * 22)
    const x1 = link.from.x + 14, y1 = link.from.y + link.from.h / 2
    const x2 = link.to.x, y2 = link.to.y + link.to.h / 2
    const mx = (x1 + x2) / 2
    return (
      <path d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} fill="none" stroke={color} strokeWidth={strokeW} opacity={0.26}
        className="cursor-default hover:opacity-70 transition-opacity"
        onMouseEnter={(e) => showTip(e, `${link.label}: ${link.count} studies`)} onMouseMove={moveTip} onMouseLeave={hideTip} />
    )
  }

  return (
    <div>
      <p className="text-[12.5px] text-inkmid mb-4">
        Flow width is proportional to study count (widest flow = {layout.maxFlow} studies); node bar length is also
        proportional to that node's total, printed next to each signal node. No "Other" bucket for signals or
        sensor types. Brands used in only one study ({layout.nSingleStudyBrands} of them) are omitted from the
        third column to keep it readable.
      </p>
      <div className="flex flex-wrap gap-3 mb-4">
        {DOMAIN_ORDER.map((name) => (
          <div key={name} className="flex items-center gap-1.5 text-[11px] text-inkmid">
            <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: DOMAIN_GROUPS[name].color }} />
            <span>{name}</span>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg width={layout.W} height={layout.H} className="font-data block">
          {layout.domain.map((d) => (<rect key={d.name} x={0} y={d.y} width={6} height={Math.max(d.h, 4)} fill={d.color} rx={1.5} />))}
          {layout.sigSenLinks.map((l, i) => (<FlowPath key={`ss-${i}`} link={l} color={l.from.color} maxFlow={layout.maxFlow} />))}
          {layout.senBrandLinks.map((l, i) => (<FlowPath key={`sb-${i}`} link={l} color="#A8A59C" maxFlow={layout.maxFlow} />))}
          {layout.signal.map((n) => (
            <g key={n.name} onMouseEnter={(e) => showTip(e, `${n.name}: ${n.total} studies`)} onMouseMove={moveTip} onMouseLeave={hideTip} className="cursor-default">
              <rect x={n.x} y={n.y} width={14} height={n.h} fill={n.color} rx={2} />
              <text x={n.x + 18} y={n.y + n.h / 2 + 3.5} fontSize={10.5} fill="#1A1A18">{n.name}, {n.total}</text>
            </g>
          ))}
          {layout.sensor.map((n) => (
            <g key={n.name} onMouseEnter={(e) => showTip(e, `${n.name}: ${n.total} studies`)} onMouseMove={moveTip} onMouseLeave={hideTip} className="cursor-default">
              <rect x={n.x} y={n.y} width={14} height={n.h} fill="#5F5E58" rx={2} />
              <text x={n.x + 18} y={n.y + n.h / 2 + 3.5} fontSize={10} fill="#1A1A18">{n.name}</text>
            </g>
          ))}
          {layout.brand.map((n) => (
            <g key={n.name} onMouseEnter={(e) => showTip(e, `${n.name}: ${n.total} studies`)} onMouseMove={moveTip} onMouseLeave={hideTip} className="cursor-default">
              <rect x={n.x} y={n.y} width={14} height={n.h} fill="#A8A59C" rx={2} />
              <text x={n.x + 18} y={n.y + n.h / 2 + 3.5} fontSize={10} fill="#1A1A18">{n.name}</text>
            </g>
          ))}
          <text x={230} y={12} fontSize={10} fill="#A8A59C" fontWeight="600">SIGNAL</text>
          <text x={560} y={12} fontSize={10} fill="#A8A59C" fontWeight="600">SENSOR TYPE</text>
          <text x={860} y={12} fontSize={10} fill="#A8A59C" fontWeight="600">SENSOR BRAND</text>
        </svg>
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

const FORMULA_COLORS = {
  'Ramanathan (1964)': '#4B1528', 'Hardy & DuBois (1938)': '#D94F6E', 'ISO 9886: 2004': '#E07820',
  'Colin & Houdas (1982)': '#B8C020', 'Ouyang (1985)': '#4855C8', 'McIntyre (1980)': '#8A8A86',
  'Other/Multiple': '#C9C6BC', 'NR': '#E2DED4',
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
                    style={{ height: `${(r.Y / total) * 100}%`, background: '#D94F6E' }}
                    className="cursor-default"
                    onMouseEnter={(e) => showTip(e, `${p}: ${r.Y} of ${total} studies calculate MST (Y) · ${((r.Y / total) * 100).toFixed(0)}%`)}
                    onMouseMove={moveTip} onMouseLeave={hideTip}
                  />
                  <div
                    style={{ height: `${(r.N / total) * 100}%`, background: '#E2DED4' }}
                    className="cursor-default"
                    onMouseEnter={(e) => showTip(e, `${p}: ${r.N} of ${total} studies measure sites but don't aggregate (N) · ${((r.N / total) * 100).toFixed(0)}%`)}
                    onMouseMove={moveTip} onMouseLeave={hideTip}
                  />
                  <div
                    style={{ height: `${(r.NAN / total) * 100}%`, background: '#F1EDE6' }}
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
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#D94F6E' }} /> calculates MST</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#E2DED4' }} /> measures sites, no MST</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#F1EDE6' }} /> no skin temp measured</span>
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

export default function ChapterBody({ data }) {
  const { physio_signal_sensor, skintemp_sites, fig17_physio_params, fig18_physio_cooccurrence,
    evo_signal_sensor, sensor_brands, mst, signal_freq_by_period, site_by_signal, signal_method_site, chapter_completeness, summary } = data

  const topSites = useMemo(() => [...skintemp_sites.site_totals].sort((a, b) => b.total - a.total).slice(0, 12), [skintemp_sites])
  const periods = skintemp_sites.periods
  const siteByPeriod = useMemo(() => {
    const map = {}
    topSites.forEach((s) => { map[s.site] = {} })
    skintemp_sites.site_period_counts.forEach((r) => { if (map[r.site]) map[r.site][r.period] = r.count })
    return map
  }, [topSites, skintemp_sites])
  const periodN = useMemo(() => {
    const m = {}
    skintemp_sites.period_n.forEach((r) => { m[r.period] = r.n_studies })
    return m
  }, [skintemp_sites])

  const topSignal = fig17_physio_params.data[0]
  const evoSignals = Object.keys(evo_signal_sensor.signals)

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
          { value: topSignal.count, label: `studies measure ${topSignal.parameter.toLowerCase()}`, color: '#D94F6E' },
          { value: mst.n_mst_studies, label: 'studies calculate MST', color: '#E07820' },
          { value: sensor_brands.n_studies_with_brand, label: 'report a sensor brand', color: '#4855C8' },
        ]}
      />

      <CompletenessStrip fields={chapter_completeness.physio_measurement.fields} nStudies={chapter_completeness.physio_measurement.n_studies} />

      <ChapterSection
        title="What's measured, and how"
        intro="Skin temperature (218 studies, 81%) and heart rate (135, 50%) dominate by a wide margin over every other signal. Other signals appear far less often and are typically paired with skin temperature or heart rate rather than measured in isolation."
      >
        <FigureCard figNumber="17" title="Most frequently measured signals" commentary="Skin temperature dominates at 218 of 269 experiments (81%) — more than triple the next most common signal, heart/pulse rate at 135 (50%). After that the field thins out fast: core/body temperature and blood pressure each appear in well under a fifth of experiments. Toggle to see how individual signal frequencies have shifted across the decade.">
          <OverallByPeriod
            earliestPeriodCaveat="2013–14 and 2015–16 have few studies (11 and 15); read early-period percentages cautiously."
            renderOverall={() => (
              <InteractiveBarChart data={fig17_physio_params.data.map((d) => ({ label: d.parameter, count: d.count }))} total={summary.n_experiments} color="#D94F6E" maxBars={12} />
            )}
            renderByPeriod={() => {
              const topSignalNames = fig17_physio_params.data.slice(0, 6).map((d) => d.parameter)
              const periods = signal_freq_by_period.periods
              return (
                <div className="space-y-5">
                  {topSignalNames.map((sig) => (
                    <div key={sig}>
                      <h4 className="text-[12px] font-medium mb-1.5 text-inkmid">{sig}</h4>
                      <PeriodBarGroup
                        periods={periods}
                        periodN={signal_freq_by_period.period_n}
                        getValue={(p) => signal_freq_by_period.data.find((r) => r.signal === sig && r.period === p)?.count || 0}
                        getTooltip={(p, v) => `${sig}, ${p}: ${v} of ${signal_freq_by_period.period_n[p]} studies · ${signal_freq_by_period.period_n[p] ? ((v / signal_freq_by_period.period_n[p]) * 100).toFixed(1) : 0}%`}
                        color="#D94F6E"
                        height={70}
                        yUnit=" studies"
                      />
                    </div>
                  ))}
                </div>
              )
            }}
          />
        </FigureCard>

        <FigureCard figNumber="18" title="Which signals get measured together" plotWidth={680} commentary="Skin temperature (218 studies) and heart/pulse rate (135) are individually the most common signals, and 103 studies measure both together — about half of all heart-rate studies also track skin temperature.">
          <CooccurrenceMatrix labels={fig18_physio_cooccurrence.labels} matrix={fig18_physio_cooccurrence.matrix} />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Signals, sensor types, and brands"
        intro="The same signal can be captured by very different instruments. This flow covers 15 signals measured in ≥5 studies, 53 distinct sensor types used across them, and every commercial brand behind those sensors — ordered by thermophysiological mechanism."
      >
        <FigureCard figNumber="19" title="Signal → sensor type → brand" plotWidth={1100} commentary="iButton is the single most-cited sensor brand (64 studies), almost all of it for skin temperature via the Thermochron sensor type. Flow thickness is proportional to study count — hover any node or flow for the exact number.">
          <SignalSensorBrandSankey overall={physio_signal_sensor.overall} brandPairs={data.sensor_type_brand.data} />
        </FigureCard>

        <FigureCard title="Signal → sensing method → body site" plotWidth={1100} commentary="A different cut of the same question, with brand removed: which measurement mechanism (ECG vs. optical PPG, thermocouple vs. infrared) is used at which body site. This matters for agreeability — two devices from the same brand can differ in validation tier, but ECG-vs-PPG or thermocouple-vs-infrared are real mechanistic differences that change what the signal actually represents.">
          <SignalMethodSiteSankey data={signal_method_site.data} />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="How sensor choice has shifted over time"
        intro="For skin temperature, thermocouples made up 55% of sensors in 2013–14 but only 25% by 2023–24, while Thermochron-type dataloggers (e.g. iButton) rose from 18% to 52% over the same span — the field's main displacement story. Each column below is normalised to 100% of that period's studies measuring the signal."
      >
        {evoSignals.map((sig) => (
          <FigureCard key={sig} title={sig} plotWidth={680} commentary={null}>
            <SensorStackChart signalData={evo_signal_sensor.signals[sig]} periods={evo_signal_sensor.periods} />
          </FigureCard>
        ))}
      </ChapterSection>

      <ChapterSection
        title="Skin temperature body sites"
        intro="Where on the body skin temperature is measured, and how that has shifted across the decade — consolidated from 23 raw terminology variants (e.g. calf/shin → lower leg)."
      >
        <FigureCard title="Site prevalence by period" plotWidth={760} commentary="Lower leg is the single most-measured site (136 of 218 skin-temperature studies, 62%), followed closely by hand, thigh, chest, and forehead (all 123–130 studies). No one site is measured in every study — choice of body site is still inconsistent across the field.">
          <div className="overflow-x-auto">
            <table className="text-[12px] border-collapse">
              <thead>
                <tr>
                  <th className="text-left pr-4 pb-2 font-data text-[11px] text-inkfaint font-medium"></th>
                  {periods.map((p) => (<th key={p} className="px-2 pb-2 font-data text-[11px] text-inkfaint font-medium text-center">{p}<div className="text-inkfaint/70">n={periodN[p] || 0}</div></th>))}
                </tr>
              </thead>
              <tbody>
                {topSites.map((s) => (
                  <tr key={s.site}>
                    <td className="pr-4 py-0.5 text-[12.5px] whitespace-nowrap">{s.site}</td>
                    {periods.map((p) => {
                      const n = siteByPeriod[s.site]?.[p]
                      const pct = n && periodN[p] ? Math.round((n / periodN[p]) * 100) : 0
                      const intensity = Math.min(pct / 70, 1)
                      return (
                        <td key={p} className="p-0.5">
                          <div className="w-14 h-9 rounded-[3px] flex items-center justify-center font-data text-[11px] cursor-default"
                            style={{ background: pct === 0 ? '#F1EDE6' : `rgba(217, 79, 110, ${0.12 + intensity * 0.78})`, color: intensity > 0.55 ? 'white' : '#1A1A18' }}
                            title={`${s.site}, ${p}: ${n || 0} of ${periodN[p] || 0} (${pct}%)`}>
                            {pct > 0 ? `${pct}%` : '–'}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Where other signals are measured"
        intro="Skin temperature isn't the only signal where measurement site reflects a real methodological choice. Heart rate's site splits roughly along sensor modality (chest straps vs. wrist/finger optical sensors); skin conductance follows electrode-placement convention; sweat is measured either at a local site or, more often, across the whole body at once — two fundamentally different kinds of measurement sharing one field name."
      >
        <FigureCard title="Heart/pulse rate measurement site" plotWidth={680} commentary="Chest (44 of 99 studies) and wrist (25) are the two dominant sites — roughly, ECG-strap vs. optical-wearable territory. Toggle to see wrist catch up to chest over the decade.">
          <OverallByPeriod
            earliestPeriodCaveat="2013–14 (n=1) and 2015–16 (n=3) are too thin to read literally; the wrist/chest convergence is clearest from 2017 onward."
            renderOverall={() => (
              <InteractiveBarChart
                data={site_by_signal['Heart/Pulse rate'].site_totals.map((d) => ({ label: d.site, count: d.count }))}
                total={site_by_signal['Heart/Pulse rate'].n_studies_with_site}
                color="#4855C8"
              />
            )}
            renderByPeriod={() => {
              const hr = site_by_signal['Heart/Pulse rate'].by_period
              const topSites = ['Chest', 'Wrist', 'Upper arm', 'Finger']
              return (
                <div className="space-y-5">
                  {topSites.map((site) => (
                    <div key={site}>
                      <h4 className="text-[12px] font-medium mb-1.5 text-inkmid">{site}</h4>
                      <PeriodBarGroup
                        periods={hr.periods}
                        periodN={hr.period_n}
                        getValue={(p) => hr.data.find((r) => r.site === site && r.period === p)?.count || 0}
                        getTooltip={(p, v) => `${site}, ${p}: ${v} of ${hr.period_n[p] || 0} heart-rate studies · ${hr.period_n[p] ? ((v / hr.period_n[p]) * 100).toFixed(0) : 0}%`}
                        color="#4855C8"
                        height={64}
                        yUnit=" studies"
                      />
                    </div>
                  ))}
                </div>
              )
            }}
          />
        </FigureCard>

        <FigureCard title="Skin conductance measurement site" commentary="Wrist (11 of 25 studies) and finger (8) — the classic GSR electrode sites — dominate, with a long tail of one-off placements (thigh, shin, temple) reflecting study-specific designs.">
          <InteractiveBarChart
            data={site_by_signal['Skin conductance'].site_totals.map((d) => ({ label: d.site, count: d.count }))}
            total={site_by_signal['Skin conductance'].n_studies_with_site}
            color="#B8C020"
          />
        </FigureCard>

        <FigureCard title="Sweat indicator measurement site" commentary="27 of 35 studies (77%) measure sweat across the whole body rather than at a local site — typically via mass-loss methods, not a local sensor. This is a fundamentally different kind of measurement from the local placements (forearm, finger, back) making up the rest, even though both share the 'sweat indicators' label.">
          <InteractiveBarChart
            data={site_by_signal['Sweat indicators'].site_totals.map((d) => ({ label: d.site, count: d.count }))}
            total={site_by_signal['Sweat indicators'].n_studies_with_site}
            color="#E07820"
          />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Mean skin temperature"
        intro={`${mst.n_mst_studies} studies explicitly calculate a weighted mean skin temperature. The calculation rate has declined over the decade even as formula choice has diversified beyond the classic Ramanathan formula.`}
      >
        <FigureCard title="MST calculation rate and formula choice, by period" plotWidth={760} commentary={null}>
          <MstCharts mst={mst} />
        </FigureCard>
      </ChapterSection>
    </div>
  )
}
