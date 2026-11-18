import { useMemo, useState } from 'react'
import { PeriodHeatmap } from './OverallByPeriod.jsx'

const PINK = '#FF4DA6'

export function ChoiceButtons({ options, value, onChange, label }) {
  return <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label={label}>
    {options.map(({ key, label: text }) => <button key={key} type="button" aria-pressed={value === key}
      onClick={() => onChange(key)} className={`px-3 py-1.5 rounded text-[11.5px] font-data transition-colors ${value === key ? 'bg-ink text-paper' : 'bg-line/50 text-inkmid hover:bg-line'}`}>
      {text}
    </button>)}
  </div>
}

export function ExperimentList({ ids, studies, label = 'Experiments in this selection' }) {
  const lookup = useMemo(() => Object.fromEntries((studies || []).map(s => [s.id, s])), [studies])
  return <details className="mt-4 max-w-4xl text-[12px]">
    <summary className="cursor-pointer font-data text-inkmid">{label} ({ids.length})</summary>
    <ol className="mt-3 max-h-64 overflow-y-auto divide-y divide-line border-y border-line">
      {ids.map(id => <li key={id} className="py-2 flex gap-3 leading-relaxed">
        <span className="font-data text-inkfaint shrink-0">{id}</span>
        {lookup[id]?.['pub-doi'] ? <a href={lookup[id]['pub-doi']} target="_blank" rel="noopener noreferrer" className="hover:text-coreaccent hover:underline">{lookup[id]['id-title']}</a>
          : <span>{lookup[id]?.['id-title'] || id}</span>}
      </li>)}
    </ol>
  </details>
}

export function CoreTemperatureView({ core }) {
  const [mode, setMode] = useState('classes')
  const items = mode === 'classes' ? core.classes : core.sites
  const cells = mode === 'classes' ? core.by_period : core.site_by_period
  return <div>
    <ChoiceButtons label="Core/body temperature grouping" value={mode} onChange={setMode}
      options={[{ key: 'classes', label: 'Measurement class' }, { key: 'sites', label: 'Anatomical site' }]} />
    <p className="text-[12px] text-inkmid max-w-3xl mb-4 leading-relaxed">
      {mode === 'classes'
        ? `${core.n} experiments carry the combined core/body-temperature label. Classification prioritises rectal or gastrointestinal measurement when present, followed by tympanic, oral or axillary estimates; other reported sites form the peripheral category. Each experiment belongs to one class.`
        : 'An experiment may report several sites. Site counts are non-exclusive; percentages use experiments measuring core/body temperature in the corresponding publication period.'}
    </p>
    <PeriodHeatmap rows={items.map(r => r.label)} periods={core.periods} periodN={core.period_n}
      rowTotals={Object.fromEntries(items.map(r => [r.label, r.count]))}
      getCount={(label, p) => cells.find(r => r.label === label && r.period === p)?.count || 0}
      labelWidth={280} cellWidth={74} />
    <p className="text-[11px] text-inkfaint mt-3 max-w-3xl leading-relaxed">
      Classification uses recorded anatomical sites, rather than assuming that the publication's temperature label identifies an equivalent measurement. “Mouth” is harmonised with oral cavity. These classes do not establish equivalence within a class.
    </p>
  </div>
}

