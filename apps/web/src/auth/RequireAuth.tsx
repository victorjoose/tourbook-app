import { Navigate, Outlet, useLocation } from 'react-router'
import { ErrorState } from '../components/ui/EmptyState'
import { FullScreenSpinner } from '../components/ui/Spinner'
import { useAuth } from './AuthProvider'

/** Protege as rotas filhas: sem sessão, manda para /login guardando o destino. */
export function RequireAuth() {
  const { user } = useAuth()
  const location = useLocation()

  if (user === undefined) return <FullScreenSpinner label="Carregando…" />
  if (!user) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }
  return <Outlet />
}

/** Só admins. */
export function RequireAdmin() {
  const { loading, isAdmin, profileError, retryProfile } = useAuth()
  if (loading) return <FullScreenSpinner label="Carregando…" />
  if (profileError) return <ErrorState message={profileError} onRetry={() => void retryProfile()} />
  if (!isAdmin) return <Navigate to="/" replace />
  return <Outlet />
}
