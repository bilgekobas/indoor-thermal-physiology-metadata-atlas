import { useMemo } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import CooccurrenceMatrix from '../components/CooccurrenceMatrix.jsx'
import InteractiveBarChart from '../components/InteractiveBarChart.jsx'

const DOMAIN_COLORS = {
  'Skin temperature': '#D94F6E',
  'Core/Body temperature': '#E07820',
  'Heart/Pulse rate': '#4855C8',
  'Skin conductance': '#B8C020',
  'Sweat indicators': '#B8C020',
  'EEG': '#8A8A86',
  'EMG': '#8A8A86',
}
function colorFor(signal) {
  return DOMAIN_COLORS[signal] || '#BBBBBB'
}

export default function Measurement({ data }) {
  const { physio_signal_sensor, skintemp_sites, fig17_physio_params, fig18_physio_cooccurrence, fig12_env_cooccurrence, summary } = data

  const topSignals = useMemo(() => {
    const bySignal = {}
    physio_signal_sensor.overall.forEach((r) => {
      bySignal[r.signal] = (bySignal[r.signal] || 0) + r.count
    })
    return Object.entries(bySignal)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
  }, [physio_signal_sensor])

  const maxSignalCount = topSignals[0]?.[1] || 1

  const topSites = useMemo(() => {
    return [...skintemp_sites.site_totals].sort((a, b) => b.total - a.total).slice(0, 12)
  }, [skintemp_sites])

  const maxSiteTotal = topSites[0]?.total || 1

  const periods = skintemp_sites.periods
  const siteByPeriod = useMemo(() => {
    const map = {}
    topSites.forEach((s) => { map[s.site] = {} })
    skintemp_sites.site_period_counts.forEach((r) => {
      if (map[r.site]) map[r.site][r.period] = r.count
    })
    return map
  }, [topSites, skintemp_sites])

  const periodN = useMemo(() => {
    const m = {}
    skintemp_sites.period_n.forEach((r) => { m[r.period] = r.n_studies })
    return m
  }, [skintemp_sites])

  return (
    <div>
      <PageHeader
        eyebrow="Analysis · Appendix Fig. 12, 17–19"
        title="Measurement & sensors"
        description="Which physiological signals are measured, with which sensors, and at which body sites — and how that has shifted across the decade."
      />

      {/* Signal frequency (Fig 17) */}
      <div className="px-10 py-8 border-b border-line">
        <h2 className="text-[16px] font-semibold mb-1">Most frequently measured signals</h2>
        <p className="text-[13px] text-inkmid mb-5">
          Each study–signal–sensor combination counted once, regardless of body site. Hover for exact share.
        </p>
        <InteractiveBarChart
          data={fig17_physio_params.data.map((d) => ({ label: d.parameter, count: d.count }))}
          total={summary.n_experiments}
          color="#D94F6E"
          maxBars={12}
        />
      </div>

      {/* Co-occurrence (Fig 18) */}
      <div className="px-10 py-8 border-b border-line">
        <h2 className="text-[16px] font-semibold mb-1">Which signals get measured together</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          Diagonal = total studies measuring that signal; off-diagonal = studies measuring both. Hover any cell.
        </p>
        <CooccurrenceMatrix labels={fig18_physio_cooccurrence.labels} matrix={fig18_physio_cooccurrence.matrix} />
      </div>

      {/* Environmental co-occurrence (Fig 12) */}
      <div className="px-10 py-8 border-b border-line">
        <h2 className="text-[16px] font-semibold mb-1">Environmental variables measured together</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          Air temperature, humidity, air velocity, and globe temperature form the standard four-variable core.
        </p>
        <CooccurrenceMatrix labels={fig12_env_cooccurrence.labels} matrix={fig12_env_cooccurrence.matrix} cellSize={28} />
      </div>

      {/* Skin temp site prevalence heatmap */}
      <div className="px-10 py-8">
        <h2 className="text-[16px] font-semibold mb-1">Skin temperature: site prevalence by period</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          Percentage of studies in each two-year period measuring that site. Site labels
          consolidated from 23 raw terminology variants (e.g. calf/shin → lower leg).
        </p>

        <div className="overflow-x-auto">
          <table className="text-[12px] border-collapse">
            <thead>
              <tr>
                <th className="text-left pr-4 pb-2 font-data text-[11px] text-inkfaint font-medium"></th>
                {periods.map((p) => (
                  <th key={p} className="px-2 pb-2 font-data text-[11px] text-inkfaint font-medium text-center">
                    {p}
                    <div className="text-inkfaint/70">n={periodN[p] || 0}</div>
                  </th>
                ))}
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
                        <div
                          className="w-14 h-9 rounded-[3px] flex items-center justify-center font-data text-[11px] cursor-default"
                          style={{
                            background: pct === 0 ? '#F1EDE6' : `rgba(217, 79, 110, ${0.12 + intensity * 0.78})`,
                            color: intensity > 0.55 ? 'white' : '#1A1A18',
                          }}
                          title={`${s.site}, ${p}: ${n || 0} of ${periodN[p] || 0} studies (${pct}%)`}
                        >
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
      </div>
    </div>
  )
}
