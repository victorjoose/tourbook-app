import { useEffect } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router'
import { ErrorState } from '../components/ui/EmptyState'
import { errorMessage } from '../lib/errorMessage'
import { isStaleChunkError } from '../lib/staleBuild'

/** Tela de erro do router (substitui o "Unexpected Application Error!" padrão). */
export function RouteErrorPage() {
  const error = useRouteError()

  useEffect(() => {
    console.error(error)
  }, [error])

  const message = isStaleChunkError(error)
    ? 'O app foi atualizado enquanto esta página estava aberta. Recarregue para pegar a versão nova.'
    : isRouteErrorResponse(error)
      ? `${error.status} ${error.statusText}`.trim()
      : errorMessage(error, 'Erro inesperado. Recarregue a página e tente de novo.')

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface text-ink">
      <ErrorState message={message} onRetry={() => window.location.reload()} />
    </div>
  )
}
