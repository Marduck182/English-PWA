import { useEffect } from 'react'

type Handler = () => void

export interface ShortcutMap {
  [key: string]: Handler | undefined
}

/**
 * Register keyboard shortcuts. Keys are lowercased event.key values.
 * Special keys: 'enter', 'escape', 'space' (mapped to ' '), 'arrowleft'/'arrowright'.
 * Modifier prefixes (combined with '+'): 'ctrl' (also matches Cmd on Mac), 'alt', 'shift'.
 * Examples: 'ctrl+arrowleft', 'shift+enter', 'ctrl+shift+m'.
 *
 * Shortcuts are ignored when focus is in an editable field UNLESS the key
 * (with the same modifier prefix string) appears in `allowInInput`.
 */
export function useShortcuts(map: ShortcutMap, allowInInput: string[] = []) {
  useEffect(() => {
    function isEditable(target: EventTarget | null): boolean {
      if (!target || !(target instanceof HTMLElement)) return false
      const tag = target.tagName.toLowerCase()
      return tag === 'input' || tag === 'textarea' || target.isContentEditable
    }

    function handler(ev: KeyboardEvent) {
      let key = ev.key.toLowerCase()
      if (key === ' ') key = 'space'
      // Don't fire on lone modifier keys
      if (key === 'control' || key === 'meta' || key === 'alt' || key === 'shift') return

      const parts: string[] = []
      if (ev.ctrlKey || ev.metaKey) parts.push('ctrl')
      if (ev.altKey) parts.push('alt')
      if (ev.shiftKey) parts.push('shift')
      parts.push(key)
      const fullKey = parts.join('+')

      const fn = map[fullKey]
      if (!fn) return
      if (isEditable(ev.target) && !allowInInput.includes(fullKey)) return
      ev.preventDefault()
      fn()
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [map, allowInInput])
}
