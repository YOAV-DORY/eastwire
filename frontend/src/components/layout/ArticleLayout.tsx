import clsx from 'clsx'
import type { ReactNode } from 'react'
import styles from './ArticleLayout.module.css'

/** A reading page: numbered sections with an index (beside the text on wide screens). */
export function ArticleLayout({ sections, children }: { sections: readonly { id: string; label: string }[]; children: ReactNode }) {
  return (
    <div className={styles.layout}>
      <nav className={styles.toc} aria-label="On this page">
        <p className="kicker">On this page</p>
        <ol>
          {sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>
                <span className="num">{String(i + 1).padStart(2, '0')}</span>
                {s.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <article className={styles.body}>{children}</article>
    </div>
  )
}

export function Section({ n, id, title, children }: { n: number; id: string; title: string; children: ReactNode }) {
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
