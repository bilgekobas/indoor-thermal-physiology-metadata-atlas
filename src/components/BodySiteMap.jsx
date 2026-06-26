import { useMemo } from 'react'
import { useTooltip, TooltipPortal } from './Tooltip.jsx'

const TAX_W = 2048
const TAX_H = 2048

// Coordinates are normalized to the supplied anatomical taxonomy image
// (anterior body on the left, posterior body on the right). Each value was
// read directly off the labelled dots in that image (anatomical-taxonomy.jpg,
// 2048x2048px) rather than estimated, so markers line up with the actual
// numbered measurement points (e.g. "8AM" Chest, "5R" Earlobe) instead of a
// guessed silhouette position. Bilateral sites (e.g. "2AR"/"2AL" Temple) only
// have one labelled point on the chart used per category — left vs. right
// is arbitrary here since the dataset doesn't distinguish sides.
const SITE_COORDS = {
  'Forehead': [652 / TAX_W, 156 / TAX_H],   // 1AM
  'Temple': [734 / TAX_W, 199 / TAX_H],     // 2AL
  'Nose': [652 / TAX_W, 248 / TAX_H],       // 3AM
  'Cheek': [615 / TAX_W, 280 / TAX_H],      // 4AR
  'Ear': [1400 / TAX_W, 232 / TAX_H],       // mid-ear, just above 5R (earlobe)
  'Earlobe': [1400 / TAX_W, 281 / TAX_H],   // 5R

  'Neck': [603 / TAX_W, 360 / TAX_H],       // 6AR
  'Clavicle': [540 / TAX_W, 420 / TAX_H],   // 7AR
  'Chest': [648 / TAX_W, 509 / TAX_H],      // 8AM
  'Axilla': [484 / TAX_W, 539 / TAX_H],     // 10R
  'Abdomen': [648 / TAX_W, 782 / TAX_H],    // 13AM

  'Back': [1340 / TAX_W, 521 / TAX_H],      // 9PM
  'Lower back': [1340 / TAX_W, 760 / TAX_H],// 14PM (lumbar)
  'Buttocks': [1441 / TAX_W, 859 / TAX_H],  // 16PR
  'Sole': [1380 / TAX_W, 1700 / TAX_H],     // 24PR (plantar)

  'Upper arm': [478 / TAX_W, 580 / TAX_H],  // 11AR
  'Elbow': [476 / TAX_W, 700 / TAX_H],      // 12AR
  'Forearm': [420 / TAX_W, 808 / TAX_H],    // 15R
  'Wrist': [413 / TAX_W, 888 / TAX_H],      // 17R
  'Hand': [440 / TAX_W, 963 / TAX_H],       // 18AR
  'Finger': [365 / TAX_W, 1058 / TAX_H],    // 19AR

  'Thigh': [589 / TAX_W, 1120 / TAX_H],     // 20AR
  'Lower leg': [589 / TAX_W, 1420 / TAX_H], // 21AR (shin)
  'Ankle': [589 / TAX_W, 1605 / TAX_H],     // 22AR
  'Foot': [595 / TAX_W, 1690 / TAX_H],      // 23AR
}
// Sites that genuinely can't be pinned to one point on this taxonomy —
// either they're not a skin-surface location at all (sample types, core-
// temperature methods), or they're too generic to place without implying
// more precision than the source paper reported.
const NON_PLACEABLE_NOTE = {
  'Whole body': 'measured as a whole-body total, not a single point',
  'Urine': 'a sample type, not a body location',
  'Limbs': 'too unspecific to place (could be any limb)',
  'Arm': 'too unspecific to place (could be upper arm or forearm)',
  'Leg': 'too unspecific to place (could be thigh or lower leg)',
  'Head': 'too unspecific to place (could be any part of the head)',
  'Face': 'too unspecific to place (could be forehead, cheek, temple, or nose)',
  'Eye': 'not a labelled site on this taxonomy',
  'Mouth': 'an oral-region site, not part of this skin-site taxonomy',
  'Chin': 'not a labelled site on this taxonomy',
  'Shoulder': 'not a distinct labelled site on this taxonomy',
  'Waist': 'not a labelled site on this taxonomy',
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
