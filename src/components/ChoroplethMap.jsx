import { useState, useEffect, useMemo } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps'
import { geoCentroid } from 'd3-geo'
import { useTooltip, TooltipPortal } from './Tooltip.jsx'

export default function ChoroplethMap({ countryData, cityData, height = 380 }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const [geoData, setGeoData] = useState(null)
  const [view, setView] = useState({ coordinates: [10, 5], zoom: 1 })

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
    const t = Math.min(Math.log(count + 1) / Math.log(maxCount + 1), 1)
    const r1 = 239, g1 = 239, b1 = 239
    const r2 = 91, g2 = 91, b2 = 255
    const r = Math.round(r1 + (r2 - r1) * t)
    const g = Math.round(g1 + (g2 - g1) * t)
    const b = Math.round(b1 + (b2 - b1) * t)
    return `rgb(${r},${g},${b})`
  }

  const legendStops = [1, 2, 5, 10, 25, Math.round(maxCount)]
    .filter((v, i, arr) => v <= maxCount && arr.indexOf(v) === i)

  if (!geoData) {
    return <div className="font-data text-[12px] text-inkfaint" style={{ height }}>Loading map…</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <div className="font-data text-[10.5px] text-inkfaint">Use + / − to zoom. Country labels are shown for all study countries.</div>
        <div className="flex items-center gap-1.5">
          <button className="px-2 py-1 rounded bg-line/60 text-[11px] font-data hover:bg-line" onClick={() => setView((v) => ({ ...v, zoom: Math.min(v.zoom * 1.4, 8) }))}>+</button>
          <button className="px-2 py-1 rounded bg-line/60 text-[11px] font-data hover:bg-line" onClick={() => setView((v) => ({ ...v, zoom: Math.max(v.zoom / 1.4, 1) }))}>−</button>
          <button className="px-2 py-1 rounded bg-line/60 text-[11px] font-data hover:bg-line" onClick={() => setView({ coordinates: [10, 5], zoom: 1 })}>Reset</button>
        </div>
      </div>
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 130, center: [10, 5] }}
        width={800}
        height={height}
        style={{ width: '100%', height: 'auto' }}
      >
        <ZoomableGroup
          center={view.coordinates}
          zoom={view.zoom}
          onMoveEnd={(pos) => setView({ coordinates: pos.coordinates, zoom: pos.zoom })}
        >
          <Geographies geography={geoData}>
            {({ geographies }) => (
              <>
                {geographies.map((geo) => {
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
                        hover: { outline: 'none', filter: count ? 'brightness(1.08)' : 'none' },
                        pressed: { outline: 'none' },
                      }}
                    />
                  )
                })}
                {geographies
                  .filter((geo) => countByName[geo.properties.name]?.count > 0)
                  .map((geo) => {
                    const centroid = geoCentroid(geo)
                    if (!Number.isFinite(centroid[0]) || !Number.isFinite(centroid[1])) return null
                    const label = countByName[geo.properties.name]?.country || geo.properties.name
                    return (
                      <Marker key={`label-${geo.rsmKey}`} coordinates={centroid}>
                        <text
                          textAnchor="middle"
                          fontSize={7.5}
                          fill="#2F2F2F"
                          stroke="#FFFFFF"
                          strokeWidth={0.8}
                          paintOrder="stroke"
                          style={{ pointerEvents: 'none' }}
                        >
                          {label}
                        </text>
                      </Marker>
                    )
                  })}
              </>
            )}
          </Geographies>
        </ZoomableGroup>
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
