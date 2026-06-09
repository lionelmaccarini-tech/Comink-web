import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'

/**
 * POST /api/orders/parse-order-file
 * FormData : { file: File }
 *
 * Accepte Excel (.xlsx / .xls) ou CSV.
 * Retourne { csv: string, rows: number, columns: string[] }
 * Le CSV est ensuite interprété par Claude (Angelo) pour mapper les colonnes.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    }

    const name = file.name.toLowerCase()
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls')
    const isCsv   = name.endsWith('.csv')

    if (!isExcel && !isCsv) {
      return NextResponse.json({ error: 'Format non supporté. Utilisez un fichier Excel (.xlsx) ou CSV.' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 5 MB)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    let csvText: string
    let columns: string[] = []
    let rowCount = 0

    if (isCsv) {
      // CSV : lire directement
      csvText = buffer.toString('utf8').trim()
      const lines = csvText.split('\n').filter(Boolean)
      rowCount = Math.max(0, lines.length - 1)
      if (lines.length > 0) {
        columns = lines[0].split(/[,;	]/).map(c => c.replace(/^"|"$/g, '').trim())
      }
    } else {
      // Excel : convertir en CSV via xlsx
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]

      // Convertir en array of arrays
      const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        blankrows: false,
      }) as unknown[][]

      if (data.length === 0) {
        return NextResponse.json({ error: 'Feuille Excel vide' }, { status: 400 })
      }

      // Première ligne = en-têtes
      columns = (data[0] as unknown[]).map(c => String(c ?? '').trim()).filter(Boolean)
      rowCount = data.length - 1

      // Convertir en CSV lisible
      csvText = XLSX.utils.sheet_to_csv(sheet, { FS: ';' })
    }

    // Limiter à 200 lignes pour ne pas saturer le contexte Claude
    const lines = csvText.split('\n')
    const truncated = lines.length > 201
    const finalCsv = truncated ? lines.slice(0, 201).join('\n') + '\n[... tronqué]' : csvText

    return NextResponse.json({
      csv:       finalCsv,
      rows:      rowCount,
      columns,
      truncated,
      file_name: file.name,
    })
  } catch (err: any) {
    console.error('[parse-order-file]', err)
    return NextResponse.json({ error: err?.message || 'Erreur lors du parsing' }, { status: 500 })
  }
}
