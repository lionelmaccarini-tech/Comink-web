import { NextRequest, NextResponse } from 'next/server'

const UA = 'Comink-PrintShop/1.0 (info@comink.be)'

interface Coords { lat: number; lon: number }

async function geocode(address: string): Promise<Coords | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=0`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'fr' },
      next: { revalidate: 3600 }, // cache 1h
    })
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

async function roadDistance(a: Coords, b: Coords): Promise<number | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false&steps=false`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 0 },
    })
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.length) return null
    return Math.round(data.routes[0].distance / 1000) // metres → km arrondi
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { origin, destination } = await req.json() as { origin: string; destination: string }

    if (!origin?.trim() || !destination?.trim()) {
      return NextResponse.json({ error: 'Adresses manquantes' }, { status: 400 })
    }

    // Géocoder en parallèle
    const [a, b] = await Promise.all([geocode(origin), geocode(destination)])

    if (!a) return NextResponse.json({ error: `Adresse non trouvée : ${origin}` }, { status: 422 })
    if (!b) return NextResponse.json({ error: `Adresse de livraison non trouvée` }, { status: 422 })

    const km = await roadDistance(a, b)
    if (km === null) return NextResponse.json({ error: 'Calcul d\'itinéraire impossible' }, { status: 422 })

    return NextResponse.json({ km })
  } catch (err) {
    console.error('[distance]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
