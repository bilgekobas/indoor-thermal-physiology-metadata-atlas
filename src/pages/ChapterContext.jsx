import { useMemo, useState } from 'react'
import { ChapterHeader, ChapterSection } from '../components/Chapter.jsx'
import FigureCard from '../components/FigureCard.jsx'
import InteractiveBarChart from '../components/InteractiveBarChart.jsx'
import CooccurrenceMatrix from '../components/CooccurrenceMatrix.jsx'
import HistogramECDF from '../components/HistogramECDF.jsx'
import { PeriodHeatmap } from '../components/OverallByPeriod.jsx'
import WorldMapExplorer from '../components/WorldMapExplorer.jsx'
import SampleSizeByCountry from '../components/SampleSizeByCountry.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'


function AuthorNetworkEmbed() {
  const src = `${import.meta.env.BASE_URL}author-network.html?v=45`
  return (
    <div className="bg-white overflow-hidden max-w-[1120px]">
      <iframe
        title="Interactive co-authorship network of the indoor thermal physiology corpus"
        src={src}
        className="block w-full h-[980px] bg-paper border-0"
        loading="lazy"
      />
    </div>
  )
}

function GeographyToggle({ cityData, countryData }) {
  return <WorldMapExplorer cityData={cityData} countryData={countryData} />
}


function TimeOfDayChart({ sessions }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const TOTAL_HOURS = 24
  const SLOT_MINS = 15
  const N_SLOTS = (TOTAL_HOURS * 60) / SLOT_MINS
  const nSessions = sessions.length
  const occupancy = useMemo(() => {
    const slots = new Array(N_SLOTS).fill(0)
    sessions.forEach(({ start, end }) => {
      const s0 = Math.floor(start * (60 / SLOT_MINS))
      const s1 = Math.min(Math.ceil(end * (60 / SLOT_MINS)), N_SLOTS - 1)
      for (let i = s0; i <= s1; i++) slots[i]++
    })
    return slots.map((v) => v / Math.max(nSessions, 1))
  }, [sessions, nSessions])
  const maxOcc = occupancy.reduce((m, v) => (v > m ? v : m), 0.001)
  const W = 920
  const H = 120
  const slotW = W / N_SLOTS
  const yAxisW = 32
  const hourLabel = (h) => `${String(h).padStart(2, '0')}:00`

  return (
    <div>
      <svg width={W + yAxisW} height={H + 44} className="font-data block">
        {[0, 0.5, 1].map((frac) => (
          <g key={frac}>
            <line x1={yAxisW} x2={W + yAxisW} y1={H - frac * H} y2={H - frac * H} stroke="#E4E4E4" strokeWidth={1} />
            <text x={yAxisW - 4} y={H - frac * H + 3} fontSize={9} fill="#8A8A8A" textAnchor="end">
              {Math.round(maxOcc * frac * 100)}%
            </text>
          </g>
        ))}
        <g transform={`translate(${yAxisW}, 0)`}>
          {occupancy.map((v, i) => {
            const x = i * slotW
            const barH = (v / maxOcc) * H
            const hour = (i * SLOT_MINS) / 60
            return (
              <rect
                key={i}
                x={x}
                y={H - barH}
                width={slotW + 0.5}
                height={barH}
                fill="#5B5BFF"
                opacity={0.75}
                className="cursor-default"
                onMouseEnter={(e) => showTip(e, `${hourLabel(Math.floor(hour))}: ${(v * 100).toFixed(1)}% of reported sessions active`)}
                onMouseMove={moveTip}
                onMouseLeave={hideTip}
              />
            )
          })}
          {Array.from({ length: 9 }, (_, i) => i * 3).map((h) => (
            <g key={h}>
              <line x1={(h / TOTAL_HOURS) * W} x2={(h / TOTAL_HOURS) * W} y1={H} y2={H + 6} stroke="#E4E4E4" />
              <text x={(h / TOTAL_HOURS) * W} y={H + 18} fontSize={10} fill="#8A8A8A" textAnchor="middle">{hourLabel(h)}</text>
            </g>
          ))}
        </g>
      </svg>
      <TooltipPortal tip={tip} />
    </div>
  )
}

