import { useMemo } from 'react'

export function ChoiceButtons({ options, value, onChange, label }) {
  return <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label={label}>
    {options.map(({ key, label: text }) => <button key={key} type="button" aria-pressed={value === key}
      onClick={() => onChange(key)} className={`px-3 py-1.5 rounded text-[11.5px] font-data transition-colors ${value === key ? 'bg-ink text-paper' : 'bg-line/50 text-inkmid hover:bg-line'}`}>
      {text}
    </button>)}
  </div>
}

export function ExperimentList({ ids, studies, label = 'Experiments in this selection', initiallyOpen = false }) {
  const lookup = useMemo(() => Object.fromEntries((studies || []).map(s => [s.id, s])), [studies])
  return <details open={initiallyOpen} className="mt-4 max-w-4xl text-[12px]">
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
