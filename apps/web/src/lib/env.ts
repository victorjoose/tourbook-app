function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Variável de ambiente ${name} não definida. Veja apps/web/.env.example.`)
  }
  return value
}

const e = import.meta.env

export const env = {
  firebase: {
    apiKey: required('VITE_FIREBASE_API_KEY', e.VITE_FIREBASE_API_KEY),
    authDomain: required('VITE_FIREBASE_AUTH_DOMAIN', e.VITE_FIREBASE_AUTH_DOMAIN),
    projectId: required('VITE_FIREBASE_PROJECT_ID', e.VITE_FIREBASE_PROJECT_ID),
    appId: required('VITE_FIREBASE_APP_ID', e.VITE_FIREBASE_APP_ID),
    storageBucket: (e.VITE_FIREBASE_STORAGE_BUCKET as string | undefined) ?? undefined,
    messagingSenderId: (e.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined) ?? undefined,
  },
  /** `VITE_FIREBASE_USE_EMULATOR=1` aponta Auth e Firestore para o emulador local. */
  useEmulator: e.VITE_FIREBASE_USE_EMULATOR === '1',
  mapStyleUrl: (e.VITE_MAP_STYLE_URL as string | undefined) ?? 'https://tiles.openfreemap.org/styles/liberty',
}
