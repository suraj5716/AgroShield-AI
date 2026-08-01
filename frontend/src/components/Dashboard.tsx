import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Thermometer, Droplets, Wind, Sun,
  Leaf, Sprout, Shield, Calendar, CheckCircle, ArrowRight, Sparkles,
  Cloud, CloudSun, CloudDrizzle, CloudRain, CloudFog,
  ArrowUp, ArrowDown,
  Activity, HeartPulse, Brain, Target, BellRing, Gauge
} from 'lucide-react'
import Chart from 'react-apexcharts'
import type { ApexOptions, ApexAxisChartSeries } from 'apexcharts'
import type { LucideIcon } from 'lucide-react'
import type { WeatherResponse, DiseaseRiskResponse, WeatherDay, DailyRisk } from '../types'
import heroImage from '../assets/agrofield-hero.png'

interface Props { farmId: number; apiBase: string; language: string }

const RISK_COLOR: Record<string, string> = { Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444' }

const CONDITION_ICON: Record<string, LucideIcon> = {
  Sunny: Sun,
  'Partly Cloudy': CloudSun,
  Cloudy: Cloud,
  Overcast: CloudFog,
  'Light Rain': CloudDrizzle,
  Rain: CloudRain,
  'Heavy Rain': CloudRain,
}

const CONDITION_EMOJI: Record<string, string> = {
  Sunny: '☀️',
  'Partly Cloudy': '⛅',
  Cloudy: '☁️',
  Overcast: '🌥️',
  'Light Rain': '🌦️',
  Rain: '🌧️',
  'Heavy Rain': '⛈️',
}

const CARD = 'rounded-[20px] border border-white/70 bg-white/70 shadow-[0_12px_40px_rgba(15,42,26,0.07)] backdrop-blur-xl'

const CHART_FONT = 'IBM Plex Sans, Helvetica Neue, Arial, sans-serif'
const CHART_MUTED = '#6b7b74'
const CHART_LINE = '#e8efe9'

const dayLabel = (date: string) => new Date(date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })
const weekdayShort = (date: string) => new Date(date).toLocaleDateString('en', { weekday: 'short' })

