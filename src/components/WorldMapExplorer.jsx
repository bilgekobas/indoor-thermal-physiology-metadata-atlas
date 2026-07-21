import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, GeoJSON, Tooltip as LeafletTooltip, useMap, useMapEvents } from 'react-leaflet'
import * as topojson from 'topojson-client'

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

const INITIAL_ZOOM = 2

// CartoDB Positron: a light basemap that already bakes in country and city
// name labels, so we get real geography (coastlines, borders, place names)
// for free instead of drawing a flat vector silhouette ourselves.
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

// Tracks the current zoom level so city marker radii can grow/shrink with
// it -- Leaflet's CircleMarker radius is a fixed pixel size by default and
// does not change on its own when the user zooms in or out.
function useCurrentZoom(initial) {
  const [zoom, setZoom] = useState(initial)
  useMapEvents({ zoom: (e) => setZoom(e.target.getZoom()) })
  return zoom
}

function CityMarkers({ cityData }) {
  const zoom = useCurrentZoom(INITIAL_ZOOM)
  const maxCity = (cityData || []).reduce((m, c) => (c.count > m ? c.count : m), 1)
  const baseRadiusFor = (count) => 2.5 + Math.sqrt(count / Math.max(maxCity, 1)) * 11
  // Grows/shrinks with zoom (clamped) so nearby cities separate visually
  // once you zoom into a dense cluster, without single markers becoming
  // either illegibly tiny or absurdly oversized at the extremes.
  const zoomScale = Math.min(Math.max(Math.pow(1.22, zoom - INITIAL_ZOOM), 0.55), 3.2)

  return (
    <>
      {[...(cityData || [])].sort((a, b) => b.count - a.count).map((c) => {
        const caveat = c.precision !== 'city'
          ? (c.precision === 'province' ? ' (province/state-level)' : c.precision === 'institute' ? ' (institution name)' : ' (one of several sites)')
          : ''
        return (
          <CircleMarker
            key={`${c.city}-${c.lat}-${c.lon}`}
            center={[c.lat, c.lon]}
            radius={baseRadiusFor(c.count) * zoomScale}
            pathOptions={{
              fillColor: climateColor(c.climate_group),
              fillOpacity: 0.76,
              color: '#FCFCFC',
              weight: 1,
            }}
          >
            <LeafletTooltip direction="top" offset={[0, -4]} opacity={0.95}>
              {c.city}: {c.count} {c.count === 1 ? 'study' : 'studies'}, {c.climate_group}{caveat}
            </LeafletTooltip>
          </CircleMarker>
        )
      })}
    </>
  )
}

export default function WorldMapExplorer({ cityData, countryData, height = 460 }) {
  const [geoData, setGeoData] = useState(null)
  const [mode, setMode] = useState('city')

  useEffect(() => {
    const base = import.meta.env.BASE_URL
    fetch(`${base}data/world-countries-110m.json`)
      .then((r) => r.json())
      .then(setGeoData)
      .catch(() => setGeoData(null))
  }, [])

  const countryGeoJSON = useMemo(() => {
    if (!geoData) return null
    return topojson.feature(geoData, geoData.objects.countries)
  }, [geoData])

  const countByAtlas = useMemo(() => {
    const m = {}
    ;(countryData || []).forEach((r) => { m[r.atlas_name] = r })
    return m
  }, [countryData])

  const maxCountry = (countryData || []).reduce((m, r) => (r.count > m ? r.count : m), 1)
  const countryColor = (count) => {
    if (!count) return null
    const t = Math.min(Math.log(count + 1) / Math.log(maxCountry + 1), 1)
    const r = Math.round(239 + (91 - 239) * t)
    const g = Math.round(239 + (91 - 239) * t)
    const b = Math.round(239 + (255 - 239) * t)
    return `rgb(${r},${g},${b})`
  }
  const climateGroups = [...new Set((cityData || []).map((c) => c.climate_group).filter(Boolean))]
  const legendStops = [1, 2, 5, 10, 25, Math.round(maxCountry)].filter((v, i, arr) => v <= maxCountry && arr.indexOf(v) === i)

  const countryStyle = (feature) => {
    const entry = countByAtlas[feature.properties.name]
    const count = entry?.count || 0
    const fill = countryColor(count)
    return {
      fillColor: fill || '#F4F4F4',
      fillOpacity: fill ? 0.72 : 0.15,
      color: '#B9B9B9',
      weight: 0.6,
    }
  }

  const onEachCountry = (feature, layer) => {
    const entry = countByAtlas[feature.properties.name]
    const count = entry?.count || 0
    const place = entry ? entry.raw_labels.join(' + ') : feature.properties.name
    layer.bindTooltip(`${place}: ${count} ${count === 1 ? 'study' : 'studies'}`, { sticky: true })
  }

  const resetCenter = [15, 10]

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
      </div>
      <div className="relative overflow-hidden border border-line/40 rounded-sm" style={{ height }}>
        {!geoData ? (
          <div className="font-data text-[12px] text-inkfaint flex items-center justify-center h-full">Loading map…</div>
        ) : (
          <MapContainer
            center={resetCenter}
            zoom={INITIAL_ZOOM}
            minZoom={2}
            maxZoom={9}
            worldCopyJump
            style={{ height: '100%', width: '100%', background: '#F4F4F4' }}
          >
            <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
            {mode === 'country' && countryGeoJSON && (
              <GeoJSON key="country-layer" data={countryGeoJSON} style={countryStyle} onEachFeature={onEachCountry} />
            )}
            {mode === 'city' && <CityMarkers cityData={cityData} />}
            <MapZoomButtons resetCenter={resetCenter} />
          </MapContainer>
        )}
      </div>
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
          <div className="font-data text-[10px] text-inkfaint mt-2">Marker area ∝ study count and grows as you zoom in. Color = Köppen climate group at that city.</div>
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
    </div>
  )
}

// Renders the zoom +/-/Reset buttons as a Leaflet control positioned in the
// top-right corner of the map itself, styled to match the rest of the site.
function MapZoomButtons({ resetCenter }) {
  const map = useMap()
  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: 8, marginRight: 8 }}>
      <div className="leaflet-control flex gap-1">
        <button className="px-2 py-1 rounded bg-white/95 border border-line/50 text-[11px] font-data hover:bg-line shadow-sm" onClick={() => map.zoomIn()}>+</button>
        <button className="px-2 py-1 rounded bg-white/95 border border-line/50 text-[11px] font-data hover:bg-line shadow-sm" onClick={() => map.zoomOut()}>−</button>
        <button className="px-2 py-1 rounded bg-white/95 border border-line/50 text-[11px] font-data hover:bg-line shadow-sm" onClick={() => map.setView(resetCenter, INITIAL_ZOOM)}>Reset</button>
      </div>
    </div>
  )
}
