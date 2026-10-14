import clsx from 'clsx'
import { Compass, Info, Keyboard, LayoutList, Map, Search, Shapes } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useCountries, useStatus } from '../../api/queries'
import { Flag } from '../graphics/Flag'
import { Wordmark } from '../graphics/Wordmark'
import { SEARCH_INPUT_ATTR } from '../search/SearchBar'
import { ShortcutsDialog } from '../search/ShortcutsDialog'
import { useHotkeys, useShortcutsSetting } from '../../hooks/useShortcuts'
import { FreshnessIndicator } from '../status/FreshnessIndicator'
import { ThemeToggle } from '../ui/ThemeToggle'
import { SECTORS, sectorColor } from '../../sectors'
import styles from './AppShell.module.css'

const NAV = [
  { to: '/', label: 'Latest', icon: LayoutList, match: null },
  { to: '/map', label: 'Map', icon: Map, match: '/map' },
  { to: '/search', label: 'Search', icon: Search, match: '/search' },
  // One sector's page (/sector/economy) is part of the Sectors section too.
  { to: '/sectors', label: 'Sectors', icon: Shapes, match: '/sector' },
] as const

type NavItem = (typeof NAV)[number]

/** "Latest" is the home page only; every other item covers its whole section. */
function isCurrent(item: NavItem, pathname: string) {
  return item.match === null ? pathname === '/' : pathname.startsWith(item.match)
}

/**
 * Top bar everywhere; primary navigation lives in exactly one place per width:
 * bottom nav (< 768 px), top bar (768–1023 px), sidebar (≥ 1024 px).
 */
export function AppShell() {
  const { pathname } = useLocation()
  const status = useStatus()
  const navigate = useNavigate()
  const shortcuts = useShortcutsSetting()
  const [helpOpen, setHelpOpen] = useState(false)
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

  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className={styles.topbar}>
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
      </header>
      <Sidebar onShowShortcuts={() => setHelpOpen(true)} />
      <main id="main" className={styles.main}>
        <Outlet />
      </main>
      <nav className={styles.bottomnav} aria-label="Primary">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={styles.bottomnavLink}
            aria-current={isCurrent(item, pathname) ? 'page' : undefined}
          >
            <item.icon size={20} strokeWidth={1.75} aria-hidden="true" />
            <span>{item.label === 'Latest' ? 'Home' : item.label}</span>
          </Link>
        ))}
      </nav>
      <ShortcutsDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        enabled={shortcuts.enabled}
        onToggle={shortcuts.setEnabled}
      />
    </div>
  )
}

function Sidebar({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  const { pathname } = useLocation()
  const countries = useCountries()
  const [params] = useSearchParams()
  const active = params.get('country')
  return (
    <aside className={styles.sidebar} aria-label="Sections">
      <nav aria-label="Primary">
        <SidebarGroup>
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={styles.sideLink}
              aria-current={isCurrent(item, pathname) ? 'page' : undefined}
            >
              <item.icon size={16} strokeWidth={1.75} aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </SidebarGroup>
      </nav>
      <SidebarGroup title="Countries">
        {(countries.data ?? []).map((c) => (
          <Link
            key={c.iso2}
            to={`/?country=${c.iso2}`}
            className={clsx(styles.sideLink, active === c.iso2 && styles.sideLinkActive)}
            aria-current={active === c.iso2 ? 'page' : undefined}
          >
            <Flag country={c.iso2} />
            <span className={styles.grow}>{c.name}</span>
            <span className="mono muted" title="Stories in the last 24 hours">
              {c.last24h}
            </span>
          </Link>
        ))}
      </SidebarGroup>
      <SidebarGroup title="Sectors">
        {SECTORS.map((sector) => (
          <NavLink key={sector.id} to={`/sector/${sector.id}`} className={styles.sideLink}>
            <span className={styles.sectorDot} style={{ background: sectorColor(sector.id) }} aria-hidden="true" />
            {sector.label}
          </NavLink>
        ))}
      </SidebarGroup>
      <SidebarGroup title="About">
        <NavLink to="/about" className={styles.sideLink}>
          <Info size={16} strokeWidth={1.75} aria-hidden="true" />
          Sources &amp; method
        </NavLink>
        <NavLink to="/status" className={styles.sideLink}>
          <Compass size={16} strokeWidth={1.75} aria-hidden="true" />
          Status
        </NavLink>
        <button type="button" className={clsx(styles.sideLink, styles.sideButton)} onClick={onShowShortcuts}>
          <Keyboard size={16} strokeWidth={1.75} aria-hidden="true" />
          Keyboard shortcuts
        </button>
      </SidebarGroup>
    </aside>
  )
}

function SidebarGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className={styles.group}>
      {title && <p className={`${styles.groupTitle} mono muted`}>{title}</p>}
      {children}
    </div>
  )
}
