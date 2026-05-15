import { ReactNode, useEffect } from 'react'
import { Header } from './Header'
import { useWordsStore } from '../store/useWordsStore'

export function Layout({ children }: { children: ReactNode }) {
  const load = useWordsStore((s) => s.load)
  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t border-slate-800/60 py-4 text-center text-xs text-slate-500">
        Hecho con Web Speech API · Funciona offline
      </footer>
    </div>
  )
}
