/** Message of a thrown error (DataError already speaks pt-BR), or a pt-BR fallback. */
export function errorMessage(error: unknown, fallback = 'Não foi possível concluir. Tente de novo.'): string {
  return error instanceof Error && error.message ? error.message : fallback
}
