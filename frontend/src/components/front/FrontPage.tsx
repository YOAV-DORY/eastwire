import clsx from 'clsx'
import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useFront, type FrontFilters } from '../../api/queries'
import type { ArticleView, FrontStory } from '../../api/types'
import { useSlow } from '../../hooks/useSlow'
import { fromApi, storyImage, type SlotImage } from '../../lib/imagery'
import { isSavedCopy } from '../../lib/savedCopy'
import { Flag } from '../graphics/Flag'
import { SectorIcon } from '../graphics/SectorIcon'
import { StoryCard } from '../news/StoryCard'
import { ColdStart, EmptyState, ErrorState, SavedCopyNotice } from '../status/Feedback'
import { Skeleton } from '../ui/Skeleton'
import { isCleared } from './cleared'
import { LeadStory } from './LeadStory'
import { ReadingList } from './ReadingList'
import { mainCountry } from './storyCountry'
import styles from './FrontPage.module.css'

/** Latest stories beside the rail; the next ones become the In focus cards; the rest are grouped. */
const TOP_LATEST = 6
const FEATURED = 4

/**
 * A ranked front page on one 12-column grid: the split lead (lead story over eight columns,
 * the next two over four), Latest beside the rail, In focus cards, an optional block (sector
 * tiles), the rest of Latest grouped, and Reading. Every picture is assigned here, once per
 * page. Every state is bounded: a saved copy with its time while refreshing, a cold-start note,
 * and an error with a retry after ~90 s.
 */
