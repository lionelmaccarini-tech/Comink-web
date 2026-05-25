'use client'

import React, { useRef, useState, useCallback } from 'react'
import { Loader2, Upload, X } from 'lucide-react'

interface LogoUploadProps {
  currentLogoUrl?: string
  currentLogoName?: string
  onUploadSuccess?: () => Promise<void>
}

export default function LogoUpload({ currentLogoUrl, currentLogoName, onUploadSuccess }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(currentLogoUrl ?? null)
  const [fileName, setFileName] = useState<string | null>(currentLogoName ?? null)

  const upload = useCallback(async (file: File) => {
    setUploading(true)
    setError('')

    try {
      // 1. Upload file to R2
      const formData = new FormData()
      formData.append('file', file)
      formData.append('itemId', 'jde-logos')

      const uploadRes = await fetch('/api/r2-upload', { method: 'POST', body: formData })
      if (!uploadRes.ok) {
        const d = await uploadRes.json()
        throw new Error(d.error || 'Upload échoué')
      }
      const { url } = await uploadRes.json()

      // 2. Save logo_url to JDE client profile
      const patchRes = await fetch('/api/jde/clients/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_url: url, logo_name: file.name }),
      })
      if (!patchRes.ok) {
        const d = await patchRes.json()
        throw new Error(d.error || 'Sauvegarde échouée')
      }

      setPreview(url)
      setFileName(file.name)
      if (onUploadSuccess) await onUploadSuccess()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'upload')
    } finally {
      setUploading(false)
    }
  }, [onUploadSuccess])

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
    if (!allowed.includes(file.type)) {
      setError('Format non supporté. Utilisez PNG, JPG, SVG ou WebP.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Fichier trop volumineux (max 10 MB)')
      return
    }
    upload(file)
  }, [upload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  return (
    <div className="space-y-3">
      {/* Current logo preview */}
      {preview && (
        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <img src={preview} alt="Logo actuel" className="h-14 w-auto max-w-[120px] object-contain" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 truncate">{fileName}</p>
            <p className="text-xs text-slate-400">Logo actuel</p>
          </div>
          <button
            onClick={() => { setPreview(null); setFileName(null) }}
            className="text-slate-300 hover:text-red-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-[#F5C200] bg-yellow-50'
            : 'border-slate-200 hover:border-[#F5C200] bg-white hover:bg-yellow-50/40'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#E8271A]" />
            <p className="text-sm">Upload en cours...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Upload className="w-8 h-8" />
            <p className="text-sm font-semibold text-slate-600">
              Glissez votre logo ici ou <span className="text-[#E8271A] underline">cliquez</span>
            </p>
            <p className="text-xs">PNG, JPG, SVG ou WebP — max 10 MB</p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}
    </div>
  )
}
