import clsx from 'clsx'
import { useStatus } from '../api/queries'
import type { FreshnessState, SourceStatus, Status } from '../api/types'
import { PageHeader } from '../components/layout/PageHeader'
import { ErrorState, FeedSkeleton } from '../components/status/Feedback'
import { formatUtc, relativeTime } from '../lib/time'
import styles from './StatusPage.module.css'

const STATE_LABEL: Record<FreshnessState, string> = {
  fresh: 'Up to date',
  stale: 'Stale',
  outage: 'Offline',
  unknown: 'Not checked yet',
}

/** Per-source freshness: checking a source and finding something new are reported separately. */
export function StatusPage() {
  const status = useStatus()
  return (
    <div className={clsx('container', styles.page)}>
      <PageHeader
        kicker="Status"
        title={status.data ? headline(status.data) : 'How fresh are the sources?'}
        lede={
          <>
            EastWire checks every source once an hour. A check can succeed and still find nothing new, so
            &ldquo;last checked&rdquo; and &ldquo;newest item&rdquo; are kept apart.
          </>
        }
      />

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
  )
}

/** The page title says the overall state in words. */
function headline(status: Status): string {
  const behind = status.sources.filter((s) => s.state === 'stale' || s.state === 'outage').length
  if (status.state === 'outage') return 'Sources are offline'
  if (behind === 0 && status.state === 'fresh') return 'Every source is up to date'
  if (behind === 1) return 'One source is behind'
  if (behind > 1) return `${behind} sources are behind`
  return 'How fresh are the sources?'
}

/** One source: a row of facts on wide screens, a small stack on phones; never a sideways scroll. */
function SourceRow({ source: s }: { source: SourceStatus }) {
  return (
    <li className={styles.row}>
      <div className={styles.name}>
        <span className={styles.dot} data-state={s.state} aria-hidden="true" />
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
          <dt>Checked</dt>
          <dd className="num" title={s.lastSuccessAt ? formatUtc(s.lastSuccessAt) : undefined}>
            {s.lastSuccessAt ? relativeTime(s.lastSuccessAt) : 'never'}
          </dd>
        </div>
        <div>
          <dt>Newest item</dt>
          <dd className="num" title={s.newestItemAt ? formatUtc(s.newestItemAt) : undefined}>
            {s.newestItemAt ? relativeTime(s.newestItemAt) : 'none yet'}
          </dd>
        </div>
        <div>
          <dt>Failed runs</dt>
          <dd className="num">
            {s.consecutiveFailures === 0 ? 'None' : `${s.consecutiveFailures} in a row`}
          </dd>
        </div>
      </dl>
    </li>
  )
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
