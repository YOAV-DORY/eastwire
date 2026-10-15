import clsx from 'clsx'
import type { FrontStory } from '../../api/types'
import { StoryCard } from '../news/StoryCard'
import { isCleared } from './cleared'
import { IllustrativeFigure } from './IllustrativeFigure'
import styles from './SecondaryStory.module.css'

/** A secondary story: a standard card, with a small credited illustrative photo when one is cleared. */
export function SecondaryStory({
  story,
  countryNames,
  now,
  onHighlight,
  highlighted,
}: {
  story: FrontStory
  countryNames: Record<string, string>
  now?: Date
  onHighlight?: (placeId: number | null) => void
  highlighted?: boolean
}) {
  const image = isCleared(story.image) ? story.image : null
  return (
    <div className={clsx(styles.secondary, image && styles.withImage)}>
      <StoryCard
        article={story.article}
        variant="standard"
        countryNames={countryNames}
        now={now}
        onHighlight={onHighlight}
        highlighted={highlighted}
      />
      {image && (
        <IllustrativeFigure className={styles.figure} image={image} variant="thumb" sizes="(min-width: 720px) 200px, 40vw" />
      )}
    </div>
  )
}
