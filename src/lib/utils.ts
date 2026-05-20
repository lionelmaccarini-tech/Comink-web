import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-BE', {
    day: '2-digit', month: 'long', year: 'numeric'
  }).format(new Date(date))
}

export const CATEGORY_LABELS: Record<string, string> = {
  banderoles: 'Banderoles',
  roll_up: 'Roll-up',
  drapeaux: 'Drapeaux',
  adhesifs: 'Adhésifs',
  toiles: 'Toiles',
  baches: 'Bâches',
  panneaux: 'Panneaux',
  textile: 'Textile',
  papier: 'Papier',
  accessoires: 'Accessoires',
  supports_evenementiels: 'Supports évènementiels',
  vinyle_autocollant: 'Vinyle autocollant',
  autre: 'Autre',
}

export function generateOrderNumber(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(Math.random() * 9000) + 1000
  return `CMK-${year}${month}-${random}`
}

export function generateQuoteNumber(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(Math.random() * 9000) + 1000
  return `DEV-${year}${month}-${random}`
}

export function calculateSurfaceM2(widthCm: number, heightCm: number): number {
  return (widthCm / 100) * (heightCm / 100)
}

export function calculatePricePerM2(widthCm: number, heightCm: number, pricePerM2: number): number {
  const surface = calculateSurfaceM2(widthCm, heightCm)
  return Math.round(surface * pricePerM2 * 100) / 100
}

export const VAT_RATES = [0, 6, 12, 21] as const

/** Returns the TTC price from HTVA + rate */
export function calcTTC(htva: number, vatRate: number): number {
  return htva * (1 + vatRate / 100)
}

/** Returns the VAT amount from HTVA + rate */
export function calcVAT(htva: number, vatRate: number): number {
  return htva * vatRate / 100
}

/** Check if a VAT number is an EU intra-community VAT (non-Belgian) → taux 0% */
export function isIntraCommunityVAT(vat: string): boolean {
  const normalized = vat.toUpperCase().replace(/[\s.\-]/g, '')
  return /^[A-Z]{2}[A-Z0-9]{5,15}$/.test(normalized) && !normalized.startsWith('BE')
}

/** Check if a VAT number is a valid Belgian VAT (BE + 10 digits) */
export function isBelgianVAT(vat: string): boolean {
  const normalized = vat.toUpperCase().replace(/[\s.\-]/g, '')
  return /^BE0[0-9]{9}$/.test(normalized)
}

/** Check if a VAT number looks like any valid EU VAT (Belgian or intra-community) */
export function isValidVAT(vat: string): boolean {
  return isBelgianVAT(vat) || isIntraCommunityVAT(vat)
}

// ─── Delivery cost ────────────────────────────────────────────────────────────

export interface DeliverySettings {
  parcel_be_min: number
  parcel_eu_min: number
  parcel_percent: number
  express_min: number
  express_per_km: number
}

export function calcDeliveryCost(
  method: 'pickup' | 'parcel' | 'express',
  htTotal: number,
  country: string,
  distanceKm: number,
  s: DeliverySettings
): number {
  if (method === 'pickup') return 0
  if (method === 'parcel') {
    const pct = htTotal * s.parcel_percent / 100
    const min = country === 'BE' ? s.parcel_be_min : s.parcel_eu_min
    return Math.max(min, pct)
  }
  // express
  const kmCost = distanceKm * s.express_per_km
  return Math.max(s.express_min, kmCost)
}
