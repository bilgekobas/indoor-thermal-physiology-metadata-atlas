import { useMemo, useState } from 'react'
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
  'Foot (plantar)': [1380 / TAX_W, 1700 / TAX_H], // 24PR, posterior panel, explicitly labelled PLANTAR
  'Waist': [721 / TAX_W, 786 / TAX_H],      // 13AL, lateral to Abdomen (13AM)

  'Upper arm': [478 / TAX_W, 580 / TAX_H],  // 11AR
  'Elbow': [476 / TAX_W, 700 / TAX_H],      // 12AR
  'Forearm': [420 / TAX_W, 808 / TAX_H],    // 15R
  'Wrist': [413 / TAX_W, 888 / TAX_H],      // 17R
  'Hand (palmar)': [440 / TAX_W, 963 / TAX_H], // 18AR, anterior panel = palm-facing
  'Hand (dorsal)': [1589 / TAX_W, 969 / TAX_H], // 18PR, posterior panel = back-of-hand
  'Finger': [365 / TAX_W, 1058 / TAX_H],    // 19AR

  'Thigh': [589 / TAX_W, 1120 / TAX_H],     // 20AR
  'Lower leg': [589 / TAX_W, 1420 / TAX_H], // 21AR (shin)
  'Ankle': [589 / TAX_W, 1605 / TAX_H],     // 22AR
  'Foot (dorsal)': [595 / TAX_W, 1690 / TAX_H], // 23AR, anterior panel = top-of-foot
}
// Sites below were NOT part of the taxonomy's own numbered sensor-placement
// points — they're specific enough to place, but there's no labelled dot to
// read pixel coordinates from, so these are estimated relative to the
// nearest sourced points above (e.g. Mouth sits between the sourced Nose and
// Cheek/jaw line). Kept separate from SITE_COORDS to make that distinction
// visible in code, even though they render identically on the map.
const SITE_COORDS_ESTIMATED = {
  'Eye': [660 / TAX_W, 205 / TAX_H],      // between Forehead (1AM) and Nose (3AM)
  'Mouth': [652 / TAX_W, 292 / TAX_H],    // below Nose (3AM), above chin line
  'Chin': [652 / TAX_W, 325 / TAX_H],     // below Mouth estimate
  'Shoulder': [460 / TAX_W, 460 / TAX_H], // lateral to Clavicle (7AR), above Axilla (10R)
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
  'Hand (surface not reported)': "measured on the hand, but whether it's the back (dorsal) or palm side isn't specified in the source paper",
  'Foot (surface not reported)': "measured on the foot, but whether it's the top (dorsal) or sole side isn't specified in the source paper",
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


const SENSOR_PALETTE = [
  '#5B5BFF', '#E76F51', '#2A9D8F', '#E9C46A', '#8E63CE',
  '#F4A261', '#3A86FF', '#D45087', '#4D908E', '#90BE6D',
]

function sensorEntries(row) {
  const source = row.sensingMethods ?? row.sensing_methods ?? row.by_sensing_method ?? row['physio-sensing-method'] ?? row.sensors ?? row.sensor_types ?? row.sensorTypes ?? row.by_sensor ?? row.bySensor
  if (!source) return []

  if (Array.isArray(source)) {
    return source
      .map((d) => ({
        sensor: String(d.sensing_method ?? d.method ?? d.sensor ?? d.type ?? d.name ?? '').trim(),
        count: Number(d.count ?? d.total ?? d.n ?? 0),
      }))
      .filter((d) => d.sensor && d.count > 0)
  }

  return Object.entries(source)
    .map(([sensor, value]) => ({
      sensor: String(sensor).trim(),
      count: Number(typeof value === 'object' ? (value.count ?? value.total ?? value.n ?? 0) : value),
    }))
    .filter((d) => d.sensor && d.count > 0)
}

function piePath(cx, cy, r, startAngle, endAngle) {
  const polar = (angle) => ({
    x: cx + r * Math.cos(angle - Math.PI / 2),
    y: cy + r * Math.sin(angle - Math.PI / 2),
  })
  const start = polar(endAngle)
  const end = polar(startAngle)
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`
}

function canonicalSite(site) {
  const raw = String(site || '').trim()
  return SITE_ALIASES[raw.toLowerCase()] || raw
}

export default function BodySiteMap({ siteData, totalLabel, color = '#5B5BFF', height = 760, sensingMethodColors = {}, sensorColors = {} }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const [activeSensor, setActiveSensor] = useState('all')
  const taxonomySrc = `${import.meta.env.BASE_URL}images/anatomical-taxonomy.jpg`

  const normalized = useMemo(() => siteData.map((s) => {
    const site = canonicalSite(s.site)
    const sensors = sensorEntries(s)
    const sensorTotal = sensors.reduce((sum, d) => sum + d.count, 0)
    return {
      ...s,
      site,
      sensors,
      count: Number(s.count ?? s.total ?? sensorTotal ?? 0),
      non_anatomical: Boolean(s.non_anatomical),
    }
  }), [siteData])

  const sensorNames = useMemo(() => {
    const names = new Set()
    normalized.forEach((s) => s.sensors.forEach((d) => names.add(d.sensor)))
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [normalized])

  const sensorColorMap = useMemo(() => Object.fromEntries(
    sensorNames.map((name, i) => [name, sensingMethodColors[name] || sensorColors[name] || SENSOR_PALETTE[i % SENSOR_PALETTE.length]])
  ), [sensorNames, sensingMethodColors, sensorColors])

  const filtered = useMemo(() => normalized.map((s) => {
    if (activeSensor === 'all') return s
    const count = s.sensors.find((d) => d.sensor === activeSensor)?.count ?? 0
    return { ...s, count }
  }).filter((s) => s.count > 0), [normalized, activeSensor])

  const { placeable, unplaceable, maxCount } = useMemo(() => {
    const placeable = []
    const unplaceable = []
    filtered.forEach((s) => {
      if (SITE_COORDS[s.site]) {
        placeable.push({ ...s, estimated: false })
      } else if (SITE_COORDS_ESTIMATED[s.site]) {
        placeable.push({ ...s, estimated: true })
      } else {
        unplaceable.push(s)
      }
    })
    const maxCount = placeable.reduce((m, s) => (s.count > m ? s.count : m), 1)
    return { placeable, unplaceable, maxCount }
  }, [filtered])

  const SCALE = 1.1
  const mapSize = Math.min(height, 690) * SCALE
  const hasSensorBreakdown = sensorNames.length > 0
  const activeColor = activeSensor === 'all' ? color : sensorColorMap[activeSensor]

  return (
    <div>
      {hasSensorBreakdown && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSensor('all')}
            className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${activeSensor === 'all' ? 'border-ink bg-ink text-paper' : 'border-line text-inkmid hover:border-inkfaint'}`}
          >
            All sensing methods
          </button>
          {sensorNames.map((sensor) => (
            <button
              key={sensor}
              type="button"
              onClick={() => setActiveSensor(sensor)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-colors ${activeSensor === sensor ? 'border-ink bg-ink text-paper' : 'border-line text-inkmid hover:border-inkfaint'}`}
            >
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: sensorColorMap[sensor] }} />
              {sensor}
            </button>
          ))}
        </div>
      )}

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
              const [fx, fy] = s.estimated ? SITE_COORDS_ESTIMATED[s.site] : SITE_COORDS[s.site]
              const cx = fx * TAX_W
              const cy = fy * TAX_H
              const r = 18 + Math.sqrt(s.count / maxCount) * 46
              const pct = totalLabel?.n ? ((s.count / totalLabel.n) * 100).toFixed(0) : '0'
              const slices = activeSensor === 'all' ? s.sensors.filter((d) => d.count > 0) : []
              const sliceTotal = slices.reduce((sum, d) => sum + d.count, 0)
              const sensorDetail = slices.length
                ? slices.map((d) => `${d.sensor}: ${d.count}`).join(' · ')
                : activeSensor !== 'all' ? activeSensor : ''
              const tipText = `${s.site}: ${s.count} studies (${pct}% of ${totalLabel?.n ?? 0})${sensorDetail ? ` — ${sensorDetail}` : ''}${s.estimated ? ' — position estimated, not a labelled point on the taxonomy' : ''}`

              let angle = 0
              return (
                <g
                  key={s.site}
                  className="cursor-default"
                  onMouseEnter={(e) => showTip(e, tipText)}
                  onMouseMove={moveTip}
                  onMouseLeave={hideTip}
                >
                  {activeSensor === 'all' && sliceTotal > 0 ? (
                    <>
                      {slices.map((slice) => {
                        const startAngle = angle
                        const endAngle = angle + (slice.count / sliceTotal) * Math.PI * 2
                        angle = endAngle
                        return (
                          <path
                            key={slice.sensor}
                            d={piePath(cx, cy, r, startAngle, endAngle)}
                            fill={sensorColorMap[slice.sensor]}
                            fillOpacity={0.82}
                          />
                        )
                      })}
                      <circle
                        cx={cx} cy={cy} r={r}
                        fill="none"
                        stroke="#FCFCFC" strokeWidth={5}
                        strokeDasharray={s.estimated ? '10 6' : undefined}
                      />
                    </>
                  ) : (
                    <circle
                      cx={cx} cy={cy} r={r}
                      fill={activeColor} fillOpacity={0.68}
                      stroke="#FCFCFC" strokeWidth={5}
                      strokeDasharray={s.estimated ? '10 6' : undefined}
                      className="hover:fill-opacity-90 transition-[fill-opacity]"
                    />
                  )}
                  <text x={cx} y={cy + 11} fontSize={28} fill="#FCFCFC" stroke="rgba(0,0,0,0.2)" strokeWidth={2} paintOrder="stroke" textAnchor="middle" className="pointer-events-none font-data font-medium">
                    {s.count}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        <div className="w-64 shrink-0 pt-2">
          <div className="font-data text-[10px] text-inkfaint mb-3">
            Marker area ∝ study count. {hasSensorBreakdown && activeSensor === 'all' ? 'Pie slices show sensing-method composition.' : 'Table values use count (% of parent signal).'}
          </div>
          {hasSensorBreakdown && activeSensor === 'all' && (
            <div className="mb-3 space-y-1">
              {sensorNames.map((sensor) => (
                <div key={sensor} className="flex items-center gap-1.5 text-[10px] text-inkfaint">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: sensorColorMap[sensor] }} />
                  {sensor}
                </div>
              ))}
            </div>
          )}
          {placeable.some((s) => s.estimated) && (
            <div className="font-data text-[10px] text-inkfaint mb-3 flex items-center gap-1.5">
              <svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="none" stroke={activeColor} strokeWidth="1.5" strokeDasharray="3 2" /></svg>
              dashed outline = position estimated (not a labelled taxonomy point)
            </div>
          )}
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
