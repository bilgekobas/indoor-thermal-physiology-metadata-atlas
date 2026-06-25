import { useState, useEffect, useMemo } from 'react'
import { useTooltip, TooltipPortal } from './Tooltip.jsx'

// Coordinates are normalized to the full two-body SVG (front at left, back at right).
// Distinct sub-sites are kept distinct wherever the underlying dataset reports them.
const SITE_COORDS = {
  // Coordinates normalized to the two-body silhouette. Front/anterior body is left; back/posterior body is right.
  'Head': [150 / 603.04, 46 / 742.93],
  'Forehead': [150 / 603.04, 50 / 742.93],
  'Temple': [128 / 603.04, 70 / 742.93],
  'Eye': [140 / 603.04, 72 / 742.93],
  'Ear': [113 / 603.04, 78 / 742.93],
  'Earlobe': [116 / 603.04, 95 / 742.93],
  'Cheek': [132 / 603.04, 91 / 742.93],
  'Nose': [150 / 603.04, 86 / 742.93],
  'Mouth': [150 / 603.04, 105 / 742.93],
  'Chin': [150 / 603.04, 118 / 742.93],
  'Face': [150 / 603.04, 88 / 742.93],

  'Neck': [150 / 603.04, 142 / 742.93],
  'Clavicle': [132 / 603.04, 160 / 742.93],
  'Shoulder': [93 / 603.04, 185 / 742.93],
  'Chest': [150 / 603.04, 228 / 742.93],
  'Axilla': [106 / 603.04, 227 / 742.93],
  'Abdomen': [150 / 603.04, 330 / 742.93],
  'Waist': [150 / 603.04, 372 / 742.93],

  'Back': [423 / 603.04, 238 / 742.93],
  'Lower back': [423 / 603.04, 350 / 742.93],
  'Buttocks': [423 / 603.04, 460 / 742.93],
  'Sole': [438 / 603.04, 722 / 742.93],

  'Upper arm': [94 / 603.04, 270 / 742.93],
  'Arm': [75 / 603.04, 325 / 742.93],
  'Elbow': [63 / 603.04, 375 / 742.93],
  'Forearm': [54 / 603.04, 432 / 742.93],
  'Wrist': [48 / 603.04, 488 / 742.93],
  'Hand': [67 / 603.04, 520 / 742.93],
  'Finger': [72 / 603.04, 550 / 742.93],

  'Thigh': [118 / 603.04, 512 / 742.93],
  'Leg': [118 / 603.04, 590 / 742.93],
  'Lower leg': [118 / 603.04, 632 / 742.93],
  'Ankle': [128 / 603.04, 692 / 742.93],
  'Foot': [127 / 603.04, 722 / 742.93],
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
  const displayHeight = height
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
