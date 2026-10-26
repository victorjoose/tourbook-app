import { lazy, Suspense } from 'react'
import { Outlet } from 'react-router'
import { FullScreenSpinner } from '../components/ui/Spinner'

export const LoginPage = lazy(() => import('../auth/LoginPage'))
export const MapPage = lazy(() => import('../features/map/MapPage'))
export const ToursListPage = lazy(() => import('../features/tours/ToursListPage'))
export const NewTourPage = lazy(() => import('../features/tours/NewTourPage'))
export const TourPage = lazy(() => import('../features/tours/TourPage'))
export const TourbookPage = lazy(() => import('../features/tourbook/TourbookPage'))
export const PublicTourbookPage = lazy(() => import('../features/tourbook/PublicTourbookPage'))
export const SubmitVenuePage = lazy(() => import('../features/venues/SubmitVenuePage'))
export const ModerationPage = lazy(() => import('../features/venues/ModerationPage'))
export const ProfilePage = lazy(() => import('../features/profile/ProfilePage'))
export const ImportSeedPage = lazy(() => import('../features/admin/ImportSeedPage'))
export const NotFoundPage = lazy(() => import('./NotFoundPage'))

export function LazyOutlet() {
  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <Outlet />
    </Suspense>
  )
}
