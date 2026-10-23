import { createBrowserRouter } from 'react-router'
import { RequireAdmin, RequireAuth } from '../auth/RequireAuth'
import { AppShell } from './AppShell'
import {
  LazyOutlet,
  LoginPage,
  MapPage,
  ImportSeedPage,
  ModerationPage,
  NewTourPage,
  ProfilePage,
  PublicTourbookPage,
  SubmitVenuePage,
  TourbookPage,
  TourPage,
  ToursListPage,
} from './pages'

export const router = createBrowserRouter([
  {
    element: <LazyOutlet />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/t/:token', element: <PublicTourbookPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            children: [
              // Mapa com detalhe lateral (casa / produtora / banda) via rota.
              { path: '/', element: <MapPage /> },
              { path: '/casas/sugerir', element: <SubmitVenuePage /> },
              { path: '/casas/:id', element: <MapPage /> },
              { path: '/produtoras/:id', element: <MapPage /> },
              { path: '/bandas/:id', element: <MapPage /> },
              { path: '/turnes', element: <ToursListPage /> },
              { path: '/turnes/nova', element: <NewTourPage /> },
              { path: '/turnes/:id', element: <TourPage /> },
              { path: '/turnes/:id/tourbook', element: <TourbookPage /> },
              { path: '/perfil', element: <ProfilePage /> },
              {
                element: <RequireAdmin />,
                children: [
                  { path: '/admin/moderacao', element: <ModerationPage /> },
                  { path: '/admin/importar', element: <ImportSeedPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
])
