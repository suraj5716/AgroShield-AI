import { useState, useEffect } from 'react'
import { SprayCan, Wind, Droplets, Thermometer, Sun, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { SprayWindowResponse } from '../types'

interface Props { farmId: number; apiBase: string; language: string }

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  optimal: { bg: 'bg-semantic-success/5 border-semantic-success/30', text: 'text-semantic-success', label: 'Optimal' },
  suboptimal: { bg: 'bg-semantic-warning/5 border-semantic-warning/30', text: 'text-semantic-warning', label: 'Sub-optimal' },
  restricted: { bg: 'bg-semantic-error/5 border-semantic-error/30', text: 'text-semantic-error', label: 'Restricted' },
}

const CONDITION_COLORS: Record<string, string> = {
  good: 'bg-semantic-success/5',
  caution: 'bg-semantic-warning/5',
}

export default function SprayPlanner({ farmId, apiBase }: Props) {
  const [data, setData] = useState<SprayWindowResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`${apiBase}/api/spray-window?farm_id=${farmId}`)
      .then(r => r.json()).then(setData)
      .catch(() => {}).finally(() => setLoading(false))
  }, [farmId, apiBase])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
  if (!data) return <p className="text-body text-ink-muted">Unable to load spray window data.</p>

  const best = data.best_window
  const days = [...new Set(data.hourly_windows.map(w => w.date))]

  return (
    <div className="space-y-xxl">
      <div className="flex items-center justify-between">
        <h1 className="text-headline text-ink flex items-center gap-2">
          <SprayCan className="w-6 h-6 text-primary" /> Spray Planner
        </h1>
        <span className="chip-neutral">{data.crop_type}</span>
      </div>

      {best && (
        <div className="card p-lg bg-primary/5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-caption text-primary uppercase tracking-wider">Best Spray Window</p>
              <p className="text-card-title text-ink mt-1">
                {new Date(best.date).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })} at {best.hour.toString().padStart(2, '0')}:00
              </p>
              <p className="text-body text-ink-muted mt-1">{data.summary}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-primary-on flex items-center justify-center text-card-title font-mono">
                {best.score}
              </div>
              <p className="text-caption text-primary mt-1">Score</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-lg">
        {best && (
          <>
            <SprayCondition icon={Wind} label="Wind" value={`${best.wind_kph} km/h`}
              status={best.wind_kph >= 3 && best.wind_kph <= 15 ? 'good' : 'caution'} />
            <SprayCondition icon={Droplets} label="Rain Risk" value={`${(best.rain_prob * 100).toFixed(0)}%`}
              status={best.rain_prob < 0.3 ? 'good' : 'caution'} />
            <SprayCondition icon={Thermometer} label="Temperature" value={`${best.temp_c}°C`}
              status={best.temp_c >= 15 && best.temp_c <= 30 ? 'good' : 'caution'} />
            <SprayCondition icon={Sun} label="UV Index" value={`${best.uv_index}`}
              status={best.uv_index < 6 ? 'good' : 'caution'} />
          </>
        )}
      </div>

      <div className="card p-lg">
        <h3 className="text-card-title text-ink mb-4">Hour-by-Hour Planner</h3>
        <div className="space-y-2">
          {days.slice(0, 5).map(day => {
            const dayWindows = data.hourly_windows.filter(w => w.date === day)
            const isOpen = selectedDay === day
            return (
              <div key={day} className="border border-hairline overflow-hidden">
                <button onClick={() => setSelectedDay(isOpen ? null : day)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-1 transition-colors">
                  <span className="text-body font-medium text-ink">
                    {new Date(day).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className={`chip ${
                      dayWindows.some(w => w.status === 'optimal')
                        ? 'chip-success' : 'chip-warning'
                    }`}>
                      {dayWindows.filter(w => w.status === 'optimal').length} optimal
                    </span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-ink-muted" /> : <ChevronDown className="w-4 h-4 text-ink-muted" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-hairline p-3 space-y-1.5">
                    {dayWindows.map((w, i) => {
                      const style = STATUS_STYLES[w.status]
                      return (
                        <div key={i} className={`flex items-center gap-3 px-3 py-2 border ${style.bg}`}>
                          <Clock className="w-4 h-4 text-ink-muted flex-shrink-0" />
                          <span className="text-body font-mono text-ink w-16">
                            {w.hour.toString().padStart(2, '0')}:00
                          </span>
                          <div className="progress-bar flex-1">
                            <div className="progress-fill"
                              style={{ width: `${w.score}%`, backgroundColor: w.score >= 80 ? '#24a148' : w.score >= 50 ? '#f1c21b' : '#da1e28' }} />
                          </div>
                          <span className={`text-body-sm font-mono w-20 text-right ${style.text}`}>{style.label}</span>
                          <span className="text-body-sm font-mono text-ink-muted w-12 text-right">{w.score}%</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SprayCondition({ icon: Icon, label, value, status }: {
  icon: LucideIcon; label: string; value: string; status: string
}) {
  return (
    <div className={`card p-lg ${CONDITION_COLORS[status] || ''}`}>
      <Icon className={`w-5 h-5 mx-auto mb-1 ${status === 'good' ? 'text-semantic-success' : 'text-semantic-warning'}`} />
      <p className="text-caption text-ink-muted text-center uppercase tracking-wider">{label}</p>
      <p className="text-body font-mono text-ink text-center">{value}</p>
    </div>
  )
}
