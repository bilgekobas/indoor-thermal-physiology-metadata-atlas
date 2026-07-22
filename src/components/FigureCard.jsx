// Standardised figure container used throughout every chapter. Commentary is now
// rendered as ordinary flow text above the plot rather than as a separate boxed
// side panel, so each chapter reads as a continuous essay with figures embedded
// in the same column.
export default function FigureCard({ figNumber, title, commentary, footnote, children, plotWidth = 960, size = null }) {
  const resolvedWidth = size === 'wide' ? 1120 : size === 'standard' ? 760 : plotWidth
  const widthClass = size === 'wide' || resolvedWidth >= 980 ? 'atlas-figure-wide' : 'atlas-figure-standard'
  // commentary can be a single string (existing convention, unchanged for
  // every other figure) or an array of strings, each rendered as its own
  // paragraph -- for figures whose caption covers more than one idea and
  // reads better broken up than as one dense block.
  const paragraphs = Array.isArray(commentary) ? commentary : commentary ? [commentary] : []

  return (
    <div className="mb-10 last:mb-0">
      <div className="flex items-baseline gap-2 mb-2">
        {figNumber && (
          <span className="font-data text-[11px] text-coreaccent font-medium shrink-0">Fig. {figNumber}</span>
        )}
        <h3 className="text-[14.5px] font-medium">{title}</h3>
      </div>
      {paragraphs.map((p, i) => (
        <p key={i} className="text-[13px] text-inkmid leading-relaxed mb-3 last:mb-4 max-w-3xl">{p}</p>
      ))}
      {footnote && (
        <p className="text-[12px] text-inkfaint leading-relaxed mb-4 max-w-3xl italic">{footnote}</p>
      )}
      <div className={`min-w-0 overflow-visible atlas-figure-plot ${widthClass}`} style={{ width: '100%', maxWidth: resolvedWidth || '100%', padding: '14px 24px 60px 0' }}>
        {children}
      </div>
    </div>
  )
}
