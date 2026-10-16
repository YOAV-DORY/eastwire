import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource-variable/schibsted-grotesk'
import '@fontsource-variable/source-sans-3'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { router } from './router'
import { prefetchPages } from './routes'
import { fetchEdgeSnapshot, readInlineSnapshot, seedFromSnapshot } from './lib/snapshot'
import './styles/tokens.css'
import './styles/base.css'
import './styles/utilities.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
})

// The first screen starts from the newest "last good" copy (baked into this page, or the edge
// Worker's, or this device's saved one) and the live API refreshes it in the background.
seedFromSnapshot(queryClient, readInlineSnapshot())
void fetchEdgeSnapshot().then((snapshot) => seedFromSnapshot(queryClient, snapshot))

const start = () =>
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  )

// A page other than Home arrives in its own small chunk: until it has, the page's built-in
// skeleton (index.html) stays on screen rather than a blank one.
if (router.state.initialized) start()
else {
  const stop = router.subscribe((state) => {
    if (!state.initialized) return
    stop()
    start()
  })
}

// Then, while the browser is idle, the other pages' code, so moving between them is instant.
const whenIdle = window.requestIdleCallback ?? ((run: () => void) => window.setTimeout(run, 2000))
window.addEventListener('load', () => whenIdle(prefetchPages), { once: true })
