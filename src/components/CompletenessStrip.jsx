import { useTooltip, TooltipPortal } from './Tooltip.jsx'

// Chapter-scoped data-completeness strip: one row per field in this chapter's
// scope, showing % reported as a horizontal bar. Sits right after the framing
// copy, before any individual figures — answers "how complete is this part of
// the corpus" before the reader sees any specific chart.
export default function CompletenessStrip({ fields, nStudies, title = 'Data completeness for this chapter' }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const sorted = [...fields].sort((a, b) => b.pct - a.pct)
  const maxPct = sorted.reduce((m, f) => (f.pct > m ? f.pct : m), 1)

  return (
    <div className="px-10 py-6 bg-paper/60 border-b border-line">
      <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-inkmid mb-3">{title}</h3>
      <div className="grid grid-cols-2 gap-x-10 gap-y-1.5 max-w-3xl">
        {sorted.map((f) => (
          <div key={f.field} className="flex items-center gap-2 group">
            <span className="text-[12px] w-40 shrink-0 truncate" title={f.field}>{f.field}</span>
            <div
              className="flex-1 h-2 rounded-full bg-line overflow-hidden cursor-default"
              onMouseEnter={(e) => showTip(e, `${f.field}: ${f.count} of ${nStudies} studies · ${f.pct}%`)}
              onMouseMove={moveTip}
              onMouseLeave={hideTip}
            >
              <div
                className="h-full rounded-full group-hover:brightness-110"
                style={{ width: `${(f.pct / maxPct) * 100}%`, background: f.pct < 50 ? '#FB3640' : '#5B5BFF' }}
              />
            </div>
            <span className="font-data text-[11px] text-inkfaint w-10 text-right">{f.pct}%</span>
          </div>
        ))}
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}
