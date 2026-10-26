import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { queryClient } from './app/queryClient'
import { router } from './app/router'
import { AuthProvider } from './auth/AuthProvider'
import { reloadOnceForStaleBuild } from './lib/staleBuild'
import './index.css'

// Dependência de um chunk (CSS ou JS) sumiu depois de um deploy: recarrega uma vez
// em vez de deixar o erro estourar. https://vite.dev/guide/build#load-error-handling
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForStaleBuild()) event.preventDefault()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
