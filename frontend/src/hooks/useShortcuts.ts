import { useCallback, useEffect, useState } from 'react'

/** Single-key shortcuts can be turned off (WCAG 2.1.4). The choice is kept on this device only. */
export const SHORTCUTS_STORAGE_KEY = 'eastwire.shortcuts'

function readEnabled(): boolean {
  try {
    return localStorage.getItem(SHORTCUTS_STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

export function useShortcutsSetting() {
  const [enabled, setEnabledState] = useState(readEnabled)
  const setEnabled = useCallback((next: boolean) => {
    try {
      localStorage.setItem(SHORTCUTS_STORAGE_KEY, next ? 'on' : 'off')
    } catch {
      // Storage unavailable: the choice applies for this visit only.
    }
    setEnabledState(next)
  }, [])
  return { enabled, setEnabled }
}

/** True when the key press happened while typing, where letters must stay letters. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

/**
 * Global single-key shortcuts. Ignored while typing, with modifier keys held, or when the
 * reader has turned shortcuts off.
 */
export function useHotkeys(enabled: boolean, bindings: Record<string, (event: KeyboardEvent) => void>) {
  useEffect(() => {
    if (!enabled) return
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return
      const handler = bindings[event.key]
      if (handler) {
        event.preventDefault()
        handler(event)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, bindings])
}
