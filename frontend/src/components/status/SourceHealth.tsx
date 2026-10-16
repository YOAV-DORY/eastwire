import { CircleAlert, CircleCheck, CircleDashed, CircleX } from 'lucide-react'
import type { FreshnessState, SourceStatus, Status } from '../../api/types'
import { formatUtc, relativeTime, storyDate } from '../../lib/time'
import styles from './SourceHealth.module.css'

const STATE_LABEL: Record<FreshnessState, string> = {
  fresh: 'Checked on schedule',
  stale: 'Behind: no successful check for over 3 hours',
  outage: 'Failing: no successful check for over a day',
  unknown: 'Not checked yet',
}

const STATE_ICON = { fresh: CircleCheck, stale: CircleAlert, outage: CircleX, unknown: CircleDashed } as const

/**
 * Each source's health: when it was last checked, its newest story and how many runs failed.
 * Operator detail, kept on the Sources page; the home page only says when the news was updated.
 */
export function SourceHealth({ status }: { status: Status }) {
  return (
    <>
      <p className={styles.summary}>{headline(status)}</p>
      <ul className={styles.list}>
        {status.sources.map((s) => (
          <SourceRow key={s.slug} source={s} />
        ))}
      </ul>
      {status.database && <DatabaseSize {...status.database} />}
    </>
  )
}

/** The overall state in one sentence. */
function headline(status: Status): string {
  const behind = status.sources.filter((s) => s.state === 'stale' || s.state === 'outage').length
  const updated = status.updatedAt ? `News last refreshed ${relativeTime(status.updatedAt)}.` : 'No refresh yet.'
  if (behind === 0) return `${updated} Every source was checked on schedule.`
  if (behind === 1) return `${updated} One source is behind schedule; the others are on time.`
  return `${updated} ${behind} sources are behind schedule.`
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
      <h3 id="db-title" className="kicker">
        Database
      </h3>
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
