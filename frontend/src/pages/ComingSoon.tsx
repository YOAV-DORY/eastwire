import { ButtonLink } from '../components/ui/Button'
import styles from './TextPage.module.css'

/** Honest placeholder for pages planned in later milestones. */
export function ComingSoon({ title, milestone, description }: { title: string; milestone: number; description: string }) {
  return (
    <article className={styles.page}>
      <h1 className={styles.title}>{title}</h1>
      <p className="muted">{description}</p>
      <p className="mono muted">Planned for milestone {milestone} of 9.</p>
      <ButtonLink href="/" size="lg">
        See the latest stories
      </ButtonLink>
    </article>
  )
}
