import clsx from 'clsx'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { useSectors } from '../api/queries'
import { Hero } from '../components/media/Hero'
import { fromLibrary } from '../lib/imagery'
import { RULES_FILE } from '../components/news/SectorRules'
import { ErrorState } from '../components/status/Feedback'
import { Skeleton } from '../components/ui/Skeleton'
import { usePageTitle } from '../hooks/usePageTitle'
import { SECTORS } from '../sectors'
import { SectorIcon } from '../components/graphics/SectorIcon'
import { PAGE_IMAGES } from '../lib/pageImages'
import styles from './SectorsPage.module.css'

const DOCS = 'https://github.com/YOAV-DORY/eastwire/blob/main/docs/sectors.md'

/** /sectors — the six sectors as an index: what each means and how many recent stories carry it. */
export function SectorsPage() {
  usePageTitle('Sectors')
  const sectors = useSectors()
  const byId = new Map((sectors.data?.sectors ?? []).map((s) => [s.slug, s]))
  return (
    <>
    <Hero
      size="compact"
      image={fromLibrary(PAGE_IMAGES.sectors)}
      kicker="Sectors"
      title="Six ways into the news"
      lede="Every story can carry up to two sectors, tagged by published rules rather than AI. Many stories get none."
    />
    <div className={clsx('container', styles.page)}>

      {sectors.isError && !sectors.data && (
        <ErrorState message="Sector counts are unavailable right now." onRetry={() => void sectors.refetch()} />
      )}

      <ol className={styles.index}>
        {SECTORS.map((s) => {
          const d = byId.get(s.id)
          return (
            <li key={s.id}>
              <Link to={`/sector/${s.id}`} className={styles.row}>
                <span className={styles.name}>
                  <span className={styles.icon}>
                    <SectorIcon sector={s.id} size={18} />
                  </span>
                  {s.label}
                </span>
                <span className={styles.definition}>{d ? d.definition : <Skeleton height="1.4em" />}</span>
                <span className={clsx(styles.count, 'num')}>
                  {d ? (
                    <>
                      <strong>{d.last7d}</strong> {d.last7d === 1 ? 'story' : 'stories'} this week
                    </>
                  ) : (
                    ' '
                  )}
                </span>
                <ArrowRight className={styles.arrow} size={20} strokeWidth={1.5} aria-hidden="true" />
              </Link>
            </li>
          )
        })}
      </ol>

      {sectors.data && (
        <p className={styles.untagged}>
          {`${sectors.data.untagged7d} ${sectors.data.untagged7d === 1 ? 'story' : 'stories'} from the last 7 days matched no sector and show no tag.`}
        </p>
      )}

      <section className={styles.accuracy} aria-labelledby="accuracy">
        <h2 id="accuracy">How accurate is it?</h2>
        <p>
          When a tag is given it is usually right, but keyword rules miss many stories, so a missing tag means little.
          We measured this on hand-labelled headlines, including a set the rules were never adjusted for.
        </p>
        <p className={styles.links}>
          <a href={DOCS}>Numbers and method</a>
          <a href={RULES_FILE}>The rules file</a>
        </p>
      </section>
    </div>
    </>
  )
}
