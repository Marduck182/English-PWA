interface PracticeSummaryProps {
  title: string
  total: number
  reviewed: number
  correct: number
  skipped: number
  hard: number
  average: number
  attempts: number
  onRestart: () => void
  onHome: () => void
}

export function PracticeSummary({
  title,
  total,
  reviewed,
  correct,
  skipped,
  hard,
  average,
  attempts,
  onRestart,
  onHome
}: PracticeSummaryProps) {
  return (
    <div className="space-y-6">
      <div className="card text-center">
        <div className="text-xs uppercase tracking-widest text-slate-400">{title}</div>
        <h1 className="mt-3 text-3xl font-bold">Lote completado</h1>
        <p className="mt-2 text-sm text-slate-400">Aquí están tus resultados para este lote.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card border-slate-700/70 bg-slate-950/80 p-4">
          <div className="text-sm uppercase tracking-[0.24em] text-slate-400">Palabras totales</div>
          <div className="mt-3 text-3xl font-semibold text-slate-100">{total}</div>
        </div>
        <div className="card border-slate-700/70 bg-slate-950/80 p-4">
          <div className="text-sm uppercase tracking-[0.24em] text-slate-400">Correctas</div>
          <div className="mt-3 text-3xl font-semibold text-emerald-300">{correct}</div>
          <div className="mt-2 text-xs text-slate-500">{Math.round((correct / total) * 100)}%</div>
        </div>
        <div className="card border-slate-700/70 bg-slate-950/80 p-4">
          <div className="text-sm uppercase tracking-[0.24em] text-slate-400">Saltadas</div>
          <div className="mt-3 text-3xl font-semibold text-slate-100">{skipped}</div>
        </div>
        <div className="card border-slate-700/70 bg-slate-950/80 p-4">
          <div className="text-sm uppercase tracking-[0.24em] text-slate-400">Difíciles</div>
          <div className="mt-3 text-3xl font-semibold text-amber-300">{hard}</div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card border-slate-700/70 bg-slate-950/80 p-4">
          <div className="text-sm uppercase tracking-[0.24em] text-slate-400">Intentos totales</div>
          <div className="mt-3 text-3xl font-semibold text-slate-100">{attempts}</div>
        </div>
        <div className="card border-slate-700/70 bg-slate-950/80 p-4">
          <div className="text-sm uppercase tracking-[0.24em] text-slate-400">Precisión media</div>
          <div className="mt-3 text-3xl font-semibold text-slate-100">{average}%</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button onClick={onRestart} className="btn-primary flex-1">
          Repetir lote
        </button>
        <button onClick={onHome} className="btn-secondary flex-1">
          Volver a lotes
        </button>
      </div>
    </div>
  )
}
