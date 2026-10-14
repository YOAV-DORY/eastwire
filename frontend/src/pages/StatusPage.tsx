import { useStatus } from '../api/queries'
import { FreshnessIndicator } from '../components/status/FreshnessIndicator'
import { ErrorState, FeedSkeleton } from '../components/status/Feedback'
import { formatUtc, relativeTime } from '../lib/time'
import styles from './TextPage.module.css'

/** Per-source freshness: checking a source and finding something new are reported separately. */
export function StatusPage() {
  const status = useStatus()
  return (
    <article className={styles.page}>
      <h1 className={styles.title}>Status</h1>
      <p className="muted">
        EastWire checks its sources every hour. A source can be checked successfully and still have nothing new, so
        &ldquo;last checked&rdquo; and &ldquo;newest item&rdquo; are shown separately.
      </p>
      <FreshnessIndicator status={status.data} loading={status.isLoading} />
      {status.isLoading && <FeedSkeleton count={2} />}
      {status.isError && <ErrorState message="Status is unavailable right now." onRetry={() => void status.refetch()} />}
      {status.data && (
        <div className={styles.tableWrap} role="region" aria-label="Source status table" tabIndex={0}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Source</th>
                <th scope="col">State</th>
                <th scope="col">Last checked</th>
                <th scope="col">Newest item</th>
                <th scope="col">Failures in a row</th>
              </tr>
            </thead>
            <tbody>
              {status.data.sources.map((s) => (
                <tr key={s.slug}>
                  <th scope="row">{s.name}</th>
                  <td className="mono">
                    {s.state}
                    {s.circuitOpen && ' · paused after repeated failures'}
                  </td>
                  <td className="mono" title={s.lastSuccessAt ? formatUtc(s.lastSuccessAt) : undefined}>
                    {s.lastSuccessAt ? relativeTime(s.lastSuccessAt) : 'never'}
                  </td>
                  <td className="mono" title={s.newestItemAt ? formatUtc(s.newestItemAt) : undefined}>
                    {s.newestItemAt ? relativeTime(s.newestItemAt) : 'none yet'}
                  </td>
                  <td className="mono">{s.consecutiveFailures}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {status.data?.database && <DatabaseSize {...status.data.database} />}
    </article>
  )
}

const MB = 1024 * 1024

/** How full the free database is. Retention keeps it small; this says so if that ever fails. */
function DatabaseSize({ sizeBytes, limitBytes, state }: { sizeBytes: number; limitBytes: number; state: 'ok' | 'warn' }) {
  const used = `${Math.round(sizeBytes / MB)} MB of ${Math.round(limitBytes / MB / 1024)} GB`
  return state === 'warn' ? (
    <p className={styles.warn} role="status">
      Database: {used}. Close to the free tier&apos;s limit, so retention needs a look.
    </p>
  ) : (
    <p className="mono muted">Database: {used} (free tier)</p>
  )
}
