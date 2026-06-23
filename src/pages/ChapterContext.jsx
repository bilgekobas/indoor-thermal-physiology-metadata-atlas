import { useMemo, useState } from 'react'
import { ChapterHeader, ChapterSection } from '../components/Chapter.jsx'
import CompletenessStrip from '../components/CompletenessStrip.jsx'
import FigureCard from '../components/FigureCard.jsx'
import InteractiveBarChart from '../components/InteractiveBarChart.jsx'
import CooccurrenceMatrix from '../components/CooccurrenceMatrix.jsx'
import HistogramECDF from '../components/HistogramECDF.jsx'
import ChoroplethMap from '../components/ChoroplethMap.jsx'
import CityMap from '../components/CityMap.jsx'
import SampleSizeByCountry from '../components/SampleSizeByCountry.jsx'
import OverallByPeriod, { PeriodBarGroup } from '../components/OverallByPeriod.jsx'
import { useTooltip, TooltipPortal } from '../components/Tooltip.jsx'

// Three-way toggle specific to the geography figure: city-level map (the
// most precise view), country-level choropleth (the broader pattern), and
// the existing by-period concentration trend. Kept local to this chapter
// since it's the only figure that needs three modes rather than the shared
// OverallByPeriod component's two.
function GeographyToggle({ cityData, countryData }) {
  const [mode, setMode] = useState('city')
  const tabs = [
    { key: 'city', label: 'By city' },
    { key: 'country', label: 'By country' },
  ]
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
      <div style={{ minHeight: 460 }}>
        {mode === 'city' && <CityMap cityData={cityData} />}
        {mode === 'country' && <ChoroplethMap countryData={countryData} cityData={cityData} />}
      </div>
    </div>
  )
}

