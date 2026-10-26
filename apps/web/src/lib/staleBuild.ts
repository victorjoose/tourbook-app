/**
 * Depois de um deploy, o index.html que já estava aberto no navegador aponta para
 * chunks com hash antigo, que não existem mais ("Failed to fetch dynamically
 * imported module"). A saída é recarregar a página uma vez para pegar o build novo.
 * Um sinal em sessionStorage evita loop quando o erro é outro.
 */
const KEY = 'tour-app:reloaded-for-stale-build'

function alreadyReloaded(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

function setReloaded(on: boolean) {
  try {
    if (on) sessionStorage.setItem(KEY, '1')
    else sessionStorage.removeItem(KEY)
  } catch {
    // sessionStorage indisponível (modo privado etc.): sem guarda, mas sem quebrar.
  }
}

const STALE_CHUNK_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /importing a module script failed/i,
  /error loading dynamically imported module/i,
  /unable to preload css/i,
  /loading (css )?chunk .* failed/i,
]

/** Erro típico de chunk que sumiu depois de um deploy (Chrome, Firefox, Safari e Vite). */
export function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  return STALE_CHUNK_PATTERNS.some((re) => re.test(message))
}

/**
 * Recarrega a página uma vez. Devolve `false` quando esta sessão já recarregou
 * por esse motivo (aí o erro deve seguir o fluxo normal e aparecer na tela).
 */
export function reloadOnceForStaleBuild(reload: () => void = () => window.location.reload()): boolean {
  if (alreadyReloaded()) return false
  setReloaded(true)
  reload()
  return true
}

/** Um chunk carregou: a próxima falha (outro deploy) pode recarregar de novo. */
export function markBuildFresh() {
  setReloaded(false)
}

/**
 * Envolve o `import()` de uma rota: se o chunk sumiu (deploy novo enquanto a
 * página estava aberta), recarrega a página uma vez e segura a promise até lá.
 * Qualquer outro erro, ou uma segunda falha, segue para quem chamou.
 */
export function withStaleChunkReload<T>(loader: () => Promise<T>): () => Promise<T> {
  return async () => {
    try {
      const mod = await loader()
      markBuildFresh()
      return mod
    } catch (error) {
      if (isStaleChunkError(error) && reloadOnceForStaleBuild()) {
        return new Promise<T>(() => {})
      }
      throw error
    }
  }
}
