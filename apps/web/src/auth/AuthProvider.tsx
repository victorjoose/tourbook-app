import type { Session, User } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { fetchMyProfile, type Profile } from '@tour/core'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { queryKeys } from '../app/queryClient'
import { supabase } from '../lib/supabase'

export type AuthState = {
  /** undefined enquanto a sessão inicial ainda não foi lida. */
  session: Session | null | undefined
  user: User | null
  profile: Profile | null
  isAdmin: boolean
  loading: boolean
  signInWithGoogle: (redirectTo?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const user = session?.user ?? null

  const profileQuery = useQuery({
    queryKey: queryKeys.profile(user?.id ?? 'anon'),
    queryFn: () => fetchMyProfile(supabase, user!.id),
    enabled: !!user,
    staleTime: 5 * 60_000,
  })

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    const target = new URL(redirectTo ?? '/', window.location.origin).toString()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: target },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      session,
      user,
      profile: profileQuery.data ?? null,
      isAdmin: profileQuery.data?.role === 'admin',
      loading: session === undefined || (!!user && profileQuery.isPending),
      signInWithGoogle,
      signOut,
    }),
    [session, user, profileQuery.data, profileQuery.isPending, signInWithGoogle, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
