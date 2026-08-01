import { useState, useEffect } from 'react'
import { AlertTriangle, Info, Shield, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import type { DiseaseRiskResponse } from '../types'

interface Props { farmId: number; apiBase: string; language: string }

const RISK_HEX: Record<string, string> = { High: '#da1e28', Medium: '#f1c21b', Low: '#24a148' }

export default function DiseaseRisk({ farmId, apiBase }: Props) {
  const [data, setData] = useState<DiseaseRiskResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`${apiBase}/api/disease-risk?farm_id=${farmId}`)
      .then(r => r.json()).then(setData)
      .catch(() => {}).finally(() => setLoading(false))
  }, [farmId, apiBase])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
  if (!data) return <p className="text-body text-ink-muted">Unable to load disease risk data.</p>

  const risk = data.current_risk
  const riskColor = RISK_HEX[risk?.risk_level] || RISK_HEX.Low

  return (
    <div className="space-y-xxl">
      <div className="flex items-center justify-between">
        <h1 className="text-headline text-ink flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-semantic-error" /> Disease Risk
        </h1>
        <span className="chip-neutral">{data.crop_type}</span>
      </div>

      <div className="card p-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-caption text-ink-muted uppercase tracking-wider">Current Risk Level</p>
            <p className="text-headline mt-1" style={{ color: riskColor }}>{risk?.risk_level || 'Low'}</p>
            <p className="text-body mt-1 text-ink-muted">{risk?.disease_name || 'No specific disease detected'}</p>
          </div>
          <div className="text-center">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" className="text-hairline" />
                <circle cx="18" cy="18" r="16" fill="none" stroke={riskColor} strokeWidth="3"
                  strokeDasharray={`${(risk?.risk_score || 0) * 100} 100`}
                  strokeLinecap="butt" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-card-title font-mono" style={{ color: riskColor }}>
                {((risk?.risk_score || 0) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <div className="card p-lg">
          <h3 className="text-card-title text-ink mb-3 flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" /> Triggers
          </h3>
          <div className="space-y-2">
            {(risk?.triggers || ['No specific triggers identified']).map((t, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-surface-1">
                <div className="w-1.5 h-1.5 bg-semantic-error mt-2 flex-shrink-0" />
                <span className="text-body text-ink-muted">{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-lg">
          <h3 className="text-card-title text-ink mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Actions
          </h3>
          <div className="space-y-2">
            {(risk?.recommendations || 'Continue regular monitoring.').split('. ').filter(Boolean).map((r, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-surface-1">
                <div className="w-1.5 h-1.5 bg-semantic-success mt-2 flex-shrink-0" />
                <span className="text-body text-ink-muted">{r}.</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-lg">
        <h3 className="text-card-title text-ink mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" /> 7-Day Risk Forecast
        </h3>
        {data.daily_risks && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.daily_risks.map(d => ({
              ...d, name: new Date(d.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'IBM Plex Sans' }} angle={-20} textAnchor="end" height={60} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 12, fontFamily: 'IBM Plex Sans' }} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
              <Bar dataKey="risk_score">
                {data.daily_risks.map((entry, i) => (
                  <Cell key={i} fill={RISK_HEX[entry.risk_level] || RISK_HEX.Low} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        <div className="flex justify-center gap-4 mt-3 text-body-sm text-ink-muted">
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-semantic-success" /> Low</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-semantic-warning" /> Medium</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-semantic-error" /> High</span>
        </div>
      </div>
    </div>
  )
}
