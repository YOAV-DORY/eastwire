import { ArrowUpRight } from 'lucide-react'
import { HeroMark } from '../components/graphics/HeroMark'
import { Wordmark } from '../components/graphics/Wordmark'
import { ButtonLink } from '../components/ui/Button'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import styles from './Home.module.css'

const REPO_URL = 'https://github.com/YOAV-DORY/eastwire'

/** Placeholder until milestone 4 builds the real homepage (map, search, feed). */
export function Home() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className={styles.bar}>
        <Wordmark />
        <ThemeToggle />
      </header>
      <main id="main" className={styles.main}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <h1 id="hero-title" className={styles.title}>
            Asian news, <br className={styles.desktopBreak} />
            on the map, <br className={styles.desktopBreak} />
            with sources shown.
          </h1>
          <HeroMark className={styles.mark} />
        </section>
        <p className={styles.lede}>
          EastWire is being built in the open. It will show news from China, India, South Korea and Japan on a map,
          with every source, and its permission to be shown here, listed alongside.
        </p>
        <div className={styles.actions}>
          <ButtonLink variant="primary" size="lg" href={REPO_URL} icon={<ArrowUpRight size={18} strokeWidth={2} />}>
            Follow the build
          </ButtonLink>
          {import.meta.env.DEV && (
            <ButtonLink href="/dev/gallery" size="lg">
              Component gallery
            </ButtonLink>
          )}
        </div>
        <p className={`${styles.status} mono muted`}>Milestone 2 of 9 · design system and skeleton</p>
      </main>
    </>
  )
}
