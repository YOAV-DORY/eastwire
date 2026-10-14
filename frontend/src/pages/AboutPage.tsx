import { useSources } from '../api/queries'
import { FeedSkeleton } from '../components/status/Feedback'
import { formatDate } from '../lib/time'
import styles from './TextPage.module.css'

const REPO = 'https://github.com/YOAV-DORY/eastwire/blob/main/docs'

export function AboutPage() {
  const sources = useSources()
  return (
    <article className={styles.page}>
      <h1 className={styles.title}>How EastWire works</h1>

      <section className={styles.section}>
        <h2 className={`${styles.heading} mono muted`}>What we show</h2>
        <p>
          Headlines from news sources that allow it, linked to the original article. Short excerpts appear only where a
          license or the publisher&apos;s policy permits them. We never republish full articles, translate them, show
          unlicensed photos or summarize with AI.
        </p>
        <p className="muted">
          EastWire shows what its listed sources published. It does not measure what any audience has or hasn&apos;t
          seen.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={`${styles.heading} mono muted`}>Sources</h2>
        {sources.isLoading && <FeedSkeleton count={1} />}
        {sources.data && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Source</th>
                  <th scope="col">Status</th>
                  <th scope="col">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {sources.data.map((s) => (
                  <tr key={s.slug}>
                    <th scope="row">
                      {s.name}
                      {s.enabled && <span className="mono muted"> · in use</span>}
                    </th>
                    <td>
                      <span className={`${styles.pill} mono`} data-status={s.status}>
                        {s.status}
                      </span>
                    </td>
                    <td className="mono">
                      <a href={s.evidenceUrl} target="_blank" rel="noopener noreferrer">
                        checked {formatDate(s.evidenceCheckedOn)}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted">
          Full reasoning: <a href={`${REPO}/source-matrix.md`}>source matrix</a> and{' '}
          <a href={`${REPO}/domain-review.md`}>publisher review</a>.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={`${styles.heading} mono muted`}>Coverage gaps</h2>
        <p>
          Coverage is uneven, and we would rather say so. Most high-volume Indian, Korean and Japanese publishers do not
          allow their headlines to be shown without permission, so GDELT-discovered stories come from a small, mostly
          Indian, group of publishers. South Korea and Japan rely largely on Global Voices. An empty city means our
          sources had nothing city-specific, not that nothing happened.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={`${styles.heading} mono muted`}>Places</h2>
        <p>
          Each story lists places in one of three roles: places it <strong>mentions</strong>, where it was{' '}
          <strong>datelined</strong>, and where the <strong>publisher</strong> is based. Dashed chips mark low
          confidence; for example, a capital city name often stands for its government. Stories that only name a
          country are never pinned to its capital. <a href={`${REPO}/cities.md`}>How the city list is chosen</a>.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={`${styles.heading} mono muted`}>Credits and privacy</h2>
        <p>
          Discovery data: <a href="https://www.gdeltproject.org/">The GDELT Project</a>. City data:{' '}
          <a href="https://www.geonames.org/">GeoNames</a> (CC BY 4.0). Global Voices text: CC BY 3.0, credited on each
          story.
        </p>
        <p className="muted">
          EastWire sets no cookies and uses no trackers. Your theme choice is stored only in your browser. To ask for a
          correction or removal, open an issue on <a href="https://github.com/YOAV-DORY/eastwire/issues">GitHub</a>.
        </p>
      </section>
    </article>
  )
}
