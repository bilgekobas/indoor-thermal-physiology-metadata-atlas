export default function PageHeader({ eyebrow, title, description }) {
  return (
    <div className="px-10 pt-10 pb-6 border-b border-line">
      {eyebrow && (
        <div className="font-data text-[11px] uppercase tracking-wider text-coreaccent mb-2">
          {eyebrow}
        </div>
      )}
      <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{title}</h1>
      {description && (
        <p className="text-[14.5px] text-inkmid mt-2 max-w-2xl leading-relaxed">
          {description}
        </p>
      )}
    </div>
  )
}
