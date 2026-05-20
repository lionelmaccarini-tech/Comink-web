import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * Vérifie que l'utilisateur connecté est staff (admin / collaborateur / producteur).
 * - Utilise createClient() (anon key + cookies) pour lire la session
 * - Retourne createServiceClient() pour les requêtes de données (bypass RLS)
 */
export async function requireStaff() {
  // 1. Lire la session depuis les cookies avec le client normal
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { supabase: authClient as any, user: null, profile: null }

  // 2. Client service role pour les données
  const supabase = await createServiceClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'collaborateur', 'producteur'].includes(profile.role)) {
    return { supabase, user: null, profile: null }
  }

  return { supabase, user, profile }
}
