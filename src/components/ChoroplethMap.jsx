import { useState, useEffect, useMemo } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { useTooltip, TooltipPortal } from './Tooltip.jsx'

// World choropleth for study counts by country. Loads the topojson once
// (bundled locally in public/data/, no external CDN dependency) and colors
// each country by its study count using the corpus's peripheral-pink ramp.
export default function ChoroplethMap({ countryData, height = 380 }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const [geoData, setGeoData] = useState(null)

  useEffect(() => {
    const base = import.meta.env.BASE_URL
    fetch(`${base}data/world-countries-110m.json`)
      .then((r) => r.json())
      .then(setGeoData)
      .catch(() => setGeoData(null))
  }, [])

  const countByName = useMemo(() => {
    const m = {}
    countryData.forEach((r) => { m[r.atlas_name] = r })
    return m
  }, [countryData])

  const maxCount = countryData.reduce((m, r) => (r.count > m ? r.count : m), 1)

  const colorFor = (count) => {
    if (!count) return '#F1EDE6'
    const t = Math.min(Math.log(count + 1) / Math.log(maxCount + 1), 1) // log scale: China shouldn't wash out everything else
    const r1 = 241, g1 = 237, b1 = 230
    const r2 = 217, g2 = 79, b2 = 110
    const r = Math.round(r1 + (r2 - r1) * t)
    const g = Math.round(g1 + (g2 - g1) * t)
    const b = Math.round(b1 + (b2 - b1) * t)
    return `rgb(${r},${g},${b})`
  }

  if (!geoData) {
    return <div className="font-data text-[12px] text-inkfaint" style={{ height }}>Loading map…</div>
  }

  // Legend: shows the actual color ramp with real study-count values at each
  // stop, and states explicitly that the scale is logarithmic — without this,
  // there is no way for a reader to tell what a given shade of pink means, or
  // that the scale compresses high counts (chosen specifically so China's 149
  // studies don't make every other country render as indistinguishable pale).
  const legendStops = [1, 2, 5, 10, 25, Math.round(maxCount)]
    .filter((v, i, arr) => v <= maxCount && arr.indexOf(v) === i)

  return (
    <div>
      <ComposableMap projection="geoEqualEarth" width={800} height={height} style={{ width: '100%', height: 'auto' }}>
        <Geographies geography={geoData}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const entry = countByName[geo.properties.name]
              const count = entry?.count || 0
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={colorFor(count)}
                  stroke="#FAF8F4"
                  strokeWidth={0.5}
                  className="cursor-default outline-none"
                  onMouseEnter={(e) => {
                    const label = entry
                      ? `${entry.raw_labels.join(' + ')}: ${count} ${count === 1 ? 'study' : 'studies'}`
                      : `${geo.properties.name}: 0 studies`
                    showTip(e, label)
                  }}
                  onMouseMove={moveTip}
                  onMouseLeave={hideTip}
                  style={{
                    default: { outline: 'none' },
                    hover: { outline: 'none', filter: count ? 'brightness(1.1)' : 'none' },
                    pressed: { outline: 'none' },
                  }}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        <span className="font-data text-[10.5px] text-inkfaint">Studies (log scale):</span>
        {legendStops.map((v) => (
          <span key={v} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block border border-line" style={{ background: colorFor(v) }} />
            <span className="font-data text-[10.5px] text-inkmid">{v}</span>
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block border border-line" style={{ background: '#F1EDE6' }} />
          <span className="font-data text-[10.5px] text-inkmid">0</span>
        </span>
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}
