import clsx from 'clsx'
import { Activity, BookOpen, Ellipsis, Keyboard, LayoutList, Map, MessagesSquare, Search, Shapes, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { useStatus } from '../../api/queries'
import { useHotkeys, useShortcutsSetting } from '../../hooks/useShortcuts'
import { Wordmark } from '../graphics/Wordmark'
import { SEARCH_INPUT_ATTR } from '../search/SearchBar'
import { ShortcutsDialog } from '../search/ShortcutsDialog'
import { FreshnessIndicator } from '../status/FreshnessIndicator'
import { ThemeToggle } from '../ui/ThemeToggle'
import styles from './AppShell.module.css'

/** Every main page. Phones show the first four in the bottom bar and the rest under "More". */
const NAV = [
  { to: '/', label: 'Latest', short: 'Home', icon: LayoutList, match: null },
  { to: '/map', label: 'Map', short: 'Map', icon: Map, match: '/map' },
  { to: '/search', label: 'Search', short: 'Search', icon: Search, match: '/search' },
  // One sector's page (/sector/economy) is part of the Sectors section too.
  { to: '/sectors', label: 'Sectors', short: 'Sectors', icon: Shapes, match: '/sector' },
  { to: '/social', label: 'Social', short: 'Social', icon: MessagesSquare, match: '/social' },
  { to: '/about', label: 'Sources & method', short: 'Sources & method', icon: BookOpen, match: '/about' },
] as const

const BOTTOM = NAV.slice(0, 4)
const MORE = [...NAV.slice(4), { to: '/status', label: 'Status', short: 'Status', icon: Activity, match: '/status' }] as const

type NavItem = (typeof NAV)[number] | (typeof MORE)[number]

/** "Latest" is the home page only; every other item covers its whole section. */
function isCurrent(item: NavItem, pathname: string) {
  return item.match === null ? pathname === '/' : pathname.startsWith(item.match)
}

/**
 * Masthead with the full navigation on wide screens; on phones a bottom bar with four
 * sections and "More" for the rest. One scroll for the whole page: no sidebar.
 */
export function AppShell() {
  const { pathname } = useLocation()
  const status = useStatus()
  const navigate = useNavigate()
  const shortcuts = useShortcutsSetting()
  const [helpOpen, setHelpOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const bindings = useMemo(
    () => ({
      // "/" focuses the search field on the page, or opens the search page.
      '/': () => {
        const input = document.querySelector<HTMLInputElement>(`[${SEARCH_INPUT_ATTR}]`)
        if (input) input.focus()
        else navigate('/search')
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
            <FreshnessIndicator status={status.data} loading={status.isLoading} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main" className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <div className={clsx('container', styles.footerInner)}>
          <div className={styles.footerAbout}>
            <Wordmark />
            <p>
              News from China, India, South Korea and Japan, from sources whose terms allow it, with every source shown.
              Headlines link to the original; we never copy articles.
            </p>
          </div>
          <nav aria-label="Footer" className={styles.footerLinks}>
            <Link to="/about">Sources &amp; method</Link>
            <Link to="/status">Status</Link>
            <a href="https://github.com/YOAV-DORY/eastwire">Code on GitHub</a>
            <button type="button" className={styles.linkButton} onClick={() => setHelpOpen(true)}>
              Keyboard shortcuts
            </button>
          </nav>
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
