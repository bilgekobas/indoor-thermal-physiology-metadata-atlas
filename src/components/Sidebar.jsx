import { NavLink } from 'react-router-dom'

const SECTIONS = [
  {
    group: 'Overview',
    items: [
      { to: '/', label: 'Corpus overview' },
    ],
  },
  {
    group: 'Explore',
    items: [
      { to: '/browse', label: 'Browse studies' },
    ],
  },
  {
    group: 'Analysis',
    items: [
      { to: '/measurement', label: 'Measurement & sensors' },
      { to: '/mst', label: 'Mean skin temperature' },
      { to: '/reporting', label: 'Reporting completeness' },
    ],
  },
  {
    group: 'Reference',
    items: [
      { to: '/about', label: 'About & methods' },
    ],
  },
]

export default function Sidebar({ summary }) {
  return (
    <aside className="w-60 shrink-0 border-r border-line h-screen sticky top-0 flex flex-col">
      <div className="px-5 pt-6 pb-5 border-b border-line">
        <div className="font-data text-[11px] text-inkmid tracking-wide uppercase">
          Living corpus
        </div>
        <h1 className="font-semibold text-[15px] leading-snug mt-1">
          Indoor Thermal<br />Physiology Corpus
        </h1>
        {summary && (
          <div className="font-data text-[11px] text-inkfaint mt-2">
            {summary.n_publications} studies · {summary.year_min}–{summary.year_max}
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {SECTIONS.map((section) => (
          <div key={section.group} className="mb-5">
            <div className="font-data text-[10px] uppercase tracking-wider text-inkfaint px-2 mb-1.5">
              {section.group}
            </div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `block px-2 py-1.5 rounded text-[13.5px] mb-0.5 transition-colors ${
                    isActive
                      ? 'bg-ink text-paper font-medium'
                      : 'text-ink hover:bg-line/60'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-line">
        <a
          href="https://github.com/bilgekobas/indoor-thermal-physiology-metadata-atlas"
          className="font-data text-[11px] text-inkmid hover:text-peripheral transition-colors"
        >
          View on GitHub →
        </a>
      </div>
    </aside>
  )
}