export default function Dashboard({ farmId, apiBase }: Props) {
  const [weather, setWeather] = useState<WeatherResponse | null>(null)
  const [disease, setDisease] = useState<DiseaseRiskResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`${apiBase}/api/weather?farm_id=${farmId}&days=7`).then(r => r.json()),
      fetch(`${apiBase}/api/disease-risk?farm_id=${farmId}`).then(r => r.json()),
    ]).then(([w, d]) => {
      setWeather(w)
      setDisease(d)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [farmId, apiBase])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )

  const forecast = weather?.forecast ?? []
  const daily = disease?.daily_risks ?? []
  const risk = disease?.current_risk
  const overallRisk = disease?.overall_risk_score ?? 0
  const riskColor = RISK_COLOR[risk?.risk_level || 'Low'] || RISK_COLOR.Low
  const lastForecast = forecast[0]
  const farmHealth = Math.max(0, Math.min(100, Math.round(100 - overallRisk * 100)))

  const avgOf = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

  const tempData = forecast.map(d => d.avg_temp)
  const windData = forecast.map(d => d.wind_speed)
  const riskData = daily.map(d => Math.round(d.risk_score * 100))
  const tempDelta = forecast.length > 1 ? forecast[0].avg_temp - forecast[1].avg_temp : undefined
  const windDelta = forecast.length > 1 ? forecast[0].wind_speed - forecast[1].wind_speed : undefined
  const riskDelta = riskData.length > 1 ? riskData[riskData.length - 1] - riskData[0] : undefined

  const soilMoisture = Math.round(avgOf(forecast.map(d => d.precip_prob)) * 100)
  const humidityAvg = Math.round(avgOf(forecast.map(d => d.humidity)))
  const leafWetPct = Math.round(Math.min(100, avgOf(forecast.map(d => d.leaf_wetness_hours)) / 24 * 100))
  const rainTotal = Math.round(forecast.reduce((a, d) => a + d.precip_mm, 0))
  const rainPct = Math.round(Math.min(100, rainTotal / 25 * 100))

  const alerts = [
    ...(weather?.stress_analysis?.factors?.map(f => ({ title: f.type, detail: f.detail, severity: f.severity })) ?? []),
  ]
  if (risk && risk.risk_level !== 'Low') {
    alerts.push({ title: 'Disease risk', detail: `${risk.disease_name || 'Monitoring needed'} — ${risk.risk_level.toLowerCase()}`, severity: risk.risk_level })
  }

  const recommendation = disease?.recommendations || 'No urgent tasks. Continue regular monitoring.'
  const actionConfidence = Math.round(overallRisk * 100)

  return (
    <div className="relative mx-auto max-w-[1440px] space-y-8 pb-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] bg-[radial-gradient(900px_420px_at_15%_-8%,rgba(220,252,231,0.7),transparent_60%),radial-gradient(800px_420px_at_85%_-12%,rgba(219,234,254,0.65),transparent_55%)]" />

      <section className="relative isolate min-h-[405px] overflow-hidden rounded-[28px] bg-[#173928] text-white shadow-[0_20px_55px_rgba(29,71,46,0.2)]">
        <img src={heroImage} alt="Lush crop fields at sunrise" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(9,39,25,0.93)_0%,rgba(11,47,30,0.7)_43%,rgba(11,47,30,0.16)_78%,rgba(11,47,30,0.35)_100%)]" />
        <div className="relative flex min-h-[405px] flex-col justify-between p-6 sm:p-9 lg:p-12">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium tracking-wide backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-[#f6cf79]" />
              Farm intelligence, made simple
            </div>
            <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-[58px] lg:leading-[1.06]">
              Grow with clarity, every day.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/80 sm:text-lg">
              A calm, connected view of {weather?.farm_name || 'your farm'}—from field conditions to the next best action.
            </p>
            <button onClick={() => document.getElementById('today-plan')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="btn btn-primary mb-10 mt-7 bg-white !text-[#173928] !border-white hover:!bg-[#f4f8f2] rounded-full">
              Explore today&apos;s plan <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid max-w-2xl grid-cols-3 gap-2.5 sm:gap-3">
            <HeroStat label="Crop" value={weather?.crop_type || 'Monitoring'} />
            <HeroStat label="Temperature" value={lastForecast ? `${lastForecast.avg_temp}°C` : '—'} />
            <HeroStat label="Risk today" value={risk?.risk_level || 'Low'} />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#1d6b45]">Field overview</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-ink">What needs your attention</h2>
        </div>
        <span className="chip-neutral w-fit border-[#d9e5da] bg-[#edf5ed] text-[#356442]">Live farm data</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SensorCard index={0} icon={AlertTriangle} label="Disease Risk"
          value={risk?.risk_level || 'Low'}
          detail={risk?.disease_name || 'No risk'}
          color={riskColor}
          spark={riskData}
          delta={riskDelta} />
        <SensorCard index={1} icon={Shield} label="Best Spray Time"
          value={risk?.risk_level === 'Low' ? 'Not Needed' : 'Tomorrow 6–8 AM'}
          detail="Optimal conditions"
          color="#0f62fe" />
        <SensorCard index={2} icon={Thermometer} label="Temperature"
          value={lastForecast ? `${lastForecast.avg_temp}°C` : '--'}
          detail={`H:${lastForecast?.temp_max ?? '--'}° L:${lastForecast?.temp_min ?? '--'}°`}
          color="#0ea5e9"
          spark={tempData}
          delta={tempDelta} />
        <SensorCard index={3} icon={Wind} label="Wind Speed"
          value={lastForecast ? `${lastForecast.wind_speed} km/h` : '--'}
          detail={`Gusts: ${lastForecast?.wind_gust ?? '--'} km/h`}
          color="#f59e0b"
          spark={windData}
          delta={windDelta} />
      </div>

      {forecast.length > 0 && (
        <GlassCard className="p-5 sm:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#1d6b45]">Forecast analytics</p>
              <h3 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-[-0.02em] text-ink">
                <Calendar className="h-5 w-5 text-primary" /> 7-Day Weather
              </h3>
            </div>
            {lastForecast && <WeatherPill condition={lastForecast.condition} />}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <WeatherChart forecast={forecast} />
            </div>
            <div className="space-y-5">
              <TodaySnapshot day={lastForecast} />
              <RainfallChart forecast={forecast} />
            </div>
          </div>
        </GlassCard>
      )}

      {daily.length > 0 && (
        <GlassCard className="p-5 sm:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#1d6b45]">Pathogen analytics</p>
              <h3 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-[-0.02em] text-ink">
                <AlertTriangle className="h-5 w-5 text-semantic-error" /> Disease Probability
              </h3>
            </div>
            <span className="chip-neutral w-fit">7-day outlook</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="flex items-center justify-center">
              <RiskGauge score={overallRisk} level={risk?.risk_level || 'Low'} />
            </div>
            <div className="lg:col-span-2">
              <DiseaseBarChart daily={daily} />
            </div>
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <GlassCard className="flex flex-col items-center justify-center p-6">
          <p className="text-sm font-semibold text-[#1d6b45]">Crop vitality</p>
          <h3 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-[-0.02em] text-ink">
            <HeartPulse className="h-5 w-5 text-emerald-600" /> Farm Health
          </h3>
          <div className="mt-3 w-full">
            <HealthGauge value={farmHealth} />
          </div>
          <p className="mt-2 text-center text-sm text-slate-500">
            {farmHealth >= 70 ? 'Field is in good condition' : farmHealth >= 40 ? 'Some stress detected' : 'High stress — act now'}
          </p>
        </GlassCard>

        <GlassCard className="p-6">
          <p className="text-sm font-semibold text-[#1d6b45]">Ground conditions</p>
          <h3 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-[-0.02em] text-ink">
            <Sprout className="h-5 w-5 text-emerald-600" /> Soil Analytics
          </h3>
          <div className="mt-5 space-y-4">
            <SoilBar icon={Droplets} label="Soil Moisture" value={soilMoisture} color="#0ea5e9" />
            <SoilBar icon={Cloud} label="Humidity" value={humidityAvg} color="#10b981" />
            <SoilBar icon={Leaf} label="Leaf Wetness" value={leafWetPct} color="#22c55e" />
            <SoilBar icon={CloudRain} label="Rainfall" value={rainPct} color="#2563eb" detail={`${rainTotal} mm`} />
          </div>
        </GlassCard>

        {daily.length > 0 && (
          <GlassCard className="p-6">
            <p className="text-sm font-semibold text-[#1d6b45]">Model outlook</p>
            <h3 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-[-0.02em] text-ink">
              <Brain className="h-5 w-5 text-violet-600" /> AI Prediction Trend
            </h3>
            <div className="mt-4">
              <PredictionTrendChart daily={daily} />
            </div>
          </GlassCard>
        )}
      </div>

      {forecast.length > 0 && (
        <GlassCard className="p-5 sm:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#1d6b45]">Cross-metric map</p>
              <h3 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-[-0.02em] text-ink">
                <Gauge className="h-5 w-5 text-primary" /> Disease & Weather Heatmap
              </h3>
            </div>
            <span className="chip-neutral w-fit">Weekly intensity</span>
          </div>
          <div className="mt-4">
            <RiskHeatmap forecast={forecast} daily={daily} />
          </div>
        </GlassCard>
      )}

      <div id="today-plan" className="grid scroll-mt-24 grid-cols-1 gap-5 lg:grid-cols-3">
        <GlassCard className="p-6">
          <p className="text-sm font-semibold text-[#1d6b45]">Field activity</p>
          <h3 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-[-0.02em] text-ink">
            <BellRing className="h-5 w-5 text-amber-500" /> Alerts Timeline
          </h3>
          {alerts.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-[#e4ece3] bg-[#f6faf7] p-5 text-sm text-slate-500">
              <CheckCircle className="mb-2 h-5 w-5 text-emerald-600" />
              No active alerts. Continue regular monitoring.
            </div>
          ) : (
            <div className="mt-5">
              <AlertTimeline alerts={alerts} />
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <p className="text-sm font-semibold text-[#1d6b45]">Smart guidance</p>
          <h3 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-[-0.02em] text-ink">
            <Brain className="h-5 w-5 text-primary" /> AI Recommendation
          </h3>
          <div className="mt-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">Risk level</p>
              <p className="mt-0.5 text-2xl font-bold" style={{ color: riskColor }}>{risk?.risk_level || 'Low'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-slate-400">Action confidence</p>
              <p className="mt-0.5 text-2xl font-bold text-ink">{actionConfidence}%</p>
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#e8efe9]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${actionConfidence}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" />
          </div>
          <div className="mt-4 rounded-2xl border border-[#e4ece3] bg-[#f6f9f7] p-4">
            <p className="text-sm font-semibold text-[#173928]">Recommended action</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{recommendation}</p>
          </div>
          {risk?.triggers && risk.triggers.length > 0 && (
            <ul className="mt-4 space-y-2">
              {risk.triggers.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <Target className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" /> {t}
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <p className="text-sm font-semibold text-[#1d6b45]">Live sensors</p>
          <h3 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-[-0.02em] text-ink">
            <Activity className="h-5 w-5 text-sky-500" /> Conditions
          </h3>
          {lastForecast ? (
            <div className="mt-4">
              <ConditionRow icon={Droplets} label="Humidity" value={`${lastForecast.humidity}%`} />
              <ConditionRow icon={Sun} label="UV Index" value={`${lastForecast.uv_index}`} />
              <ConditionRow icon={Leaf} label="Leaf Wetness" value={`${lastForecast.leaf_wetness_hours}h`} />
              <ConditionRow icon={Sprout} label="Soil Moisture" value={lastForecast.precip_prob > 0.5 ? 'High' : 'Moderate'} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No sensor data available.</p>
          )}
        </GlassCard>
      </div>
    </div>
  )
}

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`${CARD} ${className || ''}`}>
      {children}
    </motion.div>
  )
}

function SensorCard({ index, icon: Icon, label, value, detail, color, spark, delta }: {
  index: number; icon: LucideIcon; label: string; value: string; detail: string;
  color: string; spark?: number[]; delta?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.08 }}
      className={`${CARD} p-5`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold text-ink">{value}</p>
          <p className="mt-0.5 truncate text-sm text-slate-500">{detail}</p>
          {delta !== undefined && <Trend value={delta} />}
        </div>
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/60 bg-gradient-to-br from-white/80 to-white/40 shadow-sm" style={{ color }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {spark && spark.length > 0 && (
        <div className="mt-3 -mb-1 flex justify-end">
          <Sparkline data={spark} color={color} />
        </div>
      )}
    </motion.div>
  )
}

function Trend({ value }: { value: number }) {
  const up = value >= 0
  return (
    <span className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold ${up ? 'text-emerald-600' : 'text-rose-500'}`}>
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)} {up ? 'up' : 'down'}
    </span>
  )
}

function WeatherChart({ forecast }: { forecast: WeatherDay[] }) {
  const labels = forecast.map(d => dayLabel(d.date))
  const series: ApexAxisChartSeries = [
    { name: 'Max °C', type: 'area', data: forecast.map(d => d.temp_max) },
    { name: 'Min °C', type: 'line', data: forecast.map(d => d.temp_min) },
    { name: 'Humidity %', type: 'line', data: forecast.map(d => d.humidity) },
    { name: 'Wind km/h', type: 'line', data: forecast.map(d => d.wind_speed) },
  ]
  const options: ApexOptions = {
    chart: {
      type: 'line', height: 330, fontFamily: CHART_FONT, foreColor: CHART_MUTED,
      toolbar: { show: false }, zoom: { enabled: false },
      dropShadow: { enabled: true, top: 4, left: 0, blur: 6, opacity: 0.1 },
      animations: { enabled: true, easing: 'easeinout', speed: 700, animateGradually: { enabled: true, delay: 90 } },
    },
    colors: ['#0ea5e9', '#94a3b8', '#10b981', '#f59e0b'],
    stroke: { curve: 'smooth', width: [3, 2, 2, 2], dashArray: [0, 0, 5, 0] },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.32, opacityTo: 0.02, stops: [0, 90, 100] },
    },
    grid: { borderColor: CHART_LINE, strokeDashArray: 4, padding: { left: 8, right: 8 } },
    legend: {
      show: true, position: 'top', horizontalAlign: 'left', fontSize: '12px', fontWeight: 500,
      markers: { size: 5 }, itemMargin: { horizontal: 10, vertical: 2 },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: labels, tickPlacement: 'on',
      labels: { style: { colors: CHART_MUTED, fontSize: '12px' } },
      axisBorder: { show: false }, axisTicks: { show: false },
      crosshairs: { show: true, stroke: { color: '#9fb0a7', width: 1, dashArray: 4 } },
    },
    yaxis: [
      { seriesName: 'Max °C', labels: { style: { colors: CHART_MUTED } } },
      { seriesName: 'Min °C', show: false },
      { seriesName: 'Humidity %', opposite: true, min: 0, max: 100, labels: { style: { colors: '#059669' } } },
      { seriesName: 'Wind km/h', opposite: true, show: false },
    ],
    tooltip: {
      custom: ({ dataPointIndex, w }) => {
        const day = forecast[dataPointIndex]
        if (!day) return ''
        const icon = CONDITION_EMOJI[day.condition] || '🌤️'
        const rows = [
          ['Max Temp', `${day.temp_max}°C`, '#0ea5e9'],
          ['Min Temp', `${day.temp_min}°C`, '#94a3b8'],
          ['Humidity', `${day.humidity}%`, '#10b981'],
          ['Wind', `${day.wind_speed} km/h`, '#f59e0b'],
          ['Rain', `${day.precip_mm} mm`, '#38bdf8'],
        ].map(r => `<div style="display:flex;justify-content:space-between;gap:20px;padding:3px 0"><span style="color:#64748b">${r[0]}</span><b style="color:#0f172a">${r[1]}</b></div>`).join('')
        return `<div style="min-width:210px;background:#ffffff;border:1px solid #e7ede9;border-radius:14px;padding:12px 14px;box-shadow:0 14px 34px rgba(15,23,42,.14);font-family:${CHART_FONT};font-size:13px">` +
          `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #eef2f1">` +
          `<span style="font-size:18px">${icon}</span><b style="color:#0f172a">${day.condition}</b>` +
          `<span style="color:#64748b;margin-left:auto">${w.globals.categoryLabels[dataPointIndex]}</span></div>${rows}</div>`
      },
    },
  }
  return <Chart options={options} series={series} type="line" height={330} width="100%" />
}

