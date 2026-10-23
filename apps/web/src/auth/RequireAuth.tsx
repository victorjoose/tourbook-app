import { Navigate, Outlet, useLocation } from 'react-router'
import { FullScreenSpinner } from '../components/ui/Spinner'
import { useAuth } from './AuthProvider'

/** Protege as rotas filhas: sem sessão, manda para /login guardando o destino. */
export function RequireAuth() {
  const { session } = useAuth()
  const location = useLocation()

  if (session === undefined) return <FullScreenSpinner label="Carregando…" />
  if (!session) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }
  return <Outlet />
}

/** Só admins. */
export function RequireAdmin() {
  const { loading, isAdmin } = useAuth()
  if (loading) return <FullScreenSpinner label="Carregando…" />
  if (!isAdmin) return <Navigate to="/" replace />
  return <Outlet />
}
