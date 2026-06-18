import { useMemo } from 'react'
import PageHeader from '../components/PageHeader.jsx'

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
  const { physio_signal_sensor, skintemp_sites } = data

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
        eyebrow="Analysis"
        title="Measurement & sensors"
        description="Which physiological signals are measured, with which sensors, and at which body sites — and how that has shifted across the decade."
      />

      {/* Signal frequency */}
      <div className="px-10 py-8 border-b border-line">
        <h2 className="text-[16px] font-semibold mb-1">Most frequently measured signals</h2>
        <p className="text-[13px] text-inkmid mb-5">
          Each study–signal–sensor combination counted once, regardless of body site.
        </p>
        <div className="space-y-2 max-w-2xl">
          {topSignals.map(([signal, count]) => (
            <div key={signal} className="flex items-center gap-3">
              <span className="text-[13px] w-44 shrink-0">{signal}</span>
              <div className="flex-1 h-5 rounded bg-line/50 overflow-hidden">
                <div
                  className="h-full rounded flex items-center"
                  style={{ width: `${(count / maxSignalCount) * 100}%`, background: colorFor(signal) }}
                />
              </div>
              <span className="font-data text-[12px] w-10 text-right text-inkmid">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Skin temp site prevalence heatmap */}
      <div className="px-10 py-8">
        <h2 className="text-[16px] font-semibold mb-1">Skin temperature: site prevalence by period</h2>
        <p className="text-[13px] text-inkmid mb-5 max-w-2xl">
          Percentage of studies in each two-year period measuring that site. Site labels
          consolidated from {23} raw terminology variants (e.g. calf/shin → lower leg).
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
                          className="w-14 h-9 rounded-[3px] flex items-center justify-center font-data text-[11px]"
                          style={{
                            background: pct === 0 ? '#F1EDE6' : `rgba(217, 79, 110, ${0.12 + intensity * 0.78})`,
                            color: intensity > 0.55 ? 'white' : '#1A1A18',
                          }}
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