function RainfallChart({ forecast }: { forecast: WeatherDay[] }) {
  const labels = forecast.map(d => weekdayShort(d.date))
  const series: ApexAxisChartSeries = [{ name: 'Rainfall (mm)', data: forecast.map(d => d.precip_mm) }]
  const options: ApexOptions = {
    chart: {
      type: 'area', height: 130, fontFamily: CHART_FONT, foreColor: CHART_MUTED,
      toolbar: { show: false }, zoom: { enabled: false }, sparkline: { enabled: false },
      animations: { enabled: true, easing: 'easeinout', speed: 600 },
    },
    colors: ['#38bdf8'],
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.05, stops: [0, 90, 100] } },
    grid: { borderColor: CHART_LINE, strokeDashArray: 4, padding: { left: 8, right: 8 } },
    dataLabels: { enabled: false },
    xaxis: { categories: labels, labels: { style: { colors: CHART_MUTED, fontSize: '11px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: (v) => `${Math.round(v)}`, style: { colors: CHART_MUTED } } },
    tooltip: { y: { formatter: (v) => `${v} mm` } },
  }
  return (
    <div className="rounded-2xl border border-white/70 bg-white/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rainfall forecast</p>
      <Chart options={options} series={series} type="area" height={130} width="100%" />
    </div>
  )
}

function TodaySnapshot({ day }: { day?: WeatherDay }) {
  if (!day) return null
  const Icon = CONDITION_ICON[day.condition] || Cloud
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#d9e5da] bg-gradient-to-br from-[#173928] to-[#24563f] p-5 text-white shadow-lg">
      <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 blur-xl" />
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-white/60">Today&apos;s snapshot</p>
        <Icon className="h-6 w-6 text-[#f6cf79]" />
      </div>
      <p className="mt-3 text-4xl font-bold tracking-tight">{day.avg_temp}°C</p>
      <p className="text-sm text-white/80">{day.condition}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white/10 px-2 py-2 backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-wider text-white/55">Humidity</p>
          <p className="mt-0.5 text-sm font-semibold">{day.humidity}%</p>
        </div>
        <div className="rounded-xl bg-white/10 px-2 py-2 backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-wider text-white/55">Wind</p>
          <p className="mt-0.5 text-sm font-semibold">{day.wind_speed} km/h</p>
        </div>
        <div className="rounded-xl bg-white/10 px-2 py-2 backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-wider text-white/55">Rain</p>
          <p className="mt-0.5 text-sm font-semibold">{day.precip_mm} mm</p>
        </div>
      </div>
    </div>
  )
}

