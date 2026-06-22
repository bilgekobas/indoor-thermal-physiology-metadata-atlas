// Chapter shell: big title, framing copy (what we looked for / why it matters),
// and an optional headline-stat strip. This is the top of every analysis chapter.
export function ChapterHeader({ eyebrow, title, framing, headline }) {
  return (
    <div className="px-10 pt-12 pb-8 border-b border-line bg-white/30">
      {eyebrow && (
        <div className="font-data text-[11px] uppercase tracking-wider text-coreaccent mb-3">
          {eyebrow}
        </div>
      )}
      <h1 className="text-[30px] font-semibold leading-[1.15] tracking-tight max-w-3xl mb-4">
        {title}
      </h1>
      {framing && (
        <div className="max-w-2xl text-[14.5px] text-inkmid leading-relaxed space-y-3">
          {framing}
        </div>
      )}
      {headline && (
        <div className="flex flex-wrap gap-6 mt-6">
          {headline.map((h) => (
            <div key={h.label}>
              <div className="font-data text-[22px] font-semibold leading-none" style={{ color: h.color || '#1A1A18' }}>
                {h.value}
              </div>
              <div className="text-[12px] text-inkmid mt-1 max-w-[180px]">{h.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// A labelled section break within a chapter (e.g. "Evidence" after framing+completeness)
export function ChapterSection({ title, intro, children }) {
  return (
    <div className="px-10 py-8 border-b border-line last:border-b-0">
      {title && <h2 className="text-[17px] font-semibold mb-2">{title}</h2>}
      {intro && <p className="text-[13.5px] text-inkmid leading-relaxed mb-6 max-w-2xl">{intro}</p>}
      {children}
    </div>
  )
}
