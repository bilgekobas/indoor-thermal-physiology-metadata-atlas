import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { chapters } from '../chapters.js'
import { slugify } from './Chapter.jsx'

const pages = [
  { to: '/', label: 'Overview' },
  { to: '/methodology', label: 'Methodology' },
  { to: '/dictionary', label: 'Variable Dictionary' },
  { to: '/browse', label: 'Browse & Download' },
]

export default function Sidebar({ summary }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expanded, setExpanded] = useState(() => new Set(chapters.map((c) => c.to)))

  function toggle(to) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(to)) next.delete(to)
      else next.add(to)
      return next
    })
  }

  return (
    <aside className="flex shrink-0 flex-col border-b border-line md:sticky md:top-0 md:h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between md:block md:border-b md:border-line">
        <Link to="/" onClick={() => setMobileOpen(false)} className="block px-5 py-3 transition-colors hover:bg-white/50 md:pb-5 md:pt-6">
          <span className="block text-base font-semibold leading-snug">Indoor Thermal Physiology Atlas</span>
          {summary && (
            <div className="mt-2 hidden font-data text-[11px] text-inkfaint md:block">
              {summary.n_publications} publications · {summary.year_min}–{summary.year_max}
            </div>
          )}
        </Link>
        <button type="button" className="mr-4 px-2 py-2 text-sm font-medium md:hidden"
          aria-expanded={mobileOpen} aria-controls="atlas-navigation" onClick={() => setMobileOpen(!mobileOpen)}>
          Contents
        </button>
      </div>

      <nav id="atlas-navigation" aria-label="Atlas navigation"
        className={`${mobileOpen ? 'block' : 'hidden'} max-h-[60vh] flex-1 overflow-y-auto px-3 py-4 md:block md:max-h-none`}
        onClick={(event) => { if (event.target.closest('a')) setMobileOpen(false) }}>
        <div className="mb-5">
          {pages.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => `block px-2 py-1.5 rounded text-[13.5px] mb-0.5 transition-colors leading-snug ${isActive ? 'bg-ink text-paper font-medium' : 'text-ink hover:bg-line/60'}`}>
              {label}
            </NavLink>
          ))}
        </div>

        <div className="mb-5">
          <div className="font-data text-[10px] uppercase tracking-wider text-inkfaint px-2 mb-1.5">Chapters</div>
          {chapters.map((chapter) => {
            const isExpanded = expanded.has(chapter.to)
            return (
              <div key={chapter.to} className="mb-0.5">
                <div className="flex items-center">
                  <NavLink
                    to={chapter.to}
                    className={({ isActive }) =>
                      `flex-1 block px-2 py-1.5 rounded text-[13.5px] transition-colors leading-snug ${
                        isActive ? 'bg-ink text-paper font-medium' : 'text-ink hover:bg-line/60'
                      }`
                    }
                  >
                    {chapter.label}
                  </NavLink>
                  <button
                    onClick={() => toggle(chapter.to)}
                    className="px-1.5 py-1.5 text-inkfaint hover:text-ink transition-colors"
                    aria-label={isExpanded ? 'Collapse sections' : 'Expand sections'}
                  >
                    <span className="font-data text-[10px]">{isExpanded ? '▾' : '▸'}</span>
                  </button>
                </div>
                {isExpanded && (
                  <div className="ml-2 pl-2 border-l border-line mt-0.5 mb-1.5">
                    {chapter.subtitles.map((sub) => (
                      <NavLink
                        key={sub}
                        to={`${chapter.to}#${slugify(sub)}`}
                        className="block px-2 py-1 rounded text-[12px] text-inkmid hover:text-ink hover:bg-line/40 transition-colors leading-snug"
                      >
                        {sub}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </nav>

      <div className={`${mobileOpen ? 'block' : 'hidden'} border-t border-line px-5 py-4 md:block`}>
        <a
          href="https://github.com/bilgekobas/indoor-thermal-physiology-metadata-atlas"
          className="font-data text-[11px] text-inkmid hover:text-coreaccent transition-colors"
        >
          View on GitHub →
        </a>
      </div>
    </aside>
  )
}
