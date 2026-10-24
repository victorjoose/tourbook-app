import { Compass } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '../components/ui/EmptyState'

/** Catch-all route inside the app shell. */
export default function NotFoundPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState
        icon={<Compass className="h-8 w-8" aria-hidden />}
        title="Página não encontrada"
        description="Esse endereço não existe ou mudou de lugar."
        action={
          <Link
            to="/"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-500"
          >
            Voltar ao mapa
          </Link>
        }
      />
    </div>
  )
}
