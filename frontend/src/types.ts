export interface Farm {
  id: number
  name: string
  crop_type: string
  latitude: number
  longitude: number
  area_hectares: number
  planting_date?: string
}

export interface WeatherDay {
  date: string
  temp_min: number
  temp_max: number
  avg_temp: number
  humidity: number
  precip_mm: number
  precip_prob: number
  wind_speed: number
  wind_gust: number
  solar_radiation: number
  cloud_cover: number
  leaf_wetness_hours: number
  uv_index: number
  condition: string
}

export interface StressFactor {
  type: string
  severity: string
  detail: string
}

export interface StressAnalysis {
  overall_stress: string
  factors: StressFactor[]
  total_risk_days: number
}

export interface WeatherResponse {
  farm_id: number
  farm_name: string
  crop_type: string
  forecast: WeatherDay[]
  stress_analysis: StressAnalysis
}

export interface DiseaseRisk {
  risk_score: number
  risk_level: string
  disease_name: string
  triggers: string[]
  recommendations: string
}

export interface DailyRisk extends DiseaseRisk {
  date: string
}

export interface DiseaseRiskResponse {
  farm_id: number
  farm_name: string
  crop_type: string
  overall_risk_score: number
  overall_risk_level: string
  current_risk: DiseaseRisk
  daily_risks: DailyRisk[]
  recommendations: string
}

export interface SprayWindow {
  date: string
  hour: number
  score: number
  status: string
  wind_kph: number
  rain_prob: number
  humidity: number
  temp_c: number
  uv_index: number
  product_type_hint: string
}

export interface SprayWindowResponse {
  farm_id: number
  farm_name: string
  crop_type: string
  product_type: string
  hourly_windows: SprayWindow[]
  optimal_windows: SprayWindow[]
  best_window: SprayWindow
  summary: string
}

export interface ChatMessage {
  role: string
  content: string
  language?: string
  timestamp?: string
}

export interface ChatResponse {
  response: string
  session_id: string
  farm_id?: number
  language: string
}

export interface PestDiagnosis {
  detected_issue: string
  confidence: string
  severity: string
  organic_treatments: string
  chemical_controls: string
  prevention_tips: string
  immediate_actions: string
}

export interface PestDetectResponse {
  diagnosis: PestDiagnosis
  file_name: string
  farm_id?: number
}

export interface NdviResponse {
  farm_id: number
  farm_name: string
  crop_type: string
  ndvi_grid: number[][]
  avg_ndvi: number
  health_status: string
  grid_size: number
  bounds: number[][]
}
