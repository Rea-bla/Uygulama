'use client'
import { useState, useEffect, useRef } from 'react'
import { sendVerificationCode, sendResetCode, generateCode } from '../lib/email'

// ===== INTERFACES =====
interface Result { site: string; name: string; price: number; original_price?: number; url: string; image_url: string; rating?: number; review_count?: number; badge?: string }
interface Favorite { id: string; site: string; name: string; price: number; original_price?: number; url: string; image_url?: string; created_at: string }
interface User { id: string; email: string; full_name?: string }
interface Category { id: string; name: string; icon: string; description: string; keywords: string[]; color: string }
interface Deal extends Result { discount_pct: number }
interface TrendingItem { query: string; count: number }
interface Notification { id: string; title: string; message: string; type: string; is_read: boolean; created_at: string }

// ===== CONSTANTS =====
const STORAGE_OPTIONS = ['64 GB', '128 GB', '256 GB', '512 GB', '1 TB']
const SITE_OPTIONS = ['Trendyol', 'Hepsiburada', 'Amazon TR', 'MediaMarkt', 'Vatan Bilgisayar', 'Teknosa', 'n11']
const SORT_OPTIONS = [
  { id: 'popularity', label: 'Popülerlik', disabled: false },
  { id: 'price_asc', label: 'En Düşük Fiyat', disabled: false },
  { id: 'price_desc', label: 'En Yüksek Fiyat', disabled: false },
  { id: 'rating', label: 'En Yüksek Puan', disabled: false },
  { id: 'newest', label: 'En Yeniler (Yakında)', disabled: true },
] as const
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getSiteColors(dark: boolean): Record<string, string> {
  return dark ? {
    'Trendyol': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    'Hepsiburada': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Amazon TR': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    'MediaMarkt': 'bg-red-500/10 text-red-400 border-red-500/20',
    'Vatan Bilgisayar': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    'Teknosa': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'n11': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  } : {
    'Trendyol': 'bg-orange-50 text-orange-700 border-orange-200',
    'Hepsiburada': 'bg-blue-50 text-blue-700 border-blue-200',
    'Amazon TR': 'bg-yellow-50 text-yellow-800 border-yellow-200',
    'MediaMarkt': 'bg-red-50 text-red-700 border-red-200',
    'Vatan Bilgisayar': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Teknosa': 'bg-amber-50 text-amber-800 border-amber-200',
    'n11': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }
}

// ===== FILTER SECTION =====
function FilterSection({ title, isOpen, onToggle, children, badgeCount }: { title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode; badgeCount?: number }) {
  return (
    <div className="border-b border-[var(--card-border)] py-3">
      <button onClick={onToggle} className="w-full flex items-center justify-between py-2 text-left hover:text-[var(--accent)] transition">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">{title}</span>
          {badgeCount !== undefined && badgeCount > 0 && (
            <span className="bg-[var(--accent)] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-5 h-5 flex items-center justify-center">{badgeCount}</span>
          )}
        </div>
        <span className="text-[var(--text-muted)] text-[10px]">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && <div className="pt-2 pb-1 animate-slide-down">{children}</div>}
    </div>
  )
}

