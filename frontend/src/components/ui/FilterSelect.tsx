import { ChevronDown } from 'lucide-react'
import styles from './FilterSelect.module.css'

/**
 * A compact filter for narrow screens: a pill that always shows its label and the active
 * choice ("Country: Japan"). A native select covers the whole pill, so one tap opens the
 * system picker with every option, and assistive tech gets a plain "Country" combo box.
 */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string | undefined
  options: { value: string | undefined; label: string }[]
  onChange: (value: string | undefined) => void
}) {
  const current = options.find((o) => o.value === value) ?? options[0]
  return (
    <div className={styles.pill} data-active={value !== undefined || undefined}>
      <span className={styles.text} aria-hidden="true">
        <span className={styles.label}>{label}:</span> <strong>{current?.label}</strong>
      </span>
      <ChevronDown className={styles.chevron} size={16} strokeWidth={2} aria-hidden="true" />
      <select aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
        {options.map((o) => (
          <option key={o.value ?? ''} value={o.value ?? ''}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
