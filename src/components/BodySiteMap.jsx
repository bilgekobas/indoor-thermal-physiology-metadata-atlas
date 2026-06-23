import { useState, useEffect, useMemo } from 'react'
import { useTooltip, TooltipPortal } from './Tooltip.jsx'

// Body-site visualization: places one marker per measurement site on a
// front-view human silhouette, sized by study count. Coordinates below are
// normalized (0-1 fractions of the silhouette's own width/height) rather
// than raw pixels, estimated from standard front-facing-figure anatomical
// proportions — NOT measured against the actual rendered silhouette pixel
// positions, since this was built without the ability to view the
// rendered image. Treat marker alignment as a first pass: if any site's
// dot visibly sits off the body once this renders, adjust its (x, y) pair
// below — each is independent and won't affect the others.
//
// Sites with no real front-view position (Back, Lower back, Buttocks,
// Sole — all posterior) are placed at the closest visible analog with
// "(back)" in their label, rather than silently misrepresenting them as
// frontally visible.
const SITE_COORDS = {
  // Head/face/neck
  'Forehead': [0.50, 0.075],
  'Face': [0.50, 0.09],
  'Neck': [0.50, 0.135],
  // Torso
  'Clavicle': [0.43, 0.165],
  'Chest': [0.50, 0.22],
  'Axilla': [0.38, 0.225],
  'Abdomen': [0.50, 0.30],
  'Waist': [0.50, 0.34],
  'Back': [0.50, 0.27],          // posterior — approximated at torso center
  'Lower back': [0.50, 0.345],   // posterior — approximated at lower torso
  'Buttocks': [0.50, 0.40],      // posterior — approximated at hip level
  // Arms
  'Shoulder': [0.34, 0.185],
  'Upper arm': [0.30, 0.27],
  'Elbow': [0.275, 0.345],
  'Forearm': [0.26, 0.40],
  'Wrist': [0.245, 0.45],
  'Hand': [0.235, 0.49],
  'Finger': [0.225, 0.51],
  // Legs
  'Thigh': [0.44, 0.52],
  'Lower leg': [0.44, 0.68],
  'Ankle': [0.44, 0.82],
  'Foot': [0.44, 0.87],
  'Sole': [0.44, 0.885],          // posterior/plantar — approximated at foot
}

const NON_PLACEABLE_NOTE = {
  'Whole body': 'measured as a whole-body total, not a single point',
  'Urine': 'a sample type, not a body location',
  'Limbs': 'too unspecific to place (could be any limb)',
}

export default function BodySiteMap({ siteData, totalLabel, color = '#5B5BFF', height = 460 }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const [svgMarkup, setSvgMarkup] = useState(null)

  useEffect(() => {
    const base = import.meta.env.BASE_URL
    fetch(`${base}images/man_silhouette.svg`)
      .then((r) => r.text())
      .then(setSvgMarkup)
      .catch(() => setSvgMarkup(null))
  }, [])

  const { placeable, unplaceable, maxCount } = useMemo(() => {
    const placeable = []
    const unplaceable = []
    siteData.forEach((s) => {
      if (s.non_anatomical || !SITE_COORDS[s.site]) {
        unplaceable.push(s)
      } else {
        placeable.push(s)
      }
    })
    const maxCount = placeable.reduce((m, s) => (s.count > m ? s.count : m), 1)
    return { placeable, unplaceable, maxCount }
  }, [siteData])

  const radiusFor = (count) => 5 + Math.sqrt(count / maxCount) * 16

  const VB_W = 603.04, VB_H = 742.93
  const renderW = height * (VB_W / VB_H)

  return (
    <div>
      <div className="flex gap-8 items-start">
        <div className="relative shrink-0" style={{ width: renderW, height }}>
          {svgMarkup ? (
            <div
              className="absolute inset-0 opacity-[0.16]"
              style={{ width: renderW, height }}
              dangerouslySetInnerHTML={{ __html: svgMarkup.replace('<svg', '<svg width="100%" height="100%"') }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-inkfaint text-[11px] font-data">
              Loading diagram…
            </div>
          )}
          <svg width={renderW} height={height} className="absolute inset-0 overflow-visible">
            {placeable.map((s) => {
              const [fx, fy] = SITE_COORDS[s.site]
              const cx = fx * renderW
              const cy = fy * height
              const isBack = ['Back', 'Lower back', 'Buttocks', 'Sole'].includes(s.site)
              const pct = ((s.count / totalLabel.n) * 100).toFixed(0)
              return (
                <g key={s.site}>
                  <circle
                    cx={cx} cy={cy} r={radiusFor(s.count)}
                    fill={color} fillOpacity={isBack ? 0.35 : 0.65}
                    stroke={isBack ? color : '#FCFCFC'} strokeWidth={isBack ? 1.2 : 1.5}
                    strokeDasharray={isBack ? '3 2' : 'none'}
                    className="cursor-default hover:fill-opacity-90 transition-[fill-opacity]"
                    onMouseEnter={(e) => showTip(e, `${s.site}${isBack ? ' (back, approximated)' : ''}: ${s.count} studies (${pct}% of ${totalLabel.n})`)}
                    onMouseMove={moveTip}
                    onMouseLeave={hideTip}
                  />
                  <text x={cx} y={cy + 3.5} fontSize={9} fill="#FCFCFC" textAnchor="middle" className="pointer-events-none font-data font-medium">
                    {s.count}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        <div className="flex-1 pt-2">
          <div className="font-data text-[10px] text-inkfaint mb-3">
            Marker area ∝ study count. Dashed outline = posterior (back-of-body) site, approximated
            on this front view since no back view is available.
          </div>
          <div className="space-y-1">
            {placeable.sort((a, b) => b.count - a.count).map((s) => (
              <div key={s.site} className="flex items-center justify-between text-[12px] gap-3">
                <span className="text-inkmid">{s.site}</span>
                <span className="font-data text-inkfaint">{s.count}</span>
              </div>
            ))}
          </div>
          {unplaceable.length > 0 && (
            <div className="mt-4 pt-3 border-t border-line">
              <div className="font-data text-[10px] text-inkfaint mb-1.5">not shown on the diagram:</div>
              {unplaceable.map((s) => (
                <div key={s.site} className="text-[11.5px] text-inkmid mb-1">
                  <span className="font-medium">{s.site}</span>
                  <span className="text-inkfaint"> ({s.count} studies) — {NON_PLACEABLE_NOTE[s.site] || 'not a placeable body location'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}
