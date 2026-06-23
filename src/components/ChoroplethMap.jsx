import { useState, useEffect, useMemo } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { useTooltip, TooltipPortal } from './Tooltip.jsx'

// World choropleth for study counts by country. Loads the topojson once
// (bundled locally in public/data/, no external CDN dependency) and colors
// each country by its study count, blue accent ramp.
export default function ChoroplethMap({ countryData, cityData, height = 380 }) {
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

  // Dominant climate group per country, weighted by study count — a country
  // can genuinely span several Köppen zones (China alone has tropical,
  // humid-subtropical, continental, and semi-arid cities in this corpus),
  // so "the" climate for a whole country is a most-common summary, not a
  // single fact the way it is for one city.
  const dominantClimateByCountry = useMemo(() => {
    const byCountry = {}
    ;(cityData || []).forEach((c) => {
      if (!c.climate_group) return
      if (!byCountry[c.country]) byCountry[c.country] = {}
      byCountry[c.country][c.climate_group] = (byCountry[c.country][c.climate_group] || 0) + c.count
    })
    const result = {}
    Object.entries(byCountry).forEach(([country, groups]) => {
      result[country] = Object.entries(groups).sort((a, b) => b[1] - a[1])[0]?.[0]
    })
    return result
  }, [cityData])

  const maxCount = countryData.reduce((m, r) => (r.count > m ? r.count : m), 1)

  const colorFor = (count) => {
    if (!count) return '#EFEFEF'
    const t = Math.min(Math.log(count + 1) / Math.log(maxCount + 1), 1) // log scale: China shouldn't wash out everything else
    // Blue accent ramp: light track color -> primary blue
    const r1 = 239, g1 = 239, b1 = 239
    const r2 = 91, g2 = 91, b2 = 255
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
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 130, center: [10, 5] }}
        width={800}
        height={height}
        style={{ width: '100%', height: 'auto' }}
      >
        <Geographies geography={geoData}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const entry = countByName[geo.properties.name]
              const count = entry?.count || 0
              const climate = dominantClimateByCountry[geo.properties.name]
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={colorFor(count)}
                  stroke="#FCFCFC"
                  strokeWidth={0.5}
                  className="cursor-default outline-none"
                  onMouseEnter={(e) => {
                    const place = entry ? entry.raw_labels.join(' + ') : geo.properties.name
                    const label = climate
                      ? `${place}: ${count} ${count === 1 ? 'study' : 'studies'}, ${climate}`
                      : `${place}: ${count} ${count === 1 ? 'study' : 'studies'}`
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
          <span className="w-3 h-3 rounded-sm inline-block border border-line" style={{ background: '#EFEFEF' }} />
          <span className="font-data text-[10.5px] text-inkmid">0</span>
        </span>
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}