export function ExactSignalCombinations({ views, studies }) {
  const [size, setSize] = useState('all')
  const [limit, setLimit] = useState(10)
  const [selected, setSelected] = useState(null)
  const combinations = views.signal_bundles.filter(r => size === 'all' || r.signals.length === Number(size))
  const visible = combinations.slice(0, limit)
  const totals = {}
  views.signal_bundles.forEach(r => r.signals.forEach(s => { totals[s] = (totals[s] || 0) + r.count }))
  const columns = [...new Set(visible.flatMap(r => r.signals))].sort((a, b) => totals[b] - totals[a] || a.localeCompare(b))
  const colWidth = 74, left = 28, rowHeight = 34
  const top = Math.max(140, Math.ceil(Math.max(0, ...columns.map(s => s.length)) * 6.4 * Math.sin(40 * Math.PI / 180)) + 30)
  const barX = left + columns.length * colWidth + 24
  const max = Math.max(...visible.map(r => r.count), 1)
  const width = Math.max(920, barX + 340)
  const shown = visible.reduce((sum, r) => sum + r.count, 0)
  const eligible = combinations.reduce((sum, r) => sum + r.count, 0)
  return <div>
    <label className="text-[12px] font-data block mb-4">Number of coded signals in the complete set{' '}
      <select value={size} onChange={e => { setSize(e.target.value); setLimit(10); setSelected(null) }} className="ml-2 border border-line rounded bg-white px-2 py-1">
        <option value="all">All experiments ({views.n})</option>
        {views.battery_sizes.map(r => <option key={r.size} value={r.size}>{r.size} signal{r.size === 1 ? '' : 's'} ({r.count} experiment{r.count === 1 ? '' : 's'})</option>)}
      </select>
    </label>
    <div className="overflow-x-auto">
      <svg width={width} height={top + visible.length * rowHeight + 16} className="font-data block" role="group" aria-label="Exact physiological measurement combinations; filled dots identify every coded signal in each set, and bars count experiments with that complete set.">
        {columns.map((signal, i) => <text key={signal} x={left + i * colWidth} y={top - 22} transform={`rotate(-40 ${left + i * colWidth} ${top - 22})`} fontSize={10.5} fill="#5B5B5B">{signal}</text>)}
        <text x={barX} y={top - 22} fontSize={11} fill="#5B5B5B">EXPERIMENTS WITH THIS EXACT SET</text>
        {visible.map((r, i) => {
          const y = top + i * rowHeight
          const positions = columns.map((s, j) => r.signals.includes(s) ? left + j * colWidth : null).filter(x => x !== null)
          const active = selected?.signals.join('|') === r.signals.join('|')
          const countLabel = `${r.count} experiment${r.count === 1 ? '' : 's'}`
          return <g key={r.signals.join('|')} role="button" tabIndex={0} aria-label={`${r.signals.join(' and ')} only: ${countLabel}`}
            onClick={() => setSelected(active ? null : r)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(active ? null : r) } }} className="cursor-pointer">
            <title>{r.signals.join(' + ')} only: {countLabel} ({(r.count / views.n * 100).toFixed(1)}% of the full corpus). Select to inspect experiment IDs.</title>
            <rect x={0} y={y - 13} width={width} height={30} fill={active ? '#FFF0F7' : i % 2 ? '#F3F3F3' : '#FFFFFF'} />
            {positions.length > 1 && <line x1={Math.min(...positions)} x2={Math.max(...positions)} y1={y} y2={y} stroke="#0A0A0A" strokeWidth={2} />}
            {columns.map((s, j) => <circle key={s} cx={left + j * colWidth} cy={y} r={4.5} fill={r.signals.includes(s) ? '#0A0A0A' : '#DEDEDE'} />)}
            <rect x={barX} y={y - 7} width={r.count / max * 235} height={14} rx={2} fill={PINK} />
            <text x={barX + r.count / max * 235 + 8} y={y + 4} fontSize={11}>{r.count} ({(r.count / views.n * 100).toFixed(1)}%)</text>
          </g>
        })}
      </svg>
    </div>
    <p className="text-[11px] text-inkmid mt-2 max-w-3xl leading-relaxed">
      A filled dot means the signal is in the complete coded set; a grey dot means it is absent from that set. Rows are mutually exclusive. Percentages always use all {views.n} experiments. Multiple sites or sensors for one signal do not increase the signal count.
    </p>
    <p className="text-[11px] text-inkfaint mt-2">Showing {visible.length} of {combinations.length} distinct sets in this view, covering {shown} of {eligible} experiments.</p>
    {combinations.length > limit && <button type="button" onClick={() => setLimit(limit + 10)} className="mt-3 text-[12px] text-coreaccent hover:underline">Show 10 more combinations</button>}
    {selected && <ExperimentList ids={selected.ids} studies={studies} label={selected.signals.join(' + ')} />}
  </div>
}

