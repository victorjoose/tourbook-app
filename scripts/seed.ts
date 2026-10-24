// Importa os dados de exemplo (`@tour/core/seed`) no Cloud Firestore com o
// firebase-admin, gravando exatamente os documentos que `importSeedData`
// (tela /admin/importar) grava: status 'verified', submittedBy null, ownerId
// null nas bandas, createdAt/updatedAt ISO de agora. Documentos com o mesmo
// id são sobrescritos; cadastros feitos por usuários (ids automáticos) ficam.
//
// Emulador (sem credenciais):
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 pnpm seed              # projeto demo-tourbook
//   GCLOUD_PROJECT=demo-outro FIRESTORE_EMULATOR_HOST=127.0.0.1:8090 pnpm seed
// Projeto real (conta de serviço):
//   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json pnpm seed  # projeto tourbook-app
//   FIREBASE_PROJECT_ID=outro-projeto GOOGLE_APPLICATION_CREDENTIALS=... pnpm seed
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { COLLECTIONS } from '@tour/core'
import { SEED_DATA } from '@tour/core/seed'

/** O Firestore aceita até 500 operações por batch; 400 deixa folga. */
const BATCH_SIZE = 400

type SeedDoc = { id: string; data: Record<string, unknown> }
type Group = { name: string; label: string; docs: SeedDoc[] }
type Target = { db: Firestore; description: string }

function connect(): Target {
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST
  if (emulatorHost) {
    const projectId = process.env.GCLOUD_PROJECT ?? 'demo-tourbook'
    const app = initializeApp({ projectId })
    return { db: getFirestore(app), description: `emulador do Firestore em ${emulatorHost} (projeto ${projectId})` }
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error(
      'Defina GOOGLE_APPLICATION_CREDENTIALS (JSON da conta de serviço) para gravar no projeto real, ' +
        'ou FIRESTORE_EMULATOR_HOST (ex.: 127.0.0.1:8080) para usar o emulador.',
    )
  }
  const projectId = process.env.FIREBASE_PROJECT_ID ?? 'tourbook-app'
  const app = initializeApp({ credential: applicationDefault(), projectId })
  return { db: getFirestore(app), description: `projeto ${projectId} (Firestore REAL)` }
}

function buildGroups(now: string): Group[] {
  const stamp = { status: 'verified', submittedBy: null, createdAt: now, updatedAt: now }
  return [
    { name: COLLECTIONS.cities, label: 'cidades', docs: SEED_DATA.cities.map(({ id, ...data }) => ({ id, data })) },
    {
      name: COLLECTIONS.venues,
      label: 'casas de show',
      docs: SEED_DATA.venues.map(({ id, ...data }) => ({ id, data: { ...data, ...stamp } })),
    },
    {
      name: COLLECTIONS.producers,
      label: 'produtoras',
      docs: SEED_DATA.producers.map(({ id, ...data }) => ({ id, data: { ...data, ...stamp } })),
    },
    {
      name: COLLECTIONS.bands,
      label: 'bandas',
      docs: SEED_DATA.bands.map(({ id, ...data }) => ({ id, data: { ...data, ...stamp, ownerId: null } })),
    },
  ]
}

async function writeGroup(db: Firestore, group: Group): Promise<number> {
  const col = db.collection(group.name)
  for (let i = 0; i < group.docs.length; i += BATCH_SIZE) {
    const batch = db.batch()
    for (const { id, data } of group.docs.slice(i, i + BATCH_SIZE)) batch.set(col.doc(id), data)
    await batch.commit()
  }
  return group.docs.length
}

async function main(): Promise<void> {
  const { db, description } = connect()
  const groups = buildGroups(new Date().toISOString())
  const planned = groups.reduce((n, g) => n + g.docs.length, 0)

  console.log(`Importando ${planned} documentos de exemplo para ${description}.`)
  console.log('Cidades reais; casas, produtoras e bandas fictícias. Documentos com o mesmo id serão sobrescritos.')

  const started = Date.now()
  let written = 0
  try {
    for (const group of groups) {
      const count = await writeGroup(db, group)
      written += count
      console.log(`  ${group.name.padEnd(10)} ${String(count).padStart(4)} ${group.label}`)
    }
  } finally {
    await db.terminate()
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  console.log(`Pronto: ${written} documentos gravados em ${seconds} s.`)
}

main().catch((e: unknown) => {
  console.error(`Falha ao importar dados de exemplo: ${e instanceof Error ? e.message : String(e)}`)
  process.exitCode = 1
})
