import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import styles from './Picker.module.css'

/**
 * A choice from a list, drawn as a pill ("City  All of Japan ⌄"). The native select stays
 * underneath, so keyboards, screen readers and the phone's own option list all work.
 */
export function Picker({
  label,
  hideLabel = false,
  icon,
  value,
  onChange,
  children,
}: {
  label: string
  /** The label is still read out, only not shown (e.g. when the icon says it). */
  hideLabel?: boolean
  icon?: ReactNode
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <label className={styles.picker}>
      {icon}
      <span className={hideLabel ? 'visually-hidden' : styles.label}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
      <ChevronDown size={16} strokeWidth={2} aria-hidden="true" className={styles.chevron} />
    </label>
  )
}
