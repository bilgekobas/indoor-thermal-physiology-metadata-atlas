// Standardised figure container used throughout every chapter. Commentary is now
// rendered as ordinary flow text above the plot rather than as a separate boxed
// side panel, so each chapter reads as a continuous essay with figures embedded
// in the same column.
export default function FigureCard({ figNumber, title, commentary, children, plotWidth = 960 }) {
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
      <div className="min-w-0 overflow-visible" style={{ width: '100%', maxWidth: plotWidth || '100%', padding: '8px 54px 30px 0' }}>
        {children}
      </div>
    </div>
  )
}
