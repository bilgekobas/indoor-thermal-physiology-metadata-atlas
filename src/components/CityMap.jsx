import { useState, useEffect } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import { useTooltip, TooltipPortal } from './Tooltip.jsx'

// City-level point map: one marker per resolved city, sized by study count
// and colored by Köppen climate group (the same grouping used in Chapter 1's
// climate-vs-temperature chart, so colors mean the same thing across the site).
// Country polygons render as a faint grey basemap purely for geographic context.
const CLIMATE_COLORS = {
  'Tropical': '#D94F6E', 'Arid (hot)': '#E07820', 'Semi-arid (hot)': '#E0A020',
  'Mediterranean': '#B8C020', 'Humid subtropical': '#4855C8', 'Oceanic': '#6E8FD9',
  'Continental': '#8A8A86', 'Semi-arid (cold)': '#A8A59C', 'Subarctic': '#5F5E58',
  'Polar': '#3A3A38', 'Other/Mixed': '#C9C6BC',
}
function climateColor(g) { return CLIMATE_COLORS[g] || '#BBBBBB' }

export default function CityMap({ cityData, height = 420 }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const [geoData, setGeoData] = useState(null)

  useEffect(() => {
    const base = import.meta.env.BASE_URL
    fetch(`${base}data/world-countries-110m.json`)
      .then((r) => r.json())
      .then(setGeoData)
      .catch(() => setGeoData(null))
  }, [])

  const maxCount = cityData.reduce((m, c) => (c.count > m ? c.count : m), 1)
  // sqrt scaling so marker AREA (not radius) is proportional to count —
  // otherwise a 10x study count looks like a 10x bigger circle, which
  // visually overstates the difference
  const radiusFor = (count) => 2.5 + Math.sqrt(count / maxCount) * 11

  const climateGroups = [...new Set(cityData.map((c) => c.climate_group).filter(Boolean))]

  if (!geoData) {
    return <div className="font-data text-[12px] text-inkfaint" style={{ height }}>Loading map…</div>
  }

  return (
    <div>
      <ComposableMap projection="geoEqualEarth" width={800} height={height} style={{ width: '100%', height: 'auto' }}>
        <Geographies geography={geoData}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#F1EDE6"
                stroke="#E2DED4"
                strokeWidth={0.5}
                className="outline-none"
                style={{ default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }}
              />
            ))
          }
        </Geographies>
        {[...cityData].sort((a, b) => b.count - a.count).map((c) => (
          <Marker key={`${c.city}-${c.lat}-${c.lon}`} coordinates={[c.lon, c.lat]}>
            <circle
              r={radiusFor(c.count)}
              fill={climateColor(c.climate_group)}
              fillOpacity={0.75}
              stroke="#FAF8F4"
              strokeWidth={1}
              className="cursor-default hover:fill-opacity-100"
              onMouseEnter={(e) =>
                showTip(
                  e,
                  `${c.city}, ${c.country}: ${c.count} ${c.count === 1 ? 'study' : 'studies'} · ${c.climate_class} (${c.climate_group})` +
                    (c.precision !== 'city' ? ` — ${c.precision === 'province' ? 'province/state-level location only' : c.precision === 'institute' ? 'institution name resolved to its host city' : 'one of several sites for this study'}` : '')
                )
              }
              onMouseMove={moveTip}
              onMouseLeave={hideTip}
            />
          </Marker>
        ))}
      </ComposableMap>
      <div className="flex flex-wrap gap-3 mt-3">
        {climateGroups.map((g) => (
          <div key={g} className="flex items-center gap-1.5 text-[11px] text-inkmid">
            <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ background: climateColor(g) }} />
            <span>{g}</span>
          </div>
        ))}
      </div>
      <div className="font-data text-[10px] text-inkfaint mt-2">
        Marker area ∝ study count (sqrt-scaled). Color = Köppen climate group at that city.
      </div>
      <TooltipPortal tip={tip} />
    </div>
  )
}
