import { NextRequest, NextResponse } from 'next/server'

// ─── Seuils DPI pour l'impression grand format ────────────────────────────────
// Impression grand format : la résolution utile dépend de la distance de vision.
// Ces seuils sont appliqués sur la résolution du fichier à la taille commandée.
const DPI_ERROR   = 50   // < 50  → fichier inutilisable
const DPI_WARN    = 72   // < 72  → acceptable seulement grand format (> 2 m)
const DPI_OK      = 150  // ≥ 150 → bonne résolution (roll-up, présentoir, bâche rapprochée)
// ≥ 300  → excellente résolution (petits formats, close-up)

// ─── PDF ─────────────────────────────────────────────────────────────────────

interface PDFInfo {
  width_mm: number
  height_mm: number
  colorspace: string
  pages: number
  dpi: number | null        // DPI estimé à partir des images embarquées
  width_px: number          // largeur en pixels de la première image trouvée
  height_px: number
}

function detectPDFInfo(buf: Buffer): PDFInfo {
  // Lire au maximum les 200 ko initiaux pour les métadonnées
  const text = buf.slice(0, Math.min(buf.length, 200_000)).toString('latin1')

  // ── Dimensions de la page (MediaBox, en points PDF) ──
  const mbMatch = text.match(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/)
  let width_mm = 0
  let height_mm = 0
  if (mbMatch) {
    const wPts = parseFloat(mbMatch[3]) - parseFloat(mbMatch[1])
    const hPts = parseFloat(mbMatch[4]) - parseFloat(mbMatch[2])
    width_mm  = Math.round(wPts  * 0.352778)
    height_mm = Math.round(hPts  * 0.352778)
  }

  // ── Colorspace ──
  let colorspace = 'unknown'
  if (text.includes('/DeviceCMYK'))                                      colorspace = 'CMYK'
  else if (text.includes('/DeviceRGB') || text.includes('/sRGB'))        colorspace = 'RGB'

  // ── Nombre de pages ──
  const pagesMatch = text.match(/\/Count\s+(\d+)/)
  const pages = pagesMatch ? parseInt(pagesMatch[1]) : 1

  // ── Estimation DPI à partir des images XObject embarquées ──
  // Cherche les couples /Width + /Height d'images dans les flux PDF
  let dpi: number | null = null
  let width_px = 0
  let height_px = 0

  if (width_mm > 0 && height_mm > 0) {
    // Cherche les objets image : /Subtype /Image … /Width N /Height N
    const imgRegex = /\/Subtype\s*\/Image[\s\S]{0,200}?\/Width\s+(\d+)[\s\S]{0,100}?\/Height\s+(\d+)/g
    let bestDPI = 0
    let m: RegExpExecArray | null
    while ((m = imgRegex.exec(text)) !== null) {
      const iw = parseInt(m[1])
      const ih = parseInt(m[2])
      // Évite les petites icônes / miniatures
      if (iw < 50 || ih < 50) continue
      const pageWInch = width_mm  / 25.4
      const pageHInch = height_mm / 25.4
      const dpiX = iw / pageWInch
      const dpiY = ih / pageHInch
      const imgDPI = Math.round((dpiX + dpiY) / 2)
      if (imgDPI > bestDPI) {
        bestDPI = imgDPI
        width_px  = iw
        height_px = ih
      }
    }
    if (bestDPI > 0) dpi = bestDPI
  }

  return { width_mm, height_mm, colorspace, pages, dpi, width_px, height_px }
}

// ─── JPEG ─────────────────────────────────────────────────────────────────────

interface JPEGInfo {
  colorspace: string
  dpi: number | null
  width_px: number
  height_px: number
}

function detectJPEGInfo(buf: Buffer): JPEGInfo {
  let colorspace = 'unknown'
  let dpi: number | null = null
  let width_px = 0
  let height_px = 0
  let dpiFromJFIF: number | null = null

  let i = 0
  while (i < buf.length - 4) {
    if (buf[i] !== 0xFF) { i++; continue }
    const marker = buf[i + 1]

    if (marker === 0xE0 && i + 16 < buf.length) {
      // JFIF APP0 — résolution
      const ident = buf.slice(i + 4, i + 9).toString('ascii')
      if (ident === 'JFIF\0') {
        const unit     = buf[i + 11]
        const xDensity = buf.readUInt16BE(i + 12)
        if (unit === 1 && xDensity > 0) {
          dpiFromJFIF = xDensity                        // déjà en DPI
        } else if (unit === 2 && xDensity > 0) {
          dpiFromJFIF = Math.round(xDensity * 2.54)    // DPCM → DPI
        }
      }
    } else if (marker === 0xEE && i + 12 < buf.length) {
      // APP14 — Adobe colorspace marker
      const colorTransform = buf[i + 11]
      colorspace = colorTransform === 0 ? 'CMYK' : 'RGB'
    } else if ((marker === 0xC0 || marker === 0xC2) && i + 9 < buf.length) {
      // SOF0 / SOF2 — dimensions en pixels
      height_px = buf.readUInt16BE(i + 5)
      width_px  = buf.readUInt16BE(i + 7)
      const components = buf[i + 9]
      if (colorspace === 'unknown') colorspace = components === 4 ? 'CMYK' : 'RGB'
    }

    if (marker === 0xD8 || marker === 0xD9 || marker === 0x01) {
      i += 2
    } else if (i + 3 < buf.length) {
      const segLen = buf.readUInt16BE(i + 2)
      i += 2 + segLen
    } else {
      break
    }
  }

  dpi = dpiFromJFIF
  return { colorspace, dpi, width_px, height_px }
}