export function FrontPage({
  filters,
  countryNames,
  rail,
  emptyTitle,
  emptyAction,
  onHighlight,
  highlightedPlace,
  after,
  between,
  reservedImages = [],
}: {
  filters: FrontFilters
  /** Full-width content between In focus and the grouped stories (e.g. sector tiles). */
  after?: ReactNode
  /** Content between the top stories and Latest (the home page's sector chips on phones). */
  between?: ReactNode
  countryNames: Record<string, string>
  rail?: ReactNode
  emptyTitle: string
  emptyAction?: ReactNode
  onHighlight?: (placeId: number | null) => void
  highlightedPlace?: number | null
  /** Commons files used elsewhere on the page, so stories do not repeat them. */
  reservedImages?: string[]
}) {
  const front = useFront(filters)
  const data = front.data
  const loading = front.isPending
  const slow = useSlow(loading)
  const saved = data !== undefined && isSavedCopy(front.dataUpdatedAt)

  const highlighted = (a: ArticleView) =>
    highlightedPlace != null && a.locations.some((l) => l.primary && l.placeId === highlightedPlace)
  const top = data?.latest.slice(0, TOP_LATEST) ?? []
  const featured = data?.latest.slice(TOP_LATEST, TOP_LATEST + FEATURED) ?? []
  const more = data?.latest.slice(TOP_LATEST + FEATURED) ?? []
  const groups = groupStories(more, filters.country ? 'sector' : 'country', countryNames)
  const nothingNew = data !== undefined && !data.lead && data.latest.length === 0
  const images = useStoryImages(data, top, featured, reservedImages)

  return (
    <>
      {saved && (front.isFetching || front.isError) && (
        <SavedCopyNotice
          savedAt={front.dataUpdatedAt}
          refreshing={front.isFetching}
          failed={front.isError && !front.isFetching}
          onRetry={() => void front.refetch()}
        />
      )}

      {loading && (
        <div aria-busy="true">
          {slow && <ColdStart />}
          <FrontSkeleton />
        </div>
      )}
      {front.isError && !data && (
        <ErrorState
          message="The server did not answer within about 90 seconds. It may be waking up or temporarily down."
          onRetry={() => void front.refetch()}
          retrying={front.isFetching}
        />
      )}
      {nothingNew && (
        <EmptyState title={emptyTitle} action={emptyAction}>
          No reported news from our sources in the last {data.latestWindowHours} hours. That reflects our short list of
          permitted sources, not an absence of news. <Link to="/about#gaps">Coverage gaps</Link>
        </EmptyState>
      )}

      {data && (data.lead || data.secondary.length > 0) && (
        <section className={clsx(styles.grid, styles.split)} aria-label="Top stories">
          {data.lead && (
            <div className={styles.leadCol}>
              <LeadStory story={data.lead} image={images.get(data.lead.article.id) ?? null} countryNames={countryNames} onHighlight={onHighlight} />
            </div>
          )}
          {data.secondary.length > 0 && (
            <ol className={styles.secondary} aria-label="Also leading">
              {data.secondary.map((s, i) => (
                <li key={s.article.id} className="reveal">
                  <StoryCard
                    article={s.article}
                    variant="standard"
                    image={images.get(s.article.id) ?? null}
                    countryNames={countryNames}
                    onHighlight={onHighlight}
                    highlighted={highlighted(s.article)}
                    index={i}
                    sizes="(min-width: 1024px) 380px, 100vw"
                  />
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {data && between}

      {data && (top.length > 0 || rail) && (
        <div className={clsx(styles.grid, styles.latestRow)}>
          <section aria-labelledby="latest-title" className={styles.latest}>
            {(top.length > 0 || data.lead) && (
              <>
                <SectionHead id="latest-title" title="Latest">
                  <span className="num">
                    {data.latestCount} {data.latestCount === 1 ? 'story' : 'stories'} from the last {data.latestWindowHours} hours
                  </span>{' '}
                  · ordered by <Link to="/about#ranking">our ranking rules</Link>
                </SectionHead>
                <ol className={styles.list}>
                  {top.map((a, i) => (
                    <li key={a.id}>
                      <StoryCard
                        article={a}
                        variant="row"
                        image={images.get(a.id)}
                        countryNames={countryNames}
                        onHighlight={onHighlight}
                        highlighted={highlighted(a)}
                        index={i}
                      />
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>
          {rail && (
            <aside className={styles.rail} aria-label="Map and live figures">
              {rail}
            </aside>
          )}
        </div>
      )}

      {featured.length > 0 && (
        <section aria-labelledby="focus-title" className={styles.block}>
          <SectionHead id="focus-title" title="In focus" />
          <ol className={styles.cards}>
            {featured.map((a, i) => (
              <li key={a.id} className="reveal">
                <StoryCard
                  article={a}
                  variant="feature"
                  image={images.get(a.id) ?? null}
                  countryNames={countryNames}
                  index={i}
                  sizes="(min-width: 1024px) 300px, (min-width: 720px) 50vw, 100vw"
                />
              </li>
            ))}
          </ol>
        </section>
      )}

      {data && after}

      {groups.length > 0 && (
        <section aria-labelledby="more-title" className={styles.block}>
          <SectionHead id="more-title" title={`More from the last ${data?.latestWindowHours} hours`} />
          <div className={styles.groups}>
            {groups.map((g) => (
              <section key={g.key} aria-labelledby={`group-${g.key}`} className={styles.group}>
                <h3 id={`group-${g.key}`} className={styles.groupTitle}>
                  {g.flag && <Flag country={g.flag} size={22} />}
                  {g.sector && <SectorIcon sector={g.sector} size={18} />}
                  {g.label}
                  <span className={clsx('num', styles.groupCount)}>{g.items.length}</span>
                </h3>
                <ol className={styles.list}>
                  {g.items.map((a) => (
                    <li key={a.id}>
                      <StoryCard
                        article={a}
                        variant="row"
                        countryNames={countryNames}
                        onHighlight={onHighlight}
                        highlighted={highlighted(a)}
                      />
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </section>
      )}

      {data && (
        <ReadingList
          items={data.reading}
          images={images}
          from={data.readingFrom}
          to={data.readingTo}
          countryNames={countryNames}
        />
      )}
    </>
  )
}

/** A section's title on a heavy rule, with an optional note after it. */
export function SectionHead({ id, title, children }: { id: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className={styles.sectionHead}>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
      </h2>
      {children && <p className={styles.sectionNote}>{children}</p>}
    </div>
  )
}

/**
 * Pictures for the page, each Commons file at most once: the API's cleared image first, else
 * a photo of the story's city or of its country and sector. Lead, secondaries, In focus and
 * Reading may also take another photo of the same country; anything left gets EastWire's tile (null).
 * Latest rows show a picture only when one fits.
 */
function useStoryImages(
  data: ReturnType<typeof useFront>['data'],
  top: ArticleView[],
  featured: ArticleView[],
  reserved: string[],
) {
  return useMemo(() => {
    const used = new Set(reserved)
    const out = new Map<number, SlotImage | null | undefined>()
    if (!data) return out
    const pick = (a: ArticleView, loose: boolean, story?: FrontStory) => {
      if (story && isCleared(story.image) && !used.has(story.image.id)) {
        used.add(story.image.id)
        return fromApi(story.image)
      }
      return storyImage(a, mainCountry(a), used, loose)
    }
    // Strict matches first (city, then country and sector), so the closest pictures go where they fit best.
    if (data.lead) out.set(data.lead.article.id, pick(data.lead.article, false, data.lead))
    for (const s of data.secondary) out.set(s.article.id, pick(s.article, false, s))
    for (const a of top) out.set(a.id, pick(a, false) ?? undefined)
    for (const a of featured) out.set(a.id, pick(a, false))
    // Then the big slots still without one may take another photo of the same country.
    const loosen = (id: number, a: ArticleView) => {
      if (!out.get(id)) out.set(id, pick(a, true))
    }
    if (data.lead) loosen(data.lead.article.id, data.lead.article)
    for (const s of data.secondary) loosen(s.article.id, s.article)
    for (const a of featured) loosen(a.id, a)
    for (const a of data.reading) out.set(a.id, pick(a, false))
    for (const a of data.reading) loosen(a.id, a)
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recomputed when the page data changes
  }, [data, reserved.join(',')])
}

interface Group {
  key: string
  label: string
  items: ArticleView[]
  flag?: string
  sector?: string
}

/** Stories under sub-headings, biggest group first; stories with no country or sector go last. */
function groupStories(items: ArticleView[], by: 'country' | 'sector', countryNames: Record<string, string>): Group[] {
  const groups = new Map<string, Group>()
  for (const a of items) {
    const key = by === 'country' ? (mainCountry(a) ?? 'other') : (a.sectors[0]?.slug ?? 'other')
    if (!groups.has(key)) {
      groups.set(
        key,
        key === 'other'
          ? { key, label: by === 'country' ? 'Across the region' : 'Other stories', items: [] }
          : by === 'country'
            ? { key, label: countryNames[key] ?? key, flag: key, items: [] }
            : { key, label: a.sectors[0]!.label, sector: key, items: [] },
      )
    }
    groups.get(key)!.items.push(a)
  }
  return [...groups.values()].sort((x, y) => (x.key === 'other' ? 1 : y.key === 'other' ? -1 : y.items.length - x.items.length))
}

/** The page's own shape while loading: split lead, then Latest beside the rail, then cards. */
function FrontSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <div className={clsx(styles.grid, styles.split)}>
        <div className={clsx(styles.leadCol, styles.skelStack)}>
          <Skeleton width="100%" height="auto" className={styles.skelLeadImage} />
          <Skeleton width="30%" height="0.8em" />
          <Skeleton width="95%" height="2.2em" />
          <Skeleton width="70%" height="2.2em" />
          <Skeleton width="45%" height="0.9em" />
        </div>
        <div className={clsx(styles.secondary, styles.skelStack)}>
          {[0, 1].map((i) => (
            <div key={i} className={styles.skelStack}>
              <Skeleton width="100%" height="auto" className={styles.skelCardImage} />
              <Skeleton width="40%" height="0.8em" />
              <Skeleton width="90%" height="1.3em" />
              <Skeleton width="60%" height="1.3em" />
            </div>
          ))}
        </div>
      </div>
      <div className={clsx(styles.grid, styles.latestRow)}>
        <div className={styles.latest}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={styles.skelRow}>
              <div className={styles.skelStack}>
                <Skeleton width="30%" height="0.8em" />
                <Skeleton width="85%" height="1.2em" />
                <Skeleton width="40%" height="0.85em" />
              </div>
              <Skeleton width="100%" height="auto" className={styles.skelThumb} />
            </div>
          ))}
        </div>
        <div className={clsx(styles.rail, styles.skelStack)}>
          <Skeleton width="100%" height="280px" />
          <Skeleton width="60%" height="1em" />
        </div>
      </div>
    </div>
  )
}
