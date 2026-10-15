import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { useCallback } from 'react'
import { Link, useNavigate } from 'react-router'
import { useSocial } from '../../api/queries'
import type { CityPin, CountryView, MapData } from '../../api/types'
import { cleanPostText, initials } from '../../lib/postText'
import { relativeTime } from '../../lib/time'
import { Flag } from '../graphics/Flag'
import { LazyNewsMap } from '../map/LazyNewsMap'
import styles from './Companion.module.css'

/** The map beside the news: where this week's stories are, and a way into the full map. */
export function MapCompanion({
  data,
  countryNames,
  country,
  highlightedId,
}: {
  data?: MapData
  countryNames: Record<string, string>
  country?: string
  highlightedId?: number | null
}) {
  const navigate = useNavigate()
  const openCity = useCallback((pin: CityPin) => navigate(`/map/city/${pin.id}`), [navigate])
  const countryOnly = (data?.countryOnly ?? []).filter((c) => c.count > 0)
  return (
    <section className={styles.panel} aria-labelledby="companion-map">
      <div className={styles.head}>
        <h2 id="companion-map" className="kicker">
          Where this week&apos;s stories are
        </h2>
      </div>
      <LazyNewsMap
        height="260px"
        label="Map of this week's stories by city"
        pins={data?.cities ?? []}
        onSelect={openCity}
        highlightedId={highlightedId}
        staticOnTouch
      />
      {countryOnly.length > 0 && (
        <p className={styles.note}>
          Not tied to one city:{' '}
          {countryOnly.map((c, i) => (
            <span key={c.country} className="num">
              {i > 0 && ' · '}
              {countryNames[c.country] ?? c.country} {c.count}
            </span>
          ))}
        </p>
      )}
      <Link to={country ? `/map?country=${country}` : '/map'} className={styles.more}>
        Open the full map <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
      </Link>
    </section>
  )
}

/** Stories per country in the last 24 hours; each row filters the front page. */
export function CountryCounts({
  countries,
  selected,
  onSelect,
}: {
  countries: CountryView[]
  selected?: string
  onSelect: (iso2: string | undefined) => void
}) {
  return (
    <section className={styles.panel} aria-labelledby="companion-countries">
      <h2 id="companion-countries" className="kicker">
        News in the last 24 hours, by country
      </h2>
      <ul className={styles.countries}>
        {countries.map((c) => (
          <li key={c.iso2}>
            <button
              type="button"
              className={styles.countryRow}
              aria-pressed={selected === c.iso2}
              onClick={() => onSelect(selected === c.iso2 ? undefined : c.iso2)}
            >
              <Flag country={c.iso2} size={18} />
              <span className={styles.countryName}>{c.name}</span>
              <span className={styles.countryCount}>{c.last24h}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.note}>Counts are what our sources published, not how much happened.</p>
    </section>
  )
}

/** Three recent posts from the curated newsrooms, kept visibly apart from the news. */
export function SocialPreview({ country }: { country?: string }) {
  const social = useSocial({ country, size: 3 })
  const items = social.data?.pages[0]?.items ?? []
  if (items.length === 0) return null
  return (
    <section className={styles.social} aria-labelledby="companion-social">
      <div className={styles.socialHead}>
        <h2 id="companion-social" className={styles.socialTitle}>
          From newsrooms on social
        </h2>
        <p className={styles.label}>Not verified reporting</p>
        <Link to={country ? `/social?country=${country}` : '/social'} className={styles.more}>
          All posts and videos <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
      <ul className={styles.posts}>
        {items.map((item) => (
          <li key={item.id} className={styles.post}>
            <p className={styles.postSource}>
              <span className={styles.badge} aria-hidden="true">
                {initials(item.account.name)}
              </span>
              <span>
                <strong>{item.account.name}</strong>
                <span className={styles.postWhen}>
                  {item.platform === 'bluesky' ? 'Bluesky' : 'YouTube'} · {relativeTime(item.createdAt)}
                </span>
              </span>
            </p>
            <p className={styles.postText}>{cleanPostText(item.title ?? item.text)}</p>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.postLink}>
              Open the post <ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
              <span className="visually-hidden"> by {item.account.name} (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
