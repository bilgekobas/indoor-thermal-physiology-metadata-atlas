// The corpus's own controlled-vocabulary codes, rendered as a recurring visual motif.
// This is the site's signature element: instead of generic icons, we surface the
// dataset's actual reporting-completeness vocabulary (Y / NR / MNR / NAN / NC).

const CODE_STYLES = {
  Y:   { bg: '#EAF3E4', fg: '#4B6B33', label: 'Y',   title: 'Reported' },
  N:   { bg: '#F3E9E4', fg: '#8A5A3D', label: 'N',   title: 'Reported absent' },
  NR:  { bg: '#F1EDE6', fg: '#A8A59C', label: 'NR',  title: 'Not reported' },
  MNR: { bg: '#FBF1DF', fg: '#B98A2E', label: 'MNR', title: 'Measured, not reported in full' },
  NAN: { bg: '#F1EDE6', fg: '#C9C6BC', label: '—',   title: 'Not applicable' },
  NC:  { bg: '#FDEAEA', fg: '#B5453F', label: 'NC',  title: 'Reported unclearly' },
}

export function CodeChip({ code, size = 'sm' }) {
  const style = CODE_STYLES[code] || CODE_STYLES.NR
  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-1.5 py-0.5'
    : 'text-xs px-2 py-0.5'
  return (
    <span
      className={`font-data inline-flex items-center rounded-[3px] font-medium tracking-wide ${sizeClasses}`}
      style={{ background: style.bg, color: style.fg }}
      title={style.title}
    >
      {style.label}
    </span>
  )
}

export function CodeLegend() {
  const order = ['Y', 'N', 'NR', 'MNR', 'NC']
  return (
    <div className="flex flex-wrap items-center gap-3 font-data text-[11px] text-inkmid">
      {order.map((code) => (
        <span key={code} className="inline-flex items-center gap-1.5">
          <CodeChip code={code} />
          <span>{CODE_STYLES[code].title}</span>
        </span>
      ))}
    </div>
  )
}

export { CODE_STYLES }
