import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ensureProfile, type Profile } from '@tour/core'
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { queryKeys } from '../app/queryClient'
import { auth, client, googleProvider } from '../lib/firebase'

export type AppUser = {
  id: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
}

export type AuthState = {
  /** undefined enquanto o Firebase ainda não respondeu quem está logado. */
  user: AppUser | null | undefined
  profile: Profile | null
  isAdmin: boolean
  /** true enquanto não sabemos o usuário ou o perfil ainda carrega. */
  loading: boolean
  /** Erro (pt-BR) ao carregar/criar o perfil no Firestore; null quando está tudo bem. */
  profileError: string | null
  retryProfile: () => Promise<unknown>
  /** Erro (pt-BR) de um login por redirect que falhou ao voltar para o app. */
  authError: string | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

function toAppUser(u: User): AppUser {
  return { id: u.uid, email: u.email, displayName: u.displayName, avatarUrl: u.photoURL }
}

const POPUP_FALLBACK_CODES = new Set(['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'])

function errorCode(e: unknown): string {
  return typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : ''
}

const AUTH_MESSAGES: Record<string, string> = {
  'auth/unauthorized-domain': 'Este domínio não está autorizado no Firebase (Authentication → Settings → Authorized domains).',
  'auth/network-request-failed': 'Sem conexão. Tente de novo.',
  'auth/operation-not-allowed': 'O login com Google está desativado neste projeto do Firebase.',
  'auth/account-exists-with-different-credential': 'Já existe uma conta com este e-mail usando outro método de login.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/web-storage-unsupported': 'Seu navegador bloqueia o armazenamento local, necessário para o login.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente de novo.',
}

/** Mensagem legível em pt-BR para erros do Firebase Auth. */
function authErrorMessage(e: unknown): string {
  return AUTH_MESSAGES[errorCode(e)] ?? 'Não foi possível entrar. Tente de novo.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null | undefined>(undefined)
  const [authError, setAuthError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    // Conclui um login por redirect (fallback quando o popup é bloqueado) e guarda o erro para a tela de login.
    getRedirectResult(auth).catch((e: unknown) => setAuthError(authErrorMessage(e)))
    return onAuthStateChanged(auth, (next) => setUser(next ? toAppUser(next) : null))
  }, [])

  const profileQuery = useQuery({
    queryKey: queryKeys.profile(user?.id ?? 'anon'),
    queryFn: () => {
      if (!user) throw new Error('Sem usuário logado.')
      return ensureProfile(client, { uid: user.id, displayName: user.displayName, photoURL: user.avatarUrl })
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  })

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      if (errorCode(e) === 'auth/popup-closed-by-user' || errorCode(e) === 'auth/cancelled-popup-request') return
      if (POPUP_FALLBACK_CODES.has(errorCode(e))) {
        await signInWithRedirect(auth, googleProvider)
        return
      }
      throw new Error(authErrorMessage(e))
    }
  }, [])

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth)
    queryClient.clear()
  }, [queryClient])

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile: profileQuery.data ?? null,
      isAdmin: profileQuery.data?.role === 'admin',
      loading: user === undefined || (!!user && (profileQuery.isPending || (profileQuery.isError && profileQuery.isFetching))),
      profileError: profileQuery.error ? profileQuery.error.message : null,
      retryProfile: profileQuery.refetch,
      authError,
      signInWithGoogle,
      signOut,
    }),
    [
      user,
      profileQuery.data,
      profileQuery.isPending,
      profileQuery.isError,
      profileQuery.isFetching,
      profileQuery.error,
      profileQuery.refetch,
      authError,
      signInWithGoogle,
      signOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