export function SexHormoneContext({ context, studies }) {
  const [cohort, setCohort] = useState('All experiments')
  const groups = ['All experiments', 'With female participants', 'Male only', 'Female only', 'Mixed sex', 'Composition unspecified']
  const records = context.records.filter(r => cohort === 'All experiments' || (cohort === 'With female participants' ? ['Mixed sex', 'Female only'].includes(r.group) : r.group === cohort))
  const any = records.filter(r => Object.values(r.flags).some(Boolean))
  const n = records.length
  return <div>
    <label className="font-data text-[12px]">Cohort{' '}
      <select aria-label="Sex and hormone context cohort" className="ml-2 px-2 py-1 border border-line rounded bg-white" value={cohort} onChange={e => setCohort(e.target.value)}>
        {groups.map(label => <option key={label}>{label}</option>)}
      </select>
    </label>
    <div className="mt-5 mb-6 flex flex-wrap gap-6 text-[12px] text-inkmid">
      <span><strong className="font-data text-[22px] text-ink">{n}</strong> experiments in this cohort</span>
      <span><strong className="font-data text-[22px] text-coreaccent">{any.length}</strong> with at least one listed characteristic ({n ? (any.length / n * 100).toFixed(1) : '0'}%)</span>
    </div>
    {['Sample composition', 'Eligibility', 'Participant metadata', 'Protocol'].map(domain => <div key={domain} className="mb-5 max-w-4xl">
      <h4 className="text-[12px] font-semibold mb-2">{domain}</h4>
      {context.fields.filter(f => f.domain === domain).map(field => {
        const count = records.filter(r => r.flags[field.key]).length
        return <div key={field.key} className="grid grid-cols-[minmax(190px,280px)_minmax(100px,1fr)_90px] gap-3 items-center mb-2 text-[12px]">
          <span>{field.label}</span>
          <div className="h-3 bg-line/50 rounded" title={`${count} of ${n} experiments`}><div className="h-full rounded" style={{ width: `${n ? count / n * 100 : 0}%`, background: PINK }} /></div>
          <span className="font-data text-right text-inkmid">{count}/{n} · {n ? (count / n * 100).toFixed(1) : '0'}%</span>
        </div>
      })}
    </div>)}
    <p className="text-[11px] text-inkfaint max-w-3xl leading-relaxed">
      Categories overlap; the combined count includes each experiment once. Single-sex samples are identified from numeric male/female counts. Sex-based recruitment and hormone-related eligibility use their own coded fields, including records without a resolved sex breakdown. A single-sex sample does not itself establish hormonal status or menstrual control. These characteristics are not applicable to every participant or research question.
    </p>
    <ExperimentList ids={any.map(r => r.id)} studies={studies} label="Experiments with at least one listed characteristic" />
  </div>
}

export function JointReporting({ presets, studies }) {
  const [presetKey, setPresetKey] = useState(presets[0].key)
  const preset = presets.find(p => p.key === presetKey)
  const [required, setRequired] = useState(presets[0].defaults)
  const matches = preset.records.filter(r => required.every(key => r.flags[key]))
  return <div>
    <ChoiceButtons label="Joint reporting domain" options={presets.map(p => ({ key: p.key, label: p.label }))} value={presetKey}
      onChange={key => { setPresetKey(key); setRequired(presets.find(p => p.key === key).defaults) }} />
    <div className="grid md:grid-cols-[minmax(260px,1fr)_240px] gap-8 max-w-4xl items-start">
      <div>
        <p className="text-[12px] text-inkmid mb-3">Select the fields that must be documented in the same experiment.</p>
        {preset.fields.map(field => {
          const count = preset.records.filter(r => r.flags[field.key]).length
          return <label key={field.key} className="flex gap-3 items-start py-2 text-[12px] border-b border-line cursor-pointer">
            <input type="checkbox" checked={required.includes(field.key)} onChange={() => setRequired(required.includes(field.key) ? required.filter(k => k !== field.key) : [...required, field.key])} className="mt-0.5 accent-pink-500" />
            <span className="flex-1">{field.label}</span><span className="font-data text-inkfaint">{count}/{preset.n}</span>
          </label>
        })}
      </div>
      <div className="border-l-2 border-coreaccent pl-5" aria-live="polite">
        <div className="font-data text-[38px] text-coreaccent leading-none">{matches.length}<span className="text-[18px] text-inkfaint">/{preset.n}</span></div>
        <p className="text-[12px] mt-3 leading-relaxed">experiments meet all {required.length} selected requirements together</p>
        <div className="mt-4 h-3 bg-line/50 rounded"><div className="h-full rounded" style={{ width: `${preset.n ? matches.length / preset.n * 100 : 0}%`, background: PINK }} /></div>
        <p className="font-data text-[12px] mt-2">{preset.n ? (matches.length / preset.n * 100).toFixed(1) : '0'}% of this view's eligible experiments</p>
      </div>
    </div>
    <p className="text-[11px] text-inkfaint mt-5 max-w-3xl leading-relaxed">
      Individual counts at right describe each field separately; the large count is their intersection. A coded value can include a documented inference under the extraction rules. For physiological views, every coded measurement row for the selected signal must satisfy the selected measurement fields. This view describes metadata availability; comparability still requires checking protocols, measurement definitions and the underlying data.
    </p>
    <ExperimentList ids={matches.map(r => r.id)} studies={studies} label="Experiments meeting the selected requirements" />
  </div>
}

