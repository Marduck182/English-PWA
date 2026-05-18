import { useNavigate, useParams } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Bookmark, Mic, MicOff, RotateCcw, Volume2 } from 'lucide-react'
import { useWordsStore } from '../store/useWordsStore'
import { useProgressStore } from '../store/useProgressStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useSpeak } from '../hooks/useSpeak'
import { useRecognize } from '../hooks/useRecognize'
import { useShortcuts } from '../hooks/useShortcuts'
import { ProgressBar } from '../components/ProgressBar'
import { PracticeSummary } from '../components/PracticeSummary'
import { shuffleArray } from '../utils/shuffle'
import { sentenceSimilarity, scoreToPercent, scoreLabel } from '../utils/similarity'

export function SpeakingPractice() {
  const { batchId } = useParams()
  const navigate = useNavigate()
  const idx = Number(batchId)
  const { batches, byId, loaded } = useWordsStore()
  const batch = batches[idx]

  const [position, setPosition] = useState(0)
  const [score, setScore] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const autoAdvanceTimerRef = useRef<number | null>(null)

  const shuffledWordIds = useMemo(() => (batch ? shuffleArray(batch.wordIds) : []), [batch])
  const currentWordId = shuffledWordIds[position] ?? -1

  const recordSpeaking = useProgressStore((s) => s.recordSpeaking)
  const toggleHard = useProgressStore((s) => s.toggleHard)
  const isHard = useProgressStore((s) => s.progress[currentWordId]?.isHard ?? false)
  const speakMode = useSettingsStore((s) => s.speakMode)
  const speechStrictness = useSettingsStore((s) => s.speechStrictness)
  const { speak, speaking, supported: ttsSupported } = useSpeak()

  const word = useMemo(() => {
    if (!batch) return null
    const id = shuffledWordIds[position]
    return id ? byId.get(id) ?? null : null
  }, [batch, byId, position, shuffledWordIds])

  const target = speakMode === 'word'
    ? (word?.english || '')
    : (word?.sentence || word?.english || '')

  const progress = useProgressStore((s) => s.progress)
  const summary = useMemo(() => {
    if (!batch) return null
    let reviewed = 0
    let correct = 0
    let hard = 0
    let attempts = 0
    let lastScoreTotal = 0
    for (const id of batch.wordIds) {
      const p = progress[id]
      if (!p || p.attempts === 0) continue
      reviewed++
      attempts += p.attempts
      if ((p.lastScore ?? 0) >= 0.75) correct++
      lastScoreTotal += p.lastScore ?? 0
      if (p.isHard) hard++
    }
    const skipped = batch.wordIds.length - reviewed
    const average = reviewed > 0 ? Math.round((lastScoreTotal / reviewed) * 100) : 0
    return {
      total: batch.wordIds.length,
      reviewed,
      correct,
      skipped,
      hard,
      attempts,
      average
    }
  }, [batch, progress])

  const next = useCallback(() => {
    if (!batch) return
    if (position >= batch.wordIds.length - 1) {
      setShowSummary(true)
      return
    }
    setPosition((p) => Math.min(batch.wordIds.length - 1, p + 1))
  }, [batch, position])

  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current !== null) {
      window.clearTimeout(autoAdvanceTimerRef.current)
      autoAdvanceTimerRef.current = null
    }
  }, [])

  const onResult = useCallback(
    (text: string, isFinal: boolean) => {
      if (!isFinal || !word) return
      const s = sentenceSimilarity(text, target)
      setScore(s)
      recordSpeaking(word.id, s)
      if (s >= speechStrictness) {
        clearAutoAdvanceTimer()
        autoAdvanceTimerRef.current = window.setTimeout(next, 500)
      }
    },
    [word, target, recordSpeaking, next, clearAutoAdvanceTimer]
  )

  const { start, stop, reset, listening, transcript, interim, error, supported } = useRecognize({ onResult })

  useEffect(() => clearAutoAdvanceTimer, [clearAutoAdvanceTimer])

  useEffect(() => {
    setScore(null)
    setShowAnswer(false)
    reset()
    stop()
    clearAutoAdvanceTimer()
  }, [position, reset, stop, clearAutoAdvanceTimer])

  const prev = useCallback(() => setPosition((p) => Math.max(0, p - 1)), [])
  const retry = useCallback(() => {
    setScore(null)
    reset()
  }, [reset])
  const toggleMic = useCallback(() => {
    if (listening) stop()
    else {
      reset()
      setScore(null)
      start()
    }
  }, [listening, stop, reset, start])

  const shortcuts = useMemo(
    () => ({
      enter: toggleMic,
      space: () => speak(target),
      escape: () => navigate('/'),
      arrowright: next,
      arrowleft: prev,
      'ctrl+arrowright': next,
      'ctrl+arrowleft': prev,
      m: () => word && toggleHard(word.id)
    }),
    [toggleMic, speak, target, navigate, next, prev, toggleHard, word]
  )
  useShortcuts(shortcuts)

  if (!loaded) return <div className="text-slate-400">Cargando…</div>
  if (!batch) {
    return (
      <div className="card">
        Lote no encontrado.{' '}
        <button onClick={() => navigate('/')} className="btn-primary mt-3">
          Volver
        </button>
      </div>
    )
  }

  if (showSummary && summary) {
    return (
      <PracticeSummary
        title={batch.label}
        total={summary.total}
        reviewed={summary.reviewed}
        correct={summary.correct}
        skipped={summary.skipped}
        hard={summary.hard}
        average={summary.average}
        attempts={summary.attempts}
        onRestart={() => {
          setShowSummary(false)
          setPosition(0)
          setScore(null)
          setShowAnswer(false)
          reset()
        }}
        onHome={() => navigate('/')}
      />
    )
  }

  if (!word) return null

  const ratio = (position + 1) / batch.wordIds.length
  const pct = score === null ? null : scoreToPercent(score)
  const lbl = score === null ? null : scoreLabel(score)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/')} className="btn-ghost">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <div className="text-sm text-slate-400">
          {batch.label} · {position + 1}/{batch.wordIds.length}
        </div>
        <motion.button
          onClick={() => toggleHard(word.id)}
          className={`btn ${isHard ? 'bg-amber-500 text-slate-900 hover:bg-amber-400' : 'btn-ghost'}`}
          title="Marcar como difícil (M)"
          whileTap={{ scale: 0.85 }}
        >
          <motion.span
            key={String(isHard)}
            initial={{ scale: 0.6, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 450, damping: 14 }}
            className="flex items-center"
          >
            <Bookmark className="h-4 w-4" fill={isHard ? 'currentColor' : 'none'} />
          </motion.span>
          <span className="hidden sm:inline">{isHard ? 'Difícil' : 'Marcar'}</span>
        </motion.button>
      </div>

      <ProgressBar value={ratio} />

      {!supported && (
        <div className="card border-amber-700/40 bg-amber-500/10 text-amber-200">
          <div className="font-medium">Reconocimiento de voz no disponible</div>
          <p className="mt-1 text-sm">
            Este navegador no soporta Web Speech Recognition. Prueba en Chrome (desktop), Edge o Chrome para Android.
            iOS Safari tiene soporte limitado.
          </p>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={word.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className="card text-center"
        >
          <div className="text-xs uppercase tracking-widest text-slate-400">
            {speakMode === 'word' ? 'Pronuncia la palabra' : 'Pronuncia la frase'}
          </div>
          <div className="mt-2 text-2xl font-semibold leading-snug">{target}</div>
          {speakMode === 'word' && word.ipa && (
            <div className="mt-2 font-mono text-base text-brand-300">{word.ipa}</div>
          )}
          {showAnswer && word.sentenceSpanish && (
            <div className="mt-3 text-sm text-slate-400">{word.sentenceSpanish}</div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={toggleMic}
              disabled={!supported}
              className={`btn h-14 w-14 rounded-full p-0 ${
                listening
                  ? 'bg-rose-600 text-white hover:bg-rose-500 animate-pulse-soft'
                  : 'bg-brand-600 text-white hover:bg-brand-500'
              }`}
              aria-label={listening ? 'Detener' : 'Grabar'}
            >
              {listening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>
            <button
              onClick={() => speak(target)}
              disabled={!ttsSupported || speaking}
              className="btn-secondary"
            >
              <Volume2 className="h-4 w-4" /> Escuchar
            </button>
            {(score !== null || transcript) && (
              <button onClick={retry} className="btn-ghost">
                <RotateCcw className="h-4 w-4" /> Reintentar
              </button>
            )}
          </div>

          {(transcript || interim) && (
            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-left">
              <div className="text-xs uppercase text-slate-500">Te escuché</div>
              <div className="mt-1 text-slate-200">
                {transcript}
                <span className="text-slate-500 italic"> {interim}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 text-sm text-rose-400">
              <div>{error.message}</div>
              {error.hint && <div className="mt-1 text-xs text-rose-300/70">{error.hint}</div>}
              {error.code === 'network' && (
                <button
                  onClick={() => { reset(); setScore(null); start() }}
                  className="btn-ghost mt-2 text-xs text-rose-300"
                >
                  <RotateCcw className="h-3 w-3" /> Intentar de nuevo
                </button>
              )}
            </div>
          )}

          <AnimatePresence>
            {pct !== null && lbl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="mt-5"
              >
                <div className={`text-4xl font-bold ${lbl.color}`}>{pct}%</div>
                <div className={`mt-1 text-sm ${lbl.color}`}>{lbl.label}</div>
                <div className="mt-3">
                  <ProgressBar value={pct / 100} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!showAnswer && (
            <button onClick={() => setShowAnswer(true)} className="btn-ghost mt-4 text-xs">
              Mostrar traducción
            </button>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <button onClick={prev} disabled={position === 0} className="btn-secondary">
          <ArrowLeft className="h-4 w-4" /> Anterior
        </button>
        <div className="hidden text-xs text-slate-500 sm:block">
          Enter grabar · Espacio escuchar · ← → navegar · M marcar
        </div>
        <button onClick={next} className="btn-secondary">
          {position >= batch.wordIds.length - 1 ? 'Finalizar' : 'Siguiente'} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
