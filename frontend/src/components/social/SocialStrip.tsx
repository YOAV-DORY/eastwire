import { Link } from 'react-router'
import { useSocial } from '../../api/queries'
import { SocialCard } from './SocialCard'
import styles from './SocialStrip.module.css'

/** A few recent curated posts under the news, clearly apart from it. Hidden when there are none. */
export function SocialStrip({ country }: { country?: string }) {
  const social = useSocial({ country, size: 3 })
  const items = social.data?.pages[0]?.items ?? []
  if (items.length === 0) return null
  return (
    <aside className={styles.strip} aria-labelledby="social-strip-title">
      <div className={styles.head}>
        <h2 id="social-strip-title" className={`${styles.title} mono muted`}>
          Social posts &amp; videos
        </h2>
        <Link to={country ? `/social?country=${country}` : '/social'} className={styles.more}>
          See all
        </Link>
      </div>
      <p className="muted">Not verified reporting. Shown from curated accounts.</p>
      <ol className={styles.list}>
        {items.map((item) => (
          <li key={item.id}>
            <SocialCard item={item} />
          </li>
        ))}
      </ol>
    </aside>
  )
}
