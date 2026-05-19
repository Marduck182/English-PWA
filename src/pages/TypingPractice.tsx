import { useNavigate, useParams } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
import { ArrowLeft, ArrowRight, Bookmark, Check, Eye, EyeOff, LayoutList, RotateCcw, Volume2, X } from 'lucide-react'
import { useWordsStore } from '../store/useWordsStore'
import { useProgressStore } from '../store/useProgressStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useSpeak } from '../hooks/useSpeak'
import { useShortcuts } from '../hooks/useShortcuts'
import { normalize } from '../utils/normalize'
import { buildHint } from '../utils/hint'
import { shuffleArray } from '../utils/shuffle'
import { ProgressBar } from '../components/ProgressBar'
import { PracticeSummary } from '../components/PracticeSummary'

const MAX_WRONG_BEFORE_REVEAL = 3
const AUTO_ADVANCE_MS = 600

export function TypingPractice() {
  const { batchId } = useParams()
  const navigate = useNavigate()
  const idx = Number(batchId)
  const { batches, byId, loaded } = useWordsStore()
  const batch = batches[idx]

  const [position, setPosition] = useState(0)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong' | 'revealed'>('idle')
  const [wrongCount, setWrongCount] = useState(0)
  const [showSummary, setShowSummary] = useState(false)
  const showIPA = useSettingsStore((s) => s.showIPA)
  const setShowIPA = useSettingsStore((s) => s.setShowIPA)
  const showBatchList = useSettingsStore((s) => s.showBatchList)
  const setShowBatchList = useSettingsStore((s) => s.setShowBatchList)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const advanceTimerRef = useRef<number | null>(null)
  const shakeControls = useAnimationControls()

  const shuffledWordIds = useMemo(() => (batch ? shuffleArray(batch.wordIds) : []), [batch])
  const currentWordId = shuffledWordIds[position] ?? -1

  const recordTyping = useProgressStore((s) => s.recordTyping)
  const toggleHard = useProgressStore((s) => s.toggleHard)
  const markHard = useProgressStore((s) => s.markHard)
  const isHard = useProgressStore((s) => s.progress[currentWordId]?.isHard ?? false)
  const autoPlaySound = useSettingsStore((s) => s.autoPlaySound)
  const { speak } = useSpeak()

  const word = useMemo(() => {
    if (!batch) return null
    const id = shuffledWordIds[position]
    return id ? byId.get(id) ?? null : null
  }, [batch, byId, position, shuffledWordIds])

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }
  }, [])

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

  // Reset state on word change. Focus is handled via callback ref + onAnimationComplete
  // because the input is inside an AnimatePresence and only mounts after the previous
  // word's exit animation completes.
  useEffect(() => {
    clearAdvanceTimer()
    setInput('')
    setFeedback('idle')
    setWrongCount(0)
  }, [position, clearAdvanceTimer])

  // Auto-play pronunciation when word changes (if setting is enabled)
  useEffect(() => {
    if (autoPlaySound && word) speak(word.english)
  }, [word, autoPlaySound, speak])

  // Cleanup any running timer on unmount
  useEffect(() => clearAdvanceTimer, [clearAdvanceTimer])

  // Callback ref: as soon as the new input mounts, focus it.
  // This fires AFTER AnimatePresence has mounted the new instance.
  const setInputRef = useCallback((el: HTMLInputElement | null) => {
    inputRef.current = el
    if (el && !el.disabled) {
      // Defer to next frame to avoid focus-stealing during the enter animation.
      requestAnimationFrame(() => {
        if (document.activeElement !== el) el.focus()
      })
    }
  }, [])

  const next = useCallback(() => {
    if (!batch) return
    if (position >= batch.wordIds.length - 1) {
      navigate('/')
      return
    }
    clearAdvanceTimer()
    setPosition((p) => Math.min(batch.wordIds.length - 1, p + 1))
  }, [batch, clearAdvanceTimer, navigate, position])

  const prev = useCallback(() => {
    clearAdvanceTimer()
    setPosition((p) => Math.max(0, p - 1))
  }, [clearAdvanceTimer])

  const retry = useCallback(() => {
    setInput('')
    setFeedback('idle')
    // Re-focus on retry
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const reveal = useCallback(() => {
    if (!word) return
    setFeedback('revealed')
    markHard(word.id, true)
  }, [word, markHard])

  const check = useCallback(() => {
    if (!word) return
    const ok = normalize(input) === normalize(word.english)
    if (ok) {
      setFeedback('correct')
      recordTyping(word.id, true)
      clearAdvanceTimer()
      advanceTimerRef.current = window.setTimeout(() => {
        next()
      }, AUTO_ADVANCE_MS)
    } else {
      const newCount = wrongCount + 1
      setWrongCount(newCount)
      recordTyping(word.id, false)
      shakeControls.start({
        x: [-12, 12, -10, 10, -6, 6, -3, 3, 0],
        transition: { duration: 0.45 }
      })
      if (newCount >= MAX_WRONG_BEFORE_REVEAL) {
        setFeedback('revealed')
        markHard(word.id, true)
      } else {
        setFeedback('wrong')
      }
    }
  }, [word, input, recordTyping, next, wrongCount, shakeControls, markHard, clearAdvanceTimer])

  const handleEnter = useCallback(() => {
    if (feedback === 'idle') check()
    else if (feedback === 'correct') next()
    else if (feedback === 'revealed') next()
    else retry()
  }, [feedback, check, next, retry])

  const shortcuts = useMemo(
    () => ({
      enter: handleEnter,
      escape: () => navigate('/'),
      arrowright: next,
      arrowleft: prev,
      'ctrl+arrowright': next,
      'ctrl+arrowleft': prev,
      m: () => word && toggleHard(word.id),
      'ctrl+m': () => word && toggleHard(word.id)
    }),
    [handleEnter, navigate, next, prev, toggleHard, word]
  )
  useShortcuts(shortcuts, ['enter', 'ctrl+arrowright', 'ctrl+arrowleft', 'ctrl+m'])

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
          setInput('')
          setFeedback('idle')
          setWrongCount(0)
        }}
        onHome={() => navigate('/')}
      />
    )
  }

  if (!word) return null

  const ratio = (position + 1) / batch.wordIds.length
  const inputDisabled = feedback === 'correct' || feedback === 'revealed'

  const inputBorderClass =
    feedback === 'correct'
      ? 'border-emerald-500 ring-2 ring-emerald-500/30'
      : feedback === 'wrong' || feedback === 'revealed'
      ? 'border-rose-500 ring-2 ring-rose-500/30'
      : ''

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="btn-ghost">
            <ArrowLeft className="h-4 w-4" /> Volver
          </button>
          <motion.button
            onClick={() => setShowBatchList(!showBatchList)}
            className={`btn-ghost ${showBatchList ? 'text-brand-300' : ''}`}
            title={showBatchList ? 'Ocultar lista del lote' : 'Ver lista del lote'}
            whileTap={{ scale: 0.85 }}
          >
            <LayoutList className="h-4 w-4" />
            <span className="hidden sm:inline">{showBatchList ? 'Ocultar' : 'Lista'}</span>
          </motion.button>
        </div>
        <div className="text-sm text-slate-400">
          {batch.label} · {position + 1}/{batch.wordIds.length}
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => setShowIPA(!showIPA)}
            className="btn-ghost"
            title={showIPA ? 'Ocultar IPA' : 'Mostrar IPA'}
            whileTap={{ scale: 0.85 }}
          >
            {showIPA ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </motion.button>
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
      </div>

      {/* Main layout */}
      <div className="flex items-start gap-4">
        {/* Left: practice content */}
        <div className="flex-1 min-w-0 space-y-4">
          <ProgressBar value={ratio} />

          <AnimatePresence mode="wait">
            <motion.div
              key={word.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
              onAnimationComplete={() => {
                if (inputRef.current && !inputRef.current.disabled) {
                  inputRef.current.focus()
                }
              }}
              className="card text-center"
            >
              <div className="text-xs uppercase tracking-widest text-slate-400">Español</div>
              <div className="mt-1 text-3xl font-bold">{word.spanish}</div>
              {showIPA && word.ipa && <div className="mt-2 font-mono text-lg text-brand-300">{word.ipa}</div>}

              {wrongCount > 0 && wrongCount < MAX_WRONG_BEFORE_REVEAL && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={wrongCount}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="mt-4"
                  >
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">Pista</div>
                    <div className="mt-1 font-mono text-xl tracking-widest text-amber-300">
                      {buildHint(word.english, wrongCount === 1 ? 1 : 2)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">Intento {wrongCount}/{MAX_WRONG_BEFORE_REVEAL}</div>
                  </motion.div>
                </AnimatePresence>
              )}

              <motion.div animate={shakeControls} className="mt-6">
                <input
                  ref={setInputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value)
                    if (feedback === 'wrong') setFeedback('idle')
                  }}
                  placeholder="Escribe la palabra en inglés…"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoFocus
                  disabled={inputDisabled}
                  className={`input text-center text-2xl tracking-wide ${inputBorderClass}`}
                />
              </motion.div>

              <AnimatePresence>
                {feedback === 'correct' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="mt-4"
                  >
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1.5 text-emerald-300">
                      <Check className="h-4 w-4" /> ¡Correcto! Avanzando…
                    </div>
                  </motion.div>
                )}

                {feedback === 'wrong' && (
                  <motion.div
                    key="wrong"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4"
                  >
                    <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/15 px-3 py-1.5 text-rose-300">
                      <X className="h-4 w-4" /> Incorrecto, intenta otra vez
                    </div>
                  </motion.div>
                )}

                {feedback === 'revealed' && (
                  <motion.div
                    key="revealed"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-5 space-y-2"
                  >
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1.5 text-amber-300">
                      <Eye className="h-4 w-4" /> Respuesta
                    </div>
                    <div className="text-3xl font-bold text-emerald-300">{word.english}</div>
                    <div className="text-xs text-slate-400">Marcada como difícil para repaso</div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {feedback === 'idle' || feedback === 'wrong' ? (
                  <>
                    <button onClick={check} className="btn-primary">
                      <Check className="h-4 w-4" /> Comprobar
                    </button>
                    <button onClick={reveal} className="btn-ghost text-sm">
                      Mostrar respuesta
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => speak(word.english)} className="btn-ghost">
                      <Volume2 className="h-4 w-4" /> Escuchar
                    </button>
                    {feedback === 'revealed' && (
                      <button onClick={retry} className="btn-secondary">
                        <RotateCcw className="h-4 w-4" /> Reintentar
                      </button>
                    )}
                    <button onClick={next} className="btn-primary">
                      {position >= batch.wordIds.length - 1 ? 'Finalizar' : 'Siguiente'} <ArrowRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>

              {(feedback === 'correct' || feedback === 'revealed') && (word.sentence || word.sentenceSpanish) && (
                <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-left">
                  {word.sentence && <div className="text-slate-100">{word.sentence}</div>}
                  {word.sentenceSpanish && <div className="mt-1 text-sm text-slate-400">{word.sentenceSpanish}</div>}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between">
            <button onClick={prev} disabled={position === 0} className="btn-secondary">
              <ArrowLeft className="h-4 w-4" /> Anterior
            </button>
            <div className="hidden text-xs text-slate-500 sm:block">
              Enter · Ctrl+← → navegar · M marcar · Esc salir
            </div>
            <button onClick={next} className="btn-secondary">
              {position >= batch.wordIds.length - 1 ? 'Finalizar' : 'Siguiente'} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right: batch list panel */}
        <AnimatePresence>
          {showBatchList && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden shrink-0"
            >
              <div className="card w-56 space-y-1 p-3 max-h-[70vh] overflow-y-auto">
                <div className="mb-2 text-xs uppercase tracking-widest text-slate-400">
                  {batch.wordIds.length} palabras
                </div>
                {shuffledWordIds.map((id, i) => {
                  const w = byId.get(id)
                  if (!w) return null
                  const hard = progress[id]?.isHard ?? false
                  const isCurrent = i === position
                  return (
                    <div
                      key={id}
                      className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors ${
                        isCurrent
                          ? 'bg-brand-500/20 text-brand-200'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-4 shrink-0 text-right text-xs text-slate-500">{i + 1}</span>
                        <span className="truncate">{w.spanish}</span>
                      </div>
                      <motion.button
                        onClick={() => toggleHard(id)}
                        className={`ml-1 shrink-0 rounded p-1 transition-colors ${
                          hard
                            ? 'text-amber-400 hover:text-amber-300'
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                        title={hard ? 'Quitar difícil' : 'Marcar difícil'}
                        whileTap={{ scale: 0.8 }}
                      >
                        <Bookmark className="h-3 w-3" fill={hard ? 'currentColor' : 'none'} />
                      </motion.button>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
