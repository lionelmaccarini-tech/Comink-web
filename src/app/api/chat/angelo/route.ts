import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'

// Turbopack inlines process.env at compile time — workaround: read .env.local at runtime
function getAnthropicKey(): string {
  // 1. Try runtime process.env (works in production / Vercel)
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY
  // 2. Fallback: parse .env.local directly (dev server Turbopack bug workaround)
  try {
    const envPath = path.join(process.cwd(), '.env.local')
    const content = fs.readFileSync(envPath, 'utf8')
    const line = content.split('\n').find(l => l.startsWith('ANTHROPIC_API_KEY='))
    if (line) return line.split('=').slice(1).join('=').trim()
  } catch {}
  return ''
}

function getClient() {
  return new Anthropic({ apiKey: getAnthropicKey() })
}

// ── Tool definitions ──────────────────────────────────────────────────────────
const tools: Anthropic.Tool[] = [
  {
    name: 'search_products',
    description:
      'Recherche des produits dans le catalogue Comink. Retourne la liste des produits correspondants avec leurs prix et options.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Mot-clé de recherche (ex: "bâche", "roll-up", "adhésif")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_crm_lead',
    description:
      "Crée un lead/devis dans le CRM pour qu'un commercial prenne contact avec le client. À utiliser quand le client a un besoin précis ou complexe qui nécessite l'intervention humaine.",
    input_schema: {
      type: 'object' as const,
      properties: {
        client_name: { type: 'string', description: 'Nom complet du client' },
        client_email: { type: 'string', description: 'Email du client' },
        client_company: { type: 'string', description: 'Société du client (optionnel)' },
        client_phone: { type: 'string', description: 'Téléphone du client (optionnel)' },
        notes: {
          type: 'string',
          description: 'Description du besoin du client, résumé de la conversation',
        },
        source: { type: 'string', description: 'Toujours "chat_angelo"' },
      },
      required: ['client_name', 'client_email', 'notes'],
    },
  },
]

// ── Tool execution ────────────────────────────────────────────────────────────
async function runTool(
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  if (name === 'search_products') {
    const supabase = await createServiceClient()
    const q = (input.query as string) || ''
    const { data, error } = await supabase
      .from('products')
      .select('id, name, slug, description, category')
      .or(`name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
      .eq('active', true)
      .limit(5)
    if (error) return `Erreur: ${error.message}`
    if (!data?.length) return 'Aucun produit trouvé pour cette recherche.'
    return JSON.stringify(
      data.map((p) => ({
        name: p.name,
        category: p.category,
        url: `https://comink.be/produit/${p.slug}`,
        description: p.description?.slice(0, 120),
      })),
    )
  }

  if (name === 'create_crm_lead') {
    const body = {
      client_name: input.client_name as string,
      client_email: input.client_email as string,
      client_company: (input.client_company as string) || undefined,
      client_phone: (input.client_phone as string) || undefined,
      notes: input.notes as string,
      source: 'chat_angelo',
      pipeline_stage: 'lead',
      status: 'draft',
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
    }
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/crm/quotes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )
    if (!res.ok) return `Erreur lors de la création du lead: ${res.statusText}`
    const data = await res.json()
    return `Lead créé avec succès (réf. ${data.quote_number}). Un de nos commerciaux va contacter le client très prochainement.`
  }

  return 'Outil inconnu'
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM = `Tu es Angelo Comink, l'assistant virtuel de Comink, une imprimerie grand format basée à Liège, en Belgique.

Tu aides les clients à :
- Découvrir les produits d'impression (bâches, banderoles, roll-up, adhésifs, enseignes, etc.)
- Obtenir des informations sur les prix, délais et options
- Trouver le produit adapté à leur besoin
- Commander en ligne sur comink.be

Ton style : professionnel mais chaleureux, concis, en français belge naturel. Tu tutoies les clients uniquement s'ils le font en premier.

Règles importantes :
- Si un client a un besoin précis (quantité, dimensions, événement), propose-lui de créer un devis personnalisé via l'outil create_crm_lead (demande d'abord son nom et email s'ils ne sont pas connus).
- Pour les questions sur des produits spécifiques, utilise search_products.
- Ne donne jamais de prix fermes sans passer par le devis — les prix varient selon les dimensions et quantités.
- Si tu ne sais pas, dis-le honnêtement et propose de créer un lead pour qu'un commercial rappelle.
- Site web : https://comink.be — catalogue en ligne sur https://comink.be/catalogue`

