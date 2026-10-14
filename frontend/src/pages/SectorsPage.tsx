import { Link } from 'react-router'
import { useSectors } from '../api/queries'
import { RULES_FILE } from '../components/news/SectorRules'
import { ErrorState } from '../components/status/Feedback'
import { Skeleton } from '../components/ui/Skeleton'
import { SECTORS, sectorColor } from '../sectors'
import styles from './SectorsPage.module.css'

const DOCS = 'https://github.com/YOAV-DORY/eastwire/blob/main/docs/sectors.md'

/** /sectors — the six sectors, what each means, and how many recent stories carry it. */
export function SectorsPage() {
  const sectors = useSectors()
  const byId = new Map((sectors.data?.sectors ?? []).map((s) => [s.slug, s]))
  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <h1 className={styles.title}>Sectors</h1>
        <p className="muted">
          Stories are tagged by published rules, not AI: keywords in the headline or excerpt, the publisher&apos;s own
          topic tags and GDELT themes. Every tag on a story can show the exact rules that matched. A story gets at most
          two sectors, and many get none.
        </p>
      </div>

      {sectors.isError && !sectors.data && (
        <ErrorState message="Sector counts are unavailable right now." onRetry={() => void sectors.refetch()} />
      )}

      <ul className={styles.grid}>
        {SECTORS.map((s) => {
          const d = byId.get(s.id)
          return (
            <li key={s.id}>
              <Link to={`/sector/${s.id}`} className={styles.card}>
                <span className={styles.name}>
                  <span className={styles.dot} style={{ background: sectorColor(s.id) }} aria-hidden="true" />
                  {s.label}
                </span>
                {d ? <span className="muted">{d.definition}</span> : <Skeleton height="2.8em" />}
                <span className="mono muted">{d ? `${d.last7d} ${d.last7d === 1 ? 'story' : 'stories'} · 7 days` : ' '}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      {sectors.data && (
        <p className="mono muted">
          {sectors.data.untagged7d} {sectors.data.untagged7d === 1 ? 'story' : 'stories'} from the last 7 days matched no
          sector and show no tag.
        </p>
      )}

      <section className={styles.section} aria-labelledby="accuracy">
        <h2 id="accuracy" className={`${styles.heading} mono muted`}>
          How accurate is it?
        </h2>
        <p>
          When a tag is given it is usually right, but keyword rules miss many stories, so the absence of a tag means
          little. We measured this on hand-labelled headlines, including a set the rules were never adjusted for.{' '}
          <a href={DOCS}>Numbers and method</a> · <a href={RULES_FILE}>The rules file</a>
        </p>
      </section>
    </div>
  )
}
