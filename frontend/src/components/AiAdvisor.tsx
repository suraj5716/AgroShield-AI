import { useState, useEffect, useRef } from 'react'
import { Bot, Send, Mic, Volume2, VolumeX, StopCircle, Sparkles, Radio } from 'lucide-react'
import type { ChatMessage, ChatResponse } from '../types'

interface Props { farmId: number; apiBase: string; language: string }

interface SpeechRecognitionResultLike {
  [index: number]: { transcript: string }
  isFinal: boolean
}

interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultLike[]
}

interface SpeechRecognitionErrorLike {
  error?: string
  message?: string
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

const LANGUAGE_SPEECH_CODES: Record<string, { bcp47: string; name: string }> = {
  en: { bcp47: 'en-IN', name: 'English' },
  hi: { bcp47: 'hi-IN', name: 'हिंदी (Hindi)' },
  bn: { bcp47: 'bn-IN', name: 'বাংলা (Bengali)' },
  mr: { bcp47: 'mr-IN', name: 'मराठी (Marathi)' },
  te: { bcp47: 'te-IN', name: 'తెలుగు (Telugu)' },
  ta: { bcp47: 'ta-IN', name: 'தமிழ் (Tamil)' },
  gu: { bcp47: 'gu-IN', name: 'ગુજરાતી (Gujarati)' },
  kn: { bcp47: 'kn-IN', name: 'ಕನ್ನಡ (Kannada)' },
  ml: { bcp47: 'ml-IN', name: 'മലയാളം (Malayalam)' },
  pa: { bcp47: 'pa-IN', name: 'ਪੰਜਾਬੀ (Punjabi)' },
  or: { bcp47: 'or-IN', name: 'ଓଡ଼ିଆ (Odia)' },
  as: { bcp47: 'as-IN', name: 'অসমীয়া (Assamese)' },
  ur: { bcp47: 'ur-IN', name: 'اردو (Urdu)' },
  es: { bcp47: 'es-ES', name: 'Español' },
  fr: { bcp47: 'fr-FR', name: 'Français' },
}

const LOCALIZED_QUICK_PROMPTS: Record<string, string[]> = {
  hi: [
    "क्या आज रात छिड़काव करना सुरक्षित है?",
    "आलू के झुलसा रोग का उपचार कैसे करें?",
    "मौसम का पूर्वानुमान क्या है?",
    "टमाटर के लिए सबसे अच्छा फफूंदनाशी?",
    "जैविक कीट नियंत्रण के उपाय",
  ],
  te: [
    "ఈ రాత్రి పిచికారీ చేయడం సురక్షితమేనా?",
    "తెగులు నివారణ చర్యలు ఏమిటి?",
    "వాతావరణ సూచన ఏమిటి?",
  ],
  ta: [
    "இன்று இரவு மருந்து தெளிப்பது பாதுகாப்பானதா?",
    "நோய் கட்டுப்பாட்டு வழிகள் என்ன?",
    "வானிலை முன்னறிவிப்பு என்ன?",
  ],
  bn: [
    "আজ রাতে স্প্রে করা কি নিরাপদ?",
    "রোগ প্রতিরোধের উপায় কি?",
    "আবহাওয়া পূর্বাভাস কি?",
  ],
  mr: [
    "आज रात्री फवारणी करणे सुरक्षित आहे का?",
    "कीड व रोग नियंत्रणाचे उपाय काय आहेत?",
    "हवामानाचा अंदाज काय आहे?",
  ],
  en: [
    "Is it safe to spray fungicide tonight?",
    "How do I cure late blight?",
    "What's the 7-day weather forecast?",
    "Best organic pest control tips",
    "Signs of nitrogen deficiency",
  ]
}

export default function AiAdvisor({ farmId, apiBase, language }: Props) {
  const currentLang = LANGUAGE_SPEECH_CODES[language] || LANGUAGE_SPEECH_CODES.en

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: `Namaste! I am AgroShield AI. You can speak or type to me in ${currentLang.name}. How can I assist your farm today?` }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [activeSpeechText, setActiveSpeechText] = useState('')
  const [sessionId] = useState(() => `session_${Date.now()}`)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort()
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: ChatMessage = { role: 'user', content: text, language }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const form = new FormData()
      form.append('message', text)
      form.append('farm_id', String(farmId))
      form.append('language', language)
      form.append('session_id', sessionId)

