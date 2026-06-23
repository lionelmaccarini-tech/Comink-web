import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/social/publish
 * Publie les posts approuvés dont l'heure est passée.
 * Appelé par un cron Vercel ou manuellement.
 */
export async function POST(req: NextRequest) {
  // Vérification clé secrète pour le cron
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const { data: posts, error } = await supabase
    .from('social_posts')
    .select('*')
    .eq('status', 'approved')
    .lte('scheduled_at', now)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!posts?.length) return NextResponse.json({ published: 0 })

  const results = []
  for (const post of posts) {
    try {
      let published = false

      if (post.platform === 'facebook' || post.platform === 'instagram') {
        published = await publishMeta(post)
      } else if (post.platform === 'linkedin') {
        published = await publishLinkedIn(post)
      }

      await supabase.from('social_posts').update({
        status: published ? 'published' : 'failed',
        published_at: published ? now : null,
        error_message: published ? null : 'Erreur de publication — vérifiez les credentials.',
        updated_at: now,
      }).eq('id', post.id)

      results.push({ id: post.id, platform: post.platform, published })
    } catch (e: any) {
      await supabase.from('social_posts').update({
        status: 'failed',
        error_message: e.message,
        updated_at: now,
      }).eq('id', post.id)
      results.push({ id: post.id, platform: post.platform, published: false, error: e.message })
    }
  }

  return NextResponse.json({ published: results.filter(r => r.published).length, results })
}

async function publishMeta(post: any): Promise<boolean> {
  const pageId = process.env.META_PAGE_ID
  const token = process.env.META_PAGE_ACCESS_TOKEN
  if (!pageId || !token) throw new Error('META_PAGE_ID ou META_PAGE_ACCESS_TOKEN manquant')

  // Instagram publie via le compte lié à la Page Facebook
  if (post.platform === 'instagram') {
    const igAccountId = process.env.META_IG_ACCOUNT_ID
    if (!igAccountId) throw new Error('META_IG_ACCOUNT_ID manquant')

    // Créer le média container
    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: post.content,
          ...(post.image_url ? { image_url: post.image_url } : { media_type: 'REELS' }),
          access_token: token,
        }),
      }
    )
    const container = await containerRes.json()
    if (!container.id) throw new Error(container.error?.message || 'Container Instagram non créé')

    // Publier le container
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: container.id, access_token: token }),
      }
    )
    const published = await publishRes.json()
    if (!published.id) throw new Error(published.error?.message || 'Erreur publication Instagram')
    return true
  }

  // Facebook
  const endpoint = post.image_url
    ? `https://graph.facebook.com/v19.0/${pageId}/photos`
    : `https://graph.facebook.com/v19.0/${pageId}/feed`

  const body: any = { message: post.content, access_token: token }
  if (post.image_url) body.url = post.image_url

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!data.id) throw new Error(data.error?.message || 'Erreur publication Facebook')
  return true
}

async function publishLinkedIn(post: any): Promise<boolean> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN
  const authorId = process.env.LINKEDIN_AUTHOR_ID // urn:li:organization:XXXXX
  if (!token || !authorId) throw new Error('LINKEDIN_ACCESS_TOKEN ou LINKEDIN_AUTHOR_ID manquant')

  const body: any = {
    author: authorId,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: post.content },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  }

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || 'Erreur publication LinkedIn')
  }
  return true
}
