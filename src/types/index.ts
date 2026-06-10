export type ProductType = 'sur_mesure' | 'taille_standard'

export type ProductCategory =
  | 'banderoles' | 'roll_up' | 'drapeaux' | 'adhesifs'
  | 'toiles' | 'baches' | 'panneaux' | 'textile'
  | 'papier' | 'accessoires' | 'supports_evenementiels'
  | 'vinyle_autocollant' | 'autre'

export type OrderStatus =
  | 'pending' | 'confirmed' | 'in_production'
  | 'ready' | 'shipped' | 'delivered' | 'cancelled'

export type UserRole = 'client' | 'admin' | 'production' | 'collaborateur'

export interface FinitionOption {
  id: string
  label: string
  price_type: 'fixed' | 'percent' | 'per_m2'
  price_supplement: number
  default_selected: boolean
}

export interface FinitionGroup {
  id: string
  label: string
  display_type: 'checkbox' | 'select'
  required: boolean
  options: FinitionOption[]
}

export interface DelaiOption {
  id: string
  label: string
  days: number
  surcharge_percent: number
}

export interface SideFinitionOption {
  id: string
  label: string
  price_type: 'fixed' | 'per_ml' | 'percent'
  price_supplement: number
}

export interface SidesFinitions {
  enabled: boolean
  sides: Array<{ id: string; label: string }>
  options: SideFinitionOption[]
  incompatibilities: Array<[string, string]>
}

export interface Product {
  id: string
  name: string
  slug: string
  description?: string
  category: ProductCategory
  product_type: ProductType
  images: string[]
  image_url?: string
  price_per_m2?: number
  standard_sizes?: StandardSize[]
  min_width_cm?: number
  max_width_cm?: number
  min_height_cm?: number
  max_height_cm?: number
  available: boolean
  vat_rate?: number
  jde_enabled?: boolean
  visibility_group?: string
  seo_title?: string
  seo_description?: string
  seo_keywords?: string
  production_code?: string
  // Options de production
  finitions?: FinitionGroup[]
  delai_options?: DelaiOption[]
  sides_finitions?: SidesFinitions | null
  // Accessoires liés
  linked_accessory_ids?: string[]
  // Visuel client
  requires_artwork?: boolean
  created_at: string
  updated_at: string
}

export interface StandardSize {
  id?: string
  label?: string   // ancien champ — peut être absent
  name?: string    // nouveau champ DB
  width_cm: number
  height_cm: number
  price: number
  sku?: string
}

export interface CartItem {
  id: string
  user_id: string
  product_id: string
  product?: Product
  quantity: number
  width_cm?: number
  height_cm?: number
  unit_price: number
  total_price: number
  file_url?: string
  file_name?: string
  notes?: string
  created_at: string
}

export interface Order {
  id: string
  order_number: string
  user_id: string
  client_name: string
  client_email: string
  client_phone?: string
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
  status: OrderStatus
  payment_status: 'pending' | 'paid' | 'refunded'
  stripe_payment_intent_id?: string
  shipping_address?: Address
  delivery_type: 'shipping' | 'pickup'
  tracking_number?: string
  notes?: string
  production_notes?: string
  estimated_delivery?: string
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  quantity: number
  width_cm?: number
  height_cm?: number
  unit_price: number
  total_price: number
  file_url?: string
  file_key?: string
}

export interface Quote {
  id: string
  quote_number: string
  client_name: string
  client_email: string
  client_company?: string
  client_phone?: string
  items: QuoteItem[]
  subtotal: number
  tax: number
  total: number
  status: 'draft' | 'sent' | 'accepted' | 'refused' | 'expired'
  valid_until?: string
  notes?: string
  created_by?: string
  created_at: string
}

export interface QuoteItem {
  description: string
  quantity: number
  unit_price: number
  total_price: number
}

export interface Address {
  name: string
  street: string
  city: string
  postal_code: string
  country: string
}

export interface UseCase {
  id: string
  name: string
  slug: string
  description?: string
  icon?: string
  image_url?: string
  product_ids: string[]
  sort_order: number
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt?: string
  content: string
  cover_image?: string
  published: boolean
  published_at?: string
  author?: string
  tags?: string[]
  seo_title?: string
  seo_description?: string
}

export interface AppUser {
  id: string
  email: string
  full_name?: string
  company?: string
  phone?: string
  role: UserRole
  price_list_id?: string
  vat_number?: string
  vat_country?: string
  billing_line1?: string | null
  billing_line2?: string | null
  billing_city?: string | null
  billing_postal_code?: string | null
  billing_country?: string | null
  created_at: string
}
