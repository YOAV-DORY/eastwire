import { ButtonLink } from '../components/ui/Button'
import styles from './NotFound.module.css'

export function NotFound() {
  return (
    <article className={styles.main}>
      <h1 className={styles.title}>Page not found</h1>
      <p className="muted">This address doesn&apos;t exist on EastWire.</p>
      <ButtonLink href="/" size="lg">
        Go to the homepage
      </ButtonLink>
    </article>
  )
}
