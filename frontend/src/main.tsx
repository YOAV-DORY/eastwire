import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource-variable/schibsted-grotesk'
import '@fontsource-variable/source-sans-3'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/tokens.css'
import './styles/base.css'
import './styles/utilities.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
})

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
