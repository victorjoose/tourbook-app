// Shared infra for the emulator suites (rules + queries). Not a test file.
import { readFileSync } from 'node:fs'
import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import type { BandDoc, CityDoc, ProfileDoc, TourDateDoc, TourDoc, VenueDoc } from '@tour/core'
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore'
import { describe } from 'vitest'

export const PROJECT_ID = 'demo-tourbook'

/** Set by `firebase emulators:exec` (pnpm rules:test). Without it the suites are skipped. */
export const EMULATOR_HOST: string | undefined = process.env.FIRESTORE_EMULATOR_HOST

/** `describe` that becomes `describe.skip` when the emulator is not running. */
export const describeWithEmulator = EMULATOR_HOST ? describe : describe.skip

export function emulatorAddress(): { host: string; port: number } {
  const [host = '', port = ''] = (EMULATOR_HOST ?? '').split(':')
  return { host: host || '127.0.0.1', port: Number.parseInt(port, 10) || 8080 }
}

/** Loads firestore.rules into the emulator for the demo project. */
export async function createTestEnv(): Promise<RulesTestEnvironment> {
  const { host, port } = emulatorAddress()
  const rules = readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8')
  return initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules, host, port } })
}

/**
 * The rules-unit-testing context hands out a *compat* instance; the modular API
 * (`doc`, `getDocs`, `writeBatch`…) accepts it by unwrapping `_delegate`.
 * The cast only exists for TypeScript.
 */
export function dbOf(ctx: RulesTestContext): Firestore {
  return ctx.firestore() as unknown as Firestore
}

export type RawDoc = Record<string, unknown>

/** Runs `fn` with security rules disabled and returns its result. */
export async function withRulesDisabled<T>(env: RulesTestEnvironment, fn: (db: Firestore) => Promise<T>): Promise<T> {
  const results: T[] = []
  await env.withSecurityRulesDisabled(async (ctx) => {
    results.push(await fn(dbOf(ctx)))
  })
  if (results.length !== 1) throw new Error('withRulesDisabled: callback did not run')
  return results[0]
}

/** Writes documents (path → data) with security rules disabled. */
export async function seed(env: RulesTestEnvironment, docs: Record<string, RawDoc>): Promise<void> {
  await withRulesDisabled(env, async (db) => {
    await Promise.all(Object.entries(docs).map(([path, data]) => setDoc(doc(db, path), data)))
  })
}

/** Reads a document with security rules disabled (to inspect what a flow wrote). */
export function readRaw(env: RulesTestEnvironment, path: string): Promise<RawDoc | null> {
  return withRulesDisabled(env, async (db) => {
    const snap = await getDoc(doc(db, path))
    return snap.exists() ? snap.data() : null
  })
}

// ---------------------------------------------------------------------------
// Fixtures (documents as stored; see packages/core/src/firestore.ts)
// ---------------------------------------------------------------------------

export const NOW = '2026-10-23T12:00:00.000Z'

export const UIDS = {
  alice: 'uid-alice',
  bob: 'uid-bob',
  carol: 'uid-carol',
  dave: 'uid-dave',
  admin: 'uid-admin',
} as const

export const CITY_ID = 'joinville-sc'

export function profileDoc(overrides: Partial<ProfileDoc> = {}): ProfileDoc {
  return { displayName: 'Alguém', avatarUrl: null, role: 'user', createdAt: NOW, updatedAt: NOW, ...overrides }
}

export function cityDoc(overrides: Partial<CityDoc> = {}): CityDoc {
  return { name: 'Joinville', state: 'SC', slug: CITY_ID, lat: -26.3045, lng: -48.8487, population: 616317, ...overrides }
}

export function venueDoc(overrides: Partial<VenueDoc> = {}): VenueDoc {
  return {
    cityId: CITY_ID,
    name: 'Porão 77',
    slug: 'porao-77',
    address: 'Rua Exemplo, 77',
    lat: -26.3,
    lng: -48.85,
    capacity: 200,
    genres: ['punk', 'hardcore'],
    showDays: [5, 6],
    dealTypes: ['porta'],
    hasPa: true,
    hasBackline: false,
    acceptsTouringBands: true,
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    instagram: null,
    website: null,
    notes: null,
    status: 'verified',
    submittedBy: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

export function bandDoc(overrides: Partial<BandDoc> = {}): BandDoc {
  return {
    name: 'Banda Local',
    slug: 'banda-local',
    cityId: CITY_ID,
    genres: ['hardcore'],
    links: {},
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    opensForTouring: true,
    ownerId: null,
    notes: null,
    status: 'verified',
    submittedBy: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

export function tourDoc(ownerId: string, overrides: Partial<TourDoc> = {}): TourDoc {
  return {
    ownerId,
    bandId: null,
    bandName: 'Banda Teste',
    name: 'Turnê Sul',
    startCityId: CITY_ID,
    endCityId: null,
    maxKmPerDay: 400,
    allowOffDays: true,
    genres: ['punk'],
    capacityMin: null,
    capacityMax: null,
    notes: null,
    shareToken: null,
    memberIds: [ownerId],
    memberRoles: { [ownerId]: 'editor' },
    dateCount: 0,
    firstDate: null,
    lastDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

export function tourDateDoc(overrides: Partial<TourDateDoc> = {}): TourDateDoc {
  return {
    date: '2026-11-14',
    cityId: CITY_ID,
    venueId: null,
    producerId: null,
    status: 'ideia',
    isFixed: false,
    loadInTime: null,
    soundcheckTime: null,
    doorsTime: null,
    setTime: null,
    dealType: null,
    feeCents: null,
    costCents: null,
    lodging: null,
    checklist: [],
    notes: null,
    bands: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}
