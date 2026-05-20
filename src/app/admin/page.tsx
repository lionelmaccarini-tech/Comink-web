import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import AdminDashboard from '@/components/admin/AdminDashboard'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Administration — Comink', robots: { index: false, follow: false } }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in → redirect to home
  if (!user) {
    redirect('/?login=required')
  }

  // Fetch profile directly via REST API (bypasses RLS with service key)
  const profileRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=role,email,full_name&limit=1`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      cache: 'no-store',
    }
  )
  const profileArr = await profileRes.json()
  const profile = Array.isArray(profileArr) && profileArr.length > 0 ? profileArr[0] : null

  // Not admin or collaborateur → access denied
  if (!profile || !['admin', 'collaborateur'].includes(profile.role)) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Accès refusé</h1>
          <p className="text-slate-500 text-sm mb-6">
            Votre compte ({user.email}) n'a pas les droits d'accès à l'administration.
          </p>
          <p className="text-xs text-slate-400 mb-4 font-mono">
            uid: {user.id}<br/>
            role DB: {profile ? profile.role : 'profil introuvable'}
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left text-xs text-slate-500 mb-6">
            <p className="font-semibold text-slate-700 mb-1">Pour obtenir l'accès :</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Demandez à un admin de vous attribuer le rôle "collaborateur" ou "admin" via l'interface d'administration.</li>
              <li>Ou modifiez directement votre rôle dans Supabase : Table <code className="bg-slate-100 px-1 rounded">profiles</code>, colonne <code className="bg-slate-100 px-1 rounded">role</code>.</li>
            </ol>
          </div>
          <a href="/" className="inline-block bg-blue-600 text-white font-bold text-sm px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
            Retour au site
          </a>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-400">Chargement…</div>}>
      <AdminDashboard userEmail={profile.email || user.email || ''} />
    </Suspense>
  )
}
