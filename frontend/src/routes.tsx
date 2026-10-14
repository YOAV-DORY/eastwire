import { lazy, Suspense } from 'react'
import type { RouteObject } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import { AboutPage } from './pages/AboutPage'
import { ComingSoon } from './pages/ComingSoon'
import { Home } from './pages/Home'
import { MapPage } from './pages/MapPage'
import { NotFound } from './pages/NotFound'
import { SearchPage } from './pages/SearchPage'
import { StatusPage } from './pages/StatusPage'

// The component gallery exists only in development builds; production drops it entirely.
const ComponentGallery = import.meta.env.DEV ? lazy(() => import('./dev/ComponentGallery')) : null

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/status', element: <StatusPage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/map', element: <MapPage /> },
      { path: '/map/city/:geonamesId', element: <MapPage /> },
      { path: '/search', element: <SearchPage /> },
      {
        path: '/sectors',
        element: (
          <ComingSoon
            title="Sectors"
            milestone={7}
            description="Economy, geopolitics, technology, business, society and environment, each with the rules used to tag stories."
          />
        ),
      },
      { path: '*', element: <NotFound /> },
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
