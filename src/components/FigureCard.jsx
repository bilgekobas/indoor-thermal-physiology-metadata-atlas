// Standardised figure container used throughout every chapter.
// Layout: on wide viewports, plot + commentary sit side-by-side (plot fixed
// width, commentary fills remaining space); on narrow viewports they stack
// (plot full width on top, commentary below). This matches how data-journalism
// outlets present "chart + annotation" pairs at any screen size.
//
// `figNumber` and `title` form the caption header; `commentary` is the prose
// explaining what the reader should take from the chart; `children` is the
// actual chart component; `plotWidth` lets wide charts (Sankey, matrices)
// override the default fixed width.
export default function FigureCard({ figNumber, title, commentary, children, plotWidth = 640 }) {
  return (
    <div className="mb-10 last:mb-0">
      <div className="flex items-baseline gap-2 mb-3">
        {figNumber && (
          <span className="font-data text-[11px] text-coreaccent font-medium shrink-0">Fig. {figNumber}</span>
        )}
        <h3 className="text-[14.5px] font-medium">{title}</h3>
      </div>
      <div className="flex flex-col lg:flex-row gap-5 lg:gap-8 items-start">
        <div className="shrink-0 overflow-x-auto" style={{ maxWidth: plotWidth, width: '100%' }}>
          {children}
        </div>
        {commentary && (
          <div className="lg:w-64 shrink-0 text-[12.5px] text-inkmid leading-relaxed lg:pt-1">
            {commentary}
          </div>
        )}
      </div>
    </div>
  )
}