function TimeOfDayChart({ sessions }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const TOTAL_HOURS = 24, SLOT_MINS = 15, N_SLOTS = (TOTAL_HOURS * 60) / SLOT_MINS
  const nStudies = new Set(sessions.map((s) => s.id)).size
  const nConsidered = new Set(sessions.filter((s) => s.circadian_considered).map((s) => s.id)).size
  const occupancy = useMemo(() => {
    const slots = new Array(N_SLOTS).fill(0)
    sessions.forEach(({ start, end }) => {
      const s0 = Math.floor(start * (60 / SLOT_MINS))
      const s1 = Math.min(Math.ceil(end * (60 / SLOT_MINS)), N_SLOTS - 1)
      for (let i = s0; i <= s1; i++) slots[i]++
    })
    return slots.map((v) => v / nStudies)
  }, [sessions, nStudies])
  const maxOcc = occupancy.reduce((m, v) => (v > m ? v : m), 0.001)
  const W = 600, H_TOP = 80, H_BOT = 110, slotW = W / N_SLOTS, yAxisW = 32
  const hourLabel = (h) => `${String(h).padStart(2, '0')}:00`
  return (
    <div className="overflow-x-auto">
      <div className="font-data text-[10px] text-inkfaint mb-1">
        Top: % of {nStudies} sessions active at each time of day (y-axis below). Bottom: each session's own
        start–end window, one line per session, colored by whether the study explicitly reported considering
        circadian timing effects ({nConsidered} of {nStudies} did).
      </div>
      <svg width={W + yAxisW} height={H_TOP + H_BOT + 28} className="font-data block">
        {/* y-axis for the occupancy panel */}
        {[0, 0.5, 1].map((frac) => (
          <g key={frac}>
            <line x1={yAxisW} x2={W + yAxisW} y1={H_TOP - 12 - frac * (H_TOP - 12)} y2={H_TOP - 12 - frac * (H_TOP - 12)} stroke="#E4E4E4" strokeWidth={1} />
            <text x={yAxisW - 4} y={H_TOP - 12 - frac * (H_TOP - 12) + 3} fontSize={9} fill="#8A8A8A" textAnchor="end">
              {Math.round(maxOcc * frac * 100)}%
            </text>
          </g>
        ))}
        <g transform={`translate(${yAxisW}, 0)`}>
          {occupancy.map((v, i) => {
            const x = i * slotW, barH = (v / maxOcc) * (H_TOP - 12), hour = (i * SLOT_MINS) / 60
            return (
              <rect key={i} x={x} y={H_TOP - barH} width={slotW + 0.5} height={barH} fill="#5B5BFF" opacity={0.7}
                className="cursor-default"
                onMouseEnter={(e) => showTip(e, `${hourLabel(Math.floor(hour))}: ${(v * 100).toFixed(1)}% of sessions active`)}
                onMouseMove={moveTip} onMouseLeave={hideTip} />
            )
          })}
          {sessions.map((s, i) => {
            const x1 = (s.start / TOTAL_HOURS) * W, x2 = (s.end / TOTAL_HOURS) * W
            const y = H_TOP + 8 + i * (H_BOT / sessions.length)
            const color = s.circadian_considered ? '#5B5BFF' : '#8A8A8A'
            return (
              <line key={i} x1={x1} x2={x2} y1={y} y2={y} stroke={color} strokeWidth={1.2} opacity={0.75}
                className="cursor-default"
                onMouseEnter={(e) => showTip(e, `${s.id}: ${s.start.toFixed(2)}h–${s.end.toFixed(2)}h · circadian timing ${s.circadian_considered ? 'considered' : 'not considered / unspecified'}`)}
                onMouseMove={moveTip} onMouseLeave={hideTip} />
            )
          })}
          {Array.from({ length: 9 }, (_, i) => i * 3).map((h) => (
            <g key={h}>
              <line x1={(h / TOTAL_HOURS) * W} x2={(h / TOTAL_HOURS) * W} y1={H_TOP + H_BOT + 6} y2={H_TOP + H_BOT + 12} stroke="#E4E4E4" />
              <text x={(h / TOTAL_HOURS) * W} y={H_TOP + H_BOT + 22} fontSize={10} fill="#8A8A8A" textAnchor="middle">{hourLabel(h)}</text>
            </g>
          ))}
        </g>
      </svg>
      <div className="flex gap-4 mt-2 text-[11px] text-inkmid">
        <span className="flex items-center gap-1.5"><span className="w-4 h-[2px] inline-block" style={{ background: '#5B5BFF' }} /> circadian timing considered ({nConsidered})</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-[2px] inline-block" style={{ background: '#8A8A8A' }} /> not considered / unspecified ({nStudies - nConsidered})</span>
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

const CLIMATE_COLORS = {
  'Tropical': '#FB3640', 'Arid (hot)': '#FB3640', 'Semi-arid (hot)': '#FB3640',
  'Mediterranean': '#D5FF99', 'Humid subtropical': '#5B5BFF', 'Oceanic': '#C5FFFD',
  'Continental': '#8A8A8A', 'Semi-arid (cold)': '#8A8A8A', 'Subarctic': '#4A4A4A', 'Other/Mixed': '#BBBBBB',
}

function quantile(sorted, q) {
  if (!sorted.length) return null
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base]
}

function ClimateTempChart({ studies, climateCounts, tempRanges }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const stepsById = useMemo(() => {
    const m = new Map()
    ;(tempRanges?.studies || []).forEach((s) => m.set(s.id, s.steps || []))
    return m
  }, [tempRanges])

  const enriched = useMemo(() => studies.map((s) => ({ ...s, steps: stepsById.get(s.id) || [] })), [studies, stepsById])
  const climateOrder = Object.keys(climateCounts).sort((a, b) => climateCounts[b] - climateCounts[a])
  const W = 600
  const allTemps = enriched.flatMap((s) => [s.min, s.max, ...(s.steps || [])]).filter((v) => Number.isFinite(v))
  const rawMin = Math.min(...allTemps, 10)
  const rawMax = Math.max(...allTemps, 40)
  const domainMin = Math.floor(rawMin / 2) * 2 - 1
  const domainMax = Math.ceil(rawMax / 2) * 2 + 1
  const xScale = (v) => ((v - domainMin) / (domainMax - domainMin)) * W
  const rowH = 34
  const H = climateOrder.length * rowH + 14
  const jitter = (id, idx) => {
    const str = String(id || idx)
    let h = 0
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 997
    return ((h / 997) - 0.5) * 12
  }
  const ticks = []
  const tickStart = Math.ceil(domainMin / 5) * 5
  for (let v = tickStart; v <= domainMax; v += 5) ticks.push(v)

  return (
    <div className="overflow-x-auto">
      <div className="font-data text-[10px] text-inkfaint mb-1">
        Compact range plot by host climate. Thin horizontal marks show tested min–max ranges; points show the specific temperature steps reported in the dataset. Boxplots below each row summarize all reported temperature steps within that climate class.
      </div>
      <svg width={W + 155} height={H + 30} className="font-data overflow-visible">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={xScale(v) + 145} x2={xScale(v) + 145} y1={0} y2={H - 4} stroke="#E4E4E4" strokeWidth={1} />
            <text x={xScale(v) + 145} y={H + 13} fontSize={10} fill="#8A8A8A" textAnchor="middle">{v}°C</text>
          </g>
        ))}
        {climateOrder.map((grp, gi) => {
          const groupStudies = enriched.filter((s) => s.climate_group === grp)
          const y = gi * rowH + 15
          const color = CLIMATE_COLORS[grp] || '#BBBBBB'
          const temps = groupStudies.flatMap((s) => (s.steps && s.steps.length ? s.steps : [s.min, s.max])).filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
          const q1 = quantile(temps, 0.25)
          const med = quantile(temps, 0.5)
          const q3 = quantile(temps, 0.75)
          const min = temps[0]
          const max = temps[temps.length - 1]
          const boxY = y + 9
          return (
            <g key={grp}>
              <text x={138} y={y + 3} fontSize={11.5} fill="#0A0A0A" textAnchor="end">{grp}</text>
              <text x={138} y={y + 15} fontSize={9} fill="#8A8A8A" textAnchor="end">n={groupStudies.length}</text>
              {groupStudies.map((s, i) => {
                const yy = y + jitter(s.id, i)
                const pts = (s.steps && s.steps.length ? s.steps : [s.min, s.max]).filter((v) => Number.isFinite(v))
                return (
                  <g key={s.id} opacity={0.55} className="cursor-default"
                    onMouseEnter={(e) => showTip(e, `${s.id} (${s.country}, ${s.climate_group}): range ${s.min}–${s.max}°C; steps ${pts.join(', ')}°C`)}
                    onMouseMove={moveTip} onMouseLeave={hideTip}>
                    <line x1={xScale(s.min) + 145} x2={xScale(s.max) + 145} y1={yy} y2={yy} stroke={color} strokeWidth={1.4} />
                    {pts.map((t, j) => <circle key={`${s.id}-${j}-${t}`} cx={xScale(t) + 145} cy={yy} r={2} fill={color} stroke="#0A0A0A" strokeWidth={0.35} />)}
                  </g>
                )
              })}
              {temps.length > 0 && (
                <g className="cursor-default" onMouseEnter={(e) => showTip(e, `${grp}: step temperature median ${med.toFixed(1)}°C (IQR ${q1.toFixed(1)}–${q3.toFixed(1)}; range ${min.toFixed(1)}–${max.toFixed(1)})`)} onMouseMove={moveTip} onMouseLeave={hideTip}>
                  <line x1={xScale(min) + 145} x2={xScale(max) + 145} y1={boxY} y2={boxY} stroke="#0A0A0A" strokeWidth={1} />
                  <line x1={xScale(min) + 145} x2={xScale(min) + 145} y1={boxY - 3} y2={boxY + 3} stroke="#0A0A0A" strokeWidth={1} />
                  <line x1={xScale(max) + 145} x2={xScale(max) + 145} y1={boxY - 3} y2={boxY + 3} stroke="#0A0A0A" strokeWidth={1} />
                  <rect x={xScale(q1) + 145} y={boxY - 5} width={Math.max(1, xScale(q3) - xScale(q1))} height={10} fill="#FFFFFF" stroke="#0A0A0A" strokeWidth={1} />
                  <line x1={xScale(med) + 145} x2={xScale(med) + 145} y1={boxY - 6} y2={boxY + 6} stroke="#0A0A0A" strokeWidth={1.5} />
                </g>
              )}
            </g>
          )
        })}
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

