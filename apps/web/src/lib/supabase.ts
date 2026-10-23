import { createClient } from '@supabase/supabase-js'
import type { Database } from '@tour/core'
import { env } from './env'

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})
