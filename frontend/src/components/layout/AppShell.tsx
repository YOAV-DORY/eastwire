import clsx from 'clsx'
import { Activity, BookOpen, Ellipsis, Keyboard, LayoutList, Map, MessagesSquare, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { useMix, useStatus } from '../../api/queries'
import { useHotkeys, useShortcutsSetting } from '../../hooks/useShortcuts'
import { Wordmark } from '../graphics/Wordmark'
import { SEARCH_INPUT_ATTR } from '../search/SearchBar'
import { ShortcutsDialog } from '../search/ShortcutsDialog'
import { FreshnessIndicator } from '../status/FreshnessIndicator'
import { ThemeToggle } from '../ui/ThemeToggle'
import { CONTACT, REPO } from '../../lib/links'
import { freshnessLabel } from '../../lib/freshness'
import styles from './AppShell.module.css'

/**
 * The main navigation, the same four places on every width: Home, Map, Search, Social.
 * Sectors are entered from the home page (chips and tiles); About and Status live in the
 * footer and, on phones, under "More".
 */
const NAV = [
  // A sector's page belongs to Home: it is reached from the home page's sector tiles.
  { to: '/', label: 'Home', short: 'Home', icon: LayoutList, match: null },
  { to: '/map', label: 'Map', short: 'Map', icon: Map, match: '/map' },
  { to: '/search', label: 'Search', short: 'Search', icon: Search, match: '/search' },
  { to: '/social', label: 'Social', short: 'Social', icon: MessagesSquare, match: '/social' },
] as const

const BOTTOM = NAV
const MORE = [
  { to: '/about', label: 'About EastWire', short: 'About', icon: BookOpen, match: '/about' },
  { to: '/sources', label: 'Sources', short: 'Sources', icon: Activity, match: '/sources' },
] as const

type NavItem = (typeof NAV)[number] | (typeof MORE)[number]

/** Home covers the front page and the sector pages; every other item covers its whole section. */
function isCurrent(item: NavItem, pathname: string) {
  return item.match === null ? pathname === '/' || pathname.startsWith('/sector') : pathname.startsWith(item.match)
}

/**
 * Masthead with the four sections on wide screens; on phones the same four in a bottom
 * bar, plus "More" for About and Sources. One scroll for the whole page: no sidebar.
 */
export function AppShell() {
  const { pathname } = useLocation()
  const status = useStatus()
  const navigate = useNavigate()
  const shortcuts = useShortcutsSetting()
  const [helpOpen, setHelpOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const outlets = useMix().data?.publishers.length ?? 0
  const mainRef = useRef<HTMLElement>(null)
  const section = pathname.split('/')[1] ?? ''
  const firstSection = useRef(section)
  useEffect(() => {
    // Moving to another section: the new page settles in quickly (pages are already loaded,
    // so this is all the "transition" there is). Not on first load, not under reduced motion.
    if (section === firstSection.current) return
    firstSection.current = '\u0000'
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    mainRef.current?.animate?.([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], {
      duration: 200,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    })
  }, [section])
  const bindings = useMemo(
    () => ({
      // "/" focuses the search field on the page, or opens the search page.
      '/': () => {
        const input = document.querySelector<HTMLInputElement>(`[${SEARCH_INPUT_ATTR}]`)
        if (input) input.focus()
        else navigate('/search', { state: { focusSearch: true } })
      },
      '?': () => setHelpOpen(true),
    }),
    [navigate],
  )
  useHotkeys(shortcuts.enabled, bindings)
  const moreCurrent = MORE.some((item) => isCurrent(item, pathname))

  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className={styles.masthead}>
        <div className={clsx('container', styles.mastheadInner)}>
          <Link to="/" className={styles.brand} aria-label="EastWire home">
            <Wordmark />
          </Link>
          <nav className={styles.topnav} aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={styles.topnavLink}
                aria-current={isCurrent(item, pathname) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className={styles.actions}>
            <FreshnessIndicator status={status.data} loading={status.isLoading} failed={status.isError} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main" className={styles.main} ref={mainRef}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <div className={clsx('container', styles.footerInner)}>
          <div className={styles.footerAbout}>
            <Wordmark />
            <p>
              An independent, non-commercial project by Yoav Dory. Headlines from China, India, South Korea and Japan,
              chosen by published rules and linked to the original; we never copy or translate articles. Summaries are
              automated, and nothing here is verified reporting.
            </p>
          </div>
          <nav aria-label="Footer" className={styles.footerLinks}>
            <Link to="/about">About EastWire</Link>
            <Link to="/sources">Sources</Link>
            <a href={CONTACT}>Contact</a>
            <a href={REPO}>Code on GitHub</a>
            <button type="button" className={styles.linkButton} onClick={() => setHelpOpen(true)}>
              Keyboard shortcuts
            </button>
          </nav>
          <dl className={styles.facts}>
            <div>
              <dt>Last update</dt>
              <dd className="num">{freshnessLabel(status.data, status.isPending, undefined, status.isError)}</dd>
            </div>
            <div>
              <dt>Sources</dt>
              <dd>
                <Link to="/sources">
                  {outlets ? `${outlets} outlets in the last 24 hours, each with its terms` : 'Every source, with its terms'}
                </Link>
              </dd>
            </div>
            <div>
              <dt>Licences</dt>
              <dd>
                Headlines and links only, except Global Voices text (
                <a href="https://creativecommons.org/licenses/by/3.0/">CC BY 3.0</a>). Photos: Wikimedia Commons, credited
                on each.
              </dd>
            </div>
          </dl>
          <p className={styles.credits}>
            Discovery data: <a href="https://www.gdeltproject.org/">The GDELT Project</a>. Maps: ©{' '}
            <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors. Cities:{' '}
            <a href="https://www.geonames.org/">GeoNames</a> (CC BY 4.0).
          </p>
        </div>
      </footer>

      <nav className={styles.bottomnav} aria-label="Primary">
        {BOTTOM.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={styles.bottomnavLink}
            aria-current={isCurrent(item, pathname) ? 'page' : undefined}
          >
            <item.icon size={20} strokeWidth={1.75} aria-hidden="true" />
            <span>{item.short}</span>
          </Link>
        ))}
        <button
          type="button"
          className={clsx(styles.bottomnavLink, moreCurrent && styles.bottomnavActive)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen(true)}
        >
          <Ellipsis size={20} strokeWidth={1.75} aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>

      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        pathname={pathname}
        onShortcuts={() => {
          setMoreOpen(false)
          setHelpOpen(true)
        }}
      />
      <ShortcutsDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        enabled={shortcuts.enabled}
        onToggle={shortcuts.setEnabled}
      />
    </div>
  )
}

/** The rest of the site on phones: a bottom sheet opened by "More". */
function MoreSheet({
  open,
  onClose,
  pathname,
  onShortcuts,
}: {
  open: boolean
  onClose: () => void
  pathname: string
  onShortcuts: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal?.()
    if (!open && dialog.open) dialog.close?.()
  }, [open])
  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-labelledby="more-title"
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={styles.sheetHead}>
        <h2 id="more-title" className="kicker">
          More
        </h2>
        <button type="button" className={styles.sheetClose} onClick={onClose} aria-label="Close">
          <X size={20} strokeWidth={1.75} />
        </button>
      </div>
      <ul className={styles.sheetList}>
        {MORE.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className={styles.sheetLink}
              aria-current={isCurrent(item, pathname) ? 'page' : undefined}
              onClick={onClose}
            >
              <item.icon size={20} strokeWidth={1.75} aria-hidden="true" />
              {item.label}
            </Link>
          </li>
        ))}
        <li>
          <button type="button" className={styles.sheetLink} onClick={onShortcuts}>
            <Keyboard size={20} strokeWidth={1.75} aria-hidden="true" />
            Keyboard shortcuts
          </button>
        </li>
      </ul>
    </dialog>
  )
}
