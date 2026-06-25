import { useState, useEffect, useMemo } from 'react'
import { useTooltip, TooltipPortal } from './Tooltip.jsx'

// Coordinates are normalized to the full two-body SVG (front at left, back at right).
// Distinct sub-sites are kept distinct wherever the underlying dataset reports them.
const SITE_COORDS = {
  // front head / face
  'Head': [150.12 / 603.04, 28 / 742.93],
  'Forehead': [150.12 / 603.04, 42 / 742.93],
  'Temple': [132 / 603.04, 66 / 742.93],
  'Eye': [142 / 603.04, 68 / 742.93],
  'Ear': [113 / 603.04, 76 / 742.93],
  'Earlobe': [114 / 603.04, 90 / 742.93],
  'Cheek': [132 / 603.04, 86 / 742.93],
  'Nose': [150 / 603.04, 83 / 742.93],
  'Mouth': [150 / 603.04, 100 / 742.93],
  'Chin': [150 / 603.04, 112 / 742.93],
  'Face': [150.12 / 603.04, 82 / 742.93],

  // trunk
  'Neck': [150.42 / 603.04, 135 / 742.93],
  'Clavicle': [134 / 603.04, 154 / 742.93],
  'Shoulder': [91 / 603.04, 182 / 742.93],
  'Chest': [150.26 / 603.04, 225 / 742.93],
  'Axilla': [112 / 603.04, 214 / 742.93],
  'Abdomen': [150.42 / 603.04, 330 / 742.93],
  'Waist': [150.42 / 603.04, 374 / 742.93],

  // back silhouette
  'Back': [422.25 / 603.04, 230 / 742.93],
  'Lower back': [422.25 / 603.04, 334 / 742.93],
  'Buttocks': [424.19 / 603.04, 458 / 742.93],
  'Sole': [438.30 / 603.04, 722 / 742.93],

  // upper limb - left/front silhouette
  'Upper arm': [90 / 603.04, 272 / 742.93],
  'Arm': [74 / 603.04, 320 / 742.93],
  'Elbow': [63 / 603.04, 377 / 742.93],
  'Forearm': [53 / 603.04, 430 / 742.93],
  'Wrist': [46 / 603.04, 485 / 742.93],
  'Hand': [66 / 603.04, 515 / 742.93],
  'Finger': [73 / 603.04, 545 / 742.93],

  // lower limb - front silhouette
  'Thigh': [117 / 603.04, 505 / 742.93],
  'Leg': [116 / 603.04, 585 / 742.93],
  'Lower leg': [117 / 603.04, 622 / 742.93],
  'Ankle': [127 / 603.04, 688 / 742.93],
  'Foot': [126 / 603.04, 730 / 742.93],
}

const NON_PLACEABLE_NOTE = {
  'Whole body': 'measured as a whole-body total, not a single point',
  'Urine': 'a sample type, not a body location',
  'Limbs': 'too unspecific to place (could be any limb)',
}

export default function BodySiteMap({ siteData, totalLabel, color = '#5B5BFF', height = 620 }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const [svgMarkup, setSvgMarkup] = useState(null)

  useEffect(() => {
    const base = import.meta.env.BASE_URL
    fetch(`${base}images/man_silhouette.svg`)
      .then((r) => r.text())
      .then(setSvgMarkup)
      .catch(() => setSvgMarkup(null))
  }, [])

  const normalized = useMemo(() => siteData.map((s) => ({
    ...s,
    count: s.count ?? s.total ?? 0,
    non_anatomical: Boolean(s.non_anatomical),
  })), [siteData])

  const { placeable, unplaceable, maxCount } = useMemo(() => {
    const placeable = []
    const unplaceable = []
    normalized.forEach((s) => {
      if (s.non_anatomical || !SITE_COORDS[s.site]) {
        unplaceable.push(s)
      } else {
        placeable.push(s)
      }
    })
    const maxCount = placeable.reduce((m, s) => (s.count > m ? s.count : m), 1)
    return { placeable, unplaceable, maxCount }
  }, [normalized])

  const radiusFor = (count) => 6 + Math.sqrt(count / maxCount) * 15

  const VB_W = 603.04, VB_H = 742.93
  const displayHeight = Math.max(height, Math.min(820, 320 + normalized.length * 13))
  const renderW = displayHeight * (VB_W / VB_H)

  return (
    <div>
      <div className="flex gap-8 items-start">
        <div className="relative shrink-0" style={{ width: renderW, height: displayHeight }}>
          {svgMarkup ? (
            <div
              className="absolute inset-0 opacity-[0.16]"
              style={{ width: renderW, height: displayHeight }}
              dangerouslySetInnerHTML={{ __html: svgMarkup.replace('<svg', '<svg width="100%" height="100%"') }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-inkfaint text-[11px] font-data">
              Loading diagram…
            </div>
          )}
          <svg width={renderW} height={displayHeight} className="absolute inset-0 overflow-visible">
            {placeable.map((s) => {
              const [fx, fy] = SITE_COORDS[s.site]
              const cx = fx * renderW
              const cy = fy * displayHeight
              const pct = totalLabel?.n ? ((s.count / totalLabel.n) * 100).toFixed(0) : '0'
              return (
                <g key={s.site}>
                  <circle
                    cx={cx} cy={cy} r={radiusFor(s.count)}
                    fill={color} fillOpacity={0.65}
                    stroke="#FCFCFC" strokeWidth={1.5}
                    className="cursor-default hover:fill-opacity-90 transition-[fill-opacity]"
                    onMouseEnter={(e) => showTip(e, `${s.site}: ${s.count} studies (${pct}% of ${totalLabel.n})`)}
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
            Marker area ∝ study count.
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