function SettingSunburst({ data, total }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const W = 420, H = 420, cx = W / 2, cy = H / 2
  const innerR = 78, midR = 142, outerR = 198
  const typeColors = { Lab: '#0A0A0A', Field: '#5B5BFF', 'Living Lab': '#FB3640', Mixed: '#8A8A8A', NR: '#BBBBBB' }
  const byType = useMemo(() => {
    const m = new Map()
    data.forEach((d) => {
      const type = d['exp-type'] || 'NR'
      if (!m.has(type)) m.set(type, { label: type, count: 0, children: [] })
      const item = m.get(type)
      item.count += d.count
      item.children.push({ label: d['exp-spatial-typology'] || 'NR', count: d.count })
    })
    return [...m.values()].sort((a, b) => b.count - a.count)
  }, [data])
  const sum = byType.reduce((a, d) => a + d.count, 0) || total || 1
  const polar = (r, a) => [cx + r * Math.cos(a - Math.PI / 2), cy + r * Math.sin(a - Math.PI / 2)]
  const arc = (r0, r1, a0, a1) => {
    const large = a1 - a0 > Math.PI ? 1 : 0
    const [x00, y00] = polar(r0, a0), [x01, y01] = polar(r0, a1), [x10, y10] = polar(r1, a0), [x11, y11] = polar(r1, a1)
    return `M ${x10} ${y10} A ${r1} ${r1} 0 ${large} 1 ${x11} ${y11} L ${x01} ${y01} A ${r0} ${r0} 0 ${large} 0 ${x00} ${y00} Z`
  }
  const withOpacity = (hex, opacity) => {
    const v = hex.replace('#', '')
    const r = parseInt(v.slice(0, 2), 16), g = parseInt(v.slice(2, 4), 16), b = parseInt(v.slice(4, 6), 16)
    return `rgba(${r},${g},${b},${opacity})`
  }
  let angle = 0
  const segments = []
  byType.forEach((type) => {
    const a0 = angle
    const a1 = angle + (type.count / sum) * Math.PI * 2
    const base = typeColors[type.label] || '#BBBBBB'
    segments.push({ kind: 'type', label: type.label, count: type.count, a0, a1, color: base })
    let ca = a0
    type.children.sort((a, b) => b.count - a.count).forEach((child) => {
      const cb = ca + (child.count / type.count) * (a1 - a0)
      segments.push({ kind: 'child', parent: type.label, label: child.label, count: child.count, a0: ca, a1: cb, color: withOpacity(base, 0.62) })
      ca = cb
    })
    angle = a1
  })
  return (
    <div className="overflow-x-auto">
      <div className="font-data text-[10px] text-inkfaint mb-1">Inner ring: experimental setting type. Outer ring: spatial typologies nested within each setting type.</div>
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <svg width={W} height={H} className="font-data overflow-visible">
          {segments.map((s, i) => (
            <path key={i} d={s.kind === 'type' ? arc(innerR, midR, s.a0, s.a1) : arc(midR + 3, outerR, s.a0, s.a1)} fill={s.color} stroke="#FFFFFF" strokeWidth={1.5}
              className="cursor-default"
              onMouseEnter={(e) => showTip(e, s.kind === 'type' ? `${s.label}: ${s.count} experiments (${((s.count / sum) * 100).toFixed(1)}%)` : `${s.parent} / ${s.label}: ${s.count} experiments`)}
              onMouseMove={moveTip} onMouseLeave={hideTip} />
          ))}
          <circle cx={cx} cy={cy} r={innerR - 8} fill="#FFFFFF" />
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize={24} fontWeight={600} fill="#0A0A0A">{sum}</text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill="#8A8A8A">experiments</text>
        </svg>
        <div className="grid grid-cols-1 gap-2 mt-2 min-w-[220px]">
          {byType.map((t) => (
            <div key={t.label} className="text-[11px] text-inkmid">
              <div className="flex items-center gap-1.5 font-data text-ink">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: typeColors[t.label] || '#BBBBBB' }} />
                {t.label}: {t.count}
              </div>
              <div className="ml-4 text-inkfaint">{t.children.sort((a, b) => b.count - a.count).slice(0, 4).map((c) => `${c.label} ${c.count}`).join(' · ')}</div>
            </div>
          ))}
        </div>
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}

