import { useMemo } from 'react'
import { useTooltip, TooltipPortal } from './Tooltip.jsx'

// Coordinates are normalized to the full two-body SVG (front at left, back at right).
// Distinct sub-sites are kept distinct wherever the underlying dataset reports them.
const TAX_W = 2048
const TAX_H = 2048

// Coordinates are normalized to the supplied anatomical taxonomy image
// (anterior body on the left, posterior body on the right). Aggregated
// categories are placed on the corresponding labelled taxonomy point or, when
// the category spans bilateral/surface-specific subpoints, at the centroid of
// the relevant labelled region.
const SITE_COORDS = {
  'Head': [650 / TAX_W, 115 / TAX_H],
  'Forehead': [650 / TAX_W, 150 / TAX_H],
  'Temple': [592 / TAX_W, 195 / TAX_H],
  'Eye': [650 / TAX_W, 213 / TAX_H],
  'Ear': [562 / TAX_W, 225 / TAX_H],
  'Earlobe': [1168 / TAX_W, 220 / TAX_H],
  'Cheek': [625 / TAX_W, 265 / TAX_H],
  'Nose': [650 / TAX_W, 240 / TAX_H],
  'Mouth': [650 / TAX_W, 305 / TAX_H],
  'Chin': [650 / TAX_W, 330 / TAX_H],
  'Face': [650 / TAX_W, 250 / TAX_H],

  'Neck': [650 / TAX_W, 370 / TAX_H],
  'Clavicle': [585 / TAX_W, 425 / TAX_H],
  'Shoulder': [560 / TAX_W, 475 / TAX_H],
  'Chest': [650 / TAX_W, 555 / TAX_H],
  'Axilla': [510 / TAX_W, 608 / TAX_H],
  'Abdomen': [650 / TAX_W, 805 / TAX_H],
  'Waist': [650 / TAX_W, 875 / TAX_H],

  'Back': [1360 / TAX_W, 555 / TAX_H],
  'Lower back': [1360 / TAX_W, 805 / TAX_H],
  'Buttocks': [1360 / TAX_W, 900 / TAX_H],
  'Sole': [1370 / TAX_W, 1895 / TAX_H],

  'Upper arm': [480 / TAX_W, 650 / TAX_H],
  'Arm': [480 / TAX_W, 740 / TAX_H],
  'Elbow': [500 / TAX_W, 805 / TAX_H],
  'Forearm': [505 / TAX_W, 925 / TAX_H],
  'Wrist': [430 / TAX_W, 995 / TAX_H],
  'Hand': [430 / TAX_W, 1080 / TAX_H],
  'Finger': [430 / TAX_W, 1185 / TAX_H],

  'Thigh': [650 / TAX_W, 1250 / TAX_H],
  'Leg': [650 / TAX_W, 1430 / TAX_H],
  'Lower leg': [620 / TAX_W, 1535 / TAX_H],
  'Ankle': [620 / TAX_W, 1780 / TAX_H],
  'Foot': [620 / TAX_W, 1905 / TAX_H],
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
  const taxonomySrc = `${import.meta.env.BASE_URL}images/anatomical-taxonomy.jpg`

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

  const mapSize = Math.min(height, 690)

  return (
    <div>
      <div className="flex gap-6 items-start">
        <div className="shrink-0" style={{ width: mapSize, height: mapSize }}>
          <svg
            width={mapSize}
            height={mapSize}
            viewBox={`0 0 ${TAX_W} ${TAX_H}`}
            preserveAspectRatio="xMidYMid meet"
            className="block overflow-visible"
          >
            <image
              href={taxonomySrc}
              x={0}
              y={0}
              width={TAX_W}
              height={TAX_H}
              opacity={0.24}
              preserveAspectRatio="xMidYMid meet"
            />
            {placeable.map((s) => {
              const [fx, fy] = SITE_COORDS[s.site]
              const cx = fx * TAX_W
              const cy = fy * TAX_H
              const r = 18 + Math.sqrt(s.count / maxCount) * 46
              const pct = totalLabel?.n ? ((s.count / totalLabel.n) * 100).toFixed(0) : '0'
              return (
                <g key={s.site}>
                  <circle
                    cx={cx} cy={cy} r={r}
                    fill={color} fillOpacity={0.68}
                    stroke="#FCFCFC" strokeWidth={5}
                    className="cursor-default hover:fill-opacity-90 transition-[fill-opacity]"
                    onMouseEnter={(e) => showTip(e, `${s.site}: ${s.count} studies (${pct}% of ${totalLabel.n})`)}
                    onMouseMove={moveTip}
                    onMouseLeave={hideTip}
                  />
                  <text x={cx} y={cy + 11} fontSize={28} fill="#FCFCFC" textAnchor="middle" className="pointer-events-none font-data font-medium">
                    {s.count}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        <div className="w-64 shrink-0 pt-2">
          <div className="font-data text-[10px] text-inkfaint mb-3">
            Marker area ∝ study count. Table values use count (% of parent signal).
          </div>
          <div className="space-y-1">
            {[...placeable].sort((a, b) => b.count - a.count).map((s) => (
              <div key={s.site} className="grid grid-cols-[1fr_auto] items-baseline gap-4 text-[12px]">
                <span className="text-inkmid whitespace-nowrap">{s.site}</span>
                <span className="font-data text-inkfaint whitespace-nowrap tabular-nums">{s.count} ({totalLabel?.n ? ((s.count / totalLabel.n) * 100).toFixed(0) : 0}%)</span>
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