// ─── PNG ──────────────────────────────────────────────────────────────────────

interface PNGInfo {
  dpi: number | null
  width_px: number
  height_px: number
}

function detectPNGInfo(buf: Buffer): PNGInfo {
  let dpi: number | null = null
  let width_px = 0
  let height_px = 0

  // Vérification signature PNG (8 octets)
  if (buf.length < 24) return { dpi, width_px, height_px }
  const sig = buf.slice(0, 8)
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  if (!sig.equals(PNG_SIG)) return { dpi, width_px, height_px }

  // IHDR — premiers 8 octets chunk header, puis 4 octets width + 4 octets height
  if (buf.slice(12, 16).toString('ascii') === 'IHDR') {
    width_px  = buf.readUInt32BE(16)
    height_px = buf.readUInt32BE(20)
  }

  // Scan des chunks pour trouver pHYs (densité de pixels)
  let offset = 8
  while (offset + 12 <= buf.length) {
    const chunkLen  = buf.readUInt32BE(offset)
    const chunkType = buf.slice(offset + 4, offset + 8).toString('ascii')

    if (chunkType === 'pHYs' && chunkLen === 9 && offset + 8 + 9 <= buf.length) {
      const xPPU  = buf.readUInt32BE(offset + 8)
      const unit  = buf[offset + 16]
      if (unit === 1 && xPPU > 0) {
        // Pixels par mètre → DPI
        dpi = Math.round(xPPU / 39.3701)
      }
      break
    }

    if (chunkType === 'IDAT') break   // les pHYs sont toujours avant les données image
    offset += 12 + chunkLen
  }

  return { dpi, width_px, height_px }
}

// ─── TIFF ─────────────────────────────────────────────────────────────────────

interface TIFFInfo {
  colorspace: string
  dpi: number | null
  width_px: number
  height_px: number
}

function detectTIFFInfo(buf: Buffer): TIFFInfo {
  let colorspace = 'unknown'
  let dpi: number | null = null
  let width_px = 0
  let height_px = 0

  if (buf.length < 8) return { colorspace, dpi, width_px, height_px }

  // Byte order : II (little-endian) ou MM (big-endian)
  const isLE = buf[0] === 0x49 && buf[1] === 0x49
  const read16 = (off: number) => isLE ? buf.readUInt16LE(off) : buf.readUInt16BE(off)
  const read32 = (off: number) => isLE ? buf.readUInt32LE(off) : buf.readUInt32BE(off)

  const ifdOffset = read32(4)
  if (ifdOffset + 2 >= buf.length) return { colorspace, dpi, width_px, height_px }

  const numEntries = read16(ifdOffset)
  let xResNum = 0, xResDen = 1

  for (let e = 0; e < numEntries; e++) {
    const base = ifdOffset + 2 + e * 12
    if (base + 12 > buf.length) break
    const tag   = read16(base)
    const type  = read16(base + 2)
    const value = read32(base + 8)

    switch (tag) {
      case 0x0100: width_px  = value; break   // ImageWidth
      case 0x0101: height_px = value; break   // ImageLength
      case 0x0106:                             // PhotometricInterpretation
        if (value === 5) colorspace = 'CMYK'
        else if (value === 2) colorspace = 'RGB'
        break
      case 0x011A: {                           // XResolution (RATIONAL)
        const off = value
        if (type === 5 && off + 8 <= buf.length) {
          xResNum = read32(off)
          xResDen = read32(off + 4)
        }
        break
      }
    }
  }

  // XResolution est en pixels par unité (tag 0x0128 = ResolutionUnit: 1=none, 2=inch, 3=cm)
  if (xResNum > 0 && xResDen > 0) {
    dpi = Math.round(xResNum / xResDen)
  }

  return { colorspace, dpi, width_px, height_px }
}

// ─── DPI helpers ──────────────────────────────────────────────────────────────

/** Calcule le DPI effectif du fichier raster si les dimensions de commande sont connues */
function computeEffectiveDPI(
  width_px: number,
  height_px: number,
  orderedWidthMm: number | null,
  orderedHeightMm: number | null
): number | null {
  if (!width_px || !height_px || !orderedWidthMm || !orderedHeightMm) return null
  const dpiX = width_px  / (orderedWidthMm  / 25.4)
  const dpiY = height_px / (orderedHeightMm / 25.4)
  return Math.round((dpiX + dpiY) / 2)
}

