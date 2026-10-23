// Dados de exemplo da região-piloto (SC/PR/SP). Importados pela tela
// /admin/importar e pelo script scripts/seed.ts. Fica fora do index principal
// para não entrar no bundle do app.
import type { SeedData } from '../queries'

export const SEED_DATA: SeedData = { cities: [], venues: [], producers: [], bands: [] }
