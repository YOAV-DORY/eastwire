import { lazy, Suspense } from 'react'
import type { RouteObject } from 'react-router'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'

// The component gallery exists only in development builds; production drops it entirely.
const ComponentGallery = import.meta.env.DEV ? lazy(() => import('./dev/ComponentGallery')) : null

export const routes: RouteObject[] = [
  { path: '/', element: <Home /> },
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
  { path: '*', element: <NotFound /> },
]
