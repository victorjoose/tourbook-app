// Dados de exemplo da região-piloto (SC/PR/SP). Importados pela tela
// /admin/importar e pelo script scripts/seed.ts. Fica fora do index principal
// (entrada `@tour/core/seed`) para não entrar no bundle do app.
//
// Cidades são REAIS; casas de show, produtoras e bandas são FICTÍCIAS, com
// contatos obviamente falsos (99999-xxxx, @exemplo.com.br). Ids = slugs.
import type { SeedData } from '../queries'
import { BANDS } from './bands'
import { CITIES } from './cities'
import { PRODUCERS } from './producers'
import { VENUES } from './venues'

export type { SeedBand, SeedCity, SeedData, SeedProducer, SeedVenue } from '../queries'
export { BANDS, CITIES, PRODUCERS, VENUES }

export const SEED_DATA: SeedData = { cities: CITIES, venues: VENUES, producers: PRODUCERS, bands: BANDS }