// ===== MAIN =====
export default function Home() {
  // Theme
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  // Search
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  // Filters
  const [selectedStorage, setSelectedStorage] = useState<string>('')
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<string>('popularity')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [openSite, setOpenSite] = useState(true)
  const [openSort, setOpenSort] = useState(true)
  const [openPrice, setOpenPrice] = useState(true)
  const [openStorage, setOpenStorage] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  // Auth
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'forgot_password' | 'verify_register' | 'verify_forgot_password'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authFullName, setAuthFullName] = useState('')
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // Favorites
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [activeTab, setActiveTab] = useState<'search' | 'favorites'>('search')
  // Homepage
  const [categories, setCategories] = useState<Category[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [trending, setTrending] = useState<TrendingItem[]>([])
  const [recommendations, setRecommendations] = useState<Result[]>([])
  const [recommendationLabel, setRecommendationLabel] = useState('Popüler Ürünler')
  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  // Search History
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [showSearchHistory, setShowSearchHistory] = useState(false)
  // Refs
  const notifRef = useRef<HTMLDivElement>(null)
  const historyRef = useRef<HTMLDivElement>(null)

  const isDark = theme === 'dark'
  const SITE_COLORS = getSiteColors(isDark)

  // ===== THEME =====
  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
    const t = saved || 'light'
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light')

  // ===== INIT =====
  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    if (savedToken) { setToken(savedToken); fetchUser(savedToken); fetchFavorites(savedToken); fetchNotifications(savedToken) }
    const saved = localStorage.getItem('searchHistory')
    if (saved) setSearchHistory(JSON.parse(saved))
    loadHomepageData()
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false)
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) setShowSearchHistory(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ===== HOMEPAGE DATA =====
  const loadHomepageData = async () => {
    try {
      const [catRes, trendRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/categories`).catch(() => null),
        fetch(`${API_URL}/api/v1/homepage/trending`).catch(() => null),
      ])
      if (catRes?.ok) { const d = await catRes.json(); setCategories(d.categories || []) }
      if (trendRes?.ok) { const d = await trendRes.json(); setTrending(d.trending || []) }
      loadDeals()
      loadRecommendations()
    } catch (e) { console.error('Homepage verisi yüklenemedi:', e) }
  }
  const loadDeals = async () => {
    try { const res = await fetch(`${API_URL}/api/v1/homepage/deals`); if (res.ok) { const d = await res.json(); setDeals(d.deals || []) } } catch (e) { console.error('Deals yüklenemedi:', e) }
  }
  const loadRecommendations = async () => {
    try {
      const headers: Record<string, string> = {}
      const t = localStorage.getItem('token')
      if (t) headers['Authorization'] = `Bearer ${t}`
      const res = await fetch(`${API_URL}/api/v1/homepage/recommendations`, { headers })
      if (res.ok) { const d = await res.json(); setRecommendations(d.recommendations || []); setRecommendationLabel(d.label || 'Popüler Ürünler') }
    } catch (e) { console.error('Öneriler yüklenemedi:', e) }
  }

  // ===== AUTH =====
  const fetchUser = async (t: string) => { try { const r = await fetch(`${API_URL}/api/v1/auth/me`, { headers: { 'Authorization': `Bearer ${t}` } }); if (r.ok) setUser(await r.json()); else handleLogout() } catch (e) { console.error('Kullanıcı bilgisi çekilemedi:', e) } }
  const fetchFavorites = async (t: string) => { try { const r = await fetch(`${API_URL}/api/v1/favorites`, { headers: { 'Authorization': `Bearer ${t}` } }); if (r.ok) setFavorites(await r.json()) } catch (e) { console.error('Favoriler çekilemedi:', e) } }
  const fetchNotifications = async (t: string) => { try { const r = await fetch(`${API_URL}/api/v1/notifications`, { headers: { 'Authorization': `Bearer ${t}` } }); if (r.ok) { const d = await r.json(); const list = Array.isArray(d) ? d : d.notifications || []; setNotifications(list); setUnreadCount(list.filter((n: Notification) => !n.is_read).length) } } catch (e) { console.error('Bildirimler yüklenemedi:', e) } }
  const handleLogout = () => { localStorage.removeItem('token'); setToken(null); setUser(null); setFavorites([]); setActiveTab('search'); setNotifications([]); setUnreadCount(0) }
  const resetAuthModal = () => { setAuthEmail(''); setAuthPassword(''); setAuthFullName(''); setInputCode(''); setVerificationCode(''); setAuthError(''); setAuthSuccess(''); setAuthTab('login'); setShowPassword(false) }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(''); setAuthSuccess(''); setAuthLoading(true)
    try {
      if (authTab === 'register') { const code = generateCode(); setVerificationCode(code); await sendVerificationCode(authEmail, authFullName, code); setAuthTab('verify_register'); setAuthSuccess('Doğrulama kodu e-postanıza gönderildi.'); setAuthLoading(false); return }
      if (authTab === 'forgot_password') { const code = generateCode(); setVerificationCode(code); await sendResetCode(authEmail, code); setAuthTab('verify_forgot_password'); setAuthSuccess('Şifre sıfırlama kodu e-postanıza gönderildi.'); setAuthLoading(false); return }
      if (authTab === 'verify_register') {
        if (inputCode !== verificationCode) throw new Error('Doğrulama kodu hatalı.')
        const res = await fetch(`${API_URL}/api/v1/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: authEmail, password: authPassword, full_name: authFullName }) })
        const data = await res.json(); if (!res.ok) throw new Error(data.detail || 'Kayıt başarısız')
        localStorage.setItem('token', data.access_token); setToken(data.access_token); await fetchUser(data.access_token); await fetchFavorites(data.access_token); await fetchNotifications(data.access_token); setShowAuthModal(false); resetAuthModal()
      } else if (authTab === 'verify_forgot_password') {
        if (inputCode !== verificationCode) throw new Error('Doğrulama kodu hatalı.')
        const res = await fetch(`${API_URL}/api/v1/auth/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: authEmail, new_password: authPassword }) })
        const data = await res.json(); if (!res.ok) throw new Error(data.detail || 'Şifre sıfırlama başarısız')
        resetAuthModal(); setAuthTab('login'); setAuthSuccess('Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.')
      } else if (authTab === 'login') {
        const res = await fetch(`${API_URL}/api/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: authEmail, password: authPassword }) })
        const data = await res.json(); if (!res.ok) throw new Error(data.detail || 'Giriş başarısız')
        localStorage.setItem('token', data.access_token); setToken(data.access_token); await fetchUser(data.access_token); await fetchFavorites(data.access_token); await fetchNotifications(data.access_token); setShowAuthModal(false); resetAuthModal(); loadRecommendations()
      }
    } catch (err: any) { setAuthError(err.message || 'Sistem bağlantı hatası') } finally { setAuthLoading(false) }
  }

  // ===== FAVORITES =====
  const toggleFavorite = async (item: Result) => {
    if (!token) { resetAuthModal(); setShowAuthModal(true); return }
    const isFav = favorites.some(f => f.url === item.url)
    try {
      if (isFav) { const r = await fetch(`${API_URL}/api/v1/favorites?url=${encodeURIComponent(item.url)}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); if (r.ok) setFavorites(prev => prev.filter(f => f.url !== item.url)) }
      else { const r = await fetch(`${API_URL}/api/v1/favorites`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ site: item.site, name: item.name, price: item.price, original_price: item.original_price, url: item.url, image_url: item.image_url }) }); if (r.ok) { const nf = await r.json(); setFavorites(prev => [nf, ...prev]) } }
    } catch (e) { console.error('Favori hatası:', e) }
  }
  const exportFavorites = async (format: 'csv' | 'json') => {
    if (!token) return
    try { const r = await fetch(`${API_URL}/api/v1/export/favorites/${format}`, { headers: { 'Authorization': `Bearer ${token}` } }); if (r.ok) { const blob = await r.blob(); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `favorilerim.${format}`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url) } } catch (e) { console.error('Export hatası:', e) }
  }

  // ===== SEARCH =====
  const search = async () => {
    if (!query.trim()) return
    setLoading(true); setSearched(true); setResults([]); setActiveTab('search'); setShowSearchHistory(false)
    const updated = [query.trim(), ...searchHistory.filter(h => h !== query.trim())].slice(0, 10)
    setSearchHistory(updated); localStorage.setItem('searchHistory', JSON.stringify(updated))
    try {
      const fq = selectedStorage ? `${query.trim()} ${selectedStorage}` : query.trim()
      const sp = selectedSites.length > 0 ? `&sites=${encodeURIComponent(selectedSites.join(','))}` : ''
      const r = await fetch(`${API_URL}/api/v1/search?q=${encodeURIComponent(fq)}&limit=200${sp}`)
      if (r.ok) { const d = await r.json(); setResults(d?.results || []) }
    } catch (e) { console.error('Arama hatası:', e) } finally { setLoading(false) }
  }

  useEffect(() => { if (searched && query.trim()) search() }, [selectedSites]) // eslint-disable-line react-hooks/exhaustive-deps

  // ===== NAVIGATION =====
  const goHome = () => { setSearched(false); setLoading(false); setResults([]); setQuery(''); setActiveTab('search'); loadRecommendations() }
  const handleCategoryClick = (cat: Category) => {
    const kw = cat.keywords[0] || cat.name; setQuery(kw); setSearched(true); setLoading(true); setActiveTab('search')
    fetch(`${API_URL}/api/v1/search?q=${encodeURIComponent(kw)}&limit=200`).then(r => r.json()).then(d => setResults(d?.results || [])).catch(console.error).finally(() => setLoading(false))
  }
  const handleTrendingClick = (q: string) => {
    setQuery(q); setSearched(true); setLoading(true); setActiveTab('search')
    fetch(`${API_URL}/api/v1/search?q=${encodeURIComponent(q)}&limit=200`).then(r => r.json()).then(d => setResults(d?.results || [])).catch(console.error).finally(() => setLoading(false))
  }
  const markNotificationRead = async (id: string) => {
    if (!token) return
    try { await fetch(`${API_URL}/api/v1/notifications/${id}/read`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } }); setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n)); setUnreadCount(prev => Math.max(0, prev - 1)) } catch (e) { console.error(e) }
  }

  // ===== FILTERING =====
  const filteredResults = [...results].filter(r => {
    if (minPrice && r.price < parseFloat(minPrice)) return false
    if (maxPrice && r.price > parseFloat(maxPrice)) return false
    if (selectedStorage && !r.name.toLowerCase().includes(selectedStorage.toLowerCase())) return false
    return true
  })
  if (sortOrder === 'price_asc') filteredResults.sort((a, b) => a.price - b.price)
  else if (sortOrder === 'price_desc') filteredResults.sort((a, b) => b.price - a.price)
  else if (sortOrder === 'rating') filteredResults.sort((a, b) => { const rd = (b.rating || 0) - (a.rating || 0); if (rd !== 0) return rd; const rv = (b.review_count || 0) - (a.review_count || 0); if (rv !== 0) return rv; return a.price - b.price })

  const filteredFavorites = favorites.filter(f => {
    if (query && !f.name.toLowerCase().includes(query.toLowerCase())) return false
    if (minPrice && f.price < parseFloat(minPrice)) return false
    if (maxPrice && f.price > parseFloat(maxPrice)) return false
    if (selectedSites.length > 0 && !selectedSites.includes(f.site)) return false
    return true
  })

  const toggleSite = (s: string) => setSelectedSites(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])
  const handleClick = (url: string) => { if (!url?.trim()) return; window.open(url.startsWith('http') ? url : 'https://' + url, '_blank', 'noopener,noreferrer') }
  const formatPrice = (p: number) => p.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const hasActiveFilters = selectedSites.length > 0 || !!selectedStorage || !!minPrice || !!maxPrice

  // ===== RENDER =====
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased flex flex-col transition-colors duration-300">

      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-30 glass-header px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* THEME TOGGLE */}
              <button onClick={toggleTheme} className="theme-toggle" title={isDark ? 'Açık Tema' : 'Koyu Tema'}>
                {isDark ? '☀️' : '🌙'}
              </button>
              {searched && <button onClick={goHome} className="text-[var(--text-secondary)] hover:text-[var(--foreground)] transition text-sm ml-1">←</button>}
              <span className="text-2xl cursor-pointer" onClick={goHome}>⚡</span>
              <h1 onClick={goHome} className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-[var(--accent)] to-purple-500 bg-clip-text text-transparent whitespace-nowrap cursor-pointer">SmartScan</h1>
            </div>
            <div className="md:hidden flex items-center gap-2">
              {user && (
                <div className="relative" ref={notifRef}>
                  <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition relative">🔔{unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}</button>
                </div>
              )}
              {user
                ? <button onClick={handleLogout} className="text-xs btn-ghost py-1.5 px-3">Çıkış</button>
                : <button onClick={() => { resetAuthModal(); setShowAuthModal(true) }} className="text-xs btn-primary py-1.5 px-3">Giriş</button>
              }
            </div>
          </div>

          {/* SEARCH BAR (search mode only) */}
          {searched && (
            <div className="flex-1 flex gap-2 max-w-2xl w-full">
              <div className="relative flex-1" ref={historyRef}>
                <input className="w-full glass-input px-4 py-2.5 pl-10 text-sm text-[var(--foreground)] placeholder-[var(--text-muted)]" placeholder="Ürün adı, model numarası arayın..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} onFocus={() => searchHistory.length > 0 && setShowSearchHistory(true)} />
                <span className="absolute left-3.5 top-3 text-[var(--text-muted)] text-sm">🔍</span>
                {query && <button onClick={() => setQuery('')} className="absolute right-3.5 top-2.5 text-[var(--text-muted)] hover:text-[var(--foreground)] text-sm font-semibold">✕</button>}
                {showSearchHistory && searchHistory.length > 0 && (
                  <div className="search-history-dropdown glass-panel animate-slide-down">
                    <div className="p-3 border-b border-[var(--card-border)] flex justify-between items-center">
                      <span className="text-xs font-bold text-[var(--text-secondary)]">Son Aramalar</span>
                      <button onClick={() => { setSearchHistory([]); localStorage.removeItem('searchHistory'); setShowSearchHistory(false) }} className="text-[10px] text-[var(--accent)] hover:text-[var(--accent-light)]">Temizle</button>
                    </div>
                    {searchHistory.map((h, i) => <div key={i} className="search-history-item text-[var(--text-primary)]" onClick={() => { setQuery(h); setShowSearchHistory(false); handleTrendingClick(h) }}>🕐 {h}</div>)}
                  </div>
                )}
              </div>
              <button onClick={search} disabled={loading} className="btn-primary whitespace-nowrap disabled:opacity-50 active:scale-95">{loading ? 'Aranıyor...' : 'Ara'}</button>
            </div>
          )}

          {/* DESKTOP AUTH + NOTIF */}
          <div className="hidden md:flex items-center gap-3">
            {user && (
              <div className="relative" ref={notifRef}>
                <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition relative">🔔{unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}</button>
                {showNotifications && (
                  <div className="notification-panel glass-panel animate-slide-down">
                    <div className="p-4 border-b border-[var(--card-border)]"><h3 className="text-sm font-bold text-[var(--foreground)]">Bildirimler</h3></div>
                    {notifications.length === 0
                      ? <div className="p-6 text-center text-[var(--text-muted)] text-sm">Bildirim yok</div>
                      : notifications.slice(0, 10).map(n => (
                        <div key={n.id} className={`notification-item ${!n.is_read ? 'unread' : ''}`} onClick={() => markNotificationRead(n.id)}>
                          <p className="text-sm text-[var(--foreground)] font-medium">{n.title}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-1">{n.message}</p>
                          <p className="text-[10px] text-[var(--text-muted)] mt-2">{new Date(n.created_at).toLocaleDateString('tr-TR')}</p>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            )}
            {user
              ? <div className="flex items-center gap-3">
                  <div className="text-right"><p className="text-xs text-[var(--text-muted)]">Hoş geldiniz</p><p className="text-sm font-semibold text-[var(--foreground)]">{user.full_name || user.email}</p></div>
                  <button onClick={handleLogout} className="btn-ghost text-xs active:scale-95">Güvenli Çıkış</button>
                </div>
              : <button onClick={() => { resetAuthModal(); setShowAuthModal(true) }} className="btn-primary text-xs active:scale-95">Üye Girişi / Kayıt</button>
            }
          </div>
        </div>
      </header>

      {/* ===== HOMEPAGE ===== */}
      {!searched && (
        <div className="flex-1">
          {/* HERO */}
          <div className="hero-gradient relative py-16 sm:py-24 px-4">
            <div className="max-w-3xl mx-auto text-center relative z-10">
              <h2 className="text-3xl sm:text-5xl font-extrabold text-[var(--foreground)] mb-4 animate-fade-in-up">
                Binlerce Üründe
                <span className="bg-gradient-to-r from-[var(--accent)] to-purple-500 bg-clip-text text-transparent"> En İyi Fiyatı </span>
                Bulun
              </h2>
              <p className="text-[var(--text-secondary)] text-lg mb-8 animate-fade-in-up stagger-1">7 büyük e-ticaret sitesinden anlık fiyat karşılaştırma</p>
              <div className="hero-search flex gap-2 p-2 max-w-2xl mx-auto animate-fade-in-up stagger-2">
                <div className="relative flex-1" ref={historyRef}>
                  <input className="w-full bg-transparent px-4 py-3 pl-10 text-sm text-[var(--foreground)] placeholder-[var(--text-muted)] outline-none" placeholder="Ne aramak istersiniz? (örn: gaming laptop, airpods, ayakkabı...)" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} onFocus={() => searchHistory.length > 0 && setShowSearchHistory(true)} />
                  <span className="absolute left-3.5 top-3.5 text-[var(--text-muted)] text-sm">🔍</span>
                  {showSearchHistory && searchHistory.length > 0 && !searched && (
                    <div className="search-history-dropdown glass-panel animate-slide-down">
                      <div className="p-3 border-b border-[var(--card-border)] flex justify-between items-center">
                        <span className="text-xs font-bold text-[var(--text-secondary)]">Son Aramalar</span>
                        <button onClick={() => { setSearchHistory([]); localStorage.removeItem('searchHistory'); setShowSearchHistory(false) }} className="text-[10px] text-[var(--accent)]">Temizle</button>
                      </div>
                      {searchHistory.map((h, i) => <div key={i} className="search-history-item text-[var(--text-primary)]" onClick={() => { setQuery(h); setShowSearchHistory(false); handleTrendingClick(h) }}>🕐 {h}</div>)}
                    </div>
                  )}
                </div>
                <button onClick={search} className="btn-primary px-8 whitespace-nowrap active:scale-95">Ara</button>
              </div>
            </div>
          </div>

          {/* CATEGORIES */}
          <section className="max-w-6xl mx-auto px-4 py-12">
            <h3 className="section-title">📦 Kategoriler</h3>
            <p className="section-subtitle">İlgilendiğiniz kategoriye tıklayarak ürünleri keşfedin</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6">
              {categories.map((cat, i) => (
                <div key={cat.id} className={`category-card animate-fade-in-up stagger-${Math.min(i + 1, 8)}`} onClick={() => handleCategoryClick(cat)}>
                  <span className="category-icon">{cat.icon}</span>
                  <h4 className="text-sm font-bold text-[var(--foreground)]">{cat.name}</h4>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{cat.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* DEALS */}
          <section className="max-w-6xl mx-auto px-4 py-10">
            <h3 className="section-title">🔥 Son İndirimler</h3>
            <p className="section-subtitle">En yüksek indirimli ürünler</p>
            <div className="scroll-container mt-6">
              {deals.length > 0 ? deals.map((deal, i) => (
                <div key={i} className="deal-card cursor-pointer" onClick={() => handleClick(deal.url)}>
                  <div className="h-[180px] bg-[var(--surface-2)] p-3 flex items-center justify-center">
                    {deal.image_url ? <img src={deal.image_url} alt={deal.name} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} /> : <span className="text-[var(--text-muted)] text-xs">Görsel yok</span>}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-[var(--foreground)] font-semibold truncate">{deal.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">{deal.site}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <p className="text-sm font-bold text-[var(--success)]">{formatPrice(deal.price)} ₺</p>
                        {deal.original_price && <p className="text-[10px] text-[var(--text-muted)] line-through">{formatPrice(deal.original_price)} ₺</p>}
                      </div>
                      <span className="discount-badge">%{deal.discount_pct}</span>
                    </div>
                  </div>
                </div>
              )) : [...Array(6)].map((_, i) => (
                <div key={i} className="deal-card"><div className="h-[180px] animate-shimmer" /><div className="p-3 space-y-2"><div className="h-3 animate-shimmer rounded w-3/4" /><div className="h-3 animate-shimmer rounded w-1/2" /></div></div>
              ))}
            </div>
          </section>

          {/* TRENDING */}
          {trending.length > 0 && (
            <section className="max-w-6xl mx-auto px-4 py-10">
              <h3 className="section-title">🔍 Popüler Aramalar</h3>
              <p className="section-subtitle">En çok aranan ürünler</p>
              <div className="flex flex-wrap gap-3 mt-6">
                {trending.map((item, i) => (
                  <button key={i} className="trending-chip animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }} onClick={() => handleTrendingClick(item.query)}>
                    <span className="text-[var(--accent)]">#</span> {item.query}
                    {item.count > 0 && <span className="text-[var(--text-muted)] text-xs">({item.count})</span>}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* RECOMMENDATIONS */}
          {recommendations.length > 0 && (
            <section className="max-w-6xl mx-auto px-4 py-10 pb-20">
              <h3 className="section-title">⭐ {recommendationLabel}</h3>
              <p className="section-subtitle">{recommendationLabel === 'Sizin İçin Öneriler' ? 'Arama geçmişinize göre kişiselleştirilmiş öneriler' : 'Popüler ürünleri keşfedin'}</p>
              <div className="scroll-container mt-6">
                {recommendations.slice(0, 15).map((r, i) => (
                  <div key={i} className="deal-card cursor-pointer" onClick={() => handleClick(r.url)}>
                    <div className="h-[180px] bg-[var(--surface-2)] p-3 flex items-center justify-center">
                      {r.image_url ? <img src={r.image_url} alt={r.name} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} /> : <span className="text-[var(--text-muted)] text-xs">Görsel yok</span>}
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-[var(--foreground)] font-semibold truncate">{r.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">{r.site}</p>
                      <div className="mt-2">
                        <p className="text-sm font-bold text-[var(--price-color)]">{formatPrice(r.price)} ₺</p>
                        {r.original_price && r.original_price > r.price && <p className="text-[10px] text-[var(--text-muted)] line-through">{formatPrice(r.original_price)} ₺</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ===== SEARCH RESULTS ===== */}
      {searched && (
        <>
          <div className="lg:hidden bg-[var(--surface-1)] border-b border-[var(--card-border)] px-4 py-2.5 flex items-center justify-between">
            <button onClick={() => setShowMobileFilters(!showMobileFilters)} className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] px-3.5 py-2 rounded-lg transition">
              ⚙️ {showMobileFilters ? 'Filtreleri Gizle' : 'Filtrele & Sırala'}
              {hasActiveFilters && <span className="bg-[var(--accent)] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">!</span>}
            </button>
            {user && (
              <div className="flex gap-1.5">
                <button onClick={() => { setActiveTab('search'); setShowMobileFilters(false) }} className={`text-xs font-semibold px-3 py-2 rounded-lg transition ${activeTab === 'search' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-2)] text-[var(--text-secondary)]'}`}>Arama</button>
                <button onClick={() => { setActiveTab('favorites'); setShowMobileFilters(false) }} className={`text-xs font-semibold px-3 py-2 rounded-lg transition ${activeTab === 'favorites' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-2)] text-[var(--text-secondary)]'}`}>Favorilerim ({favorites.length})</button>
              </div>
            )}
          </div>

          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row min-h-screen w-full">
            {/* SIDEBAR */}
            <aside className={`w-full lg:w-[260px] lg:min-w-[260px] flex-shrink-0 lg:border-r border-[var(--card-border)] px-5 pt-6 bg-[var(--surface-1)] lg:bg-transparent ${showMobileFilters ? 'block border-b' : 'hidden lg:block'}`}>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--card-border)]">
                <p className="text-sm font-extrabold text-[var(--foreground)] tracking-wider">FİLTRELER</p>
                {hasActiveFilters && <button onClick={() => { setSelectedSites([]); setSelectedStorage(''); setMinPrice(''); setMaxPrice('') }} className="text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition font-semibold">Temizle</button>}
              </div>
              <FilterSection title="SATIŞ NOKTASI" isOpen={openSite} onToggle={() => setOpenSite(p => !p)} badgeCount={selectedSites.length}>
                <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {SITE_OPTIONS.map(s => <label key={s} className="flex items-center gap-2.5 cursor-pointer group"><input type="checkbox" checked={selectedSites.includes(s)} onChange={() => toggleSite(s)} className="accent-[var(--accent)] w-4 h-4 rounded" /><span className="text-sm text-[var(--text-primary)] group-hover:text-[var(--accent)] transition font-medium">{s}</span></label>)}
                </div>
              </FilterSection>
              <FilterSection title="SIRALAMA" isOpen={openSort} onToggle={() => setOpenSort(p => !p)}>
                <div className="flex flex-col gap-2.5">
                  {SORT_OPTIONS.map(o => <label key={o.id} className={`flex items-center gap-2.5 cursor-pointer group ${o.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}><input type="radio" name="sortOrder" checked={sortOrder === o.id} onChange={() => !o.disabled && setSortOrder(o.id)} disabled={o.disabled} className="accent-[var(--accent)] w-4 h-4" /><span className={`text-sm font-medium transition ${o.disabled ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)] group-hover:text-[var(--accent)]'}`}>{o.label}</span></label>)}
                </div>
              </FilterSection>
              <FilterSection title="FİYAT ARALIĞI" isOpen={openPrice} onToggle={() => setOpenPrice(p => !p)} badgeCount={(minPrice || maxPrice) ? 1 : 0}>
                <div className="flex gap-2">
                  <div className="flex-1"><p className="text-[10px] font-bold text-[var(--text-muted)] mb-1">MIN (TL)</p><input type="number" placeholder="0" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="w-full glass-input px-2.5 py-1.5 text-xs text-[var(--foreground)]" /></div>
                  <div className="flex-1"><p className="text-[10px] font-bold text-[var(--text-muted)] mb-1">MAKS (TL)</p><input type="number" placeholder="Sınırsız" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="w-full glass-input px-2.5 py-1.5 text-xs text-[var(--foreground)]" /></div>
                </div>
              </FilterSection>
            </aside>

            {/* MAIN */}
            <main className="flex-1 min-w-0 px-4 sm:px-8 pt-6 pb-10 flex flex-col">
              {user && (
                <div className="hidden lg:flex items-center gap-2 mb-6 border-b border-[var(--card-border)]">
                  <button onClick={() => setActiveTab('search')} className={`py-3 px-6 text-sm font-bold border-b-2 transition ${activeTab === 'search' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>🔎 Arama Sonuçları</button>
                  <button onClick={() => setActiveTab('favorites')} className={`py-3 px-6 text-sm font-bold border-b-2 transition ${activeTab === 'favorites' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>★ Favorilerim ({favorites.length})</button>
                </div>
              )}

              {activeTab === 'search' ? (
                <>
                  {loading && <div className="flex flex-col gap-3">{[...Array(5)].map((_, i) => <div key={i} className="flex items-center gap-4 p-4 glass-card"><div className="w-16 h-16 animate-shimmer rounded-xl flex-shrink-0" /><div className="flex-1 space-y-2"><div className="h-3 animate-shimmer rounded w-2/3" /><div className="h-3 animate-shimmer rounded w-1/4" /></div><div className="h-5 animate-shimmer rounded w-20 flex-shrink-0" /></div>)}</div>}
                  {!loading && searched && filteredResults.length === 0 && <div className="text-center py-20 glass-card p-6 max-w-lg mx-auto my-auto"><div className="text-4xl mb-4">😕</div><h3 className="text-lg font-bold text-[var(--foreground)]">Ürün bulunamadı</h3><p className="text-sm text-[var(--text-muted)] mt-2">Farklı anahtar kelimeler girmeyi deneyin ya da filtreleri temizleyin.</p></div>}
                  {!loading && filteredResults.length > 0 && (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-[var(--text-muted)]"><span className="font-semibold text-[var(--text-primary)]">{query}</span> için {selectedStorage && <span className="text-[var(--accent)]"> · {selectedStorage}</span>}<span className="ml-1 font-bold text-[var(--text-primary)]">{filteredResults.length} sonuç</span></p>
                      </div>
                      <div className="flex flex-col gap-3.5">
                        {filteredResults.map((r, i) => {
                          const isFav = favorites.some(f => f.url === r.url)
                          return (
                            <div key={i} className="flex flex-col sm:flex-row items-center gap-4 p-4 glass-card relative w-full group">
                              <div onClick={() => handleClick(r.url)} className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-[var(--surface-2)] rounded-xl flex items-center justify-center p-1.5 cursor-pointer">
                                {r.image_url ? <img src={r.image_url} alt={r.name} className="w-full h-full object-contain rounded-lg transition group-hover:scale-105" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} /> : <span className="text-[var(--text-muted)] text-[10px] font-semibold uppercase">Görsel yok</span>}
                              </div>
                              <div onClick={() => handleClick(r.url)} className="flex-1 min-w-0 w-full cursor-pointer">
                                <h3 className="text-sm font-bold text-[var(--foreground)] leading-snug group-hover:text-[var(--accent)] transition truncate">{r.name}</h3>
                                {r.badge && <div className="mt-1"><span className="text-[9px] font-bold px-2 py-0.5 rounded-md" style={{ background: 'var(--badge-amber-bg)', color: 'var(--badge-amber-text)', border: '1px solid var(--badge-amber-border)' }}>{r.badge}</span></div>}
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SITE_COLORS[r.site] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>{r.site}</span>
                                  {r.rating && r.rating > 0 && <div className="flex items-center gap-0.5"><span className="text-yellow-500 text-xs">★</span><span className="text-[10px] font-extrabold text-[var(--text-primary)]">{r.rating}</span>{r.review_count ? <span className="text-[9px] text-[var(--text-muted)]">({r.review_count})</span> : null}</div>}
                                </div>
                              </div>
                              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto border-t sm:border-t-0 border-[var(--card-border)] pt-3 sm:pt-0 gap-2 flex-shrink-0">
                                <div className="text-left sm:text-right">
                                  <p className="text-[var(--price-color)] font-black text-lg whitespace-nowrap">{formatPrice(r.price)} TL</p>
                                  {r.original_price && r.original_price > r.price && <p className="text-xs text-[var(--text-muted)] line-through">{formatPrice(r.original_price)} TL</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={e => { e.stopPropagation(); toggleFavorite(r) }} className={`p-2 rounded-xl border transition ${isFav ? 'border-[var(--fav-border)] text-[var(--fav-text)]' : 'bg-[var(--surface-2)] border-[var(--card-border)] text-[var(--text-muted)]'}`} style={isFav ? { background: 'var(--fav-bg)' } : {}}>{isFav ? '★' : '☆'}</button>
                                  <button onClick={() => handleClick(r.url)} className="btn-primary text-xs px-3.5 py-2.5 active:scale-95">Siteye Git →</button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  {favorites.length > 0 && <div className="flex items-center gap-3 mb-4"><button onClick={() => exportFavorites('csv')} className="export-btn">📥 CSV İndir</button><button onClick={() => exportFavorites('json')} className="export-btn">📥 JSON İndir</button></div>}
                  {filteredFavorites.length === 0 ? (
                    <div className="flex flex-col items-center justify-center my-auto py-20 text-center">
                      <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-6 border" style={{ background: 'var(--fav-bg)', borderColor: 'var(--fav-border)', color: 'var(--fav-text)' }}>★</div>
                      <h2 className="text-xl font-bold text-[var(--foreground)]">Henüz favori ürününüz yok</h2>
                      <p className="text-sm text-[var(--text-muted)] max-w-sm mt-2">Beğendiğiniz ürünlerin yanındaki yıldız ikonuna tıklayarak favorilerinize ekleyebilirsiniz.</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-[var(--text-muted)] font-semibold mb-4">Toplam {filteredFavorites.length} favori ürün listeleniyor</p>
                      <div className="flex flex-col gap-3.5">
                        {filteredFavorites.map(r => (
                          <div key={r.id} className="flex flex-col sm:flex-row items-center gap-4 p-4 glass-card relative w-full group">
                            <div onClick={() => handleClick(r.url)} className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-[var(--surface-2)] rounded-xl flex items-center justify-center p-1.5 cursor-pointer">
                              {r.image_url ? <img src={r.image_url} alt={r.name} className="w-full h-full object-contain rounded-lg transition group-hover:scale-105" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} /> : <span className="text-[var(--text-muted)] text-[10px]">Görsel yok</span>}
                            </div>
                            <div onClick={() => handleClick(r.url)} className="flex-1 min-w-0 w-full cursor-pointer">
                              <h3 className="text-sm font-bold text-[var(--foreground)] leading-snug truncate group-hover:text-[var(--accent)]">{r.name}</h3>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SITE_COLORS[r.site] || 'bg-gray-100 text-gray-700'}`}>{r.site}</span>
                                <span className="text-[9px] text-[var(--text-muted)]">Eklendi: {new Date(r.created_at).toLocaleDateString('tr-TR')}</span>
                              </div>
                            </div>
                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto border-t sm:border-t-0 border-[var(--card-border)] pt-3 sm:pt-0 gap-2 flex-shrink-0">
                              <div className="text-left sm:text-right">
                                <p className="text-[var(--price-color)] font-black text-lg whitespace-nowrap">{formatPrice(r.price)} TL</p>
                                {r.original_price && r.original_price > r.price && <p className="text-xs text-[var(--text-muted)] line-through">{formatPrice(r.original_price)} TL</p>}
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={e => { e.stopPropagation(); toggleFavorite(r as any) }} className="p-2 rounded-xl border transition" style={{ background: 'var(--fav-bg)', borderColor: 'var(--fav-border)', color: 'var(--fav-text)' }} title="Favorilerden Kaldır">★</button>
                                <button onClick={() => handleClick(r.url)} className="btn-primary text-xs px-3.5 py-2.5 active:scale-95">Siteye Git →</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </main>
          </div>
        </>
      )}

      {/* ===== AUTH MODAL ===== */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-modal max-w-sm w-full overflow-hidden animate-scale-in">
            <div className="flex border-b border-[var(--card-border)] bg-[var(--surface-2)]">
              <button type="button" onClick={() => { setAuthTab('login'); setAuthError(''); setAuthSuccess('') }} className={`flex-1 py-4 text-sm font-bold transition ${authTab === 'login' || authTab === 'forgot_password' || authTab === 'verify_forgot_password' ? 'bg-[var(--surface-1)] text-[var(--accent)] border-b-2 border-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Giriş Yap</button>
              <button type="button" onClick={() => { setAuthTab('register'); setAuthError(''); setAuthSuccess('') }} className={`flex-1 py-4 text-sm font-bold transition ${authTab === 'register' || authTab === 'verify_register' ? 'bg-[var(--surface-1)] text-[var(--accent)] border-b-2 border-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Kayıt Ol</button>
            </div>
            <form onSubmit={handleAuthSubmit} className="p-6 space-y-4">
              {authError && <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200 font-medium" style={{ background: 'var(--discount-bg)', color: 'var(--discount-text)', borderColor: 'var(--discount-border)' }}>⚠️ {authError}</div>}
              {authSuccess && <div className="text-xs p-3 rounded-lg border font-medium" style={{ background: 'rgba(22,163,74,0.08)', color: 'var(--success)', borderColor: 'rgba(22,163,74,0.2)' }}>✓ {authSuccess}</div>}
              {(authTab === 'verify_register' || authTab === 'verify_forgot_password') ? (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--text-secondary)]">E-posta adresinize gönderilen 6 haneli doğrulama kodunu girin.</p>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Doğrulama Kodu</label>
                    <input type="text" required placeholder="000000" maxLength={6} value={inputCode} onChange={e => setInputCode(e.target.value)} className="w-full glass-input px-3.5 py-2.5 text-center tracking-[1em] font-bold text-2xl text-[var(--foreground)]" />
                  </div>
                </div>
              ) : (
                <>
                  {authTab === 'register' && <div className="space-y-1"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Ad Soyad</label><input type="text" required placeholder="Adınızı ve soyadınızı girin..." value={authFullName} onChange={e => setAuthFullName(e.target.value)} className="w-full glass-input px-3.5 py-2.5 text-sm text-[var(--foreground)]" /></div>}
                  <div className="space-y-1"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">E-Posta Adresi</label><input type="email" required placeholder="örnek@eposta.com" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full glass-input px-3.5 py-2.5 text-sm text-[var(--foreground)]" /></div>
                  {(authTab === 'login' || authTab === 'register' || authTab === 'forgot_password') && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{authTab === 'forgot_password' ? 'Yeni Şifre' : 'Şifre'}</label>
                        {authTab === 'login' && <button type="button" onClick={() => { setAuthTab('forgot_password'); setAuthError(''); setAuthSuccess('') }} className="text-[10px] font-bold text-[var(--accent)] hover:text-[var(--accent-light)]">Şifremi Unuttum</button>}
                        {authTab === 'forgot_password' && <button type="button" onClick={() => { setAuthTab('login'); setAuthError(''); setAuthSuccess('') }} className="text-[10px] font-bold text-[var(--accent)] hover:text-[var(--accent-light)]">Girişe Dön</button>}
                      </div>
                      <div className="relative">
                        <input type={showPassword ? "text" : "password"} required placeholder="••••••••" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full glass-input px-3.5 py-2.5 pr-10 text-sm text-[var(--foreground)]" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--foreground)]" tabIndex={-1}>{showPassword ? '👁️' : '👁️‍🗨️'}</button>
                      </div>
                      {(authTab === 'register' || authTab === 'forgot_password') && <p className="text-[10px] text-[var(--text-muted)]">Şifre en az 6 karakter olmalıdır.</p>}
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAuthModal(false)} className="btn-ghost text-xs">İptal</button>
                <button type="submit" disabled={authLoading} className="btn-primary text-xs disabled:opacity-50">{authLoading ? 'Bekleyin...' : authTab === 'verify_register' || authTab === 'verify_forgot_password' ? 'Doğrula' : authTab === 'forgot_password' ? 'Şifreyi Sıfırla' : authTab === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}