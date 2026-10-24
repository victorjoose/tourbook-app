// Security rules tests (firebase/firestore.rules) against the Firestore emulator.
// Run from the repo root: `pnpm rules:test`. Skipped when FIRESTORE_EMULATOR_HOST is unset.
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import type { PublicTourbookDoc, TourDoc } from '@tour/core'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  CITY_ID,
  NOW,
  UIDS,
  bandDoc,
  cityDoc,
  createTestEnv,
  dbOf,
  describeWithEmulator,
  profileDoc,
  seed,
  tourDateDoc,
  tourDoc,
  venueDoc,
} from './emulator'

let env: RulesTestEnvironment

function authed(uid: string): Firestore {
  return dbOf(env.authenticatedContext(uid))
}

function anon(): Firestore {
  return dbOf(env.unauthenticatedContext())
}

const TOUR_ID = 'tour-1'
const DATE_ID = 'date-1'
const TOKEN = 'tok-abc'
// alice owns the tour; bob is an editor; carol a viewer; dave is not a member.
const TOUR_MEMBERS: Pick<TourDoc, 'memberIds' | 'memberRoles'> = {
  memberIds: [UIDS.alice, UIDS.bob, UIDS.carol],
  memberRoles: { [UIDS.alice]: 'editor', [UIDS.bob]: 'editor', [UIDS.carol]: 'viewer' },
}

function publicDoc(tourId: string): PublicTourbookDoc<Record<string, unknown>> {
  return { tourId, payload: { tour: { name: 'Turnê Sul' }, dates: [] }, updatedAt: NOW }
}

