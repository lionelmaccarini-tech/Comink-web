export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
  const now = new Date()
  const mois = now.toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' })
  const saison = now.getMonth() >= 2 && now.getMonth() <= 4 ? 'printemps'
    : now.getMonth() >= 5 && now.getMonth() <= 7 ? 'été'
    : now.getMonth() >= 8 && now.getMonth() <= 10 ? 'automne'
    : 'hiver'

  const prompt = `Expert stratégie pour Comink (imprimerie grand format Liège — banderoles, bâches, covering véhicule/vitrine, enseignes, vitrophanie, backdrops). Commande en ligne comink.eu. Clients : agences, PME, commerces, événementiel. ${mois}, ${saison}.

Génère un JSON de strings courtes (max 25 mots par string). Aucun texte avant ou après le JSON.

{
  "brief": "3 phrases sur l'état du marché et la position Comink maintenant",
  "insight": "1 insight stratégique surprenant ou contre-intuitif pour un dirigeant d'imprimerie",
  "tendances": [
    "Tendance 1 (format: NOM : impact court pour Comink)",
    "Tendance 2",
    "Tendance 3",
    "Tendance 4"
  ],
  "opportunites": [
    "Opportunité 1 (format: TITRE : angle actionnable pour Comink)",
    "Opportunité 2",
    "Opportunité 3"
  ],
  "menaces": [
    "Menace 1 (format: RISQUE : comment s'en protéger)",
    "Menace 2",
    "Menace 3"
  ],
  "swot_forces": ["Force 1", "Force 2", "Force 3"],
  "swot_faiblesses": ["Faiblesse 1", "Faiblesse 2", "Faiblesse 3"],
  "swot_opportunites": ["Opport. marché 1", "Opport. marché 2", "Opport. marché 3"],
  "swot_menaces": ["Menace 1", "Menace 2", "Menace 3"],
  "concurrents": [
    "Type concurrent 1 — leur force vs avantage Comink",
    "Type concurrent 2 — leur force vs avantage Comink",
    "Type concurrent 3 — leur force vs avantage Comink"
  ],
  "actions": [
    "🔴 CETTE SEMAINE : action concrète + résultat attendu",
    "🔴 CETTE SEMAINE : action concrète + résultat attendu",
    "🟡 CE MOIS : action concrète + résultat attendu",
    "🟡 CE MOIS : action concrète + résultat attendu",
    "🟢 30 JOURS : action concrète + résultat attendu"
  ],
  "questions": [
    "Question stratégique 1 (la vraie question à se poser)",
    "Question stratégique 2",
    "Question stratégique 3"
  ]
}`

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY manquant' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!anthropicRes.ok || !anthropicRes.body) {
    const err = await anthropicRes.text()
    return new Response(JSON.stringify({ error: err }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()
  const generated_at = now.toISOString()

  const outStream = new ReadableStream({
    async start(controller) {
      const reader = anthropicRes.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const evt = JSON.parse(data)
              if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
                controller.enqueue(encoder.encode(evt.delta.text))
              }
            } catch { /* chunk SSE invalide */ }
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          const line = buffer.trim()
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data !== '[DONE]') {
              try {
                const evt = JSON.parse(data)
                if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
                  controller.enqueue(encoder.encode(evt.delta.text))
                }
              } catch { /* ignore */ }
            }
          }
        }

        controller.enqueue(encoder.encode(`\n__META__${JSON.stringify({ generated_at })}`))
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Erreur stream'
        controller.enqueue(encoder.encode(`\n__ERROR__${msg}`))
      }

      controller.close()
    },
  })

  return new Response(outStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-store',
      'X-Accel-Buffering': 'no',
    },
  })
}
