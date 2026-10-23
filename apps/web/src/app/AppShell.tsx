import { CalendarRange, Map as MapIcon, ShieldCheck, UserRound } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { cn } from '../lib/cn'

const items = [
  { to: '/', label: 'Mapa', icon: MapIcon, match: (p: string) => p === '/' || /^\/(casas|produtoras|bandas)\//.test(p) },
  { to: '/turnes', label: 'Turnês', icon: CalendarRange, match: (p: string) => p.startsWith('/turnes') },
  { to: '/perfil', label: 'Perfil', icon: UserRound, match: (p: string) => p.startsWith('/perfil') },
]

/**
 * Layout do app: barra no topo no desktop, barra inferior no celular.
 * O conteúdo ocupa o resto da altura (o mapa precisa de altura fixa).
 */
export function AppShell() {
  const { pathname } = useLocation()
  const { isAdmin } = useAuth()
  const nav = isAdmin
    ? [...items, { to: '/admin/moderacao', label: 'Moderação', icon: ShieldCheck, match: (p: string) => p.startsWith('/admin') }]
    : items

  return (
    <div className="flex h-full flex-col">
      <header className="hidden h-14 shrink-0 items-center justify-between border-b border-surface-2 bg-surface-1 px-4 md:flex">
        <NavLink to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
            <MapIcon className="h-4 w-4" aria-hidden />
          </span>
          Tour App
        </NavLink>
        <nav className="flex items-center gap-1" aria-label="Principal">
          {nav.map(({ to, label, icon: Icon, match }) => (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                match(pathname) ? 'bg-surface-2 text-ink' : 'text-ink-muted hover:text-ink',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="min-h-0 flex-1">
        <Outlet />
      </main>

      <nav
        className="pb-safe flex shrink-0 items-stretch border-t border-surface-2 bg-surface-1 md:hidden"
        aria-label="Principal"
      >
        {nav.map(({ to, label, icon: Icon, match }) => (
          <NavLink
            key={to}
            to={to}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
              match(pathname) ? 'text-brand-300' : 'text-ink-muted',
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
