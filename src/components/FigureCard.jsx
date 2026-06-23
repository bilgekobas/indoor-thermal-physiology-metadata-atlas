// Standardised figure container used throughout every chapter.
// Layout: commentary sits in a fixed-width left column with its own soft
// background/border (visually distinct from the page), and the plot starts
// immediately after it — at the SAME horizontal position for every figure
// on the page, regardless of how wide any individual chart's own content
// is. This is the opposite of the original layout (plot first, then
// variable-width commentary trailing it), which meant every figure's plot
// started at a different x-position depending on that figure's own
// plotWidth — there was no consistent column for the eye to track down the
// page. On narrow viewports the two stack (commentary above, plot below).
//
// `figNumber` and `title` form the caption header; `commentary` is the
// prose explaining what the reader should take from the chart; `children`
// is the actual chart component. `plotWidth` no longer constrains where
// the plot STARTS (that's now fixed by the commentary column width) — it
// only caps how wide the plot's own content can grow before scrolling.
const COMMENTARY_COL_WIDTH = 280

export default function FigureCard({ figNumber, title, commentary, children, plotWidth = 640 }) {
  return (
    <div className="mb-10 last:mb-0">
      <div className="flex items-baseline gap-2 mb-3">
        {figNumber && (
          <span className="font-data text-[11px] text-coreaccent font-medium shrink-0">Fig. {figNumber}</span>
        )}
        <h3 className="text-[14.5px] font-medium">{title}</h3>
      </div>
      <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">
        {commentary && (
          <div
            className="shrink-0 text-[12.5px] text-inkmid leading-relaxed bg-line/30 border border-line rounded-md p-4 order-2 lg:order-1"
            style={{ width: '100%', maxWidth: COMMENTARY_COL_WIDTH }}
          >
            {commentary}
          </div>
        )}
        <div
          className="overflow-x-auto order-1 lg:order-2 min-w-0"
          style={{ maxWidth: plotWidth, width: '100%' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
