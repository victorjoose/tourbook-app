// The real @tour/core data-access functions against the emulator with rules ENFORCED.
// Proves every client flow in packages/core/src/queries.ts is allowed by firestore.rules.
// Run from the repo root: `pnpm rules:test`. Skipped when FIRESTORE_EMULATOR_HOST is unset.
import { assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import {
  DataError,
  addTourDate,
  createTour,
  deleteTour,
  deleteTourDate,
  disableShareLink,
  enableShareLink,
  ensureProfile,
  fetchCollectionCounts,
  fetchMyProfile,
  fetchMySubmissions,
  fetchMyTours,
  fetchPendingVenues,
  fetchPublicTourbook,
  fetchRegionData,
  fetchTour,
  importSeedData,
  moderateVenue,
  searchCities,
  setTourDateBands,
  submitVenue,
  updateMyProfile,
  updateTour,
  updateTourDate,
  type Client,
  type SeedData,
  type SeedProgress,
  type TourFormValues,
  type TourSummary,
  type VenueSubmissionValues,
} from '@tour/core'
import type { Auth } from 'firebase/auth'
import { collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { CITY_ID, UIDS, cityDoc, createTestEnv, dbOf, describeWithEmulator, profileDoc, readRaw, seed, withRulesDisabled } from './emulator'

let env: RulesTestEnvironment

/** A `Client` like apps/web/src/lib/firebase.ts builds, but backed by a rules-unit-testing context. */
function clientFor(uid: string | null): Client {
  const ctx = uid === null ? env.unauthenticatedContext() : env.authenticatedContext(uid)
  // Test infra: queries.ts only reads `auth.currentUser.uid`.
  const auth = { currentUser: uid === null ? null : { uid } } as unknown as Auth
  return { db: dbOf(ctx), auth }
}

/** The flow must be denied by the rules and surface as a pt-BR DataError. */
async function expectDenied(promise: Promise<unknown>): Promise<void> {
  const err: unknown = await assertFails(promise)
  expect(err).toBeInstanceOf(DataError)
  if (err instanceof DataError) {
    expect(err.code).toBe('permission-denied')
    expect(err.message).toContain('Você não tem permissão para isso.')
  }
}

async function mySummary(client: Client, tourId: string): Promise<TourSummary | undefined> {
  return (await fetchMyTours(client)).find((t) => t.id === tourId)
}

const tourValues: TourFormValues = {
  name: 'Turnê Sul',
  bandName: 'Banda Teste',
  bandId: null,
  genres: ['punk', 'hardcore'],
  startCityId: CITY_ID,
  endCityId: null,
  maxKmPerDay: 400,
  allowOffDays: true,
  capacityMin: null,
  capacityMax: 500,
  notes: null,
}

const venueValues: VenueSubmissionValues = {
  name: 'Casa Nova',
  cityId: CITY_ID,
  address: 'Rua das Flores, 10',
  lat: -26.3,
  lng: -48.85,
  capacity: 150,
  genres: ['punk'],
  showDays: [5, 6],
  dealTypes: ['porta'],
  hasPa: true,
  hasBackline: false,
  acceptsTouringBands: true,
  contactName: 'Maria',
  contactPhone: '47 99999-0000',
  contactEmail: 'maria@casanova.com',
  instagram: '@casanova',
  website: 'https://casanova.com',
  notes: null,
}

const tinySeed: SeedData = {
  cities: [{ id: CITY_ID, name: 'Joinville', state: 'SC', slug: CITY_ID, lat: -26.3045, lng: -48.8487, population: 616317 }],
  venues: [
    {
      id: 'porao-77',
      cityId: CITY_ID,
      name: 'Porão 77',
      slug: 'porao-77',
      address: 'Rua Exemplo, 77',
      lat: -26.3,
      lng: -48.85,
      capacity: 200,
      genres: ['punk', 'hardcore'],
      showDays: [5, 6],
      dealTypes: ['porta', 'misto'],
      hasPa: true,
      hasBackline: false,
      acceptsTouringBands: true,
      contactName: 'Zé',
      contactPhone: '47999990000',
      contactEmail: null,
      instagram: '@porao77',
      website: null,
      notes: null,
    },
  ],
  producers: [
    {
      id: 'coletivo-x',
      name: 'Coletivo X',
      slug: 'coletivo-x',
      cityId: CITY_ID,
      cityIds: [CITY_ID],
      venueIds: ['porao-77'],
      genres: ['punk'],
      contactName: null,
      contactPhone: null,
      contactEmail: 'contato@coletivox.com',
      instagram: null,
      website: null,
      notes: null,
    },
  ],
  bands: [
    {
      id: 'banda-x',
      name: 'Banda X',
      slug: 'banda-x',
      cityId: CITY_ID,
      genres: ['hardcore'],
      links: { instagram: 'https://instagram.com/bandax' },
      contactName: null,
      contactPhone: null,
      contactEmail: null,
      opensForTouring: true,
      notes: null,
    },
  ],
}

const FIXED_DATE = { date: '2026-11-14', cityId: CITY_ID, venueId: null, producerId: null, isFixed: true }
const OPEN_DATE = { date: '2026-11-13', cityId: null, venueId: null, producerId: null, isFixed: false }

describeWithEmulator('queries.ts against the emulator (rules enforced)', () => {
  beforeAll(async () => {
    env = await createTestEnv()
  })

  afterAll(async () => {
    await env.cleanup()
  })

  beforeEach(async () => {
    await env.clearFirestore()
    await seed(env, { [`cities/${CITY_ID}`]: cityDoc() })
  })

  // -------------------------------------------------------------------------
  describe('profile', () => {
    it('ensureProfile creates the profile and is idempotent', async () => {
      const alice = clientFor(UIDS.alice)
      const first = await ensureProfile(alice, { uid: UIDS.alice, displayName: 'Alice', photoURL: null })
      expect(first).toEqual({ id: UIDS.alice, displayName: 'Alice', avatarUrl: null, role: 'user' })

      // Second login: keeps the stored name, refreshes the avatar, never touches role.
      const second = await ensureProfile(alice, { uid: UIDS.alice, displayName: 'Outro Nome', photoURL: 'https://img.example/a.png' })
      expect(second).toEqual({ id: UIDS.alice, displayName: 'Alice', avatarUrl: 'https://img.example/a.png', role: 'user' })

      const third = await ensureProfile(alice, { uid: UIDS.alice, displayName: 'Alice', photoURL: 'https://img.example/a.png' })
      expect(third).toEqual(second)
      expect(await fetchMyProfile(alice, UIDS.alice)).toEqual(second)

      await updateMyProfile(alice, UIDS.alice, { displayName: 'Alice B.' })
      expect((await fetchMyProfile(alice, UIDS.alice))?.displayName).toBe('Alice B.')
      expect((await readRaw(env, `profiles/${UIDS.alice}`))?.role).toBe('user')
    })

    it("another user's profile is readable when signed in, not anonymously", async () => {
      await ensureProfile(clientFor(UIDS.bob), { uid: UIDS.bob, displayName: 'Bob', photoURL: null })
      expect((await fetchMyProfile(clientFor(UIDS.alice), UIDS.bob))?.displayName).toBe('Bob')
      expect(await fetchMyProfile(clientFor(UIDS.alice), 'nobody')).toBeNull()
      await expectDenied(fetchMyProfile(clientFor(null), UIDS.bob))
    })

    it("nobody edits another user's profile", async () => {
      await ensureProfile(clientFor(UIDS.bob), { uid: UIDS.bob, displayName: 'Bob', photoURL: null })
      await expectDenied(updateMyProfile(clientFor(UIDS.alice), UIDS.bob, { displayName: 'Hacked' }))
    })
  })

  // -------------------------------------------------------------------------
  describe('tours and dates', () => {
    it('createTour + fetchMyTours carry the summary; fetchTour returns dates and members', async () => {
      await ensureProfile(clientFor(UIDS.alice), { uid: UIDS.alice, displayName: 'Alice', photoURL: null })
      const alice = clientFor(UIDS.alice)
      const tour = await createTour(alice, UIDS.alice, { tour: tourValues, dates: [FIXED_DATE, { ...OPEN_DATE, bandIds: ['banda-x'] }] })
      expect(tour).toMatchObject({
        ownerId: UIDS.alice,
        name: tourValues.name,
        memberIds: [UIDS.alice],
        memberRoles: { [UIDS.alice]: 'editor' },
        shareToken: null,
      })

      const mine = await fetchMyTours(alice)
      expect(mine).toHaveLength(1)
      expect(mine[0]).toMatchObject({ id: tour.id, dateCount: 2, firstDate: '2026-11-13', lastDate: '2026-11-14' })

      const full = await fetchTour(alice, tour.id)
      expect(full?.dates.map((d) => d.date)).toEqual(['2026-11-13', '2026-11-14'])
      expect(full?.dates[0]?.bands).toEqual([{ bandId: 'banda-x', role: 'convidada' }])
      expect(full?.dates[1]?.isFixed).toBe(true)
      expect(full?.dates[1]?.checklist.length).toBeGreaterThan(0)
      expect(full?.members).toEqual([
        { tourId: tour.id, profileId: UIDS.alice, role: 'editor', profile: { id: UIDS.alice, displayName: 'Alice', avatarUrl: null, role: 'user' } },
      ])

      // Someone else sees nothing; an unknown id is "not found", not "denied".
      const bob = clientFor(UIDS.bob)
      expect(await fetchMyTours(bob)).toEqual([])
      await expectDenied(fetchTour(bob, tour.id))
      expect(await fetchTour(alice, 'missing')).toBeNull()
      expect(await fetchTour(bob, 'missing')).toBeNull()
    })

    it('createTour requires the session owner; fetchMyTours requires a session', async () => {
      await expectDenied(createTour(clientFor(UIDS.bob), UIDS.alice, { tour: tourValues, dates: [] }))
      await expect(fetchMyTours(clientFor(null))).rejects.toMatchObject({ name: 'DataError', code: 'unauthenticated' })
    })

    it('updateTour changes the form fields', async () => {
      const alice = clientFor(UIDS.alice)
      const tour = await createTour(alice, UIDS.alice, { tour: tourValues, dates: [] })
      await updateTour(alice, tour.id, { name: 'Turnê Sul 2026', maxKmPerDay: 300, notes: 'Van alugada' })
      expect(await fetchTour(alice, tour.id)).toMatchObject({ name: 'Turnê Sul 2026', maxKmPerDay: 300, notes: 'Van alugada', ownerId: UIDS.alice })
    })

    it('addTourDate/updateTourDate/deleteTourDate/setTourDateBands keep the summary correct', async () => {
      const alice = clientFor(UIDS.alice)
      const tour = await createTour(alice, UIDS.alice, { tour: tourValues, dates: [] })
      expect(await mySummary(alice, tour.id)).toMatchObject({ dateCount: 0, firstDate: null, lastDate: null })

      const d1 = await addTourDate(alice, tour.id, { date: '2026-11-20', cityId: CITY_ID, isFixed: true })
      const d2 = await addTourDate(alice, tour.id, { date: '2026-11-22', feeCents: 150000, status: 'negociando' })
      expect(d1).toMatchObject({ tourId: tour.id, date: '2026-11-20', cityId: CITY_ID, isFixed: true, status: 'ideia' })
      expect(d2).toMatchObject({ date: '2026-11-22', feeCents: 150000, status: 'negociando' })
      expect(await mySummary(alice, tour.id)).toMatchObject({ dateCount: 2, firstDate: '2026-11-20', lastDate: '2026-11-22' })

      await updateTourDate(alice, tour.id, d1.id, {
        date: '2026-11-25',
        status: 'confirmado',
        checklist: [{ label: 'Contrato ou acordo fechado', done: true }],
      })
      expect(await mySummary(alice, tour.id)).toMatchObject({ dateCount: 2, firstDate: '2026-11-22', lastDate: '2026-11-25' })

      await setTourDateBands(alice, tour.id, d2.id, ['banda-x', 'banda-y'])

      const full = await fetchTour(alice, tour.id)
      expect(full?.dates.find((d) => d.id === d1.id)).toMatchObject({
        date: '2026-11-25',
        status: 'confirmado',
        checklist: [{ label: 'Contrato ou acordo fechado', done: true }],
      })
      expect(full?.dates.find((d) => d.id === d2.id)?.bands).toEqual([
        { bandId: 'banda-x', role: 'convidada' },
        { bandId: 'banda-y', role: 'convidada' },
      ])

      await deleteTourDate(alice, tour.id, d1.id)
      expect(await mySummary(alice, tour.id)).toMatchObject({ dateCount: 1, firstDate: '2026-11-22', lastDate: '2026-11-22' })
      expect((await fetchTour(alice, tour.id))?.dates.map((d) => d.id)).toEqual([d2.id])

      await deleteTourDate(alice, tour.id, d2.id)
      expect(await mySummary(alice, tour.id)).toMatchObject({ dateCount: 0, firstDate: null, lastDate: null })
    })

    it('editor edits dates, name and link; viewer only reads; non-member sees nothing', async () => {
      const alice = clientFor(UIDS.alice)
      const bob = clientFor(UIDS.bob)
      const carol = clientFor(UIDS.carol)
      const dave = clientFor(UIDS.dave)
      const tour = await createTour(alice, UIDS.alice, { tour: tourValues, dates: [FIXED_DATE] })

      // Membership is managed outside the MVP client (console); simulate it with rules disabled.
      await withRulesDisabled(env, (db) =>
        updateDoc(doc(db, 'tours', tour.id), {
          memberIds: [UIDS.alice, UIDS.bob, UIDS.carol],
          memberRoles: { [UIDS.alice]: 'editor', [UIDS.bob]: 'editor', [UIDS.carol]: 'viewer' },
        }),
      )

      // Editor
      const added = await addTourDate(bob, tour.id, { date: '2026-11-15', cityId: CITY_ID })
      await updateTourDate(bob, tour.id, added.id, { status: 'contato_feito' })
      await updateTour(bob, tour.id, { name: 'Turnê editada pelo Bob' })
      const token = await enableShareLink(bob, tour.id)
      expect(await mySummary(bob, tour.id)).toMatchObject({ name: 'Turnê editada pelo Bob', dateCount: 2, shareToken: token })
      expect((await fetchPublicTourbook(clientFor(null), token))?.dates).toHaveLength(2)

      // Viewer
      const seenByCarol = await fetchTour(carol, tour.id)
      expect(seenByCarol?.dates).toHaveLength(2)
      expect(seenByCarol?.members.map((m) => [m.profileId, m.role])).toEqual([
        [UIDS.alice, 'editor'],
        [UIDS.bob, 'editor'],
        [UIDS.carol, 'viewer'],
      ])
      expect((await fetchMyTours(carol)).map((t) => t.id)).toEqual([tour.id])
      await expectDenied(addTourDate(carol, tour.id, { date: '2026-11-16' }))
      await expectDenied(updateTourDate(carol, tour.id, added.id, { notes: 'x' }))
      await expectDenied(deleteTourDate(carol, tour.id, added.id))
      await expectDenied(updateTour(carol, tour.id, { name: 'Carol' }))
      await expectDenied(disableShareLink(carol, tour.id))

      // Outsider
      await expectDenied(fetchTour(dave, tour.id))
      expect(await fetchMyTours(dave)).toEqual([])

      // Only the owner may delete the tour. deleteTour checks ownership before cascading, so an
      // editor's denied attempt leaves the dates and the public copy in place.
      await expectDenied(deleteTour(bob, tour.id))
      expect(await readRaw(env, `tours/${tour.id}`)).not.toBeNull()
      expect(await readRaw(env, `tours/${tour.id}/dates/${added.id}`)).not.toBeNull()
      expect(await readRaw(env, `publicTourbooks/${token}`)).not.toBeNull()
      await deleteTour(alice, tour.id)
      expect(await readRaw(env, `tours/${tour.id}`)).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  describe('public tourbook', () => {
    it('enableShareLink publishes a sanitized payload readable without login', async () => {
      await seed(env, { [`profiles/${UIDS.alice}`]: profileDoc({ displayName: 'Alice' }) })
      const alice = clientFor(UIDS.alice)
      const tour = await createTour(alice, UIDS.alice, { tour: tourValues, dates: [FIXED_DATE] })
      const dates = (await fetchTour(alice, tour.id))?.dates ?? []
      expect(dates).toHaveLength(1)
      await updateTourDate(alice, tour.id, dates[0].id, { feeCents: 250000, costCents: 80000, dealType: 'cache_fixo' })

      const token = await enableShareLink(alice, tour.id)
      expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      expect(await enableShareLink(alice, tour.id)).toBe(token)
      expect((await fetchTour(alice, tour.id))?.shareToken).toBe(token)

      const anon = clientFor(null)
      const payload = await fetchPublicTourbook(anon, token)
      expect(payload).not.toBeNull()
      expect(payload?.tour).toMatchObject({ id: tour.id, name: tourValues.name, bandName: tourValues.bandName, ownerId: '', shareToken: null })
      expect(payload?.tour.memberIds).toEqual([])
      expect(payload?.tour.memberRoles).toEqual({})
      expect(payload?.dates).toHaveLength(1)
      expect(payload?.dates[0]).toMatchObject({ date: '2026-11-14', cityId: CITY_ID, dealType: 'cache_fixo', feeCents: null, costCents: null })
      expect(payload?.lookups.cities.map((c) => c.id)).toEqual([CITY_ID])
      expect(payload?.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)

      // Nothing private leaks, not even in the raw document.
      const raw = await readRaw(env, `publicTourbooks/${token}`)
      expect(raw?.tourId).toBe(tour.id)
      const serialized = JSON.stringify(raw)
      expect(serialized).not.toContain(UIDS.alice)
      expect(serialized).not.toContain('250000')
      expect(serialized).not.toContain('80000')

      expect(await fetchPublicTourbook(anon, 'token-that-does-not-exist')).toBeNull()

      // Any later mutation re-syncs the public copy.
      await updateTour(alice, tour.id, { name: 'Turnê Sul 2026' })
      await addTourDate(alice, tour.id, { date: '2026-11-15', cityId: CITY_ID })
      const synced = await fetchPublicTourbook(anon, token)
      expect(synced?.tour.name).toBe('Turnê Sul 2026')
      expect(synced?.dates.map((d) => d.date)).toEqual(['2026-11-14', '2026-11-15'])
    })

    it('disableShareLink deletes the public doc and clears the token', async () => {
      const alice = clientFor(UIDS.alice)
      const tour = await createTour(alice, UIDS.alice, { tour: tourValues, dates: [FIXED_DATE] })
      const token = await enableShareLink(alice, tour.id)
      expect(await readRaw(env, `publicTourbooks/${token}`)).not.toBeNull()

      await disableShareLink(alice, tour.id)
      expect(await fetchPublicTourbook(clientFor(null), token)).toBeNull()
      expect(await readRaw(env, `publicTourbooks/${token}`)).toBeNull()
      expect((await fetchTour(alice, tour.id))?.shareToken).toBeNull()

      // Disabling twice is harmless; enabling again issues a new token.
      await disableShareLink(alice, tour.id)
      const again = await enableShareLink(alice, tour.id)
      expect(again).not.toBe(token)
      expect(await fetchPublicTourbook(clientFor(null), again)).not.toBeNull()
    })

    it('disableShareLink still clears the token when the public copy is already gone', async () => {
      const alice = clientFor(UIDS.alice)
      const tour = await createTour(alice, UIDS.alice, { tour: tourValues, dates: [] })
      const token = await enableShareLink(alice, tour.id)
      // Simulate a lost public copy (e.g. a failed sync) while the tour still carries the token.
      await withRulesDisabled(env, (db) => deleteDoc(doc(db, 'publicTourbooks', token)))
      await disableShareLink(alice, tour.id)
      expect((await fetchTour(alice, tour.id))?.shareToken).toBeNull()
    })

    it('deleteTour removes the dates and the public tourbook', async () => {
      const alice = clientFor(UIDS.alice)
      const tour = await createTour(alice, UIDS.alice, { tour: tourValues, dates: [FIXED_DATE, OPEN_DATE] })
      const token = await enableShareLink(alice, tour.id)

      await deleteTour(alice, tour.id)

      expect(await readRaw(env, `tours/${tour.id}`)).toBeNull()
      expect(await readRaw(env, `publicTourbooks/${token}`)).toBeNull()
      const leftover = await withRulesDisabled(env, (db) => getDocs(collection(db, 'tours', tour.id, 'dates')))
      expect(leftover.size).toBe(0)
      expect(await fetchMyTours(alice)).toEqual([])
      expect(await fetchPublicTourbook(clientFor(null), token)).toBeNull()
      expect(await fetchTour(alice, tour.id)).toBeNull()

      // Deleting again is a no-op.
      await deleteTour(alice, tour.id)
    })
  })

  // -------------------------------------------------------------------------
  describe('venues: submission and moderation', () => {
    beforeEach(async () => {
      await seed(env, { [`profiles/${UIDS.admin}`]: profileDoc({ displayName: 'Admin', role: 'admin' }) })
    })

    it('submitVenue (A) → fetchPendingVenues/moderateVenue (admin) → fetchRegionData (B)', async () => {
      const alice = clientFor(UIDS.alice)
      const bob = clientFor(UIDS.bob)
      const admin = clientFor(UIDS.admin)

      const venue = await submitVenue(alice, UIDS.alice, venueValues)
      expect(venue).toMatchObject({ name: 'Casa Nova', cityId: CITY_ID, status: 'pending', submittedBy: UIDS.alice, capacity: 150 })
      expect(venue.slug).toMatch(/^casa-nova-[a-z0-9]{6}$/)

      expect((await fetchMySubmissions(alice, UIDS.alice)).map((v) => v.id)).toEqual([venue.id])
      expect(await fetchMySubmissions(bob, UIDS.bob)).toEqual([])

      // Pending is invisible to other users and only admins see the moderation queue.
      expect((await fetchRegionData(bob)).venues).toEqual([])
      await expectDenied(fetchPendingVenues(bob))
      await expectDenied(fetchPendingVenues(alice))
      expect((await fetchPendingVenues(admin)).map((v) => v.id)).toEqual([venue.id])

      // Nobody but an admin moderates (not even the submitter).
      await expectDenied(moderateVenue(bob, venue.id, 'verified'))
      await expectDenied(moderateVenue(alice, venue.id, 'verified'))

      await moderateVenue(admin, venue.id, 'verified')
      const region = await fetchRegionData(bob)
      expect(region.cities.map((c) => c.id)).toEqual([CITY_ID])
      expect(region.venues.map((v) => v.id)).toEqual([venue.id])
      expect(region.venues[0]).toMatchObject({ status: 'verified', submittedBy: UIDS.alice, contactPhone: '47 99999-0000' })
      expect(await fetchPendingVenues(admin)).toEqual([])
    })

    it("a rejected venue leaves the map but stays in the submitter's list", async () => {
      const alice = clientFor(UIDS.alice)
      const venue = await submitVenue(alice, UIDS.alice, venueValues)
      await moderateVenue(clientFor(UIDS.admin), venue.id, 'rejected')
      expect((await fetchRegionData(clientFor(UIDS.bob))).venues).toEqual([])
      expect((await fetchMySubmissions(alice, UIDS.alice))[0]).toMatchObject({ id: venue.id, status: 'rejected' })
    })

    it('submitVenue requires the session uid', async () => {
      await expectDenied(submitVenue(clientFor(UIDS.bob), UIDS.alice, venueValues))
      await expectDenied(submitVenue(clientFor(null), UIDS.alice, venueValues))
    })
  })

  // -------------------------------------------------------------------------
  describe('admin: seed import and counts', () => {
    beforeEach(async () => {
      await seed(env, { [`profiles/${UIDS.admin}`]: profileDoc({ role: 'admin' }) })
    })

    it('importSeedData succeeds for the admin and is denied for a plain user', async () => {
      const admin = clientFor(UIDS.admin)
      const bob = clientFor(UIDS.bob)

      await expectDenied(importSeedData(bob, tinySeed))
      expect(await readRaw(env, 'venues/porao-77')).toBeNull()

      const progress: SeedProgress[] = []
      expect(await importSeedData(admin, tinySeed, (p) => progress.push(p))).toEqual({ written: 4 })
      expect(progress).toEqual([
        { collection: 'cities', done: 1, total: 1 },
        { collection: 'venues', done: 1, total: 1 },
        { collection: 'producers', done: 1, total: 1 },
        { collection: 'bands', done: 1, total: 1 },
      ])
      // Re-import (now an update) is idempotent.
      expect(await importSeedData(admin, tinySeed)).toEqual({ written: 4 })

      const region = await fetchRegionData(bob)
      expect(region.cities.map((c) => c.id)).toEqual([CITY_ID])
      expect(region.venues.map((v) => v.id)).toEqual(['porao-77'])
      expect(region.venues[0]).toMatchObject({ status: 'verified', submittedBy: null, dealTypes: ['porta', 'misto'] })
      expect(region.producers.map((p) => p.id)).toEqual(['coletivo-x'])
      expect(region.producers[0]?.cityIds).toEqual([CITY_ID])
      expect(region.bands.map((b) => b.id)).toEqual(['banda-x'])
      expect(region.bands[0]).toMatchObject({ ownerId: null, links: { instagram: 'https://instagram.com/bandax' } })

      expect((await searchCities(bob, 'join')).map((c) => c.id)).toEqual([CITY_ID])
    })

    it('fetchCollectionCounts counts the map collections (admin only)', async () => {
      const admin = clientFor(UIDS.admin)
      expect(await fetchCollectionCounts(admin)).toEqual({ cities: 1, venues: 0, producers: 0, bands: 0 })
      await importSeedData(admin, tinySeed)
      await submitVenue(clientFor(UIDS.alice), UIDS.alice, venueValues)
      expect(await fetchCollectionCounts(admin)).toEqual({ cities: 1, venues: 2, producers: 1, bands: 1 })
      // A plain user cannot count collections that hold documents hidden from them.
      await expectDenied(fetchCollectionCounts(clientFor(UIDS.bob)))
    })
  })
})
