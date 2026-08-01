import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Map, AlertTriangle, SprayCan, Camera, Bot,
  Menu, X, Bell, ChevronDown, Leaf
} from 'lucide-react'
import Dashboard from './components/Dashboard'
import FarmMap from './components/FarmMap'
import DiseaseRisk from './components/DiseaseRisk'
import SprayPlanner from './components/SprayPlanner'
import PestDiagnosis from './components/PestDiagnosis'
import AiAdvisor from './components/AiAdvisor'
import type { Farm } from './types'

const API_BASE = 'http://localhost:8000'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'map', label: 'Field Map', icon: Map },
  { id: 'disease', label: 'Disease Risk', icon: AlertTriangle },
  { id: 'spray', label: 'Spray Planner', icon: SprayCan },
  { id: 'pest', label: 'Pest Diagnosis', icon: Camera },
  { id: 'advisor', label: 'AI Advisor', icon: Bot },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [farms, setFarms] = useState<Farm[]>([])
  const [selectedFarm, setSelectedFarm] = useState<number>(1)
  const [language, setLanguage] = useState('en')
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'High disease risk for Tomato field', type: 'warning' },
    { id: 2, text: 'Optimal spray window tomorrow 6–8 AM', type: 'info' },
  ])

  useEffect(() => {
    fetch(`${API_BASE}/api/farms`)
      .then(r => r.json())
      .then(setFarms)
      .catch(() => setFarms([]))
    const interval = setInterval(() => {
      setNotifications(prev => {
        if (prev.length > 2) return prev
        const alerts = [
          { id: Date.now(), text: 'Rain expected in 2 days — plan spray schedule', type: 'info' },
          { id: Date.now() + 1, text: 'Check tomato field for early blight signs', type: 'warning' },
        ]
        return [...prev, ...alerts].slice(-3)
      })
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const renderPage = () => {
    const commonProps = { farmId: selectedFarm, apiBase: API_BASE, language }
    switch (activeTab) {
      case 'dashboard': return <Dashboard {...commonProps} />
      case 'map': return <FarmMap {...commonProps} farms={farms} />
      case 'disease': return <DiseaseRisk {...commonProps} />
      case 'spray': return <SprayPlanner {...commonProps} />
      case 'pest': return <PestDiagnosis {...commonProps} />
      case 'advisor': return <AiAdvisor {...commonProps} farmId={selectedFarm} />
      default: return <Dashboard {...commonProps} />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7faf6]">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} flex-shrink-0 bg-canvas border-r border-[#e0e9df] transition-all duration-300 overflow-hidden z-30`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-hairline">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#1d6b45] text-primary-on shadow-[0_6px_14px_rgba(29,107,69,0.2)]">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-sans font-semibold text-body text-ink">AgroShield AI</h1>
              <p className="text-caption text-ink-muted">Smart Farming Assistant</p>
            </div>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={activeTab === item.id ? 'nav-item-active w-full text-left' : 'nav-item-inactive w-full text-left'}>
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-hairline">
            <label className="block text-caption text-ink-muted mb-1">Select Language</label>
            <select value={language} onChange={e => setLanguage(e.target.value)}
              className="input-field text-body-sm cursor-pointer bg-surface-1">
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="bn">বাংলা (Bengali)</option>
              <option value="mr">मराठी (Marathi)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="gu">ગુજરાતી (Gujarati)</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
              <option value="ml">മലയാളം (Malayalam)</option>
              <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
              <option value="or">ଓଡ଼ିଆ (Odia)</option>
              <option value="as">অসমীয়া (Assamese)</option>
              <option value="ur">اردو (Urdu)</option>
              <option value="es">Español (Spanish)</option>
              <option value="fr">Français (French)</option>
            </select>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-canvas/90 backdrop-blur-md border-b border-[#e0e9df] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="btn-ghost min-h-0 p-2">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="relative">
              <select value={selectedFarm} onChange={e => setSelectedFarm(Number(e.target.value))}
                className="input-field text-body-sm pr-8 min-h-[40px] appearance-none bg-surface-1 cursor-pointer">
                {farms.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.crop_type})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
            </div>
          </div>
          <div className="relative">
            <Bell className="w-5 h-5 text-ink-muted cursor-pointer hover:text-[#1d6b45]" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-semantic-error text-primary-on text-[10px] font-semibold flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </div>
        </header>

        <main className="app-scroll flex-1 overflow-y-auto p-4 md:px-8 md:py-7">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}
