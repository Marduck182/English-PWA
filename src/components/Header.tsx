import { useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { GraduationCap, BookmarkCheck, Settings2 } from 'lucide-react'

export function Header() {
  const loc = useLocation()
  const navigate = useNavigate()
  const prevPathRef = useRef<string>('/')
  const onReview = loc.pathname.startsWith('/review')
  const onSettings = loc.pathname.startsWith('/settings')

  const handleSettings = () => {
    if (onSettings) {
      navigate(prevPathRef.current)
    } else {
      prevPathRef.current = loc.pathname + loc.search
      navigate('/settings')
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/70 bg-slate-950/80 backdrop-blur dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-900/30 group-hover:bg-brand-500 transition">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Aprender Inglés</div>
            <div className="text-[11px] text-slate-400">Vocabulario · Pronunciación</div>
          </div>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            to="/review"
            className={`btn ${onReview ? 'bg-brand-600 text-white hover:bg-brand-500' : 'btn-ghost'}`}
          >
            <BookmarkCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Difíciles</span>
          </Link>
          <button
            onClick={handleSettings}
            className={`btn ${onSettings ? 'bg-brand-600 text-white hover:bg-brand-500' : 'btn-ghost'}`}
            aria-label="Configuración"
            title="Configuración"
          >
            <Settings2 className="h-5 w-5" />
          </button>
        </nav>
      </div>
    </header>
  )
}
