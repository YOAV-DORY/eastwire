import clsx from 'clsx'
import { ArrowUpRight } from 'lucide-react'
import { useCountries, useMix, useSources, useStatus } from '../api/queries'
import type { Mix, SourceView } from '../api/types'
import { Flag } from '../components/graphics/Flag'
import { ArticleLayout, Section } from '../components/layout/ArticleLayout'
import articleStyles from '../components/layout/ArticleLayout.module.css'
import { Hero } from '../components/media/Hero'
import { ErrorState, FeedSkeleton } from '../components/status/Feedback'
import { SourceHealth } from '../components/status/SourceHealth'
import { usePageTitle } from '../hooks/usePageTitle'
import { fromLibrary } from '../lib/imagery'
import { PAGE_IMAGES } from '../lib/pageImages'
import { formatDate } from '../lib/time'
import styles from './SourcesPage.module.css'

const REPO = 'https://github.com/YOAV-DORY/eastwire/blob/main/docs'

const SECTIONS = [
  { id: 'mix', label: "Today's mix" },
  { id: 'health', label: 'Source health' },
  { id: 'terms', label: 'Terms we checked' },
  { id: 'gaps', label: 'Coverage gaps' },
  { id: 'credits', label: 'Credits and licences' },
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

/**
 * /sources: where the news comes from. The live mix by country, each source's health (the
 * operator detail the home page leaves out), the terms checked for every source, the gaps, and
 * every credit and licence.
 */
export function SourcesPage() {
  usePageTitle('Sources')
  const sources = useSources()
  const status = useStatus()
  const countries = useCountries()
  const mix = useMix()
  const countryNames = Object.fromEntries((countries.data ?? []).map((c) => [c.iso2, c.name]))
  return (
    <>
      <Hero
        size="compact"
        image={fromLibrary(PAGE_IMAGES.status)}
        kicker="Sources"
        title="Where the news comes from"
        lede="Every source was checked against its own terms before use. Here is today's mix, how each source is doing, and every credit."
      />
      <div className={clsx('container', articleStyles.page)}>
        <ArticleLayout sections={SECTIONS}>
          <Section n={1} id="mix" title="Today's mix">
            <p>
              Stories our sources published in the last 24 hours, by the country they are about and by publisher. Some
              countries and outlets publish far more than others; the front page balances them in its order (no country
              above about 40% and no outlet above about 25% of the list), without hiding any story.
            </p>
            {mix.data ? (
              <MixBars mix={mix.data} countryNames={countryNames} />
            ) : mix.isError ? (
              <p>The mix is unavailable right now.</p>
            ) : (
              <FeedSkeleton count={1} />
            )}
          </Section>

          <Section n={2} id="health" title="Source health">
            {status.isLoading && <FeedSkeleton count={2} />}
            {status.isError && !status.data && (
              <ErrorState message="Source health is unavailable right now." onRetry={() => void status.refetch()} />
            )}
            {status.data && <SourceHealth status={status.data} />}
          </Section>

          <Section n={3} id="terms" title="Terms we checked">
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
                  <ul className={articleStyles.sources}>
                    {list.map((s) => (
                      <li key={s.slug}>
                        <div className={articleStyles.sourceHead}>
                          <strong>{s.name}</strong>
                          <span>{KIND[s.kind] ?? s.kind}</span>
                        </div>
                        {s.evidenceNote && <p>{s.evidenceNote}</p>}
                        <a href={s.evidenceUrl} target="_blank" rel="noopener noreferrer" className={articleStyles.evidence}>
                          Terms checked {formatDate(s.evidenceCheckedOn)}
                          <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden="true" />
                          <span className="visually-hidden"> (opens in new tab)</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )
                return g.folded ? (
                  <details key={g.title} className={clsx(articleStyles.group, articleStyles.folded)}>
                    <summary>
                      <span className={articleStyles.groupTitle}>
                        {g.title} <span className="num">{list.length}</span>
                      </span>
                      <span className={articleStyles.groupNote}>{g.note}</span>
                    </summary>
                    {rows}
                  </details>
                ) : (
                  <div key={g.title} className={articleStyles.group}>
                    <h3 className={articleStyles.groupTitle}>
                      {g.title} <span className="num">{list.length}</span>
                    </h3>
                    <p className={articleStyles.groupNote}>{g.note}</p>
                    {rows}
                  </div>
                )
              })}
          </Section>

          <Section n={4} id="gaps" title="Coverage gaps">
            <p>
              Coverage is uneven, and we would rather say so. GDELT&apos;s English stream is dominated by Indian
              publishers, and most high-volume Indian, Korean and Japanese outlets do not allow their headlines to be
              shown without permission. Japan and China now also come straight from three publishers whose terms allow
              headline links: The Mainichi, Sixth Tone and Nippon.com.
            </p>
            <p>
              <strong>South Korea is the largest gap.</strong> Every Korean outlet we have checked (Yonhap, The Korea
              Herald, The Korea Times, JoongAng Daily, KBS World) forbids display without permission, The Hankyoreh
              licenses its articles for a fee, and the government&apos;s Korea.net could not be read automatically. Korea
              therefore appears mainly through Global Voices essays and other outlets&apos; reporting.
            </p>
            <p className={articleStyles.aside}>An empty country or city means our sources had nothing about it, not that nothing happened.</p>
          </Section>

          <Section n={5} id="credits" title="Credits, licences and privacy">
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
              EastWire sets no cookies and uses no trackers. Your theme and shortcut settings, and a saved copy of the
              last front page you loaded (so a return visit can show it, dated, while the server wakes), are stored only
              in your browser. Map images load from the OpenStreetMap tile servers and illustrative photos from
              Wikimedia&apos;s image servers, which see your IP address like any website.
            </p>
            <p className={articleStyles.aside}>
              To ask for a correction or removal, open an issue on{' '}
              <a href="https://github.com/YOAV-DORY/eastwire/issues">GitHub</a>.
            </p>
          </Section>
        </ArticleLayout>
      </div>
    </>
  )
}

