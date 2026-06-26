import { useState, useEffect, useMemo } from 'react'
import { useTooltip, TooltipPortal } from './Tooltip.jsx'

// Coordinates are normalized to the full two-body SVG (front at left, back at right).
// Distinct sub-sites are kept distinct wherever the underlying dataset reports them.
const SITE_COORDS = {
  // Coordinates normalized to the two-body silhouette viewBox (603.04 × 742.93).
  // These are anchored to the anatomical taxonomy supplied for the atlas:
  // anterior/front body on the left, posterior/back body on the right. The aim is
  // not to show every bilateral sub-point separately; it is to place the aggregate
  // table categories at their anatomical region centroids.
  'Head': [150 / 603.04, 37 / 742.93],
  'Forehead': [150 / 603.04, 40 / 742.93],
  'Temple': [126 / 603.04, 72 / 742.93],
  'Eye': [140 / 603.04, 76 / 742.93],
  'Ear': [112 / 603.04, 78 / 742.93],
  'Earlobe': [112 / 603.04, 96 / 742.93],
  'Cheek': [135 / 603.04, 96 / 742.93],
  'Nose': [150 / 603.04, 86 / 742.93],
  'Mouth': [150 / 603.04, 105 / 742.93],
  'Chin': [150 / 603.04, 121 / 742.93],
  'Face': [150 / 603.04, 88 / 742.93],

  'Neck': [150 / 603.04, 148 / 742.93],
  'Clavicle': [116 / 603.04, 170 / 742.93],
  'Shoulder': [96 / 603.04, 185 / 742.93],
  'Chest': [150 / 603.04, 218 / 742.93],
  'Axilla': [98 / 603.04, 235 / 742.93],
  'Abdomen': [150 / 603.04, 324 / 742.93],
  'Waist': [150 / 603.04, 360 / 742.93],

  'Back': [430 / 603.04, 220 / 742.93],
  'Lower back': [430 / 603.04, 345 / 742.93],
  'Buttocks': [430 / 603.04, 386 / 742.93],
  'Sole': [438 / 603.04, 722 / 742.93],

  'Upper arm': [76 / 603.04, 258 / 742.93],
  'Arm': [72 / 603.04, 310 / 742.93],
  'Elbow': [56 / 603.04, 351 / 742.93],
  'Forearm': [62 / 603.04, 420 / 742.93],
  'Wrist': [58 / 603.04, 478 / 742.93],
  'Hand': [72 / 603.04, 516 / 742.93],
  'Finger': [74 / 603.04, 548 / 742.93],

  'Thigh': [150 / 603.04, 478 / 742.93],
  'Leg': [150 / 603.04, 565 / 742.93],
  'Lower leg': [150 / 603.04, 628 / 742.93],
  'Ankle': [143 / 603.04, 690 / 742.93],
  'Foot': [137 / 603.04, 720 / 742.93],
}
const NON_PLACEABLE_NOTE = {
  'Whole body': 'measured as a whole-body total, not a single point',
  'Urine': 'a sample type, not a body location',
  'Limbs': 'too unspecific to place (could be any limb)',
}

const SITE_ALIASES = {
  'lowerback': 'Lower back',
  'lower back': 'Lower back',
  'lowerleg': 'Lower leg',
  'lower leg': 'Lower leg',
  'upperarm': 'Upper arm',
  'upper arm': 'Upper arm',
  'heart rate chest': 'Chest',
}

function canonicalSite(site) {
  const raw = String(site || '').trim()
  return SITE_ALIASES[raw.toLowerCase()] || raw
}

export default function BodySiteMap({ siteData, totalLabel, color = '#5B5BFF', height = 760 }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const [svgMarkup, setSvgMarkup] = useState(null)

  useEffect(() => {
    const base = import.meta.env.BASE_URL
    fetch(`${base}images/man_silhouette.svg`)
      .then((r) => r.text())
      .then(setSvgMarkup)
      .catch(() => setSvgMarkup(null))
  }, [])

  const normalized = useMemo(() => siteData.map((s) => {
    const site = canonicalSite(s.site)
    return {
      ...s,
      site,
      count: s.count ?? s.total ?? 0,
      non_anatomical: Boolean(s.non_anatomical),
    }
  }), [siteData])

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
      <div className="flex gap-6 items-start">
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
            Marker area ∝ study count. Table values use count (% of parent signal).
          </div>
          <div className="space-y-1">
            {[...placeable].sort((a, b) => b.count - a.count).map((s) => (
              <div key={s.site} className="flex items-center justify-between text-[12px] gap-3">
                <span className="text-inkmid">{s.site}</span>
                <span className="font-data text-inkfaint">{s.count} ({totalLabel?.n ? ((s.count / totalLabel.n) * 100).toFixed(0) : 0}%)</span>
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
