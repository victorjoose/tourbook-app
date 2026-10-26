import type { Client } from '@tour/core'
import { getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { env } from './env'

const app = getApps()[0] ?? initializeApp(env.firebase)

export const auth = getAuth(app)
export const db = getFirestore(app)

if (env.useEmulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

/** O que as funções de `@tour/core` recebem. */
export const client: Client = { db, auth }