function ClimateTempChart({ studies, climateCounts, tempRanges }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()

  const stepsById = useMemo(() => {
    const m = new Map()
    ;(tempRanges?.studies || []).forEach((s) => m.set(s.id, s.steps || []))
    return m
  }, [tempRanges])

  const climateOrder = useMemo(
    () => Object.keys(climateCounts).sort((a, b) => climateCounts[b] - climateCounts[a]),
    [climateCounts]
  )

  const rows = useMemo(() => {
    const climateRows = climateOrder.map((grp) => {
      const groupStudies = studies.filter((s) => s.climate_group === grp)
      const allTemps = []
      groupStudies.forEach((s) => {
        const rawSteps = stepsById.get(s.id) || []
        const values = (rawSteps.length ? rawSteps : [s.min, s.max]).filter((v) => Number.isFinite(v))
        values.forEach((v) => allTemps.push(Number(v)))
      })
      allTemps.sort((a, b) => a - b)
      return { climate: grp, nStudies: groupStudies.length, allTemps }
    })

    const overallTemps = []
    let overallStudies = 0
    studies.forEach((s) => {
      const rawSteps = stepsById.get(s.id) || []
      const values = (rawSteps.length ? rawSteps : [s.min, s.max]).filter((v) => Number.isFinite(v)).map(Number)
      if (values.length) overallStudies += 1
      values.forEach((v) => overallTemps.push(v))
    })
    overallTemps.sort((a, b) => a - b)

    return [...climateRows, { climate: 'Overall', nStudies: overallStudies, allTemps: overallTemps }]
  }, [studies, climateOrder, stepsById])

  const everyTemp = rows.flatMap((r) => r.allTemps)
  const rawMin = everyTemp.length ? Math.min(...everyTemp) : 10
  const rawMax = everyTemp.length ? Math.max(...everyTemp) : 40
  const domainMin = Math.floor(rawMin / 2) * 2 - 1
  const domainMax = Math.ceil(rawMax / 2) * 2 + 1
  const W = 920
  const LABEL_W = 170
  const rowH = 52
  const H = rows.length * rowH + 8
  const xScale = (v) => ((v - domainMin) / Math.max(domainMax - domainMin, 1)) * W
  const ticks = []
  const tickStart = Math.ceil(domainMin / 5) * 5
  for (let v = tickStart; v <= domainMax; v += 5) ticks.push(v)
  const q = (arr, p) => {
    if (!arr.length) return null
    const pos = (arr.length - 1) * p
    const base = Math.floor(pos)
    const rest = pos - base
    return arr[base + 1] !== undefined ? arr[base] + rest * (arr[base + 1] - arr[base]) : arr[base]
  }
  const violinPath = (vals, yCenter) => {
    if (!vals.length) return ''
    const binStep = 1
    const bins = []
    for (let t = Math.floor(domainMin); t <= Math.ceil(domainMax); t += binStep) bins.push({ t, count: 0 })
    vals.forEach((v) => {
      const idx = Math.max(0, Math.min(bins.length - 1, Math.round((v - Math.floor(domainMin)) / binStep)))
      bins[idx].count += 1
    })
    // light smoothing so the violin reads as density rather than as a bar code
    const smoothed = bins.map((b, i) => {
      const prev = bins[i - 1]?.count || 0
      const next = bins[i + 1]?.count || 0
      return { t: b.t, count: (prev + b.count * 2 + next) / 4 }
    })
    const maxC = smoothed.reduce((m, b) => Math.max(m, b.count), 1)
    const maxHalf = 14
    const upper = smoothed.map((b) => `${xScale(b.t) + LABEL_W},${yCenter - (b.count / maxC) * maxHalf}`)
    const lower = [...smoothed].reverse().map((b) => `${xScale(b.t) + LABEL_W},${yCenter + (b.count / maxC) * maxHalf}`)
    return `M ${upper.concat(lower).join(' L ')} Z`
  }

  return (
    <div>
      <svg width={W + LABEL_W + 10} height={H + 44} className="font-data overflow-visible">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={xScale(v) + LABEL_W} x2={xScale(v) + LABEL_W} y1={0} y2={H - 2} stroke="#E4E4E4" strokeWidth={1} />
            <text x={xScale(v) + LABEL_W} y={H + 22} fontSize={10} fill="#8A8A8A" textAnchor="middle">{v}°C</text>
          </g>
        ))}
        {rows.map((row, ri) => {
          const yCenter = ri * rowH + rowH / 2
          const vals = row.allTemps
          const stats = vals.length ? (() => { const q1 = q(vals, 0.25); const med = q(vals, 0.5); const q3 = q(vals, 0.75); const iqr = q3 - q1; const lowFence = q1 - 1.5 * iqr; const highFence = q3 + 1.5 * iqr; const nonOut = vals.filter((v) => v >= lowFence && v <= highFence); return { min: vals[0], q1, med, q3, max: vals[vals.length - 1], whiskerMin: nonOut[0] ?? vals[0], whiskerMax: nonOut[nonOut.length - 1] ?? vals[vals.length - 1], lowFence, highFence, outliers: vals.filter((v) => v < lowFence || v > highFence) } })() : null
          return (
            <g key={row.climate}>
              <line x1={LABEL_W} x2={LABEL_W + W} y1={yCenter} y2={yCenter} stroke="#F2F2F2" strokeWidth={1} />
              <text x={LABEL_W - 8} y={yCenter - 4} fontSize={11.5} fill="#0A0A0A" textAnchor="end">{row.climate}</text>
              <text x={LABEL_W - 8} y={yCenter + 10} fontSize={9} fill="#8A8A8A" textAnchor="end">n={row.nStudies} studies</text>
              {vals.length > 1 && <path d={violinPath(vals, yCenter)} fill="#5B5BFF" opacity={0.14} stroke="#5B5BFF" strokeWidth={0.8} />}
              {vals.map((temp, i) => (
                <circle
                  key={`${row.climate}-${i}`}
                  cx={xScale(temp) + LABEL_W}
                  cy={yCenter}
                  r={2.1}
                  fill="#0A0A0A"
                  opacity={0.12}
                  className="cursor-default"
                  onMouseEnter={(e) => showTip(e, `${row.climate}: ${temp}°C`)}
                  onMouseMove={moveTip}
                  onMouseLeave={hideTip}
                />
              ))}
              {stats && (
                <g
                  className="cursor-default"
                  onMouseEnter={(e) => showTip(e, `${row.climate}: median ${stats.med.toFixed(1)}°C, IQR ${stats.q1.toFixed(1)}–${stats.q3.toFixed(1)}°C, whiskers ${stats.whiskerMin.toFixed(1)}–${stats.whiskerMax.toFixed(1)}°C, full range ${stats.min.toFixed(1)}–${stats.max.toFixed(1)}°C`)}
                  onMouseMove={moveTip}
                  onMouseLeave={hideTip}
                >
                  <line x1={xScale(stats.whiskerMin) + LABEL_W} x2={xScale(stats.whiskerMax) + LABEL_W} y1={yCenter} y2={yCenter} stroke="#0A0A0A" strokeWidth={1} />
                  <line x1={xScale(stats.whiskerMin) + LABEL_W} x2={xScale(stats.whiskerMin) + LABEL_W} y1={yCenter - 5} y2={yCenter + 5} stroke="#0A0A0A" strokeWidth={1} />
                  <line x1={xScale(stats.whiskerMax) + LABEL_W} x2={xScale(stats.whiskerMax) + LABEL_W} y1={yCenter - 5} y2={yCenter + 5} stroke="#0A0A0A" strokeWidth={1} />
                  <rect x={xScale(stats.q1) + LABEL_W} y={yCenter - 7} width={Math.max(1, xScale(stats.q3) - xScale(stats.q1))} height={14} fill="none" stroke="#0A0A0A" strokeWidth={1.15} />
                  <line x1={xScale(stats.q1) + LABEL_W} x2={xScale(stats.q1) + LABEL_W} y1={yCenter - 8} y2={yCenter + 8} stroke="#0A0A0A" strokeWidth={0.9} opacity={0.65} />
                  <line x1={xScale(stats.med) + LABEL_W} x2={xScale(stats.med) + LABEL_W} y1={yCenter - 9} y2={yCenter + 9} stroke="#0A0A0A" strokeWidth={1.35} />
                  <line x1={xScale(stats.q3) + LABEL_W} x2={xScale(stats.q3) + LABEL_W} y1={yCenter - 8} y2={yCenter + 8} stroke="#0A0A0A" strokeWidth={0.9} opacity={0.65} />
                  {stats.outliers.map((temp, oi) => (
                    <circle key={`out-${row.climate}-${oi}`} cx={xScale(temp) + LABEL_W} cy={yCenter} r={2.8} fill="#0A0A0A" opacity={0.9}
                      onMouseEnter={(e) => showTip(e, `${row.climate}: ${temp}°C outlier (>1.5×IQR)`)} onMouseMove={moveTip} onMouseLeave={hideTip} />
                  ))}
                </g>
              )}
            </g>
          )
        })}
      </svg>
      <div className="font-data text-[10px] text-inkfaint mt-5 figure-note">
        Violin width shows the density of reported tested temperature values within each host-climate row. Low-opacity points are individual temperature values; darker black points are 1.5×IQR outliers. The boxplot is unfilled so the violin remains visible. Negative tested temperatures are retained as coded and listed in public/data/tested_temperature_negative_values.csv for checking.
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
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

