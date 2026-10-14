import { lazy, Suspense } from 'react'
import type { RouteObject } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import { AboutPage } from './pages/AboutPage'
import { ComingSoon } from './pages/ComingSoon'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
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
      {
        path: '/map',
        element: (
          <ComingSoon
            title="Map"
            milestone={6}
            description="An interactive map of the city list, with stories pinned only where a city is known and country-level stories counted separately."
          />
        ),
      },
      {
        path: '/search',
        element: (
          <ComingSoon
            title="Search"
            milestone={5}
            description="Keyword search with country, city, sector and date filters, and links you can share."
          />
        ),
      },
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