function WeatherPill({ condition }: { condition?: string }) {
  const Icon = CONDITION_ICON[condition || ''] || Cloud
  return (
    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#d9e5da] bg-[#edf5ed] px-3 py-1.5 text-xs font-semibold text-[#356442]">
      <Icon className="h-3.5 w-3.5 text-[#1d6b45]" /> {condition || 'Monitoring'}
    </span>
  )
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const options: ApexOptions = {
    chart: { type: 'area', sparkline: { enabled: true }, animations: { enabled: true, easing: 'easeinout', speed: 600 } },
    colors: [color],
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0, stops: [0, 90, 100] } },
    tooltip: { enabled: false },
  }
  return <Chart options={options} series={[{ name: 's', data }]} type="area" height={44} width={110} />
}

function RiskGauge({ score, level }: { score: number; level: string }) {
  const value = Math.round(score * 100)
  const color = RISK_COLOR[level] || RISK_COLOR.Low
  const options: ApexOptions = {
    chart: { type: 'radialBar', fontFamily: CHART_FONT },
    plotOptions: {
      radialBar: {
        hollow: { size: '58%' },
        track: { background: '#e8efe9', strokeWidth: '100%' },
        dataLabels: {
          name: { show: true, fontSize: '13px', fontWeight: 500, color: '#6b7b74', offsetY: -10 },
          value: { show: true, fontSize: '34px', fontWeight: 700, color, offsetY: 4, formatter: (v) => `${Math.round(v)}%` },
        },
      },
    },
    colors: [color],
    stroke: { lineCap: 'round' },
    fill: { type: 'gradient', gradient: { shadeIntensity: 0.9, opacityFrom: 1, opacityTo: 0.7, colorStops: [{ offset: 0, color, opacity: 1 }, { offset: 100, color, opacity: 0.7 }] } },
    labels: ['Disease Risk'],
    states: { hover: { filter: { type: 'none' } } },
  }
  return <Chart options={options} series={[value]} type="radialBar" height={260} width="100%" />
}

