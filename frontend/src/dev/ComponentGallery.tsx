import { Search } from 'lucide-react'
import { useState } from 'react'
import { HeroMark } from '../components/graphics/HeroMark'
import { Wordmark } from '../components/graphics/Wordmark'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { Kbd } from '../components/ui/Kbd'
import { Skeleton } from '../components/ui/Skeleton'
import { Sticker } from '../components/ui/Sticker'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { SECTORS, sectorColor, type SectorId } from '../sectors'
import styles from './ComponentGallery.module.css'

const SURFACES = ['--bg', '--bg-elev-1', '--bg-elev-2', '--bg-hover', '--bg-social']
const ACCENTS = ['--accent', '--accent-text', '--accent-2', '--danger', '--ok']

/** Living style guide at /dev/gallery (development builds only). */
export default function ComponentGallery() {
  const [selected, setSelected] = useState<Set<SectorId>>(new Set(['technology']))
  const [loading, setLoading] = useState(false)

  const toggle = (id: SectorId) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Wordmark />
        <span className="mono muted">/dev/gallery</span>
        <ThemeToggle />
      </header>

      <Section title="Color tokens">
        <div className={styles.swatches}>
          {[...SURFACES, ...ACCENTS].map((token) => (
            <figure key={token} className={styles.swatch}>
              <span className={styles.swatchColor} style={{ background: `var(${token})` }} />
              <figcaption className="mono muted">{token}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section title="Type scale">
        <p className={styles.display}>Display headline</p>
        <p className={styles.h1}>Page heading</p>
        <p>Body text: news from China, India, South Korea and Japan, with sources shown.</p>
        <p className="muted" style={{ fontSize: 'var(--text-small)' }}>
          Secondary text, 13px
        </p>
        <p className="mono muted">12 min ago · japantimes.co.jp · 35.69°N 139.69°E</p>
      </Section>

      <Section title="Buttons">
        <div className={styles.row}>
          <Button variant="primary" size="lg" icon={<Search size={18} />}>
            Search
          </Button>
          <Button variant="primary">Primary</Button>
          <Button>Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
          <Button variant="primary" loading={loading} onClick={() => setLoading((v) => !v)}>
            {loading ? 'Loading' : 'Click to load'}
          </Button>
        </div>
      </Section>

      <Section title="Sector chips">
        <div className={styles.row}>
          {SECTORS.map((s) => (
            <Chip key={s.id} dotColor={sectorColor(s.id)} selected={selected.has(s.id)} onClick={() => toggle(s.id)}>
              {s.label}
            </Chip>
          ))}
          <Chip count={42}>With count</Chip>
          <Chip disabled>Disabled</Chip>
        </div>
      </Section>

      <Section title="Stickers and keys">
        <div className={styles.row}>
          <Sticker>New</Sticker>
          <Sticker variant="country">JP</Sticker>
          <Sticker variant="country" tilt>
            KR
          </Sticker>
          <span className="muted">
            Press <Kbd>/</Kbd> to search, <Kbd>?</Kbd> for shortcuts
          </span>
        </div>
      </Section>

      <Section title="Skeleton (story card)">
        <div className={styles.card}>
          <Skeleton width="40%" />
          <Skeleton width="90%" height="1.4em" />
          <Skeleton width="75%" />
        </div>
      </Section>

      <Section title="Hero graphic">
        <HeroMark />
      </Section>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section} aria-label={title}>
      <h2 className={`${styles.sectionTitle} mono muted`}>{title}</h2>
      {children}
    </section>
  )
}