export function SignalSettingMatrix({ matrix, studies }) {
  const [mode, setMode] = useState('within-setting')
  const [showAll, setShowAll] = useState(false)
  const [selected, setSelected] = useState(null)
  const rows = matrix.rows.filter(r => showAll || r.count >= 5)
  return <div>
    <ChoiceButtons label="Signal and setting denominator" value={mode} onChange={setMode}
      options={[{ key: 'within-setting', label: '% within setting' }, { key: 'within-signal', label: '% within signal' }, { key: 'count', label: 'Experiment count' }]} />
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] max-w-5xl text-[11px] border-separate border-spacing-1 font-data">
        <caption className="text-left text-[12px] font-sans text-inkmid mb-3">
          {mode === 'within-setting' ? 'Of the experiments in each setting, what percentage measured this signal?'
            : mode === 'within-signal' ? 'Of the experiments measuring each signal, what percentage used this setting?'
              : 'How many distinct experiments measured each signal in each setting?'}
        </caption>
        <thead><tr><th className="text-left p-2 font-medium">Physiological signal</th>{matrix.settings.map(s => <th key={s.label} className="p-2 font-medium">{s.label}<span className="block text-inkfaint font-normal">n={s.n}</span></th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.label}>
          <th className="text-left p-2 font-normal max-w-[240px]">{row.label}<span className="text-inkfaint ml-2">n={row.count}</span></th>
          {row.cells.map((cell, i) => {
            const denom = mode === 'within-signal' ? row.count : matrix.settings[i].n
            const pct = denom ? cell.count / denom * 100 : 0
            const intensity = mode === 'count' ? cell.count / Math.max(...matrix.rows.flatMap(r => r.cells.map(c => c.count)), 1) : pct / 100
            return <td key={cell.setting} className="p-0"><button type="button" onClick={() => setSelected({ ...cell, signal: row.label })}
              title={`${row.label}, ${cell.setting}: ${cell.count} of ${denom} experiments (${pct.toFixed(1)}%). Select to inspect records.`}
              className="w-full px-3 py-2.5 rounded hover:outline hover:outline-1 hover:outline-ink"
              style={{ background: `rgba(255,77,166,${0.04 + intensity * 0.7})` }}>
              {mode === 'count' ? cell.count : `${pct.toFixed(1)}%`}<span className="block text-[9px] text-inkmid">{cell.count}/{denom}</span>
            </button></td>
          })}
        </tr>)}</tbody>
      </table>
    </div>
    <button type="button" className="mt-3 text-[12px] text-coreaccent hover:underline" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show signals measured in at least five experiments' : `Show all ${matrix.rows.length} coded signals`}</button>
    <p className="text-[11px] text-inkfaint mt-3 max-w-3xl leading-relaxed">Each experiment has one setting classification and may contribute to several signal rows. Mixed settings remain a separate category; the dataset does not resolve each measurement by setting or protocol phase. These distributions describe the included corpus and do not establish differences in measurement quality or explain why a method was chosen.</p>
    {selected && <ExperimentList key={`${selected.signal}-${selected.setting}`} ids={selected.ids} studies={studies} label={`${selected.signal} · ${selected.setting}`} />}
  </div>
}