function HealthGauge({ value }: { value: number }) {
  const options: ApexOptions = {
    chart: { type: 'radialBar', fontFamily: CHART_FONT },
    plotOptions: {
      radialBar: {
        hollow: { size: '62%' },
        track: { background: '#e8efe9', strokeWidth: '100%' },
        dataLabels: {
          name: { show: true, fontSize: '13px', fontWeight: 500, color: '#6b7b74', offsetY: -10 },
          value: { show: true, fontSize: '34px', fontWeight: 700, color: '#10b981', offsetY: 4, formatter: (v) => `${Math.round(v)}%` },
        },
      },
    },
    colors: ['#10b981'],
    stroke: { lineCap: 'round' },
    fill: { type: 'gradient', gradient: { shadeIntensity: 0.9, opacityFrom: 1, opacityTo: 0.75, colorStops: [{ offset: 0, color: '#34d399', opacity: 1 }, { offset: 100, color: '#059669', opacity: 1 }] } },
    labels: ['Farm Health'],
    states: { hover: { filter: { type: 'none' } } },
  }
  return <Chart options={options} series={[value]} type="radialBar" height={230} width="100%" />
}

function DiseaseBarChart({ daily }: { daily: DailyRisk[] }) {
  const labels = daily.map(d => weekdayShort(d.date))
  const values = daily.map(d => Math.round(d.risk_score * 100))
  const colors = daily.map(d => RISK_COLOR[d.risk_level] || RISK_COLOR.Low)
  const series: ApexAxisChartSeries = [{ name: 'Risk Score', data: values }]
  const options: ApexOptions = {
    chart: {
      type: 'bar', height: 280, fontFamily: CHART_FONT, foreColor: CHART_MUTED,
      toolbar: { show: false }, zoom: { enabled: false },
      animations: { enabled: true, easing: 'easeinout', speed: 650, animateGradually: { enabled: true, delay: 90 } },
    },
    plotOptions: {
      bar: {
        borderRadius: 8, columnWidth: '52%', distributed: true,
        dataLabels: { position: 'top' },
      },
    },
    colors,
    dataLabels: { enabled: true, formatter: (v) => `${v}%`, offsetY: -22, style: { fontSize: '12px', fontWeight: 600, colors: ['#0f172a'] } },
    xaxis: { categories: labels, labels: { style: { colors: CHART_MUTED, fontSize: '12px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { max: 100, labels: { formatter: (v) => `${Math.round(v)}%`, style: { colors: CHART_MUTED } } },
    grid: { borderColor: CHART_LINE, strokeDashArray: 4, padding: { top: 20 } },
    legend: { show: false },
    tooltip: { y: { formatter: (v) => `${Math.round(v)}% risk` } },
  }
  return <Chart options={options} series={series} type="bar" height={280} width="100%" />
}

function PredictionTrendChart({ daily }: { daily: DailyRisk[] }) {
  const labels = daily.map(d => weekdayShort(d.date))
  const risk = daily.map(d => Math.round(d.risk_score * 100))
  const confidence = daily.map(d => Math.round(Math.max(55, 100 - Math.abs(d.risk_score - 0.5) * 80)))
  const series: ApexAxisChartSeries = [
    { name: 'Risk %', type: 'area', data: risk },
    { name: 'Confidence %', type: 'line', data: confidence },
  ]
  const options: ApexOptions = {
    chart: {
      type: 'area', height: 230, fontFamily: CHART_FONT, foreColor: CHART_MUTED,
      toolbar: { show: false }, zoom: { enabled: false },
      animations: { enabled: true, easing: 'easeinout', speed: 700 },
    },
    colors: ['#8b5cf6', '#10b981'],
    stroke: { curve: 'smooth', width: [3, 2], dashArray: [0, 6] },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.03, stops: [0, 90, 100] } },
    grid: { borderColor: CHART_LINE, strokeDashArray: 4, padding: { top: 12, left: 8, right: 8 } },
    legend: { show: true, position: 'top', horizontalAlign: 'left', fontSize: '11px', markers: { size: 5 } },
    dataLabels: { enabled: false },
    xaxis: { categories: labels, labels: { style: { colors: CHART_MUTED, fontSize: '11px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { min: 0, max: 100, labels: { formatter: (v) => `${Math.round(v)}%`, style: { colors: CHART_MUTED } } },
    annotations: {
      yaxis: [
        { y: 60, strokeDashArray: 3, borderColor: '#ef4444', label: { borderColor: '#ef4444', style: { background: '#ef4444' }, text: 'High' } },
        { y: 30, strokeDashArray: 3, borderColor: '#22c55e', label: { borderColor: '#22c55e', style: { background: '#22c55e' }, text: 'Low' } },
      ],
    },
    tooltip: { shared: true, y: { formatter: (v) => `${Math.round(v)}%` } },
  }
  return <Chart options={options} series={series} type="area" height={230} width="100%" />
}

function RiskHeatmap({ forecast, daily }: { forecast: WeatherDay[]; daily: DailyRisk[] }) {
  const riskByDate = new Map(daily.map(d => [d.date, d]))
  const series: ApexAxisChartSeries = [
    { name: 'Disease Risk', data: forecast.map(d => ({ x: weekdayShort(d.date), y: Math.round((riskByDate.get(d.date)?.risk_score ?? 0) * 100) })) },
    { name: 'Temp °C', data: forecast.map(d => ({ x: weekdayShort(d.date), y: Math.round(d.avg_temp) })) },
    { name: 'Humidity %', data: forecast.map(d => ({ x: weekdayShort(d.date), y: Math.round(d.humidity) })) },
    { name: 'Wind km/h', data: forecast.map(d => ({ x: weekdayShort(d.date), y: Math.round(d.wind_speed) })) },
    { name: 'Rain mm', data: forecast.map(d => ({ x: weekdayShort(d.date), y: Math.round(d.precip_mm) })) },
  ]
  const options: ApexOptions = {
    chart: {
      type: 'heatmap', height: 270, fontFamily: CHART_FONT, foreColor: CHART_MUTED,
      toolbar: { show: false }, zoom: { enabled: false },
      animations: { enabled: true, easing: 'easeinout', speed: 600 },
    },
    dataLabels: { enabled: true, style: { fontSize: '10px', fontWeight: 600, colors: ['#0f172a'] } },
    plotOptions: {
      heatmap: {
        radius: 6, shadeIntensity: 0.35, useFillColorAsStroke: true,
        colorScale: {
          ranges: [
            { name: 'Disease Risk', from: 0, to: 33, color: '#dcfce7' },
            { name: 'Disease Risk', from: 34, to: 66, color: '#fef3c7' },
            { name: 'Disease Risk', from: 67, to: 100, color: '#fee2e2' },
            { name: 'Temp °C', from: 0, to: 20, color: '#bae6fd' },
            { name: 'Temp °C', from: 21, to: 30, color: '#fde68a' },
            { name: 'Temp °C', from: 31, to: 50, color: '#fdba74' },
            { name: 'Humidity %', from: 0, to: 50, color: '#a7f3d0' },
            { name: 'Humidity %', from: 51, to: 75, color: '#34d399' },
            { name: 'Humidity %', from: 76, to: 100, color: '#047857' },
            { name: 'Wind km/h', from: 0, to: 10, color: '#e0f2fe' },
            { name: 'Wind km/h', from: 11, to: 25, color: '#7dd3fc' },
            { name: 'Wind km/h', from: 26, to: 100, color: '#0284c7' },
            { name: 'Rain mm', from: 0, to: 3, color: '#f1f5f9' },
            { name: 'Rain mm', from: 4, to: 12, color: '#93c5fd' },
            { name: 'Rain mm', from: 13, to: 100, color: '#2563eb' },
          ],
        },
      },
    },
    legend: { show: true, position: 'bottom', fontSize: '12px', horizontalAlign: 'center' },
    tooltip: { y: { formatter: (v) => `${v}` } },
  }
  return <Chart options={options} series={series} type="heatmap" height={270} width="100%" />
}

function SoilBar({ icon: Icon, label, value, color, detail }: {
  icon: LucideIcon; label: string; value: number; color: string; detail?: string
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-slate-600">
          <Icon className="h-4 w-4" style={{ color }} /> {label}
        </span>
        <span className="font-semibold text-ink">{value}%{detail ? ` · ${detail}` : ''}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#e8efe9]">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}cc, ${color})` }} />
      </div>
    </div>
  )
}

function AlertTimeline({ alerts }: { alerts: { title: string; detail: string; severity: string }[] }) {
  const sevColor: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e' }
  const sevIcon: Record<string, LucideIcon> = { High: AlertTriangle, Medium: Shield, Low: CheckCircle }
  return (
    <div className="relative space-y-5 pl-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-[#e0e9e2]">
      {alerts.map((a, i) => {
        const Icon = sevIcon[a.severity] || Shield
        const color = sevColor[a.severity] || '#22c55e'
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: i * 0.08 }}
            className="relative">
            <span
              className="absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white"
              style={{ borderColor: color }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
            </span>
            <div className="rounded-2xl border border-[#e4ece3] bg-[#f8faf7] p-3.5">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" style={{ color }} />
                <p className="text-sm font-semibold text-ink">{a.title}</p>
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{a.severity}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{a.detail}</p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function ConditionRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#e4ece3] bg-[#f8faf7] px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-ink">{value}</span>
    </div>
  )
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-black/15 px-3 py-3 backdrop-blur-sm sm:px-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/55">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-white sm:text-base">{value}</p>
    </div>
  )
}