describeWithEmulator('firestore.rules', () => {
  beforeAll(async () => {
    env = await createTestEnv()
  })

  afterAll(async () => {
    await env.cleanup()
  })

  beforeEach(async () => {
    await env.clearFirestore()
  })

  // -------------------------------------------------------------------------
  describe('profiles', () => {
    it('user creates own profile with role user', async () => {
      await assertSucceeds(setDoc(doc(authed(UIDS.alice), 'profiles', UIDS.alice), profileDoc()))
    })

    it('user cannot create own profile with role admin', async () => {
      await assertFails(setDoc(doc(authed(UIDS.alice), 'profiles', UIDS.alice), profileDoc({ role: 'admin' })))
    })

    it('user cannot create a profile for another uid', async () => {
      await assertFails(setDoc(doc(authed(UIDS.alice), 'profiles', UIDS.bob), profileDoc()))
    })

    it('user updates own displayName', async () => {
      await seed(env, { [`profiles/${UIDS.alice}`]: profileDoc() })
      await assertSucceeds(updateDoc(doc(authed(UIDS.alice), 'profiles', UIDS.alice), { displayName: 'Alice', updatedAt: NOW }))
    })

    it('user cannot change own role', async () => {
      await seed(env, { [`profiles/${UIDS.alice}`]: profileDoc() })
      await assertFails(updateDoc(doc(authed(UIDS.alice), 'profiles', UIDS.alice), { role: 'admin' }))
    })

    it('signed-in user reads another profile', async () => {
      await seed(env, { [`profiles/${UIDS.bob}`]: profileDoc({ displayName: 'Bob' }) })
      const snap = await assertSucceeds(getDoc(doc(authed(UIDS.alice), 'profiles', UIDS.bob)))
      expect(snap.data()?.displayName).toBe('Bob')
    })

    it('unauthenticated read is denied', async () => {
      await seed(env, { [`profiles/${UIDS.bob}`]: profileDoc() })
      await assertFails(getDoc(doc(anon(), 'profiles', UIDS.bob)))
    })

    it("admin changes another user's role", async () => {
      await seed(env, { [`profiles/${UIDS.admin}`]: profileDoc({ role: 'admin' }), [`profiles/${UIDS.bob}`]: profileDoc() })
      await assertSucceeds(updateDoc(doc(authed(UIDS.admin), 'profiles', UIDS.bob), { role: 'admin', updatedAt: NOW }))
    })

    it("plain user cannot change another user's role", async () => {
      await seed(env, { [`profiles/${UIDS.bob}`]: profileDoc() })
      await assertFails(updateDoc(doc(authed(UIDS.alice), 'profiles', UIDS.bob), { role: 'admin' }))
    })
  })

  // -------------------------------------------------------------------------
  describe('cities', () => {
    beforeEach(async () => {
      await seed(env, { [`cities/${CITY_ID}`]: cityDoc(), [`profiles/${UIDS.admin}`]: profileDoc({ role: 'admin' }) })
    })

    it('signed-in user reads and lists cities', async () => {
      const db = authed(UIDS.alice)
      await assertSucceeds(getDoc(doc(db, 'cities', CITY_ID)))
      const snap = await assertSucceeds(getDocs(collection(db, 'cities')))
      expect(snap.size).toBe(1)
    })

    it('unauthenticated read is denied', async () => {
      await assertFails(getDoc(doc(anon(), 'cities', CITY_ID)))
    })

    it('non-admin cannot write cities', async () => {
      const db = authed(UIDS.alice)
      await assertFails(setDoc(doc(db, 'cities', 'curitiba-pr'), cityDoc({ name: 'Curitiba', state: 'PR', slug: 'curitiba-pr' })))
      await assertFails(updateDoc(doc(db, 'cities', CITY_ID), { population: 1 }))
      await assertFails(deleteDoc(doc(db, 'cities', CITY_ID)))
    })

    it('admin writes cities', async () => {
      const db = authed(UIDS.admin)
      await assertSucceeds(setDoc(doc(db, 'cities', 'curitiba-pr'), cityDoc({ name: 'Curitiba', state: 'PR', slug: 'curitiba-pr' })))
      await assertSucceeds(updateDoc(doc(db, 'cities', CITY_ID), { population: 620000 }))
      await assertSucceeds(deleteDoc(doc(db, 'cities', CITY_ID)))
    })
  })

  // -------------------------------------------------------------------------
  describe('venues', () => {
    const VERIFIED = 'venue-verified'
    const PENDING = 'venue-pending-alice'

    beforeEach(async () => {
      await seed(env, {
        [`venues/${VERIFIED}`]: venueDoc({ status: 'verified', submittedBy: null }),
        [`venues/${PENDING}`]: venueDoc({ name: 'Casa Nova', slug: 'casa-nova', status: 'pending', submittedBy: UIDS.alice }),
        [`profiles/${UIDS.admin}`]: profileDoc({ role: 'admin' }),
      })
    })

    it('user queries verified venues (where status == verified)', async () => {
      const snap = await assertSucceeds(getDocs(query(collection(authed(UIDS.bob), 'venues'), where('status', '==', 'verified'))))
      expect(snap.docs.map((d) => d.id)).toEqual([VERIFIED])
    })

    it('user cannot list the whole collection (rules are not filters)', async () => {
      await assertFails(getDocs(collection(authed(UIDS.bob), 'venues')))
    })

    it('submitter reads own pending venue', async () => {
      await assertSucceeds(getDoc(doc(authed(UIDS.alice), 'venues', PENDING)))
    })

    it('another user cannot read a pending venue', async () => {
      await assertFails(getDoc(doc(authed(UIDS.bob), 'venues', PENDING)))
    })

    it('unauthenticated user cannot read even a verified venue', async () => {
      await assertFails(getDoc(doc(anon(), 'venues', VERIFIED)))
    })

    it('user queries own submissions (where submittedBy == uid)', async () => {
      const snap = await assertSucceeds(getDocs(query(collection(authed(UIDS.alice), 'venues'), where('submittedBy', '==', UIDS.alice))))
      expect(snap.docs.map((d) => d.id)).toEqual([PENDING])
    })

    it("user cannot query another user's submissions", async () => {
      await assertFails(getDocs(query(collection(authed(UIDS.bob), 'venues'), where('submittedBy', '==', UIDS.alice))))
    })

    it('user creates a pending venue signed by own uid', async () => {
      await assertSucceeds(addDoc(collection(authed(UIDS.bob), 'venues'), venueDoc({ status: 'pending', submittedBy: UIDS.bob })))
    })

    it('user cannot create a venue already verified', async () => {
      await assertFails(addDoc(collection(authed(UIDS.bob), 'venues'), venueDoc({ status: 'verified', submittedBy: UIDS.bob })))
    })

    it('user cannot create a venue signed by another uid', async () => {
      await assertFails(addDoc(collection(authed(UIDS.bob), 'venues'), venueDoc({ status: 'pending', submittedBy: UIDS.alice })))
    })

    it('unauthenticated user cannot create a venue', async () => {
      await assertFails(addDoc(collection(anon(), 'venues'), venueDoc({ status: 'pending', submittedBy: UIDS.bob })))
    })

    it('submitter edits own venue while pending', async () => {
      await assertSucceeds(updateDoc(doc(authed(UIDS.alice), 'venues', PENDING), { name: 'Casa Nova 2', updatedAt: NOW }))
    })

    it('submitter cannot approve own venue', async () => {
      await assertFails(updateDoc(doc(authed(UIDS.alice), 'venues', PENDING), { status: 'verified' }))
    })

    it('submitter cannot hand the venue to another uid', async () => {
      await assertFails(updateDoc(doc(authed(UIDS.alice), 'venues', PENDING), { submittedBy: UIDS.bob }))
    })

    it("another user cannot edit someone else's pending venue", async () => {
      await assertFails(updateDoc(doc(authed(UIDS.bob), 'venues', PENDING), { name: 'Hacked' }))
    })

    it('user cannot edit a verified venue', async () => {
      await assertFails(updateDoc(doc(authed(UIDS.alice), 'venues', VERIFIED), { name: 'Other' }))
    })

    it('admin approves (status verified)', async () => {
      await assertSucceeds(updateDoc(doc(authed(UIDS.admin), 'venues', PENDING), { status: 'verified', updatedAt: NOW }))
    })

    it('admin rejects and deletes', async () => {
      const db = authed(UIDS.admin)
      await assertSucceeds(updateDoc(doc(db, 'venues', PENDING), { status: 'rejected', updatedAt: NOW }))
      await assertSucceeds(deleteDoc(doc(db, 'venues', PENDING)))
    })

    it('user cannot delete a venue', async () => {
      await assertFails(deleteDoc(doc(authed(UIDS.alice), 'venues', PENDING)))
    })

    it('admin creates a verified venue directly (seed import)', async () => {
      await assertSucceeds(setDoc(doc(authed(UIDS.admin), 'venues', 'porao-77'), venueDoc({ status: 'verified', submittedBy: null })))
    })

    it('admin queries the moderation queue (where status == pending)', async () => {
      const snap = await assertSucceeds(getDocs(query(collection(authed(UIDS.admin), 'venues'), where('status', '==', 'pending'))))
      expect(snap.docs.map((d) => d.id)).toEqual([PENDING])
    })

    it('non-admin cannot query the moderation queue', async () => {
      await assertFails(getDocs(query(collection(authed(UIDS.bob), 'venues'), where('status', '==', 'pending'))))
    })

    it('admin lists the whole collection', async () => {
      const snap = await assertSucceeds(getDocs(collection(authed(UIDS.admin), 'venues')))
      expect(snap.size).toBe(2)
    })
  })

  // -------------------------------------------------------------------------
  describe('bands', () => {
    const BAND = 'band-1'

    beforeEach(async () => {
      await seed(env, {
        [`bands/${BAND}`]: bandDoc({ ownerId: UIDS.bob, status: 'verified' }),
        [`profiles/${UIDS.admin}`]: profileDoc({ role: 'admin' }),
      })
    })

    it('ownerId user updates own band keeping status', async () => {
      await assertSucceeds(updateDoc(doc(authed(UIDS.bob), 'bands', BAND), { notes: 'Tocamos em qualquer lugar', updatedAt: NOW }))
    })

    it('ownerId user cannot change status', async () => {
      await assertFails(updateDoc(doc(authed(UIDS.bob), 'bands', BAND), { status: 'pending' }))
    })

    it('ownerId user cannot hand the band to another uid', async () => {
      await assertFails(updateDoc(doc(authed(UIDS.bob), 'bands', BAND), { ownerId: UIDS.carol }))
    })

    it('non-owner cannot update', async () => {
      await assertFails(updateDoc(doc(authed(UIDS.carol), 'bands', BAND), { notes: 'x' }))
    })

    it('admin updates any band', async () => {
      await assertSucceeds(updateDoc(doc(authed(UIDS.admin), 'bands', BAND), { status: 'rejected', updatedAt: NOW }))
    })

    it('signed-in user queries verified bands', async () => {
      const snap = await assertSucceeds(getDocs(query(collection(authed(UIDS.carol), 'bands'), where('status', '==', 'verified'))))
      expect(snap.size).toBe(1)
    })
  })

  // -------------------------------------------------------------------------
  describe('tours', () => {
    beforeEach(async () => {
      await seed(env, { [`tours/${TOUR_ID}`]: tourDoc(UIDS.alice, TOUR_MEMBERS) })
    })

    it('creates with ownerId = uid, memberIds = [uid], memberRoles[uid] = editor, shareToken null', async () => {
      await assertSucceeds(setDoc(doc(authed(UIDS.alice), 'tours', 'tour-new'), tourDoc(UIDS.alice)))
    })

    it('cannot create with memberIds including someone else', async () => {
      await assertFails(
        setDoc(
          doc(authed(UIDS.alice), 'tours', 'tour-new'),
          tourDoc(UIDS.alice, { memberIds: [UIDS.alice, UIDS.bob], memberRoles: { [UIDS.alice]: 'editor', [UIDS.bob]: 'editor' } }),
        ),
      )
    })

    it('cannot create on behalf of another owner', async () => {
      await assertFails(setDoc(doc(authed(UIDS.alice), 'tours', 'tour-new'), tourDoc(UIDS.bob)))
    })

    it('cannot create with a shareToken already set', async () => {
      await assertFails(setDoc(doc(authed(UIDS.alice), 'tours', 'tour-new'), tourDoc(UIDS.alice, { shareToken: 'abc' })))
    })

    it('cannot create without being its editor', async () => {
      await assertFails(setDoc(doc(authed(UIDS.alice), 'tours', 'tour-new'), tourDoc(UIDS.alice, { memberRoles: { [UIDS.alice]: 'viewer' } })))
    })

    it('unauthenticated user cannot create', async () => {
      await assertFails(setDoc(doc(anon(), 'tours', 'tour-new'), tourDoc(UIDS.alice)))
    })

    it('creates tour and dates in one batch (createTour flow)', async () => {
      const db = authed(UIDS.alice)
      const batch = writeBatch(db)
      batch.set(doc(db, 'tours', 'tour-batch'), tourDoc(UIDS.alice, { dateCount: 2, firstDate: '2026-11-13', lastDate: '2026-11-14' }))
      batch.set(doc(db, 'tours', 'tour-batch', 'dates', 'd1'), tourDateDoc({ date: '2026-11-13' }))
      batch.set(doc(db, 'tours', 'tour-batch', 'dates', 'd2'), tourDateDoc({ date: '2026-11-14' }))
      await assertSucceeds(batch.commit())
    })

    it('batch with dates for a tour owned by someone else is denied', async () => {
      const db = authed(UIDS.dave)
      const batch = writeBatch(db)
      batch.set(doc(db, 'tours', 'tour-batch'), tourDoc(UIDS.alice))
      batch.set(doc(db, 'tours', 'tour-batch', 'dates', 'd1'), tourDateDoc())
      await assertFails(batch.commit())
    })

    it('owner reads', async () => {
      await assertSucceeds(getDoc(doc(authed(UIDS.alice), 'tours', TOUR_ID)))
    })

    it('member viewer reads', async () => {
      await assertSucceeds(getDoc(doc(authed(UIDS.carol), 'tours', TOUR_ID)))
    })

    it('non-member and unauthenticated reads are denied', async () => {
      await assertFails(getDoc(doc(authed(UIDS.dave), 'tours', TOUR_ID)))
      await assertFails(getDoc(doc(anon(), 'tours', TOUR_ID)))
    })

    it('signed-in get of a nonexistent tour returns "does not exist" (fetchTour → null)', async () => {
      const snap = await assertSucceeds(getDoc(doc(authed(UIDS.dave), 'tours', 'missing')))
      expect(snap.exists()).toBe(false)
      await assertFails(getDoc(doc(anon(), 'tours', 'missing')))
    })

    it('member queries own tours (memberIds array-contains uid)', async () => {
      const snap = await assertSucceeds(getDocs(query(collection(authed(UIDS.bob), 'tours'), where('memberIds', 'array-contains', UIDS.bob))))
      expect(snap.docs.map((d) => d.id)).toEqual([TOUR_ID])
    })

    it("nobody lists the whole collection or another user's tours", async () => {
      await assertFails(getDocs(collection(authed(UIDS.alice), 'tours')))
      await assertFails(getDocs(query(collection(authed(UIDS.dave), 'tours'), where('memberIds', 'array-contains', UIDS.alice))))
    })

    it('member viewer cannot update', async () => {
      await assertFails(updateDoc(doc(authed(UIDS.carol), 'tours', TOUR_ID), { name: 'Other' }))
    })

    it('member editor updates name', async () => {
      await assertSucceeds(updateDoc(doc(authed(UIDS.bob), 'tours', TOUR_ID), { name: 'Turnê Sul 2026', updatedAt: NOW }))
    })

    it('member editor updates the summary and the shareToken', async () => {
      const db = authed(UIDS.bob)
      await assertSucceeds(updateDoc(doc(db, 'tours', TOUR_ID), { dateCount: 3, firstDate: '2026-11-13', lastDate: '2026-11-15', updatedAt: NOW }))
      await assertSucceeds(updateDoc(doc(db, 'tours', TOUR_ID), { shareToken: 'new-token', updatedAt: NOW }))
    })

    it('editor cannot change members or owner', async () => {
      const db = authed(UIDS.bob)
      await assertFails(updateDoc(doc(db, 'tours', TOUR_ID), { memberIds: [...TOUR_MEMBERS.memberIds, UIDS.dave] }))
      await assertFails(updateDoc(doc(db, 'tours', TOUR_ID), { memberRoles: { ...TOUR_MEMBERS.memberRoles, [UIDS.carol]: 'editor' } }))
      await assertFails(updateDoc(doc(db, 'tours', TOUR_ID), { ownerId: UIDS.bob }))
    })

    it('owner changes memberIds', async () => {
      await assertSucceeds(
        updateDoc(doc(authed(UIDS.alice), 'tours', TOUR_ID), {
          memberIds: [...TOUR_MEMBERS.memberIds, UIDS.dave],
          memberRoles: { ...TOUR_MEMBERS.memberRoles, [UIDS.dave]: 'viewer' },
          updatedAt: NOW,
        }),
      )
    })

    it('non-member cannot update', async () => {
      await assertFails(updateDoc(doc(authed(UIDS.dave), 'tours', TOUR_ID), { name: 'Intruder' }))
    })

    it('owner deletes', async () => {
      await assertSucceeds(deleteDoc(doc(authed(UIDS.alice), 'tours', TOUR_ID)))
    })

    it('editor cannot delete', async () => {
      await assertFails(deleteDoc(doc(authed(UIDS.bob), 'tours', TOUR_ID)))
    })
  })

  // -------------------------------------------------------------------------
  describe('tours/{id}/dates', () => {
    beforeEach(async () => {
      await seed(env, {
        [`tours/${TOUR_ID}`]: tourDoc(UIDS.alice, { ...TOUR_MEMBERS, dateCount: 1, firstDate: '2026-11-14', lastDate: '2026-11-14' }),
        [`tours/${TOUR_ID}/dates/${DATE_ID}`]: tourDateDoc(),
      })
    })

    it('owner creates, updates and deletes dates', async () => {
      const db = authed(UIDS.alice)
      await assertSucceeds(setDoc(doc(db, 'tours', TOUR_ID, 'dates', 'date-2'), tourDateDoc({ date: '2026-11-15' })))
      await assertSucceeds(updateDoc(doc(db, 'tours', TOUR_ID, 'dates', DATE_ID), { status: 'confirmado', feeCents: 150000, updatedAt: NOW }))
      await assertSucceeds(deleteDoc(doc(db, 'tours', TOUR_ID, 'dates', DATE_ID)))
    })

    it('editor writes dates', async () => {
      const db = authed(UIDS.bob)
      await assertSucceeds(addDoc(collection(db, 'tours', TOUR_ID, 'dates'), tourDateDoc({ date: '2026-11-16' })))
      await assertSucceeds(updateDoc(doc(db, 'tours', TOUR_ID, 'dates', DATE_ID), { notes: 'Chegar cedo', updatedAt: NOW }))
      await assertSucceeds(deleteDoc(doc(db, 'tours', TOUR_ID, 'dates', DATE_ID)))
    })

    it('viewer reads but cannot write', async () => {
      const db = authed(UIDS.carol)
      await assertSucceeds(getDoc(doc(db, 'tours', TOUR_ID, 'dates', DATE_ID)))
      await assertFails(setDoc(doc(db, 'tours', TOUR_ID, 'dates', 'date-2'), tourDateDoc()))
      await assertFails(updateDoc(doc(db, 'tours', TOUR_ID, 'dates', DATE_ID), { notes: 'x' }))
      await assertFails(deleteDoc(doc(db, 'tours', TOUR_ID, 'dates', DATE_ID)))
    })

    it('non-member cannot read or write', async () => {
      await assertFails(getDoc(doc(authed(UIDS.dave), 'tours', TOUR_ID, 'dates', DATE_ID)))
      await assertFails(getDocs(collection(authed(UIDS.dave), 'tours', TOUR_ID, 'dates')))
      await assertFails(setDoc(doc(authed(UIDS.dave), 'tours', TOUR_ID, 'dates', 'date-2'), tourDateDoc()))
      await assertFails(getDoc(doc(anon(), 'tours', TOUR_ID, 'dates', DATE_ID)))
    })

    it('member queries the dates subcollection', async () => {
      const snap = await assertSucceeds(getDocs(collection(authed(UIDS.carol), 'tours', TOUR_ID, 'dates')))
      expect(snap.docs.map((d) => d.id)).toEqual([DATE_ID])
    })

    it('nobody writes dates under a nonexistent tour', async () => {
      await assertFails(setDoc(doc(authed(UIDS.alice), 'tours', 'missing', 'dates', 'd1'), tourDateDoc()))
    })

    it('owner deletes dates in a batch (deleteTour flow)', async () => {
      const db = authed(UIDS.alice)
      const batch = writeBatch(db)
      batch.delete(doc(db, 'tours', TOUR_ID, 'dates', DATE_ID))
      await assertSucceeds(batch.commit())
    })
  })

  // -------------------------------------------------------------------------
  describe('publicTourbooks', () => {
    beforeEach(async () => {
      await seed(env, {
        [`tours/${TOUR_ID}`]: tourDoc(UIDS.alice, { ...TOUR_MEMBERS, shareToken: TOKEN }),
        'tours/tour-no-link': tourDoc(UIDS.alice, { shareToken: null }),
        [`publicTourbooks/${TOKEN}`]: publicDoc(TOUR_ID),
      })
    })

    it('unauthenticated get by token succeeds', async () => {
      const snap = await assertSucceeds(getDoc(doc(anon(), 'publicTourbooks', TOKEN)))
      expect(snap.data()?.tourId).toBe(TOUR_ID)
      // Unknown token: the read is allowed and comes back empty.
      const missing = await assertSucceeds(getDoc(doc(anon(), 'publicTourbooks', 'missing')))
      expect(missing.exists()).toBe(false)
    })

    it('nobody lists public tourbooks (tokens are not enumerable)', async () => {
      await assertFails(getDocs(collection(anon(), 'publicTourbooks')))
      await assertFails(getDocs(collection(authed(UIDS.alice), 'publicTourbooks')))
    })

    it('owner writes the doc whose id == tour.shareToken with the tourId', async () => {
      await seed(env, { 'tours/tour-2': tourDoc(UIDS.alice, { shareToken: 'tok-2' }) })
      await assertSucceeds(setDoc(doc(authed(UIDS.alice), 'publicTourbooks', 'tok-2'), publicDoc('tour-2')))
      // Rewriting (sync after a mutation) also passes.
      await assertSucceeds(setDoc(doc(authed(UIDS.alice), 'publicTourbooks', TOKEN), publicDoc(TOUR_ID)))
    })

    it('editor writes too', async () => {
      await assertSucceeds(setDoc(doc(authed(UIDS.bob), 'publicTourbooks', TOKEN), publicDoc(TOUR_ID)))
    })

    it('cannot write under an id different from the shareToken', async () => {
      await assertFails(setDoc(doc(authed(UIDS.alice), 'publicTourbooks', 'other-token'), publicDoc(TOUR_ID)))
    })

    it('cannot write when tour.shareToken is null', async () => {
      await assertFails(setDoc(doc(authed(UIDS.alice), 'publicTourbooks', 'anything'), publicDoc('tour-no-link')))
    })

    it('cannot write pointing to a nonexistent tour or without tourId', async () => {
      const db = authed(UIDS.alice)
      await assertFails(setDoc(doc(db, 'publicTourbooks', TOKEN), publicDoc('missing')))
      await assertFails(setDoc(doc(db, 'publicTourbooks', TOKEN), { payload: {}, updatedAt: NOW }))
    })

    it('viewer cannot write', async () => {
      await assertFails(setDoc(doc(authed(UIDS.carol), 'publicTourbooks', TOKEN), publicDoc(TOUR_ID)))
    })

    it('non-member cannot write', async () => {
      await assertFails(setDoc(doc(authed(UIDS.dave), 'publicTourbooks', TOKEN), publicDoc(TOUR_ID)))
    })

    it('unauthenticated user cannot write or delete', async () => {
      await assertFails(setDoc(doc(anon(), 'publicTourbooks', TOKEN), publicDoc(TOUR_ID)))
      await assertFails(deleteDoc(doc(anon(), 'publicTourbooks', TOKEN)))
      await assertFails(deleteDoc(doc(anon(), 'publicTourbooks', 'missing')))
    })

    it('owner deletes while the token still matches (disableShareLink flow)', async () => {
      await assertSucceeds(deleteDoc(doc(authed(UIDS.alice), 'publicTourbooks', TOKEN)))
    })

    it('editor deletes while the token still matches', async () => {
      await assertSucceeds(deleteDoc(doc(authed(UIDS.bob), 'publicTourbooks', TOKEN)))
    })

    it('deleting a token that no longer exists is an allowed no-op for signed-in users', async () => {
      await assertSucceeds(deleteDoc(doc(authed(UIDS.alice), 'publicTourbooks', 'missing')))
      await assertSucceeds(deleteDoc(doc(authed(UIDS.dave), 'publicTourbooks', 'missing')))
    })

    it("nobody deletes after the tour's token changed", async () => {
      await seed(env, { [`tours/${TOUR_ID}`]: tourDoc(UIDS.alice, { ...TOUR_MEMBERS, shareToken: 'other' }) })
      await assertFails(deleteDoc(doc(authed(UIDS.alice), 'publicTourbooks', TOKEN)))
    })

    it('viewer and non-member cannot delete', async () => {
      await assertFails(deleteDoc(doc(authed(UIDS.carol), 'publicTourbooks', TOKEN)))
      await assertFails(deleteDoc(doc(authed(UIDS.dave), 'publicTourbooks', TOKEN)))
    })
  })
})
