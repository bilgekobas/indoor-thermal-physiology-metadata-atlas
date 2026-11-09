import { useEffect, useRef, useState } from 'react'
import FigureCard from './FigureCard.jsx'

export default function MeasurementScene({ figNumber, title, step, heading, lead, detail, plotWidth, children }) {
  const scene = useRef(null)
  const figure = useRef(null)
  const plot = useRef(null)
  const [canPan, setCanPan] = useState(false)

  useEffect(() => {
    const section = scene.current
    const panel = figure.current
    const chart = plot.current
    // A tall plot scrolls until its bottom fits, then pins like a shorter plot.
    // Measure again when the chart's controls or available width change.
    const measure = () => {
      section.style.setProperty('--figure-height', `${panel.offsetHeight}px`)
      setCanPan(chart.scrollWidth > chart.clientWidth)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(panel)
    observer.observe(chart)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={scene} id={`fig-${figNumber}`} className="measurement-scene scroll-mt-4">
      <div className="measurement-narrative">
        <div className="measurement-beat">
          <div className="font-data text-[11px] text-coreaccent mb-2">{step} / 03</div>
          <h3 className="text-[17px] font-semibold leading-snug mb-2">{heading}</h3>
          <p className="text-[13.5px] text-inkmid leading-relaxed">{lead}</p>
        </div>
        <div className="measurement-beat measurement-beat-detail">
          <p className="text-[13px] text-inkmid leading-relaxed">{detail}</p>
        </div>
      </div>
      <div ref={figure} className="measurement-figure">
        <FigureCard figNumber={figNumber} title={title} plotWidth={plotWidth}>
          {canPan && <p className="font-data text-[10.5px] text-inkfaint mb-2">Scroll chart sideways to see all columns →</p>}
          <div ref={plot} className="measurement-plot" role="region" aria-label={`Figure ${figNumber}. ${title}`} tabIndex={0}>
            {children}
          </div>
        </FigureCard>
      </div>
    </div>
  )
}
