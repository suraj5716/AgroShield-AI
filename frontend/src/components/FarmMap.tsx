import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet'
import { Map as MapIcon, Layers, Maximize2, Minimize2 } from 'lucide-react'
import type { Farm, NdviResponse } from '../types'

interface Props { farmId: number; apiBase: string; farms: Farm[]; language: string }

const NDVI_COLORS: [number, number, string][] = [
  [0.0, 0.2, '#da1e28'],
  [0.2, 0.4, '#f1c21b'],
  [0.4, 0.6, '#d9ef8b'],
  [0.6, 0.8, '#66bd63'],
  [0.8, 1.0, '#24a148'],
]

function getNdviColor(value: number): string {
  for (const [min, max, color] of NDVI_COLORS) {
    if (value >= min && value <= max) return color
  }
  return '#24a148'
}

function createGridPolygons(lat: number, lng: number, grid: number[][], gridSize: number) {
  const step = 0.001
  const offset = (gridSize * step) / 2
  const polygons = []
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const north = lat - offset + i * step
      const south = north + step
      const west = lng - offset + j * step
      const east = west + step
      const ndvi = grid[i]?.[j] ?? 0.5
      polygons.push({
        bounds: [[north, west], [south, east]] as [[number, number], [number, number]],
        ndvi,
        color: getNdviColor(ndvi),
      })
    }
  }
  return polygons
}

export default function FarmMap({ farmId, apiBase, farms }: Props) {
  const [ndvi, setNdvi] = useState<NdviResponse | null>(null)
  const [showNdvi, setShowNdvi] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch(`${apiBase}/api/ndvi?farm_id=${farmId}`)
      .then(r => r.json())
      .then(setNdvi)
      .catch(() => {})
  }, [farmId, apiBase])

  const farm = farms.find(f => f.id === farmId)
  const center: [number, number] = farm ? [farm.latitude, farm.longitude] : [20.5937, 78.9629]

  const ndviPolygons = useMemo(() => {
    if (!ndvi?.ndvi_grid) return []
    return createGridPolygons(ndvi.bounds[0][0], ndvi.bounds[0][1], ndvi.ndvi_grid, ndvi.grid_size)
  }, [ndvi])

  return (
    <div className="space-y-lg">
      <div className="flex items-center justify-between">
        <h1 className="text-headline text-ink flex items-center gap-2">
          <MapIcon className="w-6 h-6 text-primary" /> Field Map
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNdvi(!showNdvi)}
            className={`btn-ghost text-body-sm ${showNdvi ? 'bg-primary/10 text-primary' : ''}`}>
            <Layers className="w-4 h-4" /> NDVI
          </button>
          <button onClick={() => setExpanded(!expanded)} className="btn-ghost">
            {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className={`card ${expanded ? 'fixed inset-4 z-50' : ''}`}>
        <MapContainer center={center} zoom={15} style={{ height: expanded ? '100%' : '500px' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OSM</a>' />

          {farms.map(f => {
            const polyBounds: [[number, number], [number, number]] = [
              [f.latitude - 0.008, f.longitude - 0.008],
              [f.latitude + 0.008, f.longitude + 0.008],
            ]
            const rect: [number, number][] = [
              [polyBounds[0][0], polyBounds[0][1]],
              [polyBounds[0][0], polyBounds[1][1]],
              [polyBounds[1][0], polyBounds[1][1]],
              [polyBounds[1][0], polyBounds[0][1]],
            ]
            return (
              <Polygon key={f.id} positions={rect} pathOptions={{
                color: f.id === farmId ? '#0f62fe' : '#161616',
                fillColor: f.id === farmId ? '#0f62fe20' : '#16161610',
                weight: f.id === farmId ? 3 : 1,
              }}>
                <Popup>
                  <div className="font-sans font-semibold text-body-sm">{f.name}</div>
                  <div className="font-sans text-caption text-ink-muted">{f.crop_type} | {f.area_hectares} ha</div>
                </Popup>
              </Polygon>
            )
          })}

          {showNdvi && ndviPolygons.map((p, i) => {
            const rect: [number, number][] = [
              [p.bounds[0][0], p.bounds[0][1]],
              [p.bounds[0][0], p.bounds[1][1]],
              [p.bounds[1][0], p.bounds[1][1]],
              [p.bounds[1][0], p.bounds[0][1]],
            ]
            return (
              <Polygon key={`ndvi-${i}`} positions={rect} pathOptions={{
                color: p.color, fillColor: p.color, fillOpacity: 0.6, weight: 0.5,
              }}>
                <Popup><span className="font-mono">NDVI: {p.ndvi.toFixed(3)}</span></Popup>
              </Polygon>
            )
          })}
        </MapContainer>

        {showNdvi && ndvi && (
          <div className="m-lg flex items-center justify-between bg-surface-1 p-lg">
            <div className="flex items-center gap-3">
              <span className="text-body-sm text-ink-muted">NDVI</span>
              <div className="flex gap-0">
                {NDVI_COLORS.map(([, , color], i) => (
                  <div key={i} className="w-6 h-3" style={{ backgroundColor: color }} />
                ))}
              </div>
              <span className="text-body-sm text-ink-muted">Low to High</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-card-title font-mono text-ink">{ndvi.avg_ndvi.toFixed(3)}</span>
              <span className="chip-neutral">{ndvi.health_status}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
