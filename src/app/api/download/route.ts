import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy de téléchargement — récupère un fichier distant et le renvoie
 * avec Content-Disposition: attachment pour forcer le téléchargement
 * sans ouvrir le fichier dans le navigateur.
 *
 * Usage : /api/download?url=<encoded_url>&filename=<encoded_filename>
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url      = searchParams.get('url')
  const filename = searchParams.get('filename') || 'fichier.pdf'

  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  }

  // Sécurité : n'autoriser que les URLs de nos propres domaines
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  const allowedHosts = (process.env.ALLOWED_DOWNLOAD_HOSTS || '').split(',').map(h => h.trim()).filter(Boolean)
  const r2PublicHost = process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).hostname : null
  const allowed = [
    r2PublicHost,
    'media.base44.com',
    ...allowedHosts,
  ].filter(Boolean)

  if (allowed.length > 0 && !allowed.some(h => parsedUrl.hostname === h || parsedUrl.hostname.endsWith('.' + h))) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 })
  }

  try {
    const response = await fetch(url)
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch file' }, { status: response.status })
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':        contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length':      String(buffer.byteLength),
        'Cache-Control':       'no-store',
      },
    })
  } catch (err) {
    console.error('[download proxy]', err)
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}
