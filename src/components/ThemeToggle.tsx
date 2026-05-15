import { Moon, Sun } from 'lucide-react'
import { useSettingsStore } from '../store/useSettingsStore'

export function ThemeToggle() {
  const theme = useSettingsStore((s) => s.theme)
  const toggle = useSettingsStore((s) => s.toggleTheme)
  return (
    <button
      onClick={toggle}
      className="btn-ghost"
      aria-label={theme === 'dark' ? 'Cambiar a claro' : 'Cambiar a oscuro'}
      title={theme === 'dark' ? 'Cambiar a claro' : 'Cambiar a oscuro'}
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}
