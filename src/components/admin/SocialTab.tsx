'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Sparkles, Instagram, Linkedin, Facebook, Clock, CheckCircle, XCircle,
  Trash2, Edit3, Send, Upload, RefreshCw, AlertTriangle, TrendingUp,
  ChevronDown, ChevronUp, Zap, Calendar, BarChart2,
} from 'lucide-react'

type Platform = 'facebook' | 'instagram' | 'linkedin'
type Status = 'draft' | 'approved' | 'published' | 'failed'

interface SocialPost {
  id: string
  platform: Platform
  content: string
  image_url: string | null
  scheduled_at: string | null
  status: Status
  published_at: string | null
  error_message: string | null
  generated_by: string
  created_at: string
}

interface VeilleOpportunite {
  titre: string
  contexte: string
  angle_post: string
  exemple_accroche: string
  plateformes: string[]
  urgence: 'haute' | 'moyenne' | 'faible'
}

interface VeilleFormat {
  type: string
  pourquoi_ca_marche: string
  exemple: string
}

interface VeilleCalendrier {
  evenement: string
  date: string
  angle_marketing: string
  urgence_post: string
}

interface VeilleTendance {
  tendance: string
  impact_comink: string
  angle_contenu: string
}

interface VeilleData {
  opportunites: VeilleOpportunite[]
  tendances_chaudes: VeilleTendance[]
  calendrier_proche: VeilleCalendrier[]
  formats_performants: VeilleFormat[]
  insights_algorithme: { facebook: string; instagram: string; linkedin: string }
  a_eviter: string[]
  conseil_strategique: string
  generated_at: string
}

const PLATFORM_CONFIG: Record<Platform, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  facebook:  { label: 'Facebook',  color: '#1877F2', bg: 'rgba(24,119,242,0.1)',  icon: Facebook },
  instagram: { label: 'Instagram', color: '#E1306C', bg: 'rgba(225,48,108,0.1)',  icon: Instagram },
  linkedin:  { label: 'LinkedIn',  color: '#0A66C2', bg: 'rgba(10,102,194,0.1)',  icon: Linkedin },
}

const STATUS_CONFIG: Record<Status, { label: string; color: string; icon: React.ElementType }> = {
  draft:     { label: 'Brouillon',  color: 'text-slate-400',   icon: Edit3 },
  approved:  { label: 'Approuvé',   color: 'text-emerald-400', icon: CheckCircle },
  published: { label: 'Publié',     color: 'text-blue-400',    icon: Send },
  failed:    { label: 'Échec',      color: 'text-red-400',     icon: AlertTriangle },
}

const POST_TYPES = [
  { value: '', label: 'IA choisit le type' },
  { value: 'showcase : montre un résultat client concret avec dimensions, délai, usage réel', label: '📸 Showcase produit' },
  { value: 'conseil pratique : donne une astuce utile sur comment commander, choisir son support ou préparer ses fichiers', label: '💡 Conseil pratique' },
  { value: "cas client anonyme : raconte une situation réelle (besoin urgent, projet événementiel, inauguration…)", label: '🏪 Cas client' },
  { value: "question d'engagement : pose une vraie question à la communauté liée à l'impression ou à leur activité", label: '💬 Question engagement' },
  { value: 'coulisses de production : décris ce qui se passe en atelier, le processus, la précision du travail', label: '🏭 Coulisses' },
  { value: 'offre ou urgence saisonnière : rentrée, fêtes, été, salon… délai limité pour commander', label: '🔥 Offre / Urgence' },
]

