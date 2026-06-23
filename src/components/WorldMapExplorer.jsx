import { useState, useEffect, useMemo } from 'react'
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'
import { geoCentroid } from 'd3-geo'
import { useTooltip, TooltipPortal } from './Tooltip.jsx'

const CLIMATE_COLORS = {
  'Tropical': '#FB3640',
  'Arid (hot)': '#FB3640',
  'Semi-arid (hot)': '#FB3640',
  'Mediterranean': '#D5FF99',
  'Humid subtropical': '#5B5BFF',
  'Oceanic': '#C5FFFD',
  'Continental': '#8A8A8A',
  'Semi-arid (cold)': '#8A8A8A',
  'Subarctic': '#4A4A4A',
  'Polar': '#0A0A0A',
  'Other/Mixed': '#BBBBBB',
}
function climateColor(g) { return CLIMATE_COLORS[g] || '#BBBBBB' }

export default function WorldMapExplorer({ cityData, countryData, height = 430 }) {
  const { tip, showTip, moveTip, hideTip } = useTooltip()
  const [geoData, setGeoData] = useState(null)
  const [mode, setMode] = useState('city')
  const [view, setView] = useState({ coordinates: [10, 10], zoom: 1 })

  useEffect(() => {
    const base = import.meta.env.BASE_URL
    fetch(`${base}data/world-countries-110m.json`)
      .then((r) => r.json())
      .then(setGeoData)
      .catch(() => setGeoData(null))
  }, [])

  const countByAtlas = useMemo(() => {
    const m = {}
    ;(countryData || []).forEach((r) => { m[r.atlas_name] = r })
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

  const maxCountry = (countryData || []).reduce((m, r) => (r.count > m ? r.count : m), 1)
  const maxCity = (cityData || []).reduce((m, c) => (c.count > m ? c.count : m), 1)
  const countryColor = (count) => {
    if (!count) return '#F4F4F4'
    const t = Math.min(Math.log(count + 1) / Math.log(maxCountry + 1), 1)
    const r = Math.round(239 + (91 - 239) * t)
    const g = Math.round(239 + (91 - 239) * t)
    const b = Math.round(239 + (255 - 239) * t)
    return `rgb(${r},${g},${b})`
  }
  const radiusFor = (count) => 2.5 + Math.sqrt(count / Math.max(maxCity, 1)) * 11
  const climateGroups = [...new Set((cityData || []).map((c) => c.climate_group).filter(Boolean))]
  const legendStops = [1, 2, 5, 10, 25, Math.round(maxCountry)].filter((v, i, arr) => v <= maxCountry && arr.indexOf(v) === i)

  if (!geoData) return <div className="font-data text-[12px] text-inkfaint" style={{ height }}>Loading map…</div>

  return (
    <div>
      <div className="flex justify-between items-center gap-3 mb-3 flex-wrap">
        <div className="flex gap-1">
          {[
            { key: 'city', label: 'By city' },
            { key: 'country', label: 'By country' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setMode(t.key)}
              className={`px-3 py-1 rounded text-[11.5px] font-data transition-colors ${mode === t.key ? 'bg-ink text-paper' : 'bg-line/50 text-inkmid hover:bg-line'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button className="px-2 py-1 rounded bg-line/60 text-[11px] font-data hover:bg-line" onClick={() => setView((v) => ({ ...v, zoom: Math.min(v.zoom * 1.4, 8) }))}>+</button>
          <button className="px-2 py-1 rounded bg-line/60 text-[11px] font-data hover:bg-line" onClick={() => setView((v) => ({ ...v, zoom: Math.max(v.zoom / 1.4, 1) }))}>−</button>
          <button className="px-2 py-1 rounded bg-line/60 text-[11px] font-data hover:bg-line" onClick={() => setView({ coordinates: [10, 10], zoom: 1 })}>Reset</button>
        </div>
      </div>
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 135, center: [10, 5] }}
        width={900}
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
                  const entry = countByAtlas[geo.properties.name]
                  const count = entry?.count || 0
                  const climate = dominantClimateByCountry[entry?.country || geo.properties.name]
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={mode === 'country' ? countryColor(count) : '#F4F4F4'}
                      stroke="#DADADA"
                      strokeWidth={0.45}
                      className="cursor-default outline-none"
                      onMouseEnter={(e) => {
                        if (mode !== 'country') return
                        const place = entry ? entry.raw_labels.join(' + ') : geo.properties.name
                        const label = climate ? `${place}: ${count} ${count === 1 ? 'study' : 'studies'}, ${climate}` : `${place}: ${count} ${count === 1 ? 'study' : 'studies'}`
                        showTip(e, label)
                      }}
                      onMouseMove={moveTip}
                      onMouseLeave={hideTip}
                      style={{ default: { outline: 'none' }, hover: { outline: 'none', filter: mode === 'country' && count ? 'brightness(1.06)' : 'none' }, pressed: { outline: 'none' } }}
                    />
                  )
                })}
                {geographies.filter((geo) => countByAtlas[geo.properties.name]?.count > 0).map((geo) => {
                  const centroid = geoCentroid(geo)
                  const entry = countByAtlas[geo.properties.name]
                  if (!Number.isFinite(centroid[0]) || !Number.isFinite(centroid[1]) || !entry) return null
                  return (
                    <Marker key={`label-${geo.rsmKey}`} coordinates={centroid}>
                      <text textAnchor="middle" fontSize={7.5} fill="#333" stroke="#FFFFFF" strokeWidth={0.85} paintOrder="stroke" style={{ pointerEvents: 'none' }}>
                        {entry.country}
                      </text>
                    </Marker>
                  )
                })}
              </>
            )}
          </Geographies>
          {mode === 'city' && [...(cityData || [])].sort((a, b) => b.count - a.count).map((c) => (
            <Marker key={`${c.city}-${c.lat}-${c.lon}`} coordinates={[c.lon, c.lat]}>
              <circle
                r={radiusFor(c.count)}
                fill={climateColor(c.climate_group)}
                fillOpacity={0.76}
                stroke="#FCFCFC"
                strokeWidth={1}
                className="cursor-default hover:fill-opacity-100"
                onMouseEnter={(e) => {
                  const base = `${c.city}: ${c.count} ${c.count === 1 ? 'study' : 'studies'}, ${c.climate_group}`
                  const caveat = c.precision !== 'city' ? (c.precision === 'province' ? ' (province/state-level)' : c.precision === 'institute' ? ' (institution name)' : ' (one of several sites)') : ''
                  showTip(e, base + caveat)
                }}
                onMouseMove={moveTip}
                onMouseLeave={hideTip}
              />
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>
      {mode === 'city' ? (
        <div>
          <div className="flex flex-wrap gap-3 mt-3">
            {climateGroups.map((g) => (
              <div key={g} className="flex items-center gap-1.5 text-[11px] text-inkmid">
                <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ background: climateColor(g) }} />
                <span>{g}</span>
              </div>
            ))}
          </div>
          <div className="font-data text-[10px] text-inkfaint mt-2">Marker area ∝ study count and scales with zoom. Color = Köppen climate group at that city.</div>
        </div>
      ) : (
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className="font-data text-[10.5px] text-inkfaint">Studies by country (log scale):</span>
          {legendStops.map((v) => (
            <span key={v} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block border border-line" style={{ background: countryColor(v) }} />
              <span className="font-data text-[10.5px] text-inkmid">{v}</span>
            </span>
          ))}
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block border border-line" style={{ background: '#F4F4F4' }} /><span className="font-data text-[10.5px] text-inkmid">0</span></span>
        </div>
      )}
      <TooltipPortal tip={tip} />
    </div>
  )
}