// ── POST /api/chat/angelo ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  console.log('[angelo] ANTHROPIC_API_KEY present:', !!process.env.ANTHROPIC_API_KEY, 'length:', process.env.ANTHROPIC_API_KEY?.length)
  try {
    const { messages, visitorInfo } = await req.json() as {
      messages: Anthropic.MessageParam[]
      visitorInfo?: { name?: string; email?: string }
    }

    if (!messages?.length) {
      return NextResponse.json({ error: 'messages requis' }, { status: 400 })
    }

    // Inject visitor info into system if available
    const system = visitorInfo?.name
      ? `${SYSTEM}\n\nInformations visiteur (déjà connues) : Nom: ${visitorInfo.name}${visitorInfo.email ? `, Email: ${visitorInfo.email}` : ''}`
      : SYSTEM

    const client = getClient()

    // Agentic loop with streaming output via ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const send = (data: string) =>
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))

        try {
          let currentMessages = [...messages]

          // Agentic loop (max 5 tool-call rounds)
          for (let round = 0; round < 5; round++) {
            const response = await client.messages.create({
              model: 'claude-haiku-4-5',
              max_tokens: 1024,
              system,
              tools,
              messages: currentMessages,
              stream: true,
            })

            let assistantText = ''
            const toolUses: Array<{ id: string; name: string; input: Record<string, unknown> }> = []
            let currentToolUse: { id: string; name: string; inputJson: string } | null = null
            let stopReason = ''

            for await (const event of response) {
              if (event.type === 'content_block_start') {
                if (event.content_block.type === 'tool_use') {
                  currentToolUse = {
                    id: event.content_block.id,
                    name: event.content_block.name,
                    inputJson: '',
                  }
                }
              } else if (event.type === 'content_block_delta') {
                if (event.delta.type === 'text_delta') {
                  assistantText += event.delta.text
                  send(JSON.stringify({ type: 'text', text: event.delta.text }))
                } else if (event.delta.type === 'input_json_delta' && currentToolUse) {
                  currentToolUse.inputJson += event.delta.partial_json
                }
              } else if (event.type === 'content_block_stop') {
                if (currentToolUse) {
                  let parsedInput: Record<string, unknown> = {}
                  try { parsedInput = JSON.parse(currentToolUse.inputJson) } catch {}
                  toolUses.push({
                    id: currentToolUse.id,
                    name: currentToolUse.name,
                    input: parsedInput,
                  })
                  currentToolUse = null
                }
              } else if (event.type === 'message_delta') {
                stopReason = event.delta.stop_reason || ''
              }
            }

            // No tool calls → we're done
            if (stopReason !== 'tool_use' || !toolUses.length) break

            // Execute tools and continue loop
            const toolResults: Anthropic.MessageParam = {
              role: 'user',
              content: await Promise.all(
                toolUses.map(async (tu) => {
                  send(JSON.stringify({ type: 'tool_call', name: tu.name }))
                  const result = await runTool(tu.name, tu.input)
                  return {
                    type: 'tool_result' as const,
                    tool_use_id: tu.id,
                    content: result,
                  }
                }),
              ),
            }

            // Build assistant message with all content blocks
            const assistantContent: Anthropic.Messages.ContentBlock[] = []
            if (assistantText) {
              assistantContent.push({ type: 'text', text: assistantText } as Anthropic.Messages.TextBlock)
            }
            for (const tu of toolUses) {
              assistantContent.push({
                type: 'tool_use',
                id: tu.id,
                name: tu.name,
                input: tu.input,
              } as Anthropic.Messages.ToolUseBlock)
            }

            currentMessages = [
              ...currentMessages,
              { role: 'assistant', content: assistantContent },
              toolResults,
            ]
          }

          send(JSON.stringify({ type: 'done' }))
        } catch (err) {
          console.error('[angelo/chat]', err)
          send(JSON.stringify({ type: 'error', message: 'Désolé, une erreur est survenue.' }))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[angelo/chat POST]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
