import { useState, useEffect, useMemo } from 'react'
import { useTooltip, TooltipPortal } from './Tooltip.jsx'

// Coordinates are normalized to the full two-body SVG (front at left, back at right).
// Most sites are placed on the front silhouette; explicitly posterior sites are placed
// on the back silhouette and drawn with a dashed outline.
const SITE_COORDS = {
  'Forehead': [150.12 / 603.04, 34.63 / 742.93],
  'Face': [150.12 / 603.04, 76.53 / 742.93],
  'Neck': [150.42 / 603.04, 126.08 / 742.93],
  'Clavicle': [133.77 / 603.04, 126.08 / 742.93],
  'Chest': [150.26 / 603.04, 191.71 / 742.93],
  'Axilla': [113.59 / 603.04, 222.47 / 742.93],
  'Abdomen': [150.42 / 603.04, 312.05 / 742.93],
  'Waist': [150.42 / 603.04, 359.51 / 742.93],
  'Back': [422.25 / 603.04, 199.10 / 742.93],
  'Lower back': [422.25 / 603.04, 300.73 / 742.93],
  'Buttocks': [424.19 / 603.04, 459.67 / 742.93],
  'Shoulder': [72.50 / 603.04, 222.47 / 742.93],
  'Upper arm': [72.50 / 603.04, 277.26 / 742.93],
  'Elbow': [53.83 / 603.04, 359.51 / 742.93],
  'Forearm': [42.15 / 603.04, 392.82 / 742.93],
  'Wrist': [27.64 / 603.04, 433.89 / 742.93],
  'Hand': [42.15 / 603.04, 433.89 / 742.93],
  'Finger': [53.03 / 603.04, 323.85 / 742.93],
  'Thigh': [116.20 / 603.04, 459.67 / 742.93],
  'Lower leg': [116.73 / 603.04, 593.31 / 742.93],
  'Ankle': [127.16 / 603.04, 677.16 / 742.93],
  'Foot': [125.98 / 603.04, 710.17 / 742.93],
  'Sole': [438.30 / 603.04, 716.50 / 742.93],
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

  const radiusFor = (count) => 6 + Math.sqrt(count / maxCount) * 15

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
                    onMouseEnter={(e) => showTip(e, `${s.site}${isBack ? ' (back)' : ''}: ${s.count} studies (${pct}% of ${totalLabel.n})`)}
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
            Marker area ∝ study count. Dashed outline = posterior (back-of-body) site.
          </div>
          <div className="space-y-1">
            {[...placeable].sort((a, b) => b.count - a.count).map((s) => (
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
