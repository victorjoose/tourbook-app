import { lazy, Suspense } from 'react'
import { Outlet } from 'react-router'
import { FullScreenSpinner } from '../components/ui/Spinner'
import { withStaleChunkReload as guarded } from '../lib/staleBuild'

// `guarded`: se o chunk da rota sumiu depois de um deploy, recarrega a página uma
// vez em vez de estourar "Failed to fetch dynamically imported module".
export const LoginPage = lazy(guarded(() => import('../auth/LoginPage')))
export const MapPage = lazy(guarded(() => import('../features/map/MapPage')))
export const ToursListPage = lazy(guarded(() => import('../features/tours/ToursListPage')))
export const NewTourPage = lazy(guarded(() => import('../features/tours/NewTourPage')))
export const TourPage = lazy(guarded(() => import('../features/tours/TourPage')))
export const TourbookPage = lazy(guarded(() => import('../features/tourbook/TourbookPage')))
export const PublicTourbookPage = lazy(guarded(() => import('../features/tourbook/PublicTourbookPage')))
export const SubmitVenuePage = lazy(guarded(() => import('../features/venues/SubmitVenuePage')))
export const ModerationPage = lazy(guarded(() => import('../features/venues/ModerationPage')))
export const ProfilePage = lazy(guarded(() => import('../features/profile/ProfilePage')))
export const ImportSeedPage = lazy(guarded(() => import('../features/admin/ImportSeedPage')))
export const NotFoundPage = lazy(guarded(() => import('./NotFoundPage')))

export function LazyOutlet() {
  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <Outlet />
    </Suspense>
  )
}
