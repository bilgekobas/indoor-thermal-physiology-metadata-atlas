import { useMemo } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import InteractiveBarChart from '../components/InteractiveBarChart.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'

const CLIMATE_COLORS = {
  'Tropical': '#D94F6E', 'Arid (hot)': '#E07820', 'Semi-arid (hot)': '#E0A020',
  'Mediterranean': '#B8C020', 'Humid subtropical': '#4855C8', 'Oceanic': '#6E8FD9',
  'Continental': '#8A8A86', 'Semi-arid (cold)': '#A8A59C', 'Subarctic': '#5F5E58', 'Other/Mixed': '#C9C6BC',
}

function ClimateTempChart({ studies, climateCounts }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const climateOrder = Object.keys(climateCounts).sort((a, b) => climateCounts[b] - climateCounts[a])
  const W = 640
  const domainMin = 6, domainMax = 44
  const xScale = (v) => ((v - domainMin) / (domainMax - domainMin)) * W
  const rowH = 14
  const groupGap = 10

  let y = 10
  const rows = []
  climateOrder.forEach((grp) => {
    const grpStudies = studies.filter((s) => s.climate_group === grp).sort((a, b) => a.min - b.min)
    grpStudies.forEach((s) => {
      rows.push({ ...s, y, color: CLIMATE_COLORS[grp] || '#BBBBBB' })
      y += rowH
    })
    y += groupGap
  })
  const H = y

  return (
    <div className="overflow-x-auto">
      <svg width={W + 20} height={H + 20} className="font-data overflow-visible">
        {[10, 15, 20, 25, 30, 35, 40].map((v) => (
          <line key={v} x1={xScale(v)} x2={xScale(v)} y1={0} y2={H} stroke="#E2DED4" strokeWidth={1} />
        ))}
        {rows.map((s, i) => (
          <g
            key={i}
            className="cursor-default"
            onMouseEnter={(e) => showTip(e, `${s.id} (${s.country}, ${s.climate_group}): ${s.min}–${s.max}°C tested`)}
            onMouseMove={moveTip}
            onMouseLeave={hideTip}
          >
            <line x1={xScale(s.min)} x2={xScale(s.max)} y1={s.y} y2={s.y} stroke={s.color} strokeWidth={2.5} opacity={0.75} />
          </g>
        ))}
        {[10, 20, 30, 40].map((v) => (
          <text key={v} x={xScale(v)} y={H + 14} fontSize={10} fill="#A8A59C" textAnchor="middle">{v}°C</text>
        ))}
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
        {climateOrder.map((g) => (
          <div key={g} className="flex items-center gap-1.5 text-[11px] text-inkmid">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: CLIMATE_COLORS[g] || '#BBBBBB' }} />
            {g} (n={climateCounts[g]})
          </div>
        ))}
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

export default function Context({ data }) {
  const { climate_vs_temp, sensor_brands, summary } = data

  const topBrandsBySignal = useMemo(() => {
    const map = {}
    sensor_brands.by_signal.forEach((r) => {
      const brand = r['physio-sensor-brand']
      if (!map[brand]) map[brand] = {}
      map[brand][r['physio-parameter']] = r.count
    })
    return map
  }, [sensor_brands])

  return (
    <div>
      <PageHeader
        eyebrow="Analysis · Geography, climate, and instrumentation concentration"
        title="Where research happens vs. what it studies"
        description="Whether the climates studies are conducted in match the temperature ranges they test, and how concentrated the field's instrumentation is among a small number of commercial sensor brands."
      />

      <div className="px-10 py-8 border-b border-line">
        <h2 className="text-[16px] font-semibold mb-1">Tested temperature range by host climate</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          Each line is one study's tested range, grouped by the Köppen climate class of where it was conducted
          (not necessarily the climate it simulates). Most research — including on warm conditions — is run in
          humid-subtropical and continental-climate countries; truly tropical and hot-arid settings are rare.
        </p>
        <ClimateTempChart studies={climate_vs_temp.studies} climateCounts={climate_vs_temp.climate_counts} />
      </div>

      <div className="px-10 py-8 border-b border-line">
        <h2 className="text-[16px] font-semibold mb-1">Sensor brand concentration</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          {sensor_brands.n_studies_with_brand} of {summary.n_experiments} experiments report a sensor brand.
          A handful of commercial manufacturers account for a large share of the field's physiological data.
        </p>
        <InteractiveBarChart
          data={sensor_brands.totals.map((b) => ({ label: b.brand, count: b.count }))}
          total={sensor_brands.n_studies_with_brand}
          color="#4855C8"
          maxBars={15}
        />
      </div>

      <div className="px-10 py-8">
        <h2 className="text-[16px] font-semibold mb-1">What each top brand is used to measure</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          Some brands are signal-specific (e.g. OMRON for blood pressure); others, like wearables, span several signals at once.
        </p>
        <div className="grid grid-cols-3 gap-x-8 gap-y-6">
          {Object.entries(topBrandsBySignal).slice(0, 9).map(([brand, signals]) => (
            <div key={brand}>
              <h3 className="text-[13px] font-medium mb-1.5">{brand}</h3>
              <div className="text-[11.5px] text-inkmid space-y-0.5">
                {Object.entries(signals).sort((a, b) => b[1] - a[1]).map(([sig, count]) => (
                  <div key={sig} className="flex justify-between">
                    <span>{sig}</span>
                    <span className="font-data text-inkfaint">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