function PublicationsByYearChart({ data, totalPubs }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const maxVal = data.reduce((m, d) => (d.count > m ? d.count : m), 1)
  const gridMax = Math.ceil(maxVal / 10) * 10
  const gridStep = 10
  const W = 600, H = 140, barGap = 6
  const barW = (W - barGap * (data.length - 1)) / data.length
  const yScale = (v) => H - (v / gridMax) * H
  return (
    <div className="overflow-x-auto">
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
              <rect x={x} y={H - barH} width={barW} height={barH} fill="#0A0A0A" className="hover:fill-[#5B5BFF] transition-colors"
                onMouseEnter={(e) => showTip(e, `${d.year}: ${d.count} publications · ${((d.count / totalPubs) * 100).toFixed(1)}%`)}
                onMouseMove={moveTip} onMouseLeave={hideTip} />
              <text x={x + barW / 2} y={H + 14} fontSize={10} fill="#8A8A8A" textAnchor="middle">{d.year}</text>
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
    fig01_pubs_by_year, fig02_geography, fig03_session_length,
    fig05_time_of_day, fig06_setting_typology, fig07_temperature_ranges, climate_vs_temp, geo_choropleth, geo_cities,
    geo_concentration_by_period, domain_comanipulation, domain_cooccurrence, sample_size_by_country, chapter_completeness, summary,
  } = data
  const totalPubs = fig01_pubs_by_year.data.reduce((a, d) => a + d.count, 0)
  const [sessionStats, setSessionStats] = useState(null)
  // Computed directly from the raw values (not derived from the chart's
  // quartiles, which can't answer an arbitrary "% under 180" question) —
  // this is what makes the Fig. 3 commentary text track the data exactly,
  // rather than a hand-typed percentage that silently drifts whenever the
  // corpus is updated.
  const sessionValuesCapped = fig03_session_length.values_minutes.filter((v) => v <= 600)
  const sessionUnder180Pct = sessionValuesCapped.length
    ? ((sessionValuesCapped.filter((v) => v < 180).length / sessionValuesCapped.length) * 100).toFixed(1)
    : '0'

  const typeRollup = useMemo(() => {
    const map = {}
    fig06_setting_typology.data.forEach((r) => { map[r['exp-type']] = (map[r['exp-type']] || 0) + r.count })
    return Object.entries(map).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
  }, [fig06_setting_typology])

  const peakYear = fig01_pubs_by_year.data.reduce((best, d) => (d.count > best.count ? d : best))
  const topCountryShare = ((fig02_geography.data[0].count / summary.n_publications) * 100).toFixed(0)

  return (
    <div>
      <ChapterHeader
        eyebrow="Chapter 1 of 8"
        title="When, where, and under what conditions"
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
          { value: `${topCountryShare}%`, label: `of studies from ${fig02_geography.data[0].country}`, color: '#5B5BFF' },
        ]}
      />

      <CompletenessStrip
        fields={chapter_completeness.context_setting.fields}
        nStudies={chapter_completeness.context_setting.n_studies}
      />

      <ChapterSection
        title="When and where research happens"
        intro="Publication volume has risen steadily, with a dip during 2020–21. Research is geographically concentrated, and that concentration shapes more than just where studies happen — sample size patterns differ by country too, and the climate a study is conducted in often doesn't match the temperature range it tests."
      >
        <FigureCard figNumber="1" title="Publications by year" commentary="A clear upward trend with a COVID-era dip, consistent with the appendix's own account.">
          <PublicationsByYearChart data={fig01_pubs_by_year.data} totalPubs={totalPubs} />
        </FigureCard>

        <FigureCard figNumber="2" title="Geographical distribution" plotWidth={760} commentary="250 of 269 studies (93%) resolve to a specific city; the rest report only a country or province. Research concentrates in a small number of cities — Changsha and Chongqing alone account for 48 studies. China's share has also grown over time, from 55% of studies in 2013–14 to 73% in 2023–24. Color uses a log scale on the country view so China's count doesn't wash out every other country.">
          <GeographyToggle
            cityData={geo_cities.data}
            countryData={geo_choropleth.data}
          />
        </FigureCard>

        <FigureCard title="Sample size by country" plotWidth={760} commentary="China's median study (24 participants) looks like everywhere else — but its mean (56) is pulled up by a handful of large field studies, including one with 2,110 participants. Brazil and Switzerland show the opposite pattern: few studies, but typically large ones (medians of 82 and 75). Mean and median diverge enough here that either one alone would mislead.">
          <SampleSizeByCountry
            stats={sample_size_by_country.stats}
            studies={sample_size_by_country.studies}
            minCountThreshold={sample_size_by_country.min_count_threshold}
          />
        </FigureCard>

        <FigureCard figNumber="7" title="Tested temperature range by host climate" plotWidth={680} commentary="Humid subtropical and continental climates together account for 67% of studies with a known climate, including most of the warm-condition research. Only 15 of 251 studies (6%) were run in a genuinely hot climate (tropical, hot-arid, or hot-semi-arid) — heat is mostly studied by simulating it in temperate-climate labs, not by testing where it actually occurs.">
          <ClimateTempChart studies={climate_vs_temp.studies} climateCounts={climate_vs_temp.climate_counts} tempRanges={fig07_temperature_ranges} />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="Setting and timing"
        intro="Lab studies dominate; office-like spaces are the most common spatial typology. Sessions cluster under 3 hours, and almost all testing happens in daytime hours."
      >
        <FigureCard figNumber="6" title="Experimental setting type" plotWidth={760} commentary="200 of 266 experiments (75%) are run in a lab; Field and Living Lab split the remainder almost evenly (12% each). The nested ring adds the spatial typology rather than treating setting type as a single-level count.">
          <SettingSunburst data={fig06_setting_typology.data} total={summary.n_experiments} />
        </FigureCard>

        <FigureCard figNumber="5" title="Time of day distribution" plotWidth={620} commentary="Testing peaks at 15:00, when 88% of the 73 sessions with known timing are active. Sessions in blue explicitly report considering circadian timing effects — most don't; testing concentrated in a narrow daytime window is itself a common way labs implicitly control for circadian variation without saying so.">
          <TimeOfDayChart sessions={fig05_time_of_day.sessions} />
        </FigureCard>

        <FigureCard figNumber="3" title="Session length" commentary={sessionStats ? `Minutes per session, capped at 600. ${sessionUnder180Pct}% of the ${sessionStats.n} studies with known session length run under 180 minutes. Median ${sessionStats.median} min (IQR ${sessionStats.q25}–${sessionStats.q75}), range ${sessionStats.min}–${sessionStats.max} min.` : 'Minutes per session, capped at 600.'}>
          <HistogramECDF
            values={sessionValuesCapped}
            binWidth={15}
            unit=" min"
            onStats={setSessionStats}
          />
        </FigureCard>
      </ChapterSection>

      <ChapterSection
        title="How many variables are manipulated at once"
        intro={`${domain_comanipulation.n_domains_distribution.filter((d) => d.n_domains >= 2).reduce((a, d) => a + d.count, 0)} of ${domain_comanipulation.n_studies} studies manipulate more than one environmental domain simultaneously (e.g. air temperature crossed with humidity, or with air movement). The rest isolate a single variable, the classic thermal-comfort design.`}
      >
        <FigureCard title="Number of domains manipulated per study" commentary="184 of 269 studies (68%) isolate a single variable — the classic thermal-comfort design. 71 (26%) cross two domains, and 11 (4%) cross three; almost none cross four or more.">
          <InteractiveBarChart
            data={domain_comanipulation.n_domains_distribution.map((d) => ({ label: `${d.n_domains} domain${d.n_domains === 1 ? '' : 's'}`, count: d.count }))}
            total={domain_comanipulation.n_studies}
            color="#0A0A0A"
          />
        </FigureCard>

        <FigureCard title="Which domains are manipulated together" plotWidth={620} commentary="Diagonal cells show the total number of studies manipulating each domain; off-diagonal cells show co-manipulation. This keeps the univariate counts while making the coupled experimental designs visible.">
          <CooccurrenceMatrix labels={domain_cooccurrence.labels} matrix={domain_cooccurrence.matrix} cellSize={38} />
        </FigureCard>
      </ChapterSection>
    </div>
  )
}