/** Each country's and each publisher's share of the last 24 hours, as labelled bars (numbers always in words too). */
function MixBars({ mix, countryNames }: { mix: Mix; countryNames: Record<string, string> }) {
  const pct = (n: number) => (mix.total > 0 ? Math.round((n / mix.total) * 100) : 0)
  return (
    <div className={styles.mixGroups}>
      <div>
        <h3 className={styles.mixTitle}>
          By country <span className="num">· {mix.total} stories</span>
        </h3>
        <ul className={styles.mix}>
          {mix.countries.map((c) => (
            <li key={c.key}>
              <span className={styles.mixName}>
                <Flag country={c.key} size={20} />
                {countryNames[c.key] ?? c.key}
              </span>
              <span className={styles.bar} aria-hidden="true">
                <span style={{ width: `${Math.max(pct(c.count), 1)}%` }} />
              </span>
              <span className={clsx('num', styles.mixCount)}>
                {c.count} · {pct(c.count)}%
              </span>
            </li>
          ))}
          {mix.noCountry > 0 && (
            <li>
              <span className={styles.mixName}>No one country</span>
              <span className={styles.bar} aria-hidden="true">
                <span style={{ width: `${Math.max(pct(mix.noCountry), 1)}%` }} />
              </span>
              <span className={clsx('num', styles.mixCount)}>
                {mix.noCountry} · {pct(mix.noCountry)}%
              </span>
            </li>
          )}
        </ul>
      </div>
      <div>
        <h3 className={styles.mixTitle}>
          By publisher <span className="num">· {mix.publishers.length} outlets</span>
        </h3>
        <ul className={styles.mix}>
          {mix.publishers.map((p) => (
            <li key={p.key}>
              <span className={styles.mixName}>{p.label}</span>
              <span className={styles.bar} aria-hidden="true">
                <span style={{ width: `${Math.max(pct(p.count), 1)}%` }} />
              </span>
              <span className={clsx('num', styles.mixCount)}>
                {p.count} · {pct(p.count)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
