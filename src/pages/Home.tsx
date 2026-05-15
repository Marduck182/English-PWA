import { useWordsStore } from '../store/useWordsStore'
import { BatchCard } from '../components/BatchCard'
import { useDevice } from '../hooks/useDevice'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useProgressStore } from '../store/useProgressStore'

export function Home() {
  const { batches, words, loading, error, loaded } = useWordsStore()
  const progress = useProgressStore((s) => s.progress)
  const { isMobile, recognitionSupported } = useDevice()

  const totalHard = Object.values(progress).filter((p) => p.isHard).length

  if (loading || !loaded) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Cargando palabras…
      </div>
    )
  }

  if (error) {
    return (
      <div className="card border-rose-700/50 text-rose-300">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4" /> Error al cargar
        </div>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Selecciona un lote</h1>
          <p className="text-sm text-slate-400">
            {words.length.toLocaleString()} palabras · {batches.length} lotes de 50
            {isMobile && ' · Modo pronunciación'}
          </p>
        </div>
        {totalHard > 0 && (
          <div className="chip bg-amber-500/15 text-amber-300">
            {totalHard} palabras marcadas como difíciles
          </div>
        )}
      </div>

      {!recognitionSupported && (
        <div className="card border-amber-700/40 bg-amber-500/10 text-amber-200">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" /> Aviso de compatibilidad
          </div>
          <p className="mt-1 text-sm">
            Tu navegador no soporta reconocimiento de voz (Web Speech API). El modo de pronunciación funcionará mejor en
            Chrome o Edge en desktop, o Chrome para Android.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {batches.map((b) => (
          <BatchCard key={b.index} batch={b} />
        ))}
      </div>
    </div>
  )
}
