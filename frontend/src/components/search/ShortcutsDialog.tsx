import { useEffect, useRef } from 'react'
import { Button } from '../ui/Button'
import { Kbd } from '../ui/Kbd'
import styles from './ShortcutsDialog.module.css'

export interface ShortcutsDialogProps {
  open: boolean
  onClose: () => void
  enabled: boolean
  onToggle: (enabled: boolean) => void
}

/** Lists the keyboard shortcuts and lets readers turn single-key shortcuts off (WCAG 2.1.4). */
export function ShortcutsDialog({ open, onClose, enabled, onToggle }: ShortcutsDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal?.()
    if (!open && dialog.open) dialog.close?.()
  }, [open])

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby="shortcuts-title" onClose={onClose} onCancel={onClose}>
      <h2 id="shortcuts-title" className={styles.title}>
        Keyboard shortcuts
      </h2>
      <dl className={styles.list}>
        <div>
          <dt>
            <Kbd>/</Kbd>
          </dt>
          <dd>Focus search</dd>
        </div>
        <div>
          <dt>
            <Kbd>?</Kbd>
          </dt>
          <dd>Show this list</dd>
        </div>
      </dl>
      <label className={styles.toggle}>
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
        Single-key shortcuts
      </label>
      <p className="muted">Turn these off if they get in the way of your screen reader or speech input.</p>
      <Button onClick={onClose}>Close</Button>
    </dialog>
  )
}
