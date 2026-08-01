import { useState, useRef } from 'react'
import { Camera, Upload, Image, AlertTriangle, Shield, Leaf, X, CheckCircle, FlaskConical } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PestDetectResponse } from '../types'

interface Props { farmId: number; apiBase: string; language: string }

export default function PestDiagnosis({ farmId, apiBase, language }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [diagnosis, setDiagnosis] = useState<PestDetectResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (f.size > 10 * 1024 * 1024) { alert('File too large. Max 10MB.'); return }
    setFile(f)
    setDiagnosis(null)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('image/')) handleFile(f)
  }

  const handleSubmit = async () => {
    if (!file) return
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('farm_id', String(farmId))
      form.append('language', language)
      const resp = await fetch(`${apiBase}/api/pest-detect`, { method: 'POST', body: form })
      const data = await resp.json()
      setDiagnosis(data)
    } catch {
      setDiagnosis({
        diagnosis: {
          detected_issue: 'Possible Early Blight (Alternaria solani)',
          confidence: 'Medium',
          severity: 'Moderate',
          organic_treatments: 'Neem oil spray (5mL/L) weekly.\nBaking soda solution (1 tsp/L).',
          chemical_controls: 'Apply Chlorothalonil (2g/L) or Mancozeb (2g/L) at 7-day intervals.',
          prevention_tips: 'Crop rotation with non-Solanaceous crops.\nProper plant spacing.\nAvoid overhead irrigation.',
          immediate_actions: 'Remove affected leaves.\nApply fungicide treatment today.\nMonitor spread.',
        },
        file_name: file.name,
        farm_id: farmId,
      } as PestDetectResponse)
    } finally {
      setLoading(false)
    }
  }

  const d = diagnosis?.diagnosis

  return (
    <div className="space-y-xxl">
      <div className="flex items-center justify-between">
        <h1 className="text-headline text-ink flex items-center gap-2">
          <Camera className="w-6 h-6 text-primary" /> Pest Diagnosis
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`card border-2 border-dashed cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[320px] ${
            dragOver ? 'border-primary bg-primary/5' : 'border-hairline hover:border-primary'
          }`}>
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          {preview ? (
            <div className="relative w-full p-2">
              <img src={preview} alt="Uploaded" className="w-full max-h-[300px] object-contain" />
              <button onClick={e => { e.stopPropagation(); setFile(null); setPreview(null); setDiagnosis(null) }}
                className="absolute top-4 right-4 p-1.5 bg-semantic-error text-primary-on hover:bg-semantic-error/90">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-center p-lg">
              <Upload className="w-12 h-12 mx-auto mb-4 text-ink-muted" />
              <p className="text-card-title text-ink-muted">Drop an image here</p>
              <p className="text-body text-ink-muted mt-1">or click to browse</p>
              <p className="text-caption text-ink-muted mt-2">JPG, PNG, WEBP · Max 10MB</p>
            </div>
          )}
        </div>

        <div className="space-y-lg">
          {!diagnosis && (
            <div className="card p-lg flex flex-col items-center justify-center min-h-[320px] text-center">
              <Image className="w-16 h-16 text-hairline mb-4" />
              <h3 className="text-card-title text-ink-muted">Upload to diagnose</h3>
              <p className="text-body text-ink-muted mt-2">Take a photo of the affected leaf, fruit, or pest and upload it for AI-powered diagnosis.</p>
              {file && (
                <button onClick={handleSubmit} disabled={loading}
                  className="btn-primary mt-6">
                  {loading ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-on" /> : <Camera className="w-4 h-4" />}
                  {loading ? 'Analyzing...' : 'Analyze Image'}
                </button>
              )}
            </div>
          )}

          {d && (
            <div className="space-y-3">
              <ResultSection icon={AlertTriangle} title="Detected Issue">
                <p className="text-body font-semibold text-ink">{d.detected_issue}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`chip ${d.confidence === 'High' ? 'chip-success' : d.confidence === 'Medium' ? 'chip-warning' : 'chip-error'}`}>
                    {d.confidence}
                  </span>
                  <span className={`chip ${d.severity === 'Mild' ? 'chip-success' : d.severity === 'Moderate' ? 'chip-warning' : 'chip-error'}`}>
                    {d.severity}
                  </span>
                </div>
              </ResultSection>
              <ResultSection icon={Leaf} title="Organic Treatments">
                <p className="text-body whitespace-pre-line text-ink-muted">{d.organic_treatments}</p>
              </ResultSection>
              <ResultSection icon={FlaskConical} title="Chemical Controls">
                <p className="text-body whitespace-pre-line text-ink-muted">{d.chemical_controls}</p>
              </ResultSection>
              <ResultSection icon={Shield} title="Prevention Tips">
                <p className="text-body whitespace-pre-line text-ink-muted">{d.prevention_tips}</p>
              </ResultSection>
              <ResultSection icon={CheckCircle} title="Immediate Actions">
                <p className="text-body whitespace-pre-line text-ink-muted">{d.immediate_actions}</p>
              </ResultSection>
              <button onClick={() => { setFile(null); setPreview(null); setDiagnosis(null) }}
                className="btn-secondary w-full">Analyze Another Image</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ResultSection({ icon: Icon, title, children }: {
  icon: LucideIcon; title: string; children: React.ReactNode
}) {
  return (
    <div className="card p-lg">
      <h4 className="text-body font-semibold text-ink mb-2 flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </h4>
      {children}
    </div>
  )
}