function SettingSankey({ data, total }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const TYPE_COLORS = { Lab: '#0A0A0A', Field: '#5B5BFF', 'Living Lab': '#FB3640', Mixed: '#8A8A8A', NR: '#BBBBBB' }

  const layout = useMemo(() => {
    const byType = {}
    const typologyTotals = {}
    data.forEach((d) => {
      const type = d['exp-type'] || 'NR'
      const typology = d['exp-spatial-typology'] || 'NR'
      if (!byType[type]) byType[type] = { total: 0, children: {} }
      byType[type].total += d.count
      byType[type].children[typology] = (byType[type].children[typology] || 0) + d.count
      typologyTotals[typology] = (typologyTotals[typology] || 0) + d.count
    })

    const leftEntries = Object.entries(byType)
      .map(([name, obj]) => ({ name, total: obj.total, color: TYPE_COLORS[name] || '#BBBBBB' }))
      .sort((a, b) => b.total - a.total)

    const rightEntries = Object.entries(typologyTotals)
      .map(([name, total]) => ({ key: name, name, total, color: '#D9D9D9' }))
      .sort((a, b) => b.total - a.total)

    const left = layoutColumn(leftEntries, { x: 140, gap: 8, pxPerUnit: 1.2, minH: 18 })
    const right = layoutColumn(rightEntries, { x: 470, gap: 5, pxPerUnit: 1.2, minH: 12 })
    const H = Math.max(left.totalHeight, right.totalHeight) + 24

    const leftByName = Object.fromEntries(left.nodes.map((n) => [n.name, n]))
    const rightByName = Object.fromEntries(right.nodes.map((n) => [n.name, n]))
    const leftOffsets = {}
    const rightOffsets = {}
    const links = []
    leftEntries.forEach((type) => {
      Object.entries(byType[type.name].children)
        .sort((a, b) => b[1] - a[1])
        .forEach(([typology, count]) => {
          const from = leftByName[type.name]
          const to = rightByName[typology]
          const sourceOffset = leftOffsets[type.name] || 0
          const targetOffset = rightOffsets[typology] || 0
          links.push({ from, to, count, color: from.color, sourceOffset, targetOffset, label: `${type.name} → ${typology}` })
          leftOffsets[type.name] = sourceOffset + count * 1.2
          rightOffsets[typology] = targetOffset + count * 1.2
        })
    })

    return { left: left.nodes, right: right.nodes, links, W: 760, H, total: total || leftEntries.reduce((a, d) => a + d.total, 0) }
  }, [data, total])

  return (
    <div className="no-horizontal-scroll">
      <svg width={layout.W} height={layout.H + 6} className="font-data overflow-visible">
        {layout.links.map((link, i) => {
          const x1 = link.from.x + 16
          const y1 = link.from.y + link.sourceOffset + (link.count * 1.2) / 2
          const x2 = link.to.x
          const y2 = link.to.y + link.targetOffset + (link.count * 1.2) / 2
          const mx = (x1 + x2) / 2
          const path = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
          return (
            <path
              key={i}
              d={path}
              fill="none"
              stroke={link.color}
              strokeOpacity={0.28}
              strokeWidth={Math.max(1, link.count * 1.2)}
              className="cursor-default"
              onMouseEnter={(e) => showTip(e, `${link.label}: ${link.count} experiments (${((link.count / layout.total) * 100).toFixed(1)}%)`)}
              onMouseMove={moveTip}
              onMouseLeave={hideTip}
            />
          )
        })}
        {layout.left.map((n) => (
          <g key={n.name}>
            <rect x={n.x} y={n.y} width={16} height={n.h} rx={2} fill={n.color} className="cursor-default"
              onMouseEnter={(e) => showTip(e, `${n.name}: ${n.total} experiments (${((n.total / layout.total) * 100).toFixed(1)}%)`)} onMouseMove={moveTip} onMouseLeave={hideTip} />
            <text x={n.x - 8} y={n.y + n.h / 2 + 4} fontSize={11.5} fill="#0A0A0A" textAnchor="end">{n.name}</text>
            <text x={n.x + 22} y={n.y + n.h / 2 + 4} fontSize={10} fill="#8A8A8A">{n.total} ({((n.total / layout.total) * 100).toFixed(0)}%)</text>
          </g>
        ))}
        {layout.right.map((n) => (
          <g key={n.key}>
            <rect x={n.x} y={n.y} width={16} height={n.h} rx={2} fill="#D9D9D9" className="cursor-default"
              onMouseEnter={(e) => showTip(e, `${n.name}: ${n.total} experiments total`)} onMouseMove={moveTip} onMouseLeave={hideTip} />
            <text x={n.x + 22} y={n.y + n.h / 2 + 4} fontSize={11} fill="#0A0A0A">{n.name}</text>
            <text x={n.x + 210} y={n.y + n.h / 2 + 4} fontSize={10} fill="#8A8A8A">{n.total} ({((n.total / layout.total) * 100).toFixed(0)}%)</text>
          </g>
        ))}
      </svg>
      <div className="font-data text-[10px] text-inkfaint mt-2">Left column: experimental setting type. Right column: spatial typologies, combined across all setting types. Node labels show absolute experiment counts and percentages of all experiments in this Sankey.</div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

function PublicationsByYearChart({ data, totalPubs }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const maxVal = data.reduce((m, d) => (d.count > m ? d.count : m), 1)
  const gridMax = Math.ceil(maxVal / 10) * 10
  const gridStep = 10
  const W = 920
  const H = 140
  const barGap = 6
  const barW = (W - barGap * (data.length - 1)) / data.length
  const yScale = (v) => H - (v / gridMax) * H
  return (
    <div className="no-horizontal-scroll">
      <svg width={W + 30} height={H + 24} className="font-data overflow-visible">
        {Array.from({ length: gridMax / gridStep + 1 }, (_, i) => i * gridStep).map((v) => (
          <g key={v}>
            <line x1={0} x2={W} y1={yScale(v)} y2={yScale(v)} stroke="#E4E4E4" strokeWidth={1} />
            <text x={W + 4} y={yScale(v) + 3} fontSize={9} fill="#8A8A8A">{v}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = i * (barW + barGap)
          const barH = (d.count / gridMax) * H
          return (
            <g key={d.year} className="cursor-default">
              <rect
                x={x}
                y={H - barH}
                width={barW}
                height={barH}
                fill="#0A0A0A"
                className="hover:fill-[#5B5BFF] transition-colors"
                onMouseEnter={(e) => showTip(e, `${d.year}: ${d.count} publications · ${((d.count / totalPubs) * 100).toFixed(1)}%`)}
                onMouseMove={moveTip}
                onMouseLeave={hideTip}
              />
              <text x={x + barW / 2} y={H + 22} fontSize={10} fill="#8A8A8A" textAnchor="middle">{d.year}</text>
            </g>
          )
        })}
      </svg>
      <TooltipPortal tip={tip} />
    </div>
  )
}

export default function ChapterContext({ data }) {
  const {
    fig01_pubs_by_year,
    fig03_session_length,
    fig04_normalisation_length,
    fig05_time_of_day,
    fig06_setting_typology,
    fig07_temperature_ranges,
    climate_vs_temp,
    geo_choropleth,
    geo_cities,
    domain_comanipulation,
    domain_cooccurrence,
    domain_detail,
    sample_size_by_country,
    fig11_sample_size,
    fig20_protocol,
    protocol_by_period,
    chapter_completeness,
    open_data,
    summary,
  } = data

  const totalPubs = fig01_pubs_by_year.data.reduce((a, d) => a + d.count, 0)
  const [sessionStats, setSessionStats] = useState(null)
  const [normStats, setNormStats] = useState(null)

  const sessionValuesCapped = fig03_session_length.values_minutes.filter((v) => v <= 600)
  const normValuesCapped = fig04_normalisation_length.values_minutes.filter((v) => v <= 600)
  const sessionUnder180Pct = sessionValuesCapped.length
    ? ((sessionValuesCapped.filter((v) => v < 180).length / sessionValuesCapped.length) * 100).toFixed(1)
    : '0'
  const normUnder60Pct = normValuesCapped.length
    ? ((normValuesCapped.filter((v) => v <= 60).length / normValuesCapped.length) * 100).toFixed(1)
    : '0'

  const detailedDomainRows = useMemo(() => {
    return [...domain_detail.totals]
      .sort((a, b) => b.count - a.count)
      .map((d) => ({ label: d.token, count: d.count }))
  }, [domain_detail])

  const peakYear = fig01_pubs_by_year.data.reduce((best, d) => (d.count > best.count ? d : best))
  const topCountryShare = ((geo_choropleth.data[0].count / summary.n_publications) * 100).toFixed(0)

  return (
    <div>
      <ChapterHeader
        eyebrow="Chapter 1 of 7"
        title="When, where & how"
        framing={
          <>
            <p>
              Before looking at who's studied or what's measured, this chapter covers the experiment
              as an institution: when it was published, where it was run, what climate that location
              sits in, what kind of setting it used, and how a session was timed.
            </p>
            <p>
              We looked for these fields because they're the minimum context needed to judge whether
              two studies are even comparable — a result from a lab study in Singapore summer doesn't
              transfer to a field study in Danish winter without knowing both of these things first.
            </p>
          </>
        }
        headline={[
          { value: summary.n_publications, label: 'Publications, ' + summary.year_min + '–' + summary.year_max },
          { value: peakYear.year, label: `Peak year (${peakYear.count} studies)`, color: '#0A0A0A' },
          { value: `${topCountryShare}%`, label: `of studies from ${geo_choropleth.data[0].country}`, color: '#5B5BFF' },
        ]}
      />

      <ChapterSection
        title="Authorship as field structure"
        intro="Before treating the corpus as a neutral pool of studies, it is useful to inspect the social structure behind it. Co-authorship does not measure scientific quality, but it does reveal repeated research lineages, dominant collaboration clusters, and the extent to which the evidence base is produced by a small number of connected groups."
      >
        <FigureCard figNumber="1" title="Author co-authorship network" size="wide" commentary="Nodes are authors and links are co-authorship pairs. The default grouped view reduces the dense 711-author graph to connected collaboration components; the threshold controls can then expose either stable core groups or weaker one-study links. Colours identify collaboration clusters, not national origin.">
          <AuthorNetworkEmbed />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="When and where research happens"
        intro="Publication volume has risen steadily, with a dip during 2020–21. Research is geographically concentrated, and that concentration shapes more than just where studies happen — sample size patterns differ by country too, and the climate a study is conducted in often doesn't match the temperature values it tests."
      >
        <FigureCard figNumber="2" title="Publications by year" size="wide" commentary="A clear upward trend with a COVID-era dip, consistent with the appendix's own account.">
          <PublicationsByYearChart data={fig01_pubs_by_year.data} totalPubs={totalPubs} />
        </FigureCard>

        <FigureCard figNumber="3" title="Geographical distribution" size="wide" commentary="250 of 269 studies (93%) resolve to a specific city; the rest report only a country or province. Research concentrates in a small number of cities — Changsha and Chongqing alone account for 48 studies. China's share has also grown over time, from 55% of studies in 2013–14 to 73% in 2023–24. The country map uses a log-scaled color ramp so China's count does not wash out every other country.">
          <GeographyToggle cityData={geo_cities.data} countryData={geo_choropleth.data} />
        </FigureCard>

        <FigureCard figNumber="4" title="Sample size by country" size="wide" commentary="China's median study (24 participants) looks like everywhere else — but its mean (56) is pulled up by a handful of large field studies, including one with 2,110 participants. Brazil and Switzerland show the opposite pattern: few studies, but typically large ones (medians of 82 and 75). Mean and median diverge enough here that either one alone would mislead.">
          <SampleSizeByCountry
            stats={sample_size_by_country.stats}
            studies={sample_size_by_country.studies}
            minCountThreshold={sample_size_by_country.min_count_threshold}
            overallStudies={fig11_sample_size.studies}
            sampleShareThreshold={sample_size_by_country.sample_share_threshold}
            totalSampleSizeAllCountries={sample_size_by_country.total_sample_size_all_countries}
            selectionRule={sample_size_by_country.selection_rule}
          />
        </FigureCard>

        <FigureCard figNumber="5" title="Tested temperature values by host climate" size="wide" commentary="Humid subtropical and continental climates together account for most studies with a known climate, including much of the warm-condition research. Only a small minority were run in genuinely hot climates. The figure now focuses on the actual tested temperature values rather than per-study min–max spans, making the setpoint clustering easier to see.">
          <ClimateTempChart
            studies={climate_vs_temp.studies}
            climateCounts={climate_vs_temp.climate_counts}
            tempRanges={fig07_temperature_ranges}
          />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Setting and timing"
        intro="Lab studies dominate; office-like spaces are the most common spatial typology. Sessions cluster under 3 hours, normalization periods are often short, and almost all testing happens in daytime hours."
      >
        <FigureCard figNumber="6" title="Experimental setting type" plotWidth={760} commentary="200 of 266 experiments (75%) are run in a lab; Field and Living Lab split the remainder almost evenly. The Sankey makes the spatial typologies legible without flattening them into a single categorical count.">
          <SettingSankey data={fig06_setting_typology.data} total={summary.n_experiments} />
        </FigureCard>

        <FigureCard figNumber="7" title="Time of day distribution" size="wide" commentary={`Testing peaks in the mid-afternoon. ${fig05_time_of_day.n_circadian_considered} of ${fig05_time_of_day.n_reporting} reporting studies explicitly mention circadian timing; the rest mostly standardize implicitly by testing during a fairly narrow daytime window.`}>
          <TimeOfDayChart sessions={fig05_time_of_day.sessions} />
        </FigureCard>

        <FigureCard figNumber="8" title="Session length" size="wide" commentary={sessionStats ? `Minutes per session, capped at 600. ${sessionUnder180Pct}% of the ${sessionStats.n} studies with known session length run under 180 minutes. Median ${sessionStats.median} min (IQR ${sessionStats.q25}–${sessionStats.q75}), range ${sessionStats.min}–${sessionStats.max} min.` : 'Minutes per session, capped at 600.'}>
          <HistogramECDF
            values={sessionValuesCapped}
            binWidth={15}
            unit=" min"
            xLabel="minutes per session"
            width={1080}
            onStats={setSessionStats}
          />
        </FigureCard>

        <FigureCard figNumber="9" title="Normalization length" size="wide" commentary={normStats ? `Minutes spent in normalization / stabilization before testing, capped at 600. ${normUnder60Pct}% of the ${normStats.n} studies with reported normalization time stay at or below 60 minutes. Median ${normStats.median} min (IQR ${normStats.q25}–${normStats.q75}), range ${normStats.min}–${normStats.max} min.` : 'Minutes spent in normalization / stabilization before testing, capped at 600.'}>
          <HistogramECDF
            values={normValuesCapped}
            binWidth={10}
            unit=" min"
            xLabel="normalization / stabilization time (minutes)"
            width={1080}
            onStats={setNormStats}
          />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="How many variables are manipulated at once"
        intro={`${domain_comanipulation.n_domains_distribution.filter((d) => d.n_domains >= 2).reduce((a, d) => a + d.count, 0)} of ${domain_comanipulation.n_studies} studies manipulate more than one environmental domain simultaneously (e.g. air temperature crossed with humidity, or with air movement). The rest isolate a single variable, the classic thermal-comfort design.`}
      >
        <FigureCard figNumber="10" title="Number of domains manipulated per study" plotWidth={560} commentary="Most studies still isolate a single variable — the classic thermal-comfort design. Two-domain experiments form the main minority; three-domain designs are relatively rare.">
          <InteractiveBarChart
            data={domain_comanipulation.n_domains_distribution.map((d) => ({ label: `${d.n_domains} domain${d.n_domains === 1 ? '' : 's'}`, count: d.count }))}
            total={domain_comanipulation.n_studies}
            color="#0A0A0A"
          />
        </FigureCard>

        <FigureCard figNumber="11" title="Which domains are manipulated together" plotWidth={620} commentary="Diagonal cells show the total number of studies manipulating each domain; off-diagonal cells show co-manipulation. This keeps the univariate counts while making the coupled experimental designs visible.">
          <CooccurrenceMatrix labels={domain_cooccurrence.labels} matrix={domain_cooccurrence.matrix} cellSize={38} />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Open data, in practice"
        intro={`A data-availability statement being present is not the same as data actually being shared. Of ${open_data.n_total} studies, only ${open_data.n_with_real_data_link} link to a real repository.`}
      >
        <FigureCard figNumber="12" title="Data availability statement, as reported" plotWidth={620} commentary="This belongs in the contextual layer of the corpus rather than in the closing synthesis: it describes the publication context of the studies themselves.">
          <InteractiveBarChart
            data={open_data.data_avail_distribution.map((d) => ({ label: d.status, count: d.count }))}
            total={open_data.n_total}
            color="#0A0A0A"
          />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Protocol & standardisation controls"
        intro="Protocol reporting belongs to the general experimental setup: clothing, activity, pre-session instructions, blinding, randomisation, and timing controls define how the study was run before any physiological signal is interpreted."
      >
        <FigureCard figNumber="13" title="Protocol & standardisation controls" plotWidth={980} commentary="Rows are controls; columns are 2-year periods; the right-hand bar gives the overall count for the same row.">
          <PeriodHeatmap
            rows={protocol_by_period.fields}
            periods={protocol_by_period.periods}
            periodN={Object.fromEntries(protocol_by_period.data.filter((d, idx, arr) => arr.findIndex((x) => x.period === d.period) === idx).map((d) => [d.period, d.n]))}
            rowTotals={Object.fromEntries(fig20_protocol.bar.map((d) => [d.field, d.count]))}
            getCount={(field, p) => protocol_by_period.data.find((d) => d.field === field && d.period === p)?.count || 0}
            labelWidth={230}
            cellWidth={88}
          />
        </FigureCard>
      </ChapterSection>

    </div>
  )
}
