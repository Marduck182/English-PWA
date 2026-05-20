import { useRef, useState } from 'react'
import { Moon, Sun, Volume2, Download, Upload, CheckCircle2, AlertCircle, MessageSquareText, Type, Gauge, Languages, Play, UserRound, Mic, Eye, EyeOff } from 'lucide-react'
import { useSettingsStore } from '../store/useSettingsStore'
import { useProgressStore } from '../store/useProgressStore'
import type { WordProgress } from '../store/useProgressStore'
import { Toggle } from '../components/Toggle'
import { useSpeak } from '../hooks/useSpeak'

export function Settings() {
  const theme = useSettingsStore((s) => s.theme)
  const toggleTheme = useSettingsStore((s) => s.toggleTheme)
  const autoPlaySound = useSettingsStore((s) => s.autoPlaySound)
  const setAutoPlaySound = useSettingsStore((s) => s.setAutoPlaySound)
  const speakMode = useSettingsStore((s) => s.speakMode)
  const setSpeakMode = useSettingsStore((s) => s.setSpeakMode)
  const speechRate = useSettingsStore((s) => s.speechRate)
  const setSpeechRate = useSettingsStore((s) => s.setSpeechRate)
  const speechVoiceURI = useSettingsStore((s) => s.speechVoiceURI)
  const setSpeechVoiceURI = useSettingsStore((s) => s.setSpeechVoiceURI)
  const speechStrictness = useSettingsStore((s) => s.speechStrictness)
  const setSpeechStrictness = useSettingsStore((s) => s.setSpeechStrictness)
  const pronunciationSource = useSettingsStore((s) => s.pronunciationSource)
  const setPronunciationSource = useSettingsStore((s) => s.setPronunciationSource)
  const autoShowPronunciation = useSettingsStore((s) => s.autoShowPronunciation)
  const setAutoShowPronunciation = useSettingsStore((s) => s.setAutoShowPronunciation)
  const sttSource = useSettingsStore((s) => s.sttSource)
  const setSttSource = useSettingsStore((s) => s.setSttSource)
  const groqApiKey = useSettingsStore((s) => s.groqApiKey)
  const setGroqApiKey = useSettingsStore((s) => s.setGroqApiKey)
  const [showApiKey, setShowApiKey] = useState(false)

  const { voices, speak } = useSpeak()
  const englishVoices = voices.filter((v) => v.lang.startsWith('en'))

  const progress = useProgressStore((s) => s.progress)
  const importProgress = useProgressStore((s) => s.importProgress)

  const importInputRef = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState<'idle' | 'ok' | 'error'>('idle')

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ progress }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `progreso-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (!data.progress || typeof data.progress !== 'object') throw new Error()
        const words = Object.values(data.progress) as WordProgress[]
        const valid = words.every(
          (w) => typeof w.attempts === 'number' && typeof w.correct === 'number'
        )
        if (!valid) throw new Error()
        if (!window.confirm('Esto reemplazará tu progreso actual. ¿Continuar?')) return
        importProgress(data.progress as Record<number, WordProgress>)
        setImportStatus('ok')
        setTimeout(() => setImportStatus('idle'), 3000)
      } catch {
        setImportStatus('error')
        setTimeout(() => setImportStatus('idle'), 3000)
      }
    }
    reader.readAsText(file)
  }

  const totalWords = Object.keys(progress).length

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuración</h1>

      <div className="card space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Apariencia</h2>
        <SettingRow
          icon={theme === 'dark' ? <Moon className="h-5 w-5 text-slate-400" /> : <Sun className="h-5 w-5 text-amber-400" />}
          label="Tema"
          description={theme === 'dark' ? 'Oscuro' : 'Claro'}
        >
          <Toggle checked={theme === 'light'} onChange={toggleTheme} />
        </SettingRow>
      </div>

      <div className="card space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Práctica de escritura</h2>
        <SettingRow
          icon={<Volume2 className="h-5 w-5 text-slate-400" />}
          label="Pronunciar la palabra automáticamente"
          description="Escucha la pronunciación al cargar cada palabra"
        >
          <Toggle checked={autoPlaySound} onChange={setAutoPlaySound} />
        </SettingRow>
      </div>

      <div className="card space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Reconocimiento de voz</h2>
        <SettingRow
          icon={<Mic className="h-5 w-5 text-slate-400" />}
          label="Motor de reconocimiento"
          description={
            sttSource === 'whisper'
              ? 'Groq Whisper — graba y envía el audio a Groq para transcribir'
              : 'Web Speech API — nativo del navegador, tiempo real'
          }
        >
          <div className="flex gap-1 rounded-lg bg-slate-800 p-1">
            <button
              onClick={() => setSttSource('webspeech')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                sttSource === 'webspeech'
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Navegador
            </button>
            <button
              onClick={() => setSttSource('whisper')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                sttSource === 'whisper'
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Groq Whisper
            </button>
          </div>
        </SettingRow>

        {sttSource === 'whisper' && (
          <>
            <div className="border-t border-slate-800/60" />
            <div className="py-3">
              <div className="mb-2 text-sm font-medium">API key de Groq</div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={groqApiKey}
                    onChange={(e) => setGroqApiKey(e.target.value)}
                    placeholder="gsk_..."
                    className="input w-full pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Obtén tu key gratis en{' '}
                <span className="font-mono text-brand-400">console.groq.com</span>
                . Se guarda solo en este dispositivo.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="card space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Pronunciación</h2>
        <SettingRow
          icon={speakMode === 'sentence'
            ? <MessageSquareText className="h-5 w-5 text-brand-400" />
            : <Type className="h-5 w-5 text-slate-400" />}
          label="Qué pronunciar al escuchar"
          description={speakMode === 'sentence' ? 'Toda la frase de ejemplo' : 'Solo la palabra'}
        >
          <div className="flex gap-1 rounded-lg bg-slate-800 p-1">
            <button
              onClick={() => setSpeakMode('word')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                speakMode === 'word'
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Palabra
            </button>
            <button
              onClick={() => setSpeakMode('sentence')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                speakMode === 'sentence'
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Frase
            </button>
          </div>
        </SettingRow>

        <div className="border-t border-slate-800/60" />

        <SettingRow
          icon={<Languages className="h-5 w-5 text-slate-400" />}
          label="Fuente de pronunciación en español"
          description={pronunciationSource === 'ipa' ? 'IPA local — instantáneo, basado en fonética' : 'IA (Groq) — más natural, requiere internet'}
        >
          <div className="flex gap-1 rounded-lg bg-slate-800 p-1">
            <button
              onClick={() => setPronunciationSource('ipa')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                pronunciationSource === 'ipa'
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              IPA
            </button>
            <button
              onClick={() => setPronunciationSource('ai')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                pronunciationSource === 'ai'
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              IA
            </button>
          </div>
        </SettingRow>

        <div className="border-t border-slate-800/60" />

        <SettingRow
          icon={<Languages className="h-5 w-5 text-slate-400" />}
          label="Pronunciación siempre visible"
          description={autoShowPronunciation ? 'La pronunciación se muestra siempre y no se puede ocultar' : 'La pronunciación se muestra solo al presionar el botón'}
        >
          <Toggle checked={autoShowPronunciation} onChange={setAutoShowPronunciation} />
        </SettingRow>

        <div className="border-t border-slate-800/60" />

        <div className="flex items-center gap-3 py-3">
          <div className="shrink-0">
            <Gauge className="h-5 w-5 text-slate-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Velocidad de voz</div>
              <span className="text-xs font-mono text-brand-300">{speechRate.toFixed(2)}×</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] text-slate-500">Lento</span>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={speechRate}
                onChange={(e) => setSpeechRate(Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-700 accent-brand-500"
              />
              <span className="text-[10px] text-slate-500">Rápido</span>
            </div>
            <div className="mt-1.5 flex justify-between px-0">
              {[0.5, 0.75, 1.0, 1.25, 1.5].map((v) => (
                <button
                  key={v}
                  onClick={() => setSpeechRate(v)}
                  className={`text-[10px] transition ${
                    speechRate === v ? 'text-brand-400 font-semibold' : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  {v}×
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800/60" />

        <div className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Sensibilidad de pronunciación</div>
              <div className="text-xs text-slate-400">Cuánto debe coincidir la pronunciación para avanzar.</div>
            </div>
            <div className="text-xs font-mono text-brand-300">{Math.round(speechStrictness * 100)}%</div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] text-slate-500">Flexible</span>
            <input
              type="range"
              min={0.6}
              max={1}
              step={0.05}
              value={speechStrictness}
              onChange={(e) => setSpeechStrictness(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-700 accent-brand-500"
            />
            <span className="text-[10px] text-slate-500">Estricto</span>
          </div>
        </div>

        {englishVoices.length > 0 && (
          <>
            <div className="border-t border-slate-800/60" />
            <div className="py-3">
              <div className="flex items-center gap-3">
                <UserRound className="h-5 w-5 shrink-0 text-slate-400" />
                <div className="text-sm font-medium">Voz</div>
              </div>
              <div className="mt-3 space-y-1">
                <VoiceOption
                  label="Automática"
                  sublabel="La mejor voz disponible"
                  selected={speechVoiceURI === ''}
                  onSelect={() => setSpeechVoiceURI('')}
                  onPreview={() => speak('The quick brown fox jumps over the lazy dog')}
                />
                {englishVoices.map((v) => (
                  <VoiceOption
                    key={v.voiceURI}
                    label={v.name}
                    sublabel={v.lang}
                    selected={speechVoiceURI === v.voiceURI}
                    onSelect={() => setSpeechVoiceURI(v.voiceURI)}
                    onPreview={() => speak('The quick brown fox jumps over the lazy dog')}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="card space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Progreso</h2>
        <p className="pb-1 text-xs text-slate-500">
          {totalWords} {totalWords === 1 ? 'palabra practicada' : 'palabras practicadas'}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={handleExport} disabled={totalWords === 0} className="btn-secondary flex-1">
            <Download className="h-4 w-4" /> Exportar progreso
          </button>

          <button onClick={() => importInputRef.current?.click()} className="btn-secondary flex-1">
            <Upload className="h-4 w-4" /> Importar progreso
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>

        {importStatus === 'ok' && (
          <div className="mt-2 flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Progreso importado correctamente
          </div>
        )}
        {importStatus === 'error' && (
          <div className="mt-2 flex items-center gap-2 text-sm text-rose-400">
            <AlertCircle className="h-4 w-4" /> Archivo inválido, verifica que sea un respaldo correcto
          </div>
        )}
      </div>
    </div>
  )
}

function SettingRow({
  icon,
  label,
  description,
  children,
}: {
  icon: React.ReactNode
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3">
        <div className="shrink-0">{icon}</div>
        <div>
          <div className="text-sm font-medium">{label}</div>
          {description && <div className="text-xs text-slate-400">{description}</div>}
        </div>
      </div>
      {children}
    </div>
  )
}

function VoiceOption({
  label,
  sublabel,
  selected,
  onSelect,
  onPreview,
}: {
  label: string
  sublabel: string
  selected: boolean
  onSelect: () => void
  onPreview: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition ${
        selected
          ? 'bg-brand-600/20 ring-1 ring-brand-500/50'
          : 'hover:bg-slate-800/60'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full transition ${selected ? 'bg-brand-400' : 'bg-slate-600'}`} />
        <div>
          <div className={`text-sm ${selected ? 'font-medium text-slate-100' : 'text-slate-300'}`}>{label}</div>
          <div className="text-[11px] text-slate-500">{sublabel}</div>
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onSelect(); setTimeout(onPreview, 50) }}
        className="btn-ghost p-1.5 text-slate-400 hover:text-brand-300"
        title="Escuchar ejemplo"
      >
        <Play className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
