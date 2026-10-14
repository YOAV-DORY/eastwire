import clsx from 'clsx'
import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useSources } from '../api/queries'
import type { SourceView } from '../api/types'
import { PageHeader } from '../components/layout/PageHeader'
import { FeedSkeleton } from '../components/status/Feedback'
import { formatDate } from '../lib/time'
import styles from './AboutPage.module.css'

const REPO = 'https://github.com/YOAV-DORY/eastwire/blob/main/docs'

const SECTIONS = [
  { id: 'what', label: 'What we show' },
  { id: 'sources', label: 'Sources' },
  { id: 'gaps', label: 'Coverage gaps' },
  { id: 'places', label: 'Places' },
  { id: 'sectors', label: 'Sectors' },
  { id: 'credits', label: 'Credits and privacy' },
] as const

const KIND: Record<string, string> = { news_feed: 'News feed', discovery: 'Discovery', social: 'Social' }

/** Sources grouped by what we do with them, most useful first. */
const GROUPS: { title: string; note: string; folded?: boolean; match: (s: SourceView) => boolean }[] = [
  { title: 'In use', note: 'Checked every hour.', match: (s) => s.status === 'verified' && s.enabled },
  {
    title: 'Allowed, not switched on',
    note: 'Terms checked; waiting on a key or a reason to turn it on.',
    match: (s) => s.status === 'verified' && !s.enabled,
  },
  {
    title: 'Waiting on a check',
    note: 'Off until a person can confirm the terms.',
    folded: true,
    match: (s) => s.status === 'conditional',
  },
  {
    title: 'Not used',
    note: 'Their terms do not allow it, or the service did not work.',
    folded: true,
    match: (s) => s.status === 'excluded',
  },
]

/** /about: the method page. What is shown, from where, and what is missing. */
export function AboutPage() {
  const sources = useSources()
  return (
    <div className={clsx('container', styles.page)}>
      <PageHeader
        kicker="About EastWire"
        title="Sources & method"
        lede="Headlines from China, India, South Korea and Japan, only from sources whose terms allow it, each linked to the original. Here is exactly what that means, and where it falls short."
      />

      <div className={styles.layout}>
        <nav className={styles.toc} aria-label="On this page">
          <p className="kicker">On this page</p>
          <ol>
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
                  {s.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className={styles.body}>
          <Section n={1} id="what" title="What we show">
            <p>
              Headlines from news sources that allow it, linked to the original article. Short excerpts appear only
              where a license or the publisher&apos;s policy permits them. We never republish full articles, translate
              them, show unlicensed photos or summarize with AI.
            </p>
            <p className={styles.aside}>
              EastWire shows what its listed sources published. It does not measure what any audience has or
              hasn&apos;t seen.
            </p>
          </Section>

          <Section n={2} id="sources" title="Sources">
            <p>
              Every source was checked against its own terms before use, with the page and the date kept as evidence.
              Full reasoning is in the <a href={`${REPO}/source-matrix.md`}>source matrix</a> and the{' '}
              <a href={`${REPO}/domain-review.md`}>publisher review</a>.
            </p>
            {sources.isLoading && <FeedSkeleton count={1} />}
            {sources.data &&
              GROUPS.map((g) => {
                const list = sources.data.filter(g.match)
                if (list.length === 0) return null
                const rows = (
                  <ul className={styles.sources}>
                    {list.map((s) => (
                      <li key={s.slug}>
                        <div className={styles.sourceHead}>
                          <strong>{s.name}</strong>
                          <span>{KIND[s.kind] ?? s.kind}</span>
                        </div>
                        {s.evidenceNote && <p>{s.evidenceNote}</p>}
                        <a href={s.evidenceUrl} target="_blank" rel="noopener noreferrer" className={styles.evidence}>
                          Terms checked {formatDate(s.evidenceCheckedOn)}
                          <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden="true" />
                          <span className="visually-hidden"> (opens in new tab)</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )
                return g.folded ? (
                  <details key={g.title} className={clsx(styles.group, styles.folded)}>
                    <summary>
                      <span className={styles.groupTitle}>
                        {g.title} <span className="num">{list.length}</span>
                      </span>
                      <span className={styles.groupNote}>{g.note}</span>
                    </summary>
                    {rows}
                  </details>
                ) : (
                  <div key={g.title} className={styles.group}>
                    <h3 className={styles.groupTitle}>
                      {g.title} <span className="num">{list.length}</span>
                    </h3>
                    <p className={styles.groupNote}>{g.note}</p>
                    {rows}
                  </div>
                )
              })}
          </Section>

          <Section n={3} id="gaps" title="Coverage gaps">
            <p>
              Coverage is uneven, and we would rather say so. Most high-volume Indian, Korean and Japanese publishers do
              not allow their headlines to be shown without permission, so stories found through GDELT come from a
              small, mostly Indian, group of publishers. South Korea and Japan rely largely on Global Voices, which
              publishes a few posts a month.
            </p>
            <p className={styles.aside}>An empty city means our sources had nothing about it, not that nothing happened.</p>
          </Section>

          <Section n={4} id="places" title="Places">
            <p>
              A story is filed under a city or country only when that place is its main subject: named in the
              headline, the dateline, or the first place the article covers. Passing mentions and where the publisher
              is based are kept as details but never decide where a story appears.
            </p>
            <p>
              Stories that only name a country are never pinned to its capital.{' '}
              <a href={`${REPO}/cities.md`}>How the city list is chosen</a>.
            </p>
          </Section>

          <Section n={5} id="sectors" title="Sectors">
            <p>
              Stories are tagged with up to two of six sectors by published keyword rules, the publisher&apos;s own
              topic tags and GDELT themes. No AI. Open a story&apos;s details to see the rules that matched, or read{' '}
              <Link to="/sectors">every rule and how accurate they are</Link>.
            </p>
          </Section>

          <Section n={6} id="credits" title="Credits and privacy">
            <p>
              Discovery data: <a href="https://www.gdeltproject.org/">The GDELT Project</a>. City data:{' '}
              <a href="https://www.geonames.org/">GeoNames</a> (CC BY 4.0). Map tiles: ©{' '}
              <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, drawn with{' '}
              <a href="https://leafletjs.com/">Leaflet</a>. Global Voices text: CC BY 3.0, credited on each story.
            </p>
            <p>
              The social section shows posts and videos only through Bluesky&apos;s and YouTube&apos;s official embeds,
              and only after you press load; until then nothing is requested from them. Loading a post or video lets
              that platform see your visit and, for YouTube, set cookies. Video data comes from the YouTube API
              Services, under the <a href="https://www.youtube.com/t/terms">YouTube Terms of Service</a> and the{' '}
              <a href="https://policies.google.com/privacy">Google Privacy Policy</a>. EastWire stores post and video
              data for at most 30 days and deletes it when the platform removes it.
            </p>
            <p>
              EastWire sets no cookies and uses no trackers. Your theme and shortcut settings are stored only in your
              browser. Map images load from the OpenStreetMap tile servers, which see your IP address like any website.
            </p>
            <p className={styles.aside}>
              To ask for a correction or removal, open an issue on{' '}
              <a href="https://github.com/YOAV-DORY/eastwire/issues">GitHub</a>.
            </p>
          </Section>
        </article>
      </div>
    </div>
  )
}

function Section({ n, id, title, children }: { n: number; id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={styles.section}>
      <h2 id={`${id}-title`}>
        <span className={clsx('num', styles.n)} aria-hidden="true">
          {String(n).padStart(2, '0')}
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}
