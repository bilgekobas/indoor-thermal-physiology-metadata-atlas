const labels = {
  Y: 'Yes, explicitly reported',
  N: 'No, explicitly reported',
  NR: 'Not reported',
  MNR: 'Measured, but the value is not reported',
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
  const codes = ['Y', 'N', 'NR', 'MNR', 'NC']
  return (
    <div className="space-y-2">
      {codes.map((code) => (
        <div key={code} className="flex items-start gap-3 text-[13px]">
          <CodeChip code={code} size="lg" />
          <div className="text-inkmid leading-relaxed">{labels[code]}</div>
        </div>
      ))}
    </div>
  )
}
