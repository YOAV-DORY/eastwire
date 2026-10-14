import type { SectorDefinitionView, SectorsView, WeightedRule } from '../../api/types'
import { formatWeight } from '../../sectors'
import styles from './SectorRules.module.css'

export const RULES_FILE = 'https://github.com/YOAV-DORY/eastwire/blob/main/config/sectors.yaml'

/** "How we tag this": the scoring and every rule for one sector, straight from config/sectors.yaml. */
export function SectorRules({ rules, sector }: { rules: SectorsView; sector: SectorDefinitionView }) {
  return (
    <div className={styles.rules}>
      <p>
        A story is tagged {sector.label} when its score reaches {rules.threshold}. A keyword in the headline adds its
        weight; found only in the excerpt it adds {rules.excerptFactor * 100}% of that. GDELT themes (from text we
        never show) add at most {formatWeight(rules.themeCap)} together. A story gets at most {rules.maxSectors}{' '}
        sectors, highest score first.
      </p>
      <RuleList title="Keywords and phrases" items={sector.keywords} hint="A * matches word endings." />
      <RuleList title="Phrases that cancel a match" items={sector.negative} negative />
      <RuleList title="Publisher topic tags" items={sector.feedCategories} />
      <RuleList title="GDELT themes" items={sector.gdeltThemes} hint="A * matches every theme code starting this way." />
      <p className="muted">
        Matching ignores case and punctuation and looks at whole words. <a href={RULES_FILE}>See the rules file</a>{' '}
        (version <span className="mono">{rules.version}</span>).
      </p>
    </div>
  )
}

function RuleList({
  title,
  items,
  hint,
  negative = false,
}: {
  title: string
  items: WeightedRule[]
  hint?: string
  negative?: boolean
}) {
  if (items.length === 0) return null
  return (
    <section className={styles.group}>
      <h3 className={`${styles.groupTitle} mono muted`}>
        {title} · {items.length}
      </h3>
      {hint && <p className="muted">{hint}</p>}
      <ul className={styles.list}>
        {items.map((r) => (
          <li key={r.rule} className={styles.item}>
            <span className="mono">{r.rule}</span>{' '}
            <span className="mono muted">{formatWeight(negative ? -r.weight : r.weight)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