function dpiLabel(dpi: number): { level: 'ok' | 'warn' | 'error'; message: string } {
  if (dpi >= DPI_OK)    return { level: 'ok',   message: `${dpi} DPI — bonne résolution` }
  if (dpi >= DPI_WARN)  return { level: 'warn', message: `${dpi} DPI — acceptable pour grand format (distance > 1 m)` }
  if (dpi >= DPI_ERROR) return { level: 'warn', message: `${dpi} DPI — résolution limite, impression potentiellement pixelisée` }
  return                       { level: 'error', message: `${dpi} DPI — résolution trop faible, l'impression sera pixelisée` }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const formData    = await req.formData()
    const file        = formData.get('file') as File | null
    const widthCmStr  = formData.get('width_cm')  as string | null
    const heightCmStr = formData.get('height_cm') as string | null

    if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })

    const orderedWidthMm  = widthCmStr  ? parseFloat(widthCmStr)  * 10 : null
    const orderedHeightMm = heightCmStr ? parseFloat(heightCmStr) * 10 : null

    const arrayBuffer = await file.arrayBuffer()
    const buf         = Buffer.from(arrayBuffer)
    const fileName    = file.name.toLowerCase()
    const warnings: string[] = []

    let width_mm  = 0
    let height_mm = 0
    let colorspace = 'unknown'
    let pages      = 1
    let dpi: number | null = null
    let width_px   = 0
    let height_px  = 0

    // ── Détection par type de fichier ──
    if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
      const info = detectPDFInfo(buf)
      width_mm  = info.width_mm
      height_mm = info.height_mm
      colorspace = info.colorspace
      pages      = info.pages
      dpi        = info.dpi
      width_px   = info.width_px
      height_px  = info.height_px
    } else if (fileName.match(/\.(jpg|jpeg)$/) || file.type === 'image/jpeg') {
      const info = detectJPEGInfo(buf)
      colorspace = info.colorspace
      width_px   = info.width_px
      height_px  = info.height_px
      // DPI JFIF = résolution native; si dimensions commandées disponibles, calcul DPI effectif
      const effDPI = computeEffectiveDPI(width_px, height_px, orderedWidthMm, orderedHeightMm)
      dpi = effDPI ?? info.dpi
    } else if (fileName.endsWith('.png') || file.type === 'image/png') {
      colorspace = 'RGB'
      const info = detectPNGInfo(buf)
      width_px   = info.width_px
      height_px  = info.height_px
      const effDPI = computeEffectiveDPI(width_px, height_px, orderedWidthMm, orderedHeightMm)
      dpi = effDPI ?? info.dpi
    } else if (fileName.match(/\.(tiff|tif)$/) || file.type === 'image/tiff') {
      const info = detectTIFFInfo(buf)
      colorspace = info.colorspace
      width_px   = info.width_px
      height_px  = info.height_px
      const effDPI = computeEffectiveDPI(width_px, height_px, orderedWidthMm, orderedHeightMm)
      dpi = effDPI ?? info.dpi
    }

    // ── Avertissements colorspace ──
    if (colorspace === 'RGB') {
      warnings.push('Espace colorimétrique RGB détecté — recommandé : CMYK pour une impression optimale')
    }

    // ── Avertissements DPI ──
    let dpiStatus: 'ok' | 'warn' | 'error' | 'unknown' = 'unknown'
    if (dpi !== null) {
      const label = dpiLabel(dpi)
      dpiStatus = label.level
      if (label.level !== 'ok') {
        warnings.push(label.message)
      }
    }

    // ── Comparaison dimensions ──
    let dimensionMatch = true
    let suggestedScale: number | null = null

    if (orderedWidthMm && orderedHeightMm && width_mm > 0 && height_mm > 0) {
      const TOLERANCE = 0.05
      const wRatio = width_mm / orderedWidthMm
      const hRatio = height_mm / orderedHeightMm
      dimensionMatch = Math.abs(1 - wRatio) <= TOLERANCE && Math.abs(1 - hRatio) <= TOLERANCE

      if (!dimensionMatch) {
        const scaleW = orderedWidthMm / width_mm
        const scaleH = orderedHeightMm / height_mm
        suggestedScale = Math.round(Math.min(scaleW, scaleH) * 100) / 100
        warnings.push(
          `Dimensions du fichier (${width_mm}×${height_mm} mm) différentes de la commande (${Math.round(orderedWidthMm)}×${Math.round(orderedHeightMm)} mm)`
        )
      }
    }

    return NextResponse.json({
      ok:      true,
      dimensions: { width_mm, height_mm },
      colorspace,
      pages,
      dpi,
      dpi_status: dpiStatus,    // 'ok' | 'warn' | 'error' | 'unknown'
      width_px,
      height_px,
      warnings,
      dimensionMatch,
      suggestedScale,
    })
  } catch (err) {
    console.error('[validate-file]', err)
    return NextResponse.json({ error: 'Erreur lors de la validation' }, { status: 500 })
  }
}