export default function SocialTab() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Status | 'all'>('all')

  // Génération
  const [generating, setGenerating] = useState(false)
  const [theme, setTheme] = useState('')
  const [postType, setPostType] = useState('')
  const [platforms, setPlatforms] = useState<Platform[]>(['facebook', 'instagram', 'linkedin'])
  const [scheduledAt, setScheduledAt] = useState('')
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Veille
  const [veille, setVeille] = useState<VeilleData | null>(null)
  const [veilleLoading, setVeilleLoading] = useState(false)
  const [veilleOpen, setVeilleOpen] = useState(true)

  // Edition
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/admin/social${filter !== 'all' ? `?status=${filter}` : ''}`)
    if (res.ok) setPosts(await res.json())
    setLoading(false)
  }

  async function loadVeille() {
    setVeilleLoading(true)
    try {
      const res = await fetch('/api/admin/social/veille')
      if (res.ok) setVeille(await res.json())
    } finally {
      setVeilleLoading(false)
    }
  }

  useEffect(() => { load() }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadVeille() }, [])

  function applyOpportunity(opp: VeilleOpportunite) {
    setTheme(opp.angle_post)
    const validPlats = opp.plateformes.filter(p => ['facebook', 'instagram', 'linkedin'].includes(p)) as Platform[]
    if (validPlats.length) setPlatforms(validPlats)
  }

  async function handleUploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const ext = file.name.split('.').pop()
      const path = `social/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path)
      setUploadedImage(publicUrl)
    } catch (e: unknown) {
      alert('Erreur upload : ' + (e as Error).message)
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleGenerate() {
    if (!platforms.length) return
    setGenerating(true)
    try {
      const fullTheme = [postType, theme.trim()].filter(Boolean).join(' — ')

      // Construire le contexte veille pour injecter dans le prompt
      let veilleContext = ''
      if (veille) {
        const topOpps = veille.opportunites?.slice(0, 3)
          .map(o => `• ${o.titre} → ${o.angle_post}`)
          .join('\n') ?? ''
        const formats = veille.formats_performants?.slice(0, 3)
          .map(f => `• ${f.type} : ${f.exemple}`)
          .join('\n') ?? ''
        veilleContext = [
          topOpps && `Opportunités du moment :\n${topOpps}`,
          formats && `Formats qui performent :\n${formats}`,
          veille.conseil_strategique && `Conseil stratégique : ${veille.conseil_strategique}`,
        ].filter(Boolean).join('\n\n')
      }

      const res = await fetch('/api/admin/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          platforms,
          theme: fullTheme || undefined,
          image_url: uploadedImage || undefined,
          scheduled_at: scheduledAt || undefined,
          veille_context: veilleContext || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTheme('')
      setPostType('')
      setUploadedImage(null)
      setScheduledAt('')
      setFilter('draft')
      load()
    } catch (e: unknown) {
      alert('Erreur : ' + (e as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleApprove(id: string) {
    await fetch('/api/admin/social', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'approved' }),
    })
    load()
  }

  async function handleReject(id: string) {
    await fetch('/api/admin/social', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'draft' }),
    })
    load()
  }

  async function handleSaveEdit(id: string) {
    await fetch('/api/admin/social', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, content: editContent }),
    })
    setEditingId(null)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce post ?')) return
    await fetch(`/api/admin/social?id=${id}`, { method: 'DELETE' })
    load()
  }

  function togglePlatform(p: Platform) {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  const urgenceColors: Record<string, string> = {
    haute: 'bg-red-100 text-red-700 border-red-200',
    moyenne: 'bg-amber-100 text-amber-700 border-amber-200',
    faible: 'bg-slate-100 text-slate-600 border-slate-200',
  }

  const drafts    = posts.filter(p => p.status === 'draft')
  const approved  = posts.filter(p => p.status === 'approved')
  const published = posts.filter(p => p.status === 'published')
  const failed    = posts.filter(p => p.status === 'failed')

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Réseaux sociaux</h2>
          <p className="text-sm text-slate-500 mt-0.5">L'IA génère des posts experts, tu approuves, ils partent automatiquement.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{drafts.length} brouillons</span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">{approved.length} approuvés</span>
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">{published.length} publiés</span>
        </div>
      </div>

      {/* ── Veille du secteur ── */}
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 overflow-hidden">
        {/* Header veille */}
        <div className="flex items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-900">Intelligence marché</p>
              {veille?.generated_at && (
                <p className="text-[11px] text-emerald-600 opacity-70">
                  Mise à jour {new Date(veille.generated_at).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={loadVeille}
              disabled={veilleLoading}
              title="Actualiser la veille"
              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${veilleLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setVeilleOpen(v => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors"
            >
              {veilleOpen ? <><ChevronUp className="w-3.5 h-3.5" /> Réduire</> : <><ChevronDown className="w-3.5 h-3.5" /> Voir la veille</>}
            </button>
          </div>
        </div>

        {/* Conseil stratégique — toujours visible */}
        {veille?.conseil_strategique && (
          <div className="px-5 pb-3.5 -mt-1">
            <div className="flex items-start gap-2.5">
              <Zap className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                {veille.conseil_strategique}
              </p>
            </div>
          </div>
        )}

        {/* Skeleton si chargement */}
        {veilleLoading && !veille && (
          <div className="px-5 pb-5 space-y-2 animate-pulse">
            <div className="h-3 bg-emerald-200 rounded-full w-4/5" />
            <div className="h-3 bg-emerald-200 rounded-full w-3/5" />
            <div className="h-3 bg-emerald-200 rounded-full w-2/3" />
          </div>
        )}

        {/* Détails veille (dépliés) */}
        {veille && veilleOpen && (
          <div className="border-t border-emerald-200 divide-y divide-emerald-100">
            {/* Opportunités */}
            {veille.opportunites?.length > 0 && (
              <div className="px-5 py-4">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Zap className="w-3 h-3" /> Opportunités ({veille.opportunites.length})
                  <span className="font-normal normal-case tracking-normal text-emerald-600">— clique pour pré-remplir le formulaire</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  {veille.opportunites.map((opp, i) => (
                    <button
                      key={i}
                      onClick={() => applyOpportunity(opp)}
                      className="text-left bg-white rounded-lg p-3 border border-emerald-100 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-xs font-bold text-slate-800 leading-tight group-hover:text-indigo-700 transition-colors">
                          {opp.titre}
                        </p>
                        <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${urgenceColors[opp.urgence] ?? urgenceColors.faible}`}>
                          {opp.urgence}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-1.5">{opp.angle_post}</p>
                      {opp.exemple_accroche && (
                        <p className="text-[11px] italic text-indigo-600 leading-relaxed border-l-2 border-indigo-200 pl-2">
                          {opp.exemple_accroche}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-emerald-100">
              {/* Formats performants */}
              {veille.formats_performants?.length > 0 && (
                <div className="px-5 py-4">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                    <BarChart2 className="w-3 h-3" /> Formats qui performent
                  </p>
                  <div className="space-y-2">
                    {veille.formats_performants.slice(0, 4).map((f, i) => (
                      <div key={i}>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                          {f.type}
                        </span>
                        <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">{f.exemple}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Calendrier */}
              {veille.calendrier_proche?.length > 0 && (
                <div className="px-5 py-4">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> Agenda
                  </p>
                  <div className="space-y-2.5">
                    {veille.calendrier_proche.slice(0, 4).map((ev, i) => (
                      <div key={i}>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[11px] font-bold text-slate-700">{ev.evenement}</p>
                          <span className="text-[10px] text-slate-400">{ev.date}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{ev.angle_marketing}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Algo insights + à éviter */}
              <div className="px-5 py-4 space-y-4">
                {veille.insights_algorithme && (
                  <div>
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3" /> Algorithmes
                    </p>
                    <div className="space-y-1.5">
                      {(['facebook', 'instagram', 'linkedin'] as const).map(p => (
                        <div key={p} className="flex items-start gap-1.5">
                          <span className="text-[9px] font-bold uppercase text-slate-400 w-14 flex-shrink-0 mt-0.5 tracking-wider">{p}</span>
                          <p className="text-[11px] text-slate-600 leading-relaxed">{veille.insights_algorithme[p]}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {veille.a_eviter?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1.5">À éviter</p>
                    <div className="flex flex-wrap gap-1">
                      {veille.a_eviter.map((item, i) => (
                        <span key={i} className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Panneau génération ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-800">Générer des posts</h3>
          {veille && (
            <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold ml-auto">
              ✓ Veille active
            </span>
          )}
        </div>
        <div className="p-5 space-y-4">
          {/* Plateformes */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Plateformes</p>
            <div className="flex gap-2">
              {(Object.entries(PLATFORM_CONFIG) as [Platform, typeof PLATFORM_CONFIG[Platform]][]).map(([p, cfg]) => {
                const Icon = cfg.icon
                const active = platforms.includes(p)
                return (
                  <button key={p} onClick={() => togglePlatform(p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
                    style={active
                      ? { background: cfg.bg, borderColor: cfg.color, color: cfg.color }
                      : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#64748b' }}>
                    <Icon className="w-3.5 h-3.5" /> {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Type + Précision + Image */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Type de post</label>
              <select
                value={postType}
                onChange={e => setPostType(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              >
                {POST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Précision / contexte <span className="font-normal normal-case">(optionnel)</span>
              </label>
              <input
                type="text"
                value={theme}
                onChange={e => setTheme(e.target.value)}
                placeholder="ex: covering blanc mat, bâche 4m, rentrée…"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Image <span className="font-normal normal-case">(optionnel)</span>
              </label>
              <div className="flex items-center gap-2">
                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50">
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingImage ? 'Upload…' : uploadedImage ? 'Changer' : 'Uploader une photo'}
                </button>
                {uploadedImage && (
                  <div className="flex items-center gap-1.5">
                    <img src={uploadedImage} alt="" className="w-8 h-8 rounded object-cover border border-slate-200" />
                    <button onClick={() => setUploadedImage(null)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleUploadImage} />
              </div>
            </div>
          </div>

          {/* Heure + Bouton */}
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                <Clock className="w-3 h-3 inline mr-1" />Publication prévue
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating || !platforms.length}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              <Sparkles className="w-4 h-4" />
              {generating ? 'Génération en cours…' : `Générer ${platforms.length} post${platforms.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'draft', 'approved', 'published', 'failed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === f ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {f === 'all' ? 'Tous' : f === 'draft' ? `Brouillons (${drafts.length})` : f === 'approved' ? `Approuvés (${approved.length})` : f === 'published' ? `Publiés (${published.length})` : `Échecs (${failed.length})`}
          </button>
        ))}
        <button onClick={load} className="ml-auto p-1.5 text-slate-400 hover:text-slate-700 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Liste des posts */}
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Chargement…</div>
      ) : posts.length === 0 ? (
        <div className="py-12 text-center">
          <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Aucun post. Génère tes premiers posts ci-dessus.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => {
            const pc = PLATFORM_CONFIG[post.platform]
            const sc = STATUS_CONFIG[post.status]
            const PlatIcon = pc.icon
            const StatIcon = sc.icon
            const isEditing = editingId === post.id

            return (
              <div key={post.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: pc.color }}>
                      <PlatIcon className="w-4 h-4" /> {pc.label}
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-semibold ${sc.color}`}>
                      <StatIcon className="w-3.5 h-3.5" /> {sc.label}
                    </div>
                    {post.scheduled_at && (
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {new Date(post.scheduled_at).toLocaleString('fr-BE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {post.status === 'draft' && (
                      <>
                        <button onClick={() => { setEditingId(post.id); setEditContent(post.content) }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors" title="Modifier">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleApprove(post.id)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200">
                          <CheckCircle className="w-3 h-3" /> Approuver
                        </button>
                      </>
                    )}
                    {post.status === 'approved' && (
                      <button onClick={() => handleReject(post.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-50 rounded-lg border border-slate-200 transition-colors">
                        Repasser en brouillon
                      </button>
                    )}
                    <button onClick={() => handleDelete(post.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 transition-colors" title="Supprimer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="px-4 py-3 flex gap-3">
                  {post.image_url && (
                    <img src={post.image_url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-slate-100" />
                  )}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          rows={4}
                          className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveEdit(post.id)}
                            className="px-3 py-1.5 text-xs font-bold text-white rounded-lg" style={{ background: '#6366f1' }}>
                            Enregistrer
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700">
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                    )}
                    {post.error_message && (
                      <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {post.error_message}
                      </p>
                    )}
                    {post.published_at && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        Publié le {new Date(post.published_at).toLocaleString('fr-BE')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info connexions */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> Connexion aux plateformes requise
        </p>
        <p className="text-xs text-amber-700 leading-relaxed">
          Pour activer la publication automatique, ajoute ces variables dans Vercel → Settings → Environment Variables :<br />
          <code className="font-mono bg-amber-100 px-1 rounded">META_PAGE_ID</code> ·{' '}
          <code className="font-mono bg-amber-100 px-1 rounded">META_PAGE_ACCESS_TOKEN</code> ·{' '}
          <code className="font-mono bg-amber-100 px-1 rounded">META_IG_ACCOUNT_ID</code> ·{' '}
          <code className="font-mono bg-amber-100 px-1 rounded">LINKEDIN_ACCESS_TOKEN</code> ·{' '}
          <code className="font-mono bg-amber-100 px-1 rounded">LINKEDIN_AUTHOR_ID</code> ·{' '}
          <code className="font-mono bg-amber-100 px-1 rounded">CRON_SECRET</code>
        </p>
      </div>
    </div>
  )
}
