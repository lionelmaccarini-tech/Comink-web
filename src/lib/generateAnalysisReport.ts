import type { AnalysisResult } from '@/components/crm/FileAnalysisResult'

interface ReportMeta {
  fileName: string
  fileSizeMB?: number
  dimensions?: string | null
  orderNumber?: string
  clientName?: string
}

export function generateAnalysisReport(meta: ReportMeta, result: AnalysisResult) {
  const statusColor = { ok: '#059669', warning: '#d97706', error: '#dc2626' } as const
  const statusIcon  = { ok: '✓', warning: '⚠', error: '✗' } as const
  const statusLabel = { ok: 'Conforme', warning: 'À vérifier', error: 'Non conforme' } as const
  const scoreColor  = result.score >= 80 ? '#059669' : result.score >= 60 ? '#d97706' : '#dc2626'
  const date = new Date().toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric' })

  const checksHtml = (result.checks ?? []).map(c => `
    <div style="display:flex;gap:12px;padding:12px;border-left:4px solid ${statusColor[c.status]};background:${c.status === 'ok' ? '#f0fdf4' : c.status === 'warning' ? '#fffbeb' : '#fef2f2'};margin-bottom:8px;border-radius:0 8px 8px 0">
      <span style="font-size:18px;color:${statusColor[c.status]};flex-shrink:0">${statusIcon[c.status]}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:13px;color:#1e293b">${c.label}</div>
        <div style="font-size:12px;color:#475569;margin-top:2px">${c.message}</div>
        ${c.detail ? `<div style="font-size:11px;color:#94a3b8;margin-top:4px;font-style:italic">${c.detail}</div>` : ''}
      </div>
      <span style="flex-shrink:0;font-size:11px;font-weight:700;color:${statusColor[c.status]};padding:2px 8px;border-radius:999px;border:1px solid ${statusColor[c.status]}30;background:white;height:fit-content;white-space:nowrap">${statusLabel[c.status]}</span>
    </div>`).join('')

  const recoHtml = result.recommendations?.length
    ? `<div style="margin-top:24px;padding:16px;background:#eff6ff;border-radius:12px;border:1px solid #bfdbfe">
        <div style="font-weight:700;font-size:12px;color:#1d4ed8;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Recommandations</div>
        ${result.recommendations.map(r => `<div style="font-size:12px;color:#1e40af;padding:4px 0;padding-left:12px">• ${r}</div>`).join('')}
      </div>` : ''

  const metaRows = [
    meta.orderNumber ? `<tr><td style="color:#94a3b8;padding:3px 0">Bon de commande</td><td style="font-weight:600">#${meta.orderNumber}</td></tr>` : '',
    meta.clientName  ? `<tr><td style="color:#94a3b8;padding:3px 0;padding-right:20px">Client</td><td style="font-weight:600">${meta.clientName}</td></tr>` : '',
    meta.fileSizeMB  ? `<tr><td style="color:#94a3b8;padding:3px 0">Taille</td><td>${meta.fileSizeMB} MB</td></tr>` : '',
    meta.dimensions  ? `<tr><td style="color:#94a3b8;padding:3px 0">Dimensions</td><td style="font-weight:700;color:#2563eb">📐 ${meta.dimensions}</td></tr>` : '',
  ].filter(Boolean).join('')

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Rapport vérification — ${meta.fileName}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:-apple-system,Arial,sans-serif; color:#1e293b; background:#f8faff; }
  .page { max-width:780px; margin:0 auto; background:white; min-height:100vh; }
  @media print {
    body { background:white; }
    .page { max-width:100%; }
    .no-print { display:none !important; }
    @page { margin:20mm; }
  }
</style>
</head><body>
<div class="page">
  <div class="no-print" style="background:#1e3a8a;padding:12px 32px;display:flex;align-items:center;justify-content:space-between">
    <span style="color:white;font-size:13px;font-weight:600">Rapport de vérification — Comink</span>
    <button onclick="window.print()" style="background:white;color:#1e3a8a;border:none;padding:8px 20px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer">⬇ Enregistrer en PDF</button>
  </div>

  <div style="padding:40px 40px 32px">
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:2px solid #e2e8f0;margin-bottom:28px">
      <div>
        <div style="font-size:26px;font-weight:900;color:#1e3a8a;letter-spacing:-0.5px">COM<span style="color:#2563eb">INK</span></div>
        <div style="font-size:11px;color:#94a3b8;margin-top:2px">Imprimerie grand format · Liège</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:13px;font-weight:600;color:#475569">Rapport de vérification fichier</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:2px">${date}</div>
      </div>
    </div>

    <!-- Infos fichier -->
    <div style="background:#f8faff;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:24px">
      <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Fichier analysé</div>
      <div style="font-size:15px;font-weight:700;color:#1e293b;word-break:break-all;margin-bottom:8px">${meta.fileName}</div>
      ${metaRows ? `<table style="font-size:12px;border-collapse:collapse">${metaRows}</table>` : ''}
    </div>

    <!-- Score global -->
    <div style="display:flex;align-items:center;gap:20px;padding:20px;background:${result.status === 'ok' ? '#f0fdf4' : result.status === 'warning' ? '#fffbeb' : '#fef2f2'};border-radius:12px;border:1px solid ${statusColor[result.status]}30;margin-bottom:24px">
      <div style="font-size:52px;font-weight:900;color:${scoreColor};line-height:1">${result.score ?? '—'}</div>
      <div style="font-size:18px;color:#94a3b8;font-weight:300">/100</div>
      <div style="margin-left:8px">
        <div style="font-size:16px;font-weight:700;color:${statusColor[result.status]}">${result.status === 'ok' ? '✓ Fichier conforme' : result.status === 'warning' ? '⚠ Points à vérifier' : '✗ Corrections requises'}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px">${result.summary}</div>
      </div>
    </div>

    <!-- Checks -->
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px">Résultats détaillés</div>
    ${checksHtml}
    ${recoHtml}

    <!-- Footer -->
    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:11px;color:#94a3b8">
        <div>info@comink.be · +32 4 233 01 38</div>
        <div style="margin-top:2px">Rue de Bruxelles 174h, 4340 Awans, Belgique</div>
      </div>
      <div style="font-size:10px;color:#cbd5e1;text-align:right;max-width:260px">
        Analyse IA Claude · Vérification finale par Comink à la réception
      </div>
    </div>
  </div>
</div>
</body></html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}
