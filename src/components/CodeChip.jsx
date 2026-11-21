const labels = {
  Y: 'Yes, explicitly reported',
  N: 'No, explicitly reported',
  NR: 'Not reported',
  MNR: 'Measured or administered, but the requested detail is not reported',
  NAN: 'Not applicable (subject to field-specific coding rules)',
  NC: 'Not clear / conflicting',
}

export function CodeChip({ code, size = 'sm' }) {
  const cls = size === 'lg' ? 'px-2 py-1 text-[12px]' : 'px-1.5 py-0.5 text-[10px]'
  return (
    <span
      className={`inline-flex items-center rounded border border-line bg-white text-inkmid font-data align-baseline ${cls}`}
      title={labels[code] || code}
    >
      {code}
    </span>
  )
}

export function CodeLegend() {
  return (
    <dl className="mt-3 space-y-2">
      {Object.entries({
        NR: 'Not reported. The information could not be established from the article, figures, tables or supplements.',
        MNR: 'Measured but not reported. An environmental measurement or questionnaire was used, but the paper omitted a requested detail such as sensor height or scale wording.',
        NAN: 'Not applicable. For example, a mean skin temperature formula is inapplicable to an experiment that did not calculate mean skin temperature.',
        NC: 'Not clear. The source contained conflicting information or could not be coded consistently.',
      }).map(([code, meaning]) => (
        <div key={code} className="grid grid-cols-[3rem_1fr] gap-x-2">
          <dt className="font-data text-sm font-semibold text-ink">{code}</dt>
          <dd>{meaning}</dd>
        </div>
      ))}
    </dl>
  )
}
