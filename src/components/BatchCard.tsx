import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mic, Keyboard, Bookmark } from 'lucide-react'
import type { Batch } from '../types'
import { ProgressBar } from './ProgressBar'
import { useProgressStore } from '../store/useProgressStore'
import { useDevice } from '../hooks/useDevice'
import { useMemo } from 'react'

interface Props {
  batch: Batch
}

export function BatchCard({ batch }: Props) {
  const progress = useProgressStore((s) => s.progress)
  const { isMobile } = useDevice()

  const stats = useMemo(() => {
    let mastered = 0
    let hard = 0
    for (const id of batch.wordIds) {
      const p = progress[id]
      if (!p) continue
      if (p.attempts > 0 && (p.lastScore ?? 0) >= 0.75) mastered++
      if (p.isHard) hard++
    }
    const ratio = mastered / batch.size
    return { mastered, hard, ratio }
  }, [batch, progress])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="card flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400">
            Palabras {batch.start + 1}–{batch.end}
          </div>
          <div className="text-lg font-semibold">{batch.label}</div>
        </div>
        <div className="text-right text-xs">
          <div className="text-emerald-400">{stats.mastered}/{batch.size} dominadas</div>
          {stats.hard > 0 && (
            <div className="mt-0.5 inline-flex items-center gap-1 text-amber-400">
              <Bookmark className="h-3 w-3" />
              {stats.hard} difíciles
            </div>
          )}
        </div>
      </div>

      <ProgressBar value={stats.ratio} />

      <div className="mt-1 flex flex-wrap gap-2">
        {!isMobile && (
          <Link to={`/practice/${batch.index}`} className="btn-primary flex-1">
            <Keyboard className="h-4 w-4" />
            Escribir
          </Link>
        )}
        <Link to={`/speak/${batch.index}`} className={`btn-secondary ${isMobile ? 'flex-1' : ''}`}>
          <Mic className="h-4 w-4" />
          Pronunciar
        </Link>
      </div>
    </motion.div>
  )
}
