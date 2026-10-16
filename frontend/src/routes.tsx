import { lazy, Suspense } from 'react'
import { Navigate, type RouteObject } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import { Home } from './pages/Home'

// The component gallery exists only in development builds; production drops it entirely.
const ComponentGallery = import.meta.env.DEV ? lazy(() => import('./dev/ComponentGallery')) : null

/*
 * Home is in the first bundle; every other page is its own chunk, so the front page loads less.
 * The router loads a page's chunk before switching to it (the current page stays until then),
 * and prefetchPages() fetches them all while the browser is idle, so moving between sections
 * still feels instant.
 */
const PAGES = {
  sources: () => import('./pages/SourcesPage').then((m) => ({ Component: m.SourcesPage })),
  about: () => import('./pages/AboutPage').then((m) => ({ Component: m.AboutPage })),
  map: () => import('./pages/MapPage').then((m) => ({ Component: m.MapPage })),
  search: () => import('./pages/SearchPage').then((m) => ({ Component: m.SearchPage })),
  sectors: () => import('./pages/SectorsPage').then((m) => ({ Component: m.SectorsPage })),
  sector: () => import('./pages/SectorPage').then((m) => ({ Component: m.SectorPage })),
  social: () => import('./pages/SocialPage').then((m) => ({ Component: m.SocialPage })),
  notFound: () => import('./pages/NotFound').then((m) => ({ Component: m.NotFound })),
}

export function prefetchPages() {
  for (const load of Object.values(PAGES)) void load().catch(() => undefined)
}

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/sources', lazy: PAGES.sources },
      // Source health moved to the Sources page.
      { path: '/status', element: <Navigate to="/sources#health" replace /> },
      { path: '/about', lazy: PAGES.about },
      // One route for the map and a city on it, so choosing a city keeps the same page (and map).
      { path: '/map', lazy: PAGES.map, children: [{ path: 'city/:geonamesId' }] },
      { path: '/search', lazy: PAGES.search },
      { path: '/sectors', lazy: PAGES.sectors },
      { path: '/sector/:slug', lazy: PAGES.sector },
      { path: '/social', lazy: PAGES.social },
      { path: '*', lazy: PAGES.notFound },
    ],
  },
  ...(ComponentGallery
    ? [
        {
          path: '/dev/gallery',
          element: (
            <Suspense fallback={null}>
              <ComponentGallery />
            </Suspense>
          ),
        },
      ]
    : []),
]
