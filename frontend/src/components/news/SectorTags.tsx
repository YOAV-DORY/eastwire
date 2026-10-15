import { useId, useState } from 'react'
import { Link } from 'react-router'
import type { SectorTag } from '../../api/types'
import { describeRule, formatWeight } from '../../sectors'
import { SectorIcon } from '../graphics/SectorIcon'
import styles from './SectorTags.module.css'

/**
 * A story's sectors as small icon + label buttons. Pressing one shows exactly which rules
 * tagged the story, so a tag is never a black box. Click or keyboard, never hover-only.
 */
export function SectorTags({ sectors }: { sectors: SectorTag[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const baseId = useId()
  if (sectors.length === 0) return null
  const shown = sectors.find((s) => s.slug === open)
  return (
    <div className={styles.wrap}>
      <ul className={styles.tags} aria-label="Sectors">
        {sectors.map((s) => (
          <li key={s.slug}>
            <button
              type="button"
              className={styles.tag}
              // Starts with the visible label (WCAG 2.5.3) and says what pressing it does.
              aria-label={`${s.label}: why this sector`}
              aria-expanded={open === s.slug}
              aria-controls={`${baseId}-${s.slug}`}
              onClick={() => setOpen(open === s.slug ? null : s.slug)}
            >
              <SectorIcon sector={s.slug} size={14} />
              {s.label}
            </button>
          </li>
        ))}
      </ul>
      {shown && (
        <div id={`${baseId}-${shown.slug}`} className={styles.why}>
          <p className={styles.whyTitle}>Tagged {shown.label} because of:</p>
          <ul className={styles.rules}>
            {shown.rules.map((r) => (
              <li key={`${r.kind}|${r.value}|${r.field ?? ''}`}>
                <span>{describeRule(r)}</span>
                <span className="mono muted">{formatWeight(r.weight)}</span>
              </li>
            ))}
          </ul>
          {themeNote(shown)}
          <p className="muted">
            Rule-based, no AI. <Link to={`/sector/${shown.slug}`}>How we tag {shown.label}</Link>
          </p>
        </div>
      )}
    </div>
  )
}

/** GDELT themes come from text we never show, so together they count for less; say so when that applied. */
function themeNote(tag: SectorTag) {
  const themes = tag.rules.filter((r) => r.kind === 'gdelt_theme').reduce((sum, r) => sum + r.weight, 0)
  const others = tag.rules.filter((r) => r.kind !== 'gdelt_theme').reduce((sum, r) => sum + r.weight, 0)
  const counted = Math.round((tag.score - others) * 100) / 100
  if (themes <= counted + 0.001) return null
  return <p className="muted">GDELT themes count for at most {formatWeight(counted)} together.</p>
}