      const resp = await fetch(`${apiBase}/api/chat`, { method: 'POST', body: form })
      const data: ChatResponse = await resp.json()
      
      const botResponse = data.response
      setMessages(prev => [...prev, { role: 'assistant', content: botResponse, language }])
      handleSpeak(botResponse)
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered a network issue. Please check your connection.', language }])
    } finally {
      setLoading(false)
    }
  }

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition
      || (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Voice speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.')
      return
    }
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.lang = currentLang.bcp47
      recognition.continuous = false
      recognition.interimResults = true

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        const transcript = Array.from(event.results)
          .map((res: SpeechRecognitionResultLike) => res[0].transcript)
          .join('')
        setInput(transcript)
        if (event.results[0].isFinal) {
          sendMessage(transcript)
          setListening(false)
        }
      }

      recognition.onend = () => setListening(false)
      recognition.onerror = (e: SpeechRecognitionErrorLike) => {
        console.error('Speech recognition error:', e)
        setListening(false)
      }

      recognitionRef.current = recognition
      recognition.start()
      setListening(true)
    } catch (err) {
      console.error(err)
      setListening(false)
    }
  }

  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()

    if (speaking && activeSpeechText === text) {
      setSpeaking(false)
      setActiveSpeechText('')
      return
    }

    const cleanText = text.replace(/[*#_`]/g, '')
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = currentLang.bcp47
    utterance.rate = 0.95

    utterance.onend = () => {
      setSpeaking(false)
      setActiveSpeechText('')
    }
    utterance.onerror = () => {
      setSpeaking(false)
      setActiveSpeechText('')
    }

    setSpeaking(true)
    setActiveSpeechText(text)
    window.speechSynthesis.speak(utterance)
  }

  const prompts = LOCALIZED_QUICK_PROMPTS[language] || LOCALIZED_QUICK_PROMPTS.en

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-headline text-ink flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" /> AI Advisor
          </h1>
          <p className="text-caption text-ink-muted flex items-center gap-1.5 mt-0.5">
            <Radio className="w-3.5 h-3.5 text-semantic-success animate-pulse" />
            Voice & Text active in <span className="font-semibold text-primary">{currentLang.name}</span>
          </p>
        </div>
        {speaking && (
          <button onClick={() => handleSpeak(activeSpeechText)}
            className="btn-ghost text-body-sm flex items-center gap-1 text-semantic-error">
            <StopCircle className="w-4 h-4" /> Stop Audio
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4 px-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-primary text-primary-on'
                : 'card text-ink'
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2 pb-1 border-b border-hairline">
                  <div className="w-6 h-6 bg-primary flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-primary-on" />
                  </div>
                  <span className="text-body-sm font-semibold text-primary">AgroShield Assistant</span>
                  <button onClick={() => handleSpeak(msg.content)} 
                    title="Read aloud"
                    className="ml-auto text-ink-muted hover:text-primary transition-colors p-1">
                    {speaking && activeSpeechText === msg.content ? (
                      <VolumeX className="w-4 h-4 text-semantic-error animate-pulse" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
              <p className="text-body whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="card px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                <span className="text-body text-ink-muted">Generating response in {currentLang.name}...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {listening && (
        <div className="mb-2 p-2.5 bg-semantic-error/10 border border-semantic-error/30 text-semantic-error text-body-sm flex items-center gap-2 rounded">
          <Mic className="w-4 h-4 animate-bounce" />
          <span>Listening in <strong>{currentLang.name}</strong>... Speak into your microphone.</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {prompts.map(prompt => (
          <button key={prompt} onClick={() => sendMessage(prompt)} disabled={loading}
            className="chip-neutral hover:bg-surface-1 transition-colors cursor-pointer text-body-sm">
            <Sparkles className="w-3 h-3 text-primary" /> {prompt}
          </button>
        ))}
      </div>

      <div className="card p-3">
        <div className="flex items-center gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
            placeholder={`Ask in ${currentLang.name}...`}
            className="input-field border-0 bg-transparent min-h-[40px]"
          />
          <button onClick={handleVoiceInput}
            title={listening ? "Stop voice input" : `Speak in ${currentLang.name}`}
            className={`btn-ghost p-2 min-h-0 ${listening ? 'bg-semantic-error text-white animate-pulse' : 'text-primary hover:bg-surface-1'}`}>
            <Mic className="w-5 h-5" />
          </button>
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
            className="btn-primary p-2 min-h-0">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

