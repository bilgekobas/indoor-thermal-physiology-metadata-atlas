import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

// Subtitles are each chapter's actual <ChapterSection title="..."> values —
// kept in sync by hand here, but the anchor each one points to is generated
// by the same slugify() function the section itself uses to set its id, so
// a typo here would show as a dead link rather than silently pointing at
// the wrong section.
const CHAPTERS = [
  {
    to: '/context', label: 'When, where & how',
    subtitles: ['When and where research happens', 'Setting and timing', 'How many variables are manipulated at once'],
  },
  {
    to: '/population', label: 'Who was studied',
    subtitles: ['Demographics', 'Are male and female sub-samples actually matched?', 'Who was excluded, and why', 'What else is known about participants'],
  },
  {
    to: '/body', label: 'Measurements: the body',
    subtitles: ["What's measured, and how", 'Signals, sensor types, and brands', 'How sensor choice has shifted over time', 'Skin temperature body sites', 'Where other signals are measured', 'Mean skin temperature'],
  },
  {
    to: '/environment', label: 'Measurements: the environment',
    subtitles: ['What gets measured together', 'Where sensors are placed'],
  },
  {
    to: '/questionnaires', label: 'What people were asked',
    subtitles: ['Questionnaire usage by domain', 'Scale heterogeneity: sensation vs. comfort'],
  },
  {
    to: '/cognitive', label: 'Cognitive testing',
    subtitles: ['What kind of measure is actually used', 'One task, or a full battery?'],
  },
  {
    to: '/protocol', label: 'Protocol rigor',
    subtitles: ['Has rigor improved as the field has grown?', 'Which controls are used, study by study'],
  },
  {
    to: '/reporting', label: 'Reporting completeness',
    subtitles: ['By metadata category', 'Open data, in practice', 'How sample size was justified'],
  },
]

function slugify(title) {
  return title.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')
}

export default function Sidebar({ summary }) {
  const location = useLocation()
  const [expanded, setExpanded] = useState(() => new Set(CHAPTERS.map((c) => c.to)))

  function toggle(to) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(to)) next.delete(to)
      else next.add(to)
      return next
    })
  }

  return (
    <aside className="w-64 shrink-0 border-r border-line h-screen sticky top-0 flex flex-col">
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
        <div className="mb-5">
          <div className="font-data text-[10px] uppercase tracking-wider text-inkfaint px-2 mb-1.5">Overview</div>
          <NavLink to="/" end className={({ isActive }) => `block px-2 py-1.5 rounded text-[13.5px] mb-0.5 transition-colors leading-snug ${isActive ? 'bg-ink text-paper font-medium' : 'text-ink hover:bg-line/60'}`}>
            Corpus overview
          </NavLink>
        </div>

        <div className="mb-5">
          <div className="font-data text-[10px] uppercase tracking-wider text-inkfaint px-2 mb-1.5">Explore</div>
          <NavLink to="/browse" className={({ isActive }) => `block px-2 py-1.5 rounded text-[13.5px] mb-0.5 transition-colors leading-snug ${isActive ? 'bg-ink text-paper font-medium' : 'text-ink hover:bg-line/60'}`}>
            Browse studies
          </NavLink>
          <NavLink to="/devices" className={({ isActive }) => `block px-2 py-1.5 rounded text-[13.5px] mb-0.5 transition-colors leading-snug ${isActive ? 'bg-ink text-paper font-medium' : 'text-ink hover:bg-line/60'}`}>
            Sensor brands & models
          </NavLink>
        </div>

        <div className="mb-5">
          <div className="font-data text-[10px] uppercase tracking-wider text-inkfaint px-2 mb-1.5">Chapters</div>
          {CHAPTERS.map((chapter) => {
            const isCurrent = location.pathname === chapter.to
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

        <div className="mb-5">
          <div className="font-data text-[10px] uppercase tracking-wider text-inkfaint px-2 mb-1.5">Reference</div>
          <NavLink to="/about" className={({ isActive }) => `block px-2 py-1.5 rounded text-[13.5px] mb-0.5 transition-colors leading-snug ${isActive ? 'bg-ink text-paper font-medium' : 'text-ink hover:bg-line/60'}`}>
            About & methods
          </NavLink>
        </div>
      </nav>

      <div className="px-5 py-4 border-t border-line">
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
