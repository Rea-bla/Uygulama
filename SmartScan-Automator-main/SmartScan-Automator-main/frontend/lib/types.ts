export interface User {
  id: string
  email: string
  full_name?: string
  phone?: string
  bio?: string
  avatar_url?: string
  preferred_sites?: string[]
  notification_enabled?: boolean
  theme_preference?: string
  language?: string
  search_count?: number
  is_active?: boolean
  is_verified?: boolean
  created_at?: string
  last_login_at?: string
}

export interface SearchResult {
  site: string
  name: string
  price: number
  original_price?: number
  url: string
  image_url: string
  in_stock?: boolean
  rating?: number
  review_count?: number
  badge?: string
}

export interface Favorite {
  id: string
  user_id: string
  site: string
  name: string
  price: number
  original_price?: number
  url: string
  image_url?: string
  created_at: string
}

export interface PriceAlert {
  id: string
  user_id: string
  product_name: string
  target_price: number
  current_price?: number
  product_url: string
  site: string
  image_url?: string
  is_active: boolean
  is_triggered: boolean
  triggered_at?: string
  check_count: number
  last_checked_at?: string
  created_at?: string
}

export interface PriceAlertSummary {
  total_alerts: number
  active_alerts: number
  triggered_alerts: number
  inactive_alerts: number
}

export interface SearchHistoryEntry {
  id: string
  query: string
  result_count: number
  min_price?: number
  max_price?: number
  avg_price?: number
  filters?: string
  searched_at?: string
}

export interface SearchStats {
  total_searches: number
  unique_queries: number
  avg_results_per_search: number
  most_searched: PopularSearch[]
  recent_searches: SearchHistoryEntry[]
}

export interface PopularSearch {
  query: string
  count: number
  last_searched?: string
}

export interface Notification {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  link?: string
  icon?: string
  created_at?: string
}

export interface NotificationCount {
  total: number
  unread: number
  read: number
}

export interface DashboardStats {
  total_searches: number
  total_favorites: number
  total_alerts: number
  active_alerts: number
  triggered_alerts: number
  searches_today: number
  searches_this_week: number
  searches_this_month: number
  favorite_sites: SiteDistribution[]
  recent_activity: ActivityItem[]
  savings_estimate: number
}

export interface SiteDistribution {
  site: string
  count: number
  percentage: number
}

export interface ActivityItem {
  type: string
  description: string
  timestamp?: string
}

export interface ProfileStats {
  total_searches: number
  total_favorites: number
  total_price_alerts: number
  active_alerts: number
  triggered_alerts: number
  member_since_days: number
  most_searched_sites: Record<string, number>[]
}

export interface HealthStatus {
  status: string
  version: string
  timestamp: string
  database: Record<string, any>
  scrapers: Record<string, any>
  system: Record<string, any>
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

export const SITE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Trendyol':         { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  'Hepsiburada':      { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  'Amazon TR':        { bg: '#fefce8', text: '#854d0e', border: '#fef08a' },
  'MediaMarkt':       { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  'Vatan Bilgisayar': { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' },
  'Teknosa':          { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  'n11':              { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  'Çiçeksepeti':      { bg: '#fdf2f8', text: '#be185d', border: '#fbcfe8' },
}

export const SUPPORTED_SITES = [
  'Trendyol',
  'Hepsiburada',
  'Amazon TR',
  'MediaMarkt',
  'Vatan Bilgisayar',
  'Teknosa',
  'n11',
]

export const STORAGE_OPTIONS = ['64 GB', '128 GB', '256 GB', '512 GB', '1 TB']

export const SORT_OPTIONS = [
  { id: 'popularity', label: 'Popülerlik' },
  { id: 'price_asc', label: 'En Düşük Fiyat' },
  { id: 'price_desc', label: 'En Yüksek Fiyat' },
  { id: 'rating', label: 'En Yüksek Puan' },
  { id: 'discount', label: 'En Yüksek İndirim' },
] as const

export function formatPrice(price: number): string {
  return price.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function calculateDiscount(originalPrice: number, currentPrice: number): number | null {
  if (!originalPrice || !currentPrice || originalPrice <= currentPrice) return null
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
}

export function getTimeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Az önce'
  if (diffMins < 60) return `${diffMins} dk önce`
  if (diffHours < 24) return `${diffHours} saat önce`
  if (diffDays < 7) return `${diffDays} gün önce`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} ay önce`
  return `${Math.floor(diffDays / 365)} yıl önce`
}

export function truncateText(text: string, maxLength: number = 80): string {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

export function getSiteIcon(siteName: string): string {
  const icons: Record<string, string> = {
    'Trendyol': '🟠',
    'Hepsiburada': '🔵',
    'Amazon TR': '📦',
    'MediaMarkt': '🔴',
    'Vatan Bilgisayar': '🟣',
    'Teknosa': '🟡',
    'n11': '🟢',
    'Çiçeksepeti': '🌸',
  }
  return icons[siteName] || '🏪'
}

export function generateSearchSuggestions(query: string): string[] {
  if (!query || query.length < 2) return []

  const suggestions: string[] = []
  const q = query.toLowerCase()

  const popularProducts = [
    'iPhone 15 Pro Max',
    'iPhone 16 Pro',
    'Samsung Galaxy S24 Ultra',
    'MacBook Air M3',
    'MacBook Pro M3',
    'iPad Pro M4',
    'AirPods Pro 2',
    'Apple Watch Ultra 2',
    'Sony WH-1000XM5',
    'PlayStation 5',
    'Xbox Series X',
    'Nintendo Switch OLED',
    'Samsung 65 inç TV',
    'LG OLED TV',
    'Dyson V15',
    'Robot Süpürge',
    'Philips Airfryer',
  ]

  for (const product of popularProducts) {
    if (product.toLowerCase().includes(q)) {
      suggestions.push(product)
    }
    if (suggestions.length >= 5) break
  }

  return suggestions
}
