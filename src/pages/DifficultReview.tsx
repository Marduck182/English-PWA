import { useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
import { ArrowLeft, ArrowRight, Bookmark, BookmarkX, Check, Eye, RotateCcw, Volume2, X } from 'lucide-react'
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
import type { Word } from '../types'

const MAX_WRONG_BEFORE_REVEAL = 3
const AUTO_ADVANCE_MS = 600

export function DifficultReview() {
  const navigate = useNavigate()
  const { byId, loaded } = useWordsStore()
  const progress = useProgressStore((s) => s.progress)
  const markHard = useProgressStore((s) => s.markHard)
  const recordTyping = useProgressStore((s) => s.recordTyping)
  const autoPlaySound = useSettingsStore((s) => s.autoPlaySound)
  const { speak } = useSpeak()

  const [position, setPosition] = useState(0)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong' | 'revealed'>('idle')
  const [wrongCount, setWrongCount] = useState(0)
  const [showSummary, setShowSummary] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const advanceTimerRef = useRef<number | null>(null)
  const shakeControls = useAnimationControls()

  const hardWords = useMemo<Word[]>(() => {
    const out: Word[] = []
    for (const [id, p] of Object.entries(progress)) {
      if (!p.isHard) continue
      const w = byId.get(Number(id))
      if (w) out.push(w)
    }
    return out
  }, [progress, byId])

  const hardWordsKey = useMemo(() => hardWords.map((w) => w.id).join(','), [hardWords])
  const [shuffledHardWords, setShuffledHardWords] = useState<Word[]>([])

  useEffect(() => {
    setShuffledHardWords(shuffleArray(hardWords))
    setPosition(0)
  }, [hardWordsKey])

  const word = shuffledHardWords[position] ?? null

  const summary = useMemo(() => {
    let reviewed = 0
    let correct = 0
    let hard = hardWords.length
    let attempts = 0
    let lastScoreTotal = 0

    for (const item of hardWords) {
      const p = progress[item.id]
      if (!p || p.attempts === 0) continue
      reviewed++
      attempts += p.attempts
      if ((p.lastScore ?? 0) >= 0.75) correct++
      lastScoreTotal += p.lastScore ?? 0
    }

    const skipped = hardWords.length - reviewed
    const average = reviewed > 0 ? Math.round((lastScoreTotal / reviewed) * 100) : 0

    return {
      total: hardWords.length,
      reviewed,
      correct,
      skipped,
      hard,
      attempts,
      average
    }
  }, [hardWords, progress])

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    clearAdvanceTimer()
    setInput('')
    setFeedback('idle')
    setWrongCount(0)
  }, [position, clearAdvanceTimer])

  useEffect(() => clearAdvanceTimer, [clearAdvanceTimer])

  useEffect(() => {
    if (autoPlaySound && word) speak(word.english)
  }, [word, autoPlaySound, speak])

  const setInputRef = useCallback((el: HTMLInputElement | null) => {
    inputRef.current = el
    if (el && !el.disabled) {
      requestAnimationFrame(() => {
        if (document.activeElement !== el) el.focus()
      })
    }
  }, [])

  const next = useCallback(() => {
    if (position >= shuffledHardWords.length - 1) {
      setShowSummary(true)
      return
    }
    clearAdvanceTimer()
    setPosition((p) => Math.min(shuffledHardWords.length - 1, p + 1))
  }, [shuffledHardWords.length, clearAdvanceTimer, position])

  const prev = useCallback(() => {
    clearAdvanceTimer()
    setPosition((p) => Math.max(0, p - 1))
  }, [clearAdvanceTimer])

  const retry = useCallback(() => {
    setInput('')
    setFeedback('idle')
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const reveal = useCallback(() => {
    if (!word) return
    setFeedback('revealed')
  }, [word])

  const check = useCallback(() => {
    if (!word) return
    const ok = normalize(input) === normalize(word.english)
    if (ok) {
      setFeedback('correct')
      recordTyping(word.id, true)
      clearAdvanceTimer()
      advanceTimerRef.current = window.setTimeout(next, AUTO_ADVANCE_MS)
    } else {
      const newCount = wrongCount + 1
      setWrongCount(newCount)
      recordTyping(word.id, false)
      shakeControls.start({ x: [-12, 12, -10, 10, -6, 6, -3, 3, 0], transition: { duration: 0.45 } })
      setFeedback(newCount >= MAX_WRONG_BEFORE_REVEAL ? 'revealed' : 'wrong')
    }
  }, [word, input, recordTyping, next, wrongCount, shakeControls, clearAdvanceTimer])

  const handleEnter = useCallback(() => {
    if (feedback === 'idle') check()
    else if (feedback === 'correct' || feedback === 'revealed') next()
    else retry()
  }, [feedback, check, next, retry])

  const handleUnmark = useCallback(() => {
    if (!word) return
    markHard(word.id, false)
    setPosition((p) => Math.min(p, Math.max(0, shuffledHardWords.length - 2)))
  }, [word, markHard, shuffledHardWords.length])

  const shortcuts = useMemo(
    () => ({
      enter: handleEnter,
      escape: () => navigate('/'),
      arrowright: next,
      arrowleft: prev,
      'ctrl+arrowright': next,
      'ctrl+arrowleft': prev,
    }),
    [handleEnter, navigate, next, prev]
  )
  useShortcuts(shortcuts, ['enter', 'ctrl+arrowright', 'ctrl+arrowleft'])

  if (!loaded) return <div className="text-slate-400">Cargando…</div>

  if (hardWords.length === 0) {
    return (
      <div className="card text-center">
        <Bookmark className="mx-auto h-10 w-10 text-slate-500" />
        <h2 className="mt-3 text-xl font-semibold">No tienes palabras marcadas</h2>
        <p className="mt-1 text-sm text-slate-400">
          Marca palabras como difíciles durante la práctica con el botón "Marcar" o la tecla M.
        </p>
        <button onClick={() => navigate('/')} className="btn-primary mt-4">
          Volver a lotes
        </button>
      </div>
    )
  }

  if (showSummary && summary) {
    return (
      <PracticeSummary
        title="Repaso difícil"
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

  const ratio = shuffledHardWords.length > 0 ? (position + 1) / shuffledHardWords.length : 0
  const inputDisabled = feedback === 'correct' || feedback === 'revealed'
  const inputBorderClass =
    feedback === 'correct'
      ? 'border-emerald-500 ring-2 ring-emerald-500/30'
      : feedback === 'wrong' || feedback === 'revealed'
      ? 'border-rose-500 ring-2 ring-rose-500/30'
      : ''

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/')} className="btn-ghost">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <div className="text-sm text-slate-400">
          Difíciles · {position + 1}/{hardWords.length}
        </div>
        <button onClick={handleUnmark} className="btn-secondary" title="Quitar de difíciles">
          <BookmarkX className="h-4 w-4" />
          <span className="hidden sm:inline">Quitar</span>
        </button>
      </div>

      <ProgressBar value={ratio} />

      <AnimatePresence mode="wait">
        <motion.div
          key={word.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.18 }}
          onAnimationComplete={() => {
            if (inputRef.current && !inputRef.current.disabled) inputRef.current.focus()
          }}
          className="card text-center"
        >
          <div className="text-xs uppercase tracking-widest text-slate-400">Español</div>
          <div className="mt-1 text-3xl font-bold">{word.spanish}</div>
          {word.ipa && <div className="mt-2 font-mono text-lg text-brand-300">{word.ipa}</div>}

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
                <div className="mt-1 text-xs text-slate-500">
                  Intento {wrongCount}/{MAX_WRONG_BEFORE_REVEAL}
                </div>
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
                  {position >= shuffledHardWords.length - 1 ? 'Finalizar' : 'Siguiente'} <ArrowRight className="h-4 w-4" />
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
          Enter · Ctrl+← → navegar · Esc salir
        </div>
        <button onClick={next} className="btn-secondary">
          {position >= shuffledHardWords.length - 1 ? 'Finalizar' : 'Siguiente'} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
