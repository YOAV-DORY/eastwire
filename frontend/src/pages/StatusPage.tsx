import clsx from 'clsx'
import { CircleAlert, CircleCheck, CircleDashed, CircleX } from 'lucide-react'
import { useStatus } from '../api/queries'
import type { FreshnessState, SourceStatus, Status } from '../api/types'
import { Hero } from '../components/media/Hero'
import { fromLibrary } from '../lib/imagery'
import { ErrorState, FeedSkeleton } from '../components/status/Feedback'
import { formatUtc, relativeTime, storyDate } from '../lib/time'
import { usePageTitle } from '../hooks/usePageTitle'
import { PAGE_IMAGES } from '../lib/pageImages'
import styles from './StatusPage.module.css'

const STATE_LABEL: Record<FreshnessState, string> = {
  fresh: 'Source check succeeded',
  stale: 'Behind: no successful check for over 2 hours',
  outage: 'Failing: no successful check for over a day',
  unknown: 'Not checked yet',
}

const STATE_ICON = { fresh: CircleCheck, stale: CircleAlert, outage: CircleX, unknown: CircleDashed } as const

/** Per-source freshness: checking a source and finding something new are reported separately. */
export function StatusPage() {
  usePageTitle('Status')
  const status = useStatus()
  return (
    <>
    <Hero
      size="compact"
      image={fromLibrary(PAGE_IMAGES.status)}
      kicker="Status"
      title={status.data ? headline(status.data) : 'How fresh are the sources?'}
      lede={
        <>
          EastWire checks every source once an hour. A successful check only means the source answered: it can find
          nothing new, so the newest story&apos;s own date is shown separately.
        </>
      }
    />
    <div className={clsx('container', styles.page)}>

      {status.isLoading && <FeedSkeleton count={2} />}
      {status.isError && <ErrorState message="Status is unavailable right now." onRetry={() => void status.refetch()} />}

      {status.data && (
        <section aria-labelledby="sources-title" className={styles.sources}>
          <h2 id="sources-title" className="kicker">
            Sources in use · {status.data.sources.length}
          </h2>
          <ul className={styles.list}>
            {status.data.sources.map((s) => (
              <SourceRow key={s.slug} source={s} />
            ))}
          </ul>
        </section>
      )}

      {status.data?.database && <DatabaseSize {...status.data.database} />}
    </div>
    </>
  )
}

/** The page title says the overall state in words. */
function headline(status: Status): string {
  const behind = status.sources.filter((s) => s.state === 'stale' || s.state === 'outage').length
  if (status.state === 'outage') return 'Source checks are failing'
  if (behind === 0 && status.state === 'fresh') return 'Every source check succeeded'
  if (behind === 1) return 'One source check is behind'
  if (behind > 1) return `${behind} source checks are behind`
  return 'How are the sources?'
}

/** One source: a row of facts on wide screens, a small stack on phones; never a sideways scroll. */
function SourceRow({ source: s }: { source: SourceStatus }) {
  const Icon = STATE_ICON[s.state]
  return (
    <li className={styles.row} data-state={s.state}>
      <div className={styles.name}>
        <Icon className={styles.icon} size={18} strokeWidth={2} aria-hidden="true" />
        <div>
          <h3>{s.name}</h3>
          <p className={styles.state}>
            {STATE_LABEL[s.state]}
            {s.circuitOpen && ' · paused after repeated failures'}
          </p>
        </div>
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>Last check</dt>
          <dd className="num" title={s.lastSuccessAt ? formatUtc(s.lastSuccessAt) : undefined}>
            {s.lastSuccessAt ? relativeTime(s.lastSuccessAt) : 'never'}
          </dd>
        </div>
        <div>
          <dt>Newest story</dt>
          <dd className="num" title={newest(s) ? formatUtc(newest(s)!) : undefined}>
            {newest(s) ? `published ${storyDate(newest(s)!)}` : s.newestItemAt ? `found ${relativeTime(s.newestItemAt)}` : 'none yet'}
          </dd>
        </div>
        <div>
          <dt>Last added</dt>
          <dd className="num" title={s.lastStoredAt ? formatUtc(s.lastStoredAt) : undefined}>
            {s.lastStoredAt ? relativeTime(s.lastStoredAt) : '—'}
          </dd>
        </div>
        <div>
          <dt>Failed runs</dt>
          <dd className="num">{s.consecutiveFailures === 0 ? 'None' : `${s.consecutiveFailures} in a row`}</dd>
        </div>
      </dl>
    </li>
  )
}

/** The newest story's own publication date, when the source gives dates. */
function newest(s: SourceStatus): string | null {
  return s.newestPublishedAt ?? null
}

const MB = 1024 * 1024

/** How full the free database is. Retention keeps it small; this says so if that ever fails. */
function DatabaseSize({ sizeBytes, limitBytes, state }: { sizeBytes: number; limitBytes: number; state: 'ok' | 'warn' }) {
  const share = Math.min(100, (sizeBytes / limitBytes) * 100)
  const used = `${Math.round(sizeBytes / MB)} MB of ${Math.round(limitBytes / MB / 1024)} GB`
  return (
    <section className={styles.db} aria-labelledby="db-title" data-state={state}>
      <h2 id="db-title" className="kicker">
        Database
      </h2>
      <div className={styles.meter} aria-hidden="true">
        <span style={{ width: `${Math.max(share, 0.8)}%` }} />
      </div>
      <p role={state === 'warn' ? 'status' : undefined}>
        {used} used on the free tier.{' '}
        {state === 'warn'
          ? 'Close to the limit, so retention needs a look.'
          : 'Old stories are deleted on schedule, so it stays small.'}
      </p>
    </section>
  )
}
