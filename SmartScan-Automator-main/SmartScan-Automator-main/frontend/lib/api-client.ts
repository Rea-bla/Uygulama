const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface RequestOptions {
  method?: string
  body?: any
  headers?: Record<string, string>
  requireAuth?: boolean
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('token')
  }

  private buildHeaders(options: RequestOptions = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (options.requireAuth !== false) {
      const token = this.getToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    return headers
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers = this.buildHeaders(options)

    const config: RequestInit = {
      method: options.method || 'GET',
      headers,
    }

    if (options.body && config.method !== 'GET') {
      config.body = JSON.stringify(options.body)
    }

    const response = await fetch(url, config)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.message || errorData.detail || `HTTP ${response.status} hatası`
      throw new ApiError(errorMessage, response.status, errorData.error_code)
    }

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return response.json()
    }

    return response.text() as unknown as T
  }

  async get<T>(endpoint: string, requireAuth = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', requireAuth })
  }

  async post<T>(endpoint: string, body: any, requireAuth = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, requireAuth })
  }

  async put<T>(endpoint: string, body: any, requireAuth = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, requireAuth })
  }

  async delete<T>(endpoint: string, requireAuth = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', requireAuth })
  }

  // --- Auth Endpoints ---
  async register(email: string, password: string, fullName?: string) {
    return this.post('/api/v1/auth/register', {
      email,
      password,
      full_name: fullName,
    }, false)
  }

  async login(email: string, password: string) {
    return this.post('/api/v1/auth/login', { email, password }, false)
  }

  async getMe() {
    return this.get('/api/v1/auth/me')
  }

  // --- Profile Endpoints ---
  async getProfile() {
    return this.get('/api/v1/profile')
  }

  async updateProfile(data: Record<string, any>) {
    return this.put('/api/v1/profile', data)
  }

  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
    return this.post('/api/v1/profile/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    })
  }

  async getProfileStats() {
    return this.get('/api/v1/profile/stats')
  }

  async deleteAccount() {
    return this.delete('/api/v1/profile')
  }

  // --- Favorites Endpoints ---
  async getFavorites() {
    return this.get('/api/v1/favorites')
  }

  async addFavorite(data: {
    site: string
    name: string
    price: number
    original_price?: number
    url: string
    image_url?: string
  }) {
    return this.post('/api/v1/favorites', data)
  }

  async removeFavorite(url: string) {
    return this.delete(`/api/v1/favorites?url=${encodeURIComponent(url)}`)
  }

  // --- Price Alerts Endpoints ---
  async getPriceAlerts(isActive?: boolean) {
    let endpoint = '/api/v1/price-alerts'
    if (isActive !== undefined) {
      endpoint += `?is_active=${isActive}`
    }
    return this.get(endpoint)
  }

  async createPriceAlert(data: {
    product_name: string
    target_price: number
    current_price?: number
    product_url: string
    site: string
    image_url?: string
  }) {
    return this.post('/api/v1/price-alerts', data)
  }

  async updatePriceAlert(alertId: string, data: { target_price?: number; is_active?: boolean }) {
    return this.put(`/api/v1/price-alerts/${alertId}`, data)
  }

  async deletePriceAlert(alertId: string) {
    return this.delete(`/api/v1/price-alerts/${alertId}`)
  }

  async getPriceAlertSummary() {
    return this.get('/api/v1/price-alerts/summary')
  }

  // --- Search History Endpoints ---
  async getSearchHistory(limit = 50) {
    return this.get(`/api/v1/search-history?limit=${limit}`)
  }

  async saveSearch(data: {
    query: string
    result_count: number
    min_price?: number
    max_price?: number
    avg_price?: number
    filters?: string
  }) {
    return this.post('/api/v1/search-history', data)
  }

  async clearSearchHistory() {
    return this.delete('/api/v1/search-history')
  }

  async getSearchStats() {
    return this.get('/api/v1/search-history/stats')
  }

  // --- Notifications Endpoints ---
  async getNotifications(unreadOnly = false) {
    return this.get(`/api/v1/notifications?unread_only=${unreadOnly}`)
  }

  async getNotificationCount() {
    return this.get('/api/v1/notifications/count')
  }

  async markNotificationRead(notificationId: string) {
    return this.put(`/api/v1/notifications/${notificationId}/read`, {})
  }

  async markAllNotificationsRead() {
    return this.put('/api/v1/notifications/read-all', {})
  }

  async deleteNotification(notificationId: string) {
    return this.delete(`/api/v1/notifications/${notificationId}`)
  }

  // --- Analytics Endpoints ---
  async getDashboardStats() {
    return this.get('/api/v1/analytics/dashboard')
  }

  async getGlobalStats() {
    return this.get('/api/v1/analytics/global', false)
  }

  // --- Export Endpoints ---
  async exportFavoritesCSV() {
    const token = this.getToken()
    const response = await fetch(`${this.baseUrl}/api/v1/export/favorites/csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) throw new Error('Dışa aktarma başarısız')
    return response.blob()
  }

  async exportFavoritesJSON() {
    const token = this.getToken()
    const response = await fetch(`${this.baseUrl}/api/v1/export/favorites/json`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) throw new Error('Dışa aktarma başarısız')
    return response.blob()
  }

  // --- Health Endpoints ---
  async getHealthStatus() {
    return this.get('/api/v1/health', false)
  }

  async ping() {
    return this.get('/api/v1/health/ping', false)
  }

  // --- Search ---
  async search(query: string, limit = 200, sites?: string[]) {
    let endpoint = `/api/v1/search?q=${encodeURIComponent(query)}&limit=${limit}`
    if (sites && sites.length > 0) {
      endpoint += `&sites=${encodeURIComponent(sites.join(','))}`
    }
    return this.get(endpoint, false)
  }
}

class ApiError extends Error {
  status: number
  errorCode?: string

  constructor(message: string, status: number, errorCode?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errorCode = errorCode
  }
}

export const apiClient = new ApiClient(API_URL)
export { ApiError }
export type { RequestOptions }
