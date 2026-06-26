// Standardised figure container used throughout every chapter. Commentary is now
// rendered as ordinary flow text above the plot rather than as a separate boxed
// side panel, so each chapter reads as a continuous essay with figures embedded
// in the same column.
export default function FigureCard({ figNumber, title, commentary, children, plotWidth = 960, size = null }) {
  const resolvedWidth = size === 'wide' ? 1120 : size === 'standard' ? 760 : plotWidth
  const widthClass = size === 'wide' || resolvedWidth >= 980 ? 'atlas-figure-wide' : 'atlas-figure-standard'

  return (
    <div className="mb-10 last:mb-0">
      <div className="flex items-baseline gap-2 mb-2">
        {figNumber && (
          <span className="font-data text-[11px] text-coreaccent font-medium shrink-0">Fig. {figNumber}</span>
        )}
        <h3 className="text-[14.5px] font-medium">{title}</h3>
      </div>
      {commentary && (
        <p className="text-[13px] text-inkmid leading-relaxed mb-4 max-w-3xl">{commentary}</p>
      )}
      <div className={`min-w-0 overflow-visible atlas-figure-plot ${widthClass}`} style={{ width: '100%', maxWidth: resolvedWidth || '100%', padding: '14px 24px 60px 0' }}>
        {children}
      </div>
    </div>
  )
}
