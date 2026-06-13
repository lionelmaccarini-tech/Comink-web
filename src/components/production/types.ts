export interface ProductionStatus {
  id: string
  name: string
  color: string
  sort_order: number
  is_initial: boolean
  is_final: boolean
  created_at?: string
}

export interface ProductionLine {
  id: string
  order_id: string
  order_number: string
  user_id: string
  client_name: string
  client_email: string
  product_name: string
  product_id?: string | null
  production_code?: string | null
  width_cm?: number | null
  height_cm?: number | null
  quantity: number
  file_url?: string | null
  file_name?: string | null
  file_thumb?: string | null
  status_id: string
  status?: ProductionStatus
  assignee_id?: string | null
  assignee?: { id: string; full_name: string } | null
  due_date?: string | null
  notes?: string | null
  finitions_summary?: Array<{ label: string; value: string }> | null
  delai_label?: string | null
  file_analysis?: {
    score: number
    status: 'ok' | 'warning' | 'error'
    summary: string
    checks: Array<{ id: string; label: string; status: 'ok' | 'warning' | 'error'; message: string; detail?: string }>
    recommendations?: string[]
  } | null
  line_reference?: string | null
  order_reference?: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface StaffMember {
  id: string
  full_name: string
  role: string
}
