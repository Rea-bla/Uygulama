'use client'
import { useState, useEffect } from 'react'
import { sendVerificationCode, sendResetCode, generateCode } from '../lib/email'

interface Result {
  site: string
  name: string
  price: number
  original_price?: number
  url: string
  image_url: string
  rating?: number
  review_count?: number
  badge?: string
}

interface Favorite {
  id: string
  site: string
  name: string
  price: number
  original_price?: number
  url: string
  image_url?: string
  created_at: string
}

interface User {
  id: string
  email: string
  full_name?: string
}

const SITE_COLORS: Record<string, string> = {
  'Trendyol':         'bg-orange-50 text-orange-700 border-orange-200',
  'Hepsiburada':      'bg-blue-50 text-blue-700 border-blue-200',
  'Amazon TR':        'bg-yellow-50 text-yellow-800 border-yellow-200',
  'MediaMarkt':       'bg-red-50 text-red-700 border-red-200',
  'Vatan Bilgisayar': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Teknosa':          'bg-amber-50 text-amber-800 border-amber-200',
  'n11':              'bg-emerald-50 text-emerald-700 border-emerald-200'
}

const STORAGE_OPTIONS = ['64 GB', '128 GB', '256 GB', '512 GB', '1 TB']
const SITE_OPTIONS = ['Trendyol', 'Hepsiburada', 'Amazon TR', 'MediaMarkt', 'Vatan Bilgisayar', 'Teknosa', 'n11']

const SORT_OPTIONS = [
  { id: 'popularity', label: 'Popülerlik', disabled: false },
  { id: 'price_asc', label: 'En Düşük Fiyat', disabled: false },
  { id: 'price_desc', label: 'En Yüksek Fiyat', disabled: false },
  { id: 'rating', label: 'En Yüksek Puan', disabled: false },
  { id: 'newest', label: 'En Yeniler (Yakında)', disabled: true },
] as const;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function FilterSection({ title, isOpen, onToggle, children, badgeCount }: {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  badgeCount?: number
}) {
  return (
    <div className="border-b border-gray-100 py-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-2 text-left hover:text-blue-600 transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</span>
          {badgeCount !== undefined && badgeCount > 0 && (
            <span className="bg-blue-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-5 h-5 flex items-center justify-center leading-none">
              {badgeCount}
            </span>
          )}
        </div>
        <span className="text-gray-400 text-[10px]">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="pt-2 pb-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {children}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<Result[]>([])
  const [loading, setLoading]   = useState(false)
  const [searched, setSearched] = useState(false)

  // Filter States
  const [selectedStorage, setSelectedStorage] = useState<string>('')
  const [selectedSites, setSelectedSites]     = useState<string[]>([])
  const [sortOrder, setSortOrder]             = useState<string>('popularity')
  const [minPrice, setMinPrice]               = useState('')
  const [maxPrice, setMaxPrice]               = useState('')

  const [openSite, setOpenSite]       = useState(true)
  const [openSort, setOpenSort]       = useState(true)
  const [openPrice, setOpenPrice]     = useState(true)
  const [openStorage, setOpenStorage] = useState(false)

  // Mobile responsiveness helper
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Auth States
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

  // Favorites States
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [activeTab, setActiveTab] = useState<'search' | 'favorites'>('search')

  // Load token & user details on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    if (savedToken) {
      setToken(savedToken)
      fetchUser(savedToken)
      fetchFavorites(savedToken)
    }
  }, [])

  const fetchUser = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      } else {
        // Token expired or invalid
        handleLogout()
      }
    } catch (e) {
      console.error('Kullanıcı bilgisi çekilemedi:', e)
    }
  }

  const fetchFavorites = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/favorites`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setFavorites(data)
      }
    } catch (e) {
      console.error('Favoriler çekilemedi:', e)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    setFavorites([])
    setActiveTab('search')
  }

  const resetAuthModal = () => {
    setAuthEmail('')
    setAuthPassword('')
    setAuthFullName('')
    setInputCode('')
    setVerificationCode('')
    setAuthError('')
    setAuthSuccess('')
    setAuthTab('login')
    setShowPassword(false)
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthSuccess('')
    setAuthLoading(true)

    try {
      if (authTab === 'register') {
        const code = generateCode()
        setVerificationCode(code)
        await sendVerificationCode(authEmail, authFullName, code)
        setAuthTab('verify_register')
        setAuthSuccess('Doğrulama kodu e-postanıza gönderildi.')
        setAuthLoading(false)
        return
      }

      if (authTab === 'forgot_password') {
        const code = generateCode()
        setVerificationCode(code)
        await sendResetCode(authEmail, code)
        setAuthTab('verify_forgot_password')
        setAuthSuccess('Şifre sıfırlama kodu e-postanıza gönderildi.')
        setAuthLoading(false)
        return
      }

      if (authTab === 'verify_register') {
        if (inputCode !== verificationCode) {
          throw new Error('Doğrulama kodu hatalı.')
        }
        const res = await fetch(`${API_URL}/api/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPassword, full_name: authFullName })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || 'Kayıt başarısız')
        
        localStorage.setItem('token', data.access_token)
        setToken(data.access_token)
        await fetchUser(data.access_token)
        await fetchFavorites(data.access_token)
        setShowAuthModal(false)
        resetAuthModal()
      } else if (authTab === 'verify_forgot_password') {
        if (inputCode !== verificationCode) {
          throw new Error('Doğrulama kodu hatalı.')
        }
        const res = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, new_password: authPassword })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || 'Şifre sıfırlama başarısız')
        
        resetAuthModal()
        setAuthTab('login')
        setAuthSuccess('Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.')
      } else if (authTab === 'login') {
        const res = await fetch(`${API_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPassword })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || 'Giriş başarısız')
        
        localStorage.setItem('token', data.access_token)
        setToken(data.access_token)
        await fetchUser(data.access_token)
        await fetchFavorites(data.access_token)
        setShowAuthModal(false)
        resetAuthModal()
      }
    } catch (err: any) {
      setAuthError(err.message || 'Sistem bağlantı hatası')
    } finally {
      setAuthLoading(false)
    }
  }

  const toggleFavorite = async (item: Result) => {
    if (!token) {
      resetAuthModal()
      setShowAuthModal(true)
      return
    }

    const isFav = favorites.some(f => f.url === item.url)
    try {
      if (isFav) {
        // Remove favorite
        const res = await fetch(`${API_URL}/api/v1/favorites?url=${encodeURIComponent(item.url)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (res.ok) {
          setFavorites(prev => prev.filter(f => f.url !== item.url))
        }
      } else {
        // Add favorite
        const res = await fetch(`${API_URL}/api/v1/favorites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            site: item.site,
            name: item.name,
            price: item.price,
            original_price: item.original_price,
            url: item.url,
            image_url: item.image_url
          })
        })
        if (res.ok) {
          const newFav = await res.json()
          setFavorites(prev => [newFav, ...prev])
        }
      }
    } catch (e) {
      console.error('Favori kaydedilemedi/silinemedi:', e)
    }
  }

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    setResults([])
    setActiveTab('search') // Switch to search results tab automatically
    try {
      const fullQuery = selectedStorage
        ? `${query.trim()} ${selectedStorage}`
        : query.trim()
      const sitesParam = selectedSites.length > 0 ? `&sites=${encodeURIComponent(selectedSites.join(','))}` : ''
      const res = await fetch(
        `${API_URL}/api/v1/search?q=${encodeURIComponent(fullQuery)}&limit=200${sitesParam}`
      )
      if (!res.ok) {
        console.error('API hatası:', res.status)
        return
      }
      const data = await res.json()
      setResults(data?.results || [])
    } catch (e) {
      console.error('Arama hatası:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (searched && query.trim()) {
      search()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSites])

  const filteredResults = [...results].filter(r => {
    if (minPrice && r.price < parseFloat(minPrice)) return false
    if (maxPrice && r.price > parseFloat(maxPrice)) return false
    if (selectedStorage && !r.name.toLowerCase().includes(selectedStorage.toLowerCase())) return false
    return true
  })

  if (sortOrder === 'price_asc') {
    filteredResults.sort((a, b) => a.price - b.price)
  } else if (sortOrder === 'price_desc') {
    filteredResults.sort((a, b) => b.price - a.price)
  } else if (sortOrder === 'rating') {
    filteredResults.sort((a, b) => {
      const ratingDiff = (b.rating || 0) - (a.rating || 0)
      if (ratingDiff !== 0) return ratingDiff
      
      const reviewDiff = (b.review_count || 0) - (a.review_count || 0)
      if (reviewDiff !== 0) return reviewDiff
      
      return a.price - b.price
    })
  }

  // Filtered Favorites locally for search box
  const filteredFavorites = favorites.filter(fav => {
    if (query) {
      const qLower = query.toLowerCase()
      if (!fav.name.toLowerCase().includes(qLower)) return false
    }
    if (minPrice && fav.price < parseFloat(minPrice)) return false
    if (maxPrice && fav.price > parseFloat(maxPrice)) return false
    if (selectedSites.length > 0 && !selectedSites.includes(fav.site)) return false
    return true
  })

  const toggleSite = (site: string) => {
    setSelectedSites(prev =>
      prev.includes(site) ? prev.filter(s => s !== site) : [...prev, site]
    )
  }

  const handleClick = (url: string) => {
    if (!url || url.trim() === '') return
    const fullUrl = url.startsWith('http') ? url : 'https://' + url
    window.open(fullUrl, '_blank', 'noopener,noreferrer')
  }

  const formatPrice = (price: number) =>
    price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const hasActiveFilters = selectedSites.length > 0 || selectedStorage || minPrice || maxPrice

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased flex flex-col">

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/80 px-4 sm:px-6 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent whitespace-nowrap">
                SmartScan Automator
              </h1>
            </div>
            {/* Mobile login indicator */}
            <div className="md:hidden flex items-center gap-2">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="text-xs bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition font-medium"
                >
                  Çıkış
                </button>
              ) : (
                <button
                  onClick={() => { resetAuthModal(); setShowAuthModal(true); }}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium shadow-sm transition"
                >
                  Giriş
                </button>
              )}
            </div>
          </div>

          {/* SEARCH FIELD */}
          <div className="flex-1 flex gap-2 max-w-2xl w-full">
            <div className="relative flex-1">
              <input
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 pl-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-gray-900 placeholder-gray-400 bg-white transition shadow-inner"
                placeholder="Ürün adı, model numarası arayın..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
              />
              <span className="absolute left-3.5 top-3 text-gray-400 text-sm">🔍</span>
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3.5 top-2.5 text-gray-400 hover:text-gray-600 text-sm font-semibold"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              onClick={search}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 sm:px-7 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50 transition active:scale-95 whitespace-nowrap"
            >
              {loading ? 'Aranıyor...' : 'Ara'}
            </button>
          </div>

          {/* DESKTOP MEMBERSHIP BUTTONS */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-gray-400">Hoş geldiniz</p>
                  <p className="text-sm font-semibold text-gray-800">{user.full_name || user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-semibold transition active:scale-95"
                >
                  Güvenli Çıkış
                </button>
              </div>
            ) : (
              <button
                onClick={() => { resetAuthModal(); setShowAuthModal(true); }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-blue-500/10 transition active:scale-95"
              >
                Üye Girişi / Kayıt
              </button>
            )}
          </div>
          
        </div>
      </header>

      {/* MOBILE COLLAPSIBLE FILTER TOGGLE */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3.5 py-2 rounded-lg transition"
        >
          <span>⚙️</span>
          <span>{showMobileFilters ? 'Filtreleri Gizle' : 'Filtrele & Sırala'}</span>
          {hasActiveFilters && (
            <span className="bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">!</span>
          )}
        </button>
        {user && (
          <div className="flex gap-1.5">
            <button
              onClick={() => { setActiveTab('search'); setShowMobileFilters(false); }}
              className={`text-xs font-semibold px-3 py-2 rounded-lg transition ${activeTab === 'search' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Arama
            </button>
            <button
              onClick={() => { setActiveTab('favorites'); setShowMobileFilters(false); }}
              className={`text-xs font-semibold px-3 py-2 rounded-lg transition ${activeTab === 'favorites' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Favorilerim ({favorites.length})
            </button>
          </div>
        )}
      </div>

      {/* BODY WRAPPER */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row min-h-screen w-full">

        {/* SIDEBAR FILTERS */}
        <aside className={`w-full lg:w-[260px] lg:min-w-[260px] flex-shrink-0 lg:border-r border-gray-200 px-5 pt-6 bg-white lg:bg-transparent ${showMobileFilters ? 'block border-b shadow-sm lg:shadow-none' : 'hidden lg:block'}`}>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
            <p className="text-sm font-extrabold text-gray-800 tracking-wider">FİLTRELER</p>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSelectedSites([])
                  setSelectedStorage('')
                  setMinPrice('')
                  setMaxPrice('')
                }}
                className="text-xs text-blue-600 hover:text-blue-800 transition font-semibold"
              >
                Temizle
              </button>
            )}
          </div>

          {/* SITE OPTIONS */}
          <FilterSection
            title="SATIŞ NOKTASI"
            isOpen={openSite}
            onToggle={() => setOpenSite(p => !p)}
            badgeCount={selectedSites.length}
          >
            <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto pr-1">
              {SITE_OPTIONS.map(site => (
                <label key={site} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedSites.includes(site)}
                    onChange={() => toggleSite(site)}
                    className="accent-blue-600 w-4 h-4 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600 group-hover:text-blue-600 transition font-medium">{site}</span>
                </label>
              ))}
            </div>
          </FilterSection>

          {/* SORT OPTIONS */}
          <FilterSection
            title="SIRALAMA"
            isOpen={openSort}
            onToggle={() => setOpenSort(p => !p)}
          >
            <div className="flex flex-col gap-2.5">
              {SORT_OPTIONS.map(opt => (
                <label key={opt.id} className={`flex items-center gap-2.5 cursor-pointer group ${opt.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input
                    type="radio"
                    name="sortOrder"
                    checked={sortOrder === opt.id}
                    onChange={() => !opt.disabled && setSortOrder(opt.id)}
                    disabled={opt.disabled}
                    className="accent-blue-600 w-4 h-4 border-gray-300 focus:ring-blue-500"
                  />
                  <span className={`text-sm font-medium transition ${opt.disabled ? 'text-gray-400' : 'text-gray-600 group-hover:text-blue-600'}`}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </FilterSection>

          {/* PRICE LIMITS */}
          <FilterSection
            title="FİYAT ARALIĞI"
            isOpen={openPrice}
            onToggle={() => setOpenPrice(p => !p)}
            badgeCount={(minPrice || maxPrice) ? 1 : 0}
          >
            <div className="flex gap-2">
              <div className="flex-1">
                <p className="text-[10px] font-bold text-gray-400 mb-1">MIN (TL)</p>
                <input
                  type="number"
                  placeholder="0"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-gray-400 mb-1">MAKS (TL)</p>
                <input
                  type="number"
                  placeholder="Sınırsız"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
            </div>
          </FilterSection>


        </aside>

        {/* MAIN PANEL CONTENT */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 pt-6 pb-10 flex flex-col">

          {/* DESKTOP TABS FOR SEARCH VS FAVORITES */}
          {user && (
            <div className="hidden lg:flex items-center gap-2 mb-6 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('search')}
                className={`py-3 px-6 text-sm font-bold border-b-2 transition ${activeTab === 'search' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                🔎 Arama Sonuçları
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={`py-3 px-6 text-sm font-bold border-b-2 transition ${activeTab === 'favorites' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                ★ Favorilerim ({favorites.length})
              </button>
            </div>
          )}

          {activeTab === 'search' ? (
            <>
              {/* DEFAULT IDLE STATE */}
              {!searched && !loading && (
                <div className="flex flex-col items-center justify-center my-auto py-20 text-center">
                  <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl mb-6 shadow-sm">
                    🔍
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Akıllı Fiyat Karşılaştırma</h2>
                  <p className="text-sm text-gray-400 max-w-sm mt-2">
                    7 farklı büyük e-ticaret platformunda anında tarama yapın, en ucuz fiyatı kaçırmayın!
                  </p>
                </div>
              )}

              {/* LOADING SKELTONS */}
              {loading && (
                <div className="flex flex-col gap-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border border-gray-150 rounded-2xl animate-pulse bg-white">
                      <div className="w-16 h-16 bg-gray-150 rounded-xl flex-shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-3 bg-gray-150 rounded w-2/3" />
                        <div className="h-3 bg-gray-150 rounded w-1/4" />
                      </div>
                      <div className="h-5 bg-gray-150 rounded w-20 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}

              {/* NO RESULTS FOUND */}
              {!loading && searched && filteredResults.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-150 p-6 max-w-lg mx-auto w-full my-auto shadow-sm">
                  <div className="text-4xl mb-4">😕</div>
                  <h3 className="text-lg font-bold text-gray-700">Ürün bulunamadı</h3>
                  <p className="text-sm text-gray-400 mt-2">Farklı anahtar kelimeler girmeyi deneyin ya da filtreleri temizleyin.</p>
                </div>
              )}

              {/* SEARCH RESULTS LIST */}
              {!loading && filteredResults.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-gray-400">
                      <span className="font-semibold text-gray-600">{query}</span> için 
                      {selectedStorage && <span className="text-blue-600"> · {selectedStorage}</span>}
                      <span className="ml-1 font-bold text-gray-600">{filteredResults.length} sonuç</span> listeleniyor
                    </p>
                  </div>

                  <div className="flex flex-col gap-3.5">
                    {filteredResults.map((r, i) => {
                      const isFavorited = favorites.some(f => f.url === r.url)
                      return (
                        <div
                          key={i}
                          className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-gray-200 hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/5 transition duration-200 rounded-2xl bg-white relative w-full group"
                        >
                          {/* PRODUCT IMAGE */}
                          <div
                            onClick={() => handleClick(r.url)}
                            className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center p-1.5 cursor-pointer"
                          >
                            {r.image_url ? (
                              <img
                                src={r.image_url}
                                alt={r.name}
                                className="w-full h-full object-contain rounded-lg transition group-hover:scale-105"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                              />
                            ) : (
                              <span className="text-gray-300 text-[10px] font-semibold uppercase">Görsel yok</span>
                            )}
                          </div>

                          {/* TEXT INFO */}
                          <div
                            onClick={() => handleClick(r.url)}
                            className="flex-1 min-w-0 w-full cursor-pointer"
                          >
                            <h3 className="text-sm font-bold text-gray-800 leading-snug group-hover:text-blue-600 transition truncate max-w-full">
                              {r.name}
                            </h3>
                            
                            {r.badge && (
                              <div className="mt-1">
                                <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md shadow-sm">
                                  {r.badge}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SITE_COLORS[r.site] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                {r.site}
                              </span>
                              {r.rating && r.rating > 0 ? (
                                <div className="flex items-center gap-0.5">
                                  <span className="text-yellow-400 text-xs">★</span>
                                  <span className="text-[10px] font-extrabold text-gray-600">{r.rating}</span>
                                  {r.review_count ? <span className="text-[9px] text-gray-400">({r.review_count})</span> : null}
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {/* PRICE & ACTIONS */}
                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0 gap-2 flex-shrink-0">
                            
                            <div className="text-left sm:text-right">
                              <p className="text-blue-600 font-black text-lg whitespace-nowrap">
                                {formatPrice(r.price)} TL
                              </p>
                              {r.original_price && r.original_price > r.price && (
                                <p className="text-xs text-gray-400 line-through">
                                  {formatPrice(r.original_price)} TL
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {/* STAR FOR FAVORITING */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleFavorite(r)
                                }}
                                className={`p-2 rounded-xl border transition ${isFavorited ? 'bg-yellow-50 hover:bg-yellow-100 border-yellow-300 text-yellow-500 shadow-sm' : 'bg-gray-50 hover:bg-gray-100 border-gray-250 text-gray-400'}`}
                              >
                                {isFavorited ? '★' : '☆'}
                              </button>
                              
                              <button
                                onClick={() => handleClick(r.url)}
                                className="bg-gray-900 hover:bg-blue-600 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition active:scale-95 shadow-sm"
                              >
                                Siteye Git →
                              </button>
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
            // FAVORITES VIEW TAB
            <>
              {filteredFavorites.length === 0 ? (
                <div className="flex flex-col items-center justify-center my-auto py-20 text-center">
                  <div className="w-20 h-20 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center text-3xl mb-6 border border-yellow-200">
                    ★
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Henüz favori ürününüz yok</h2>
                  <p className="text-sm text-gray-400 max-w-sm mt-2">
                    Beğendiğiniz ürünlerin yanındaki yıldız ikonuna tıklayarak favorilerinize ekleyebilirsiniz.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-gray-400 font-semibold">
                      Toplam {filteredFavorites.length} favori ürün listeleniyor
                    </p>
                  </div>

                  <div className="flex flex-col gap-3.5">
                    {filteredFavorites.map((r) => {
                      return (
                        <div
                          key={r.id}
                          className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-gray-200 hover:border-yellow-400 hover:shadow-md transition duration-200 rounded-2xl bg-white relative w-full group"
                        >
                          {/* PRODUCT IMAGE */}
                          <div
                            onClick={() => handleClick(r.url)}
                            className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center p-1.5 cursor-pointer"
                          >
                            {r.image_url ? (
                              <img
                                src={r.image_url}
                                alt={r.name}
                                className="w-full h-full object-contain rounded-lg transition group-hover:scale-105"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                              />
                            ) : (
                              <span className="text-gray-300 text-[10px] font-semibold">Görsel yok</span>
                            )}
                          </div>

                          {/* TEXT INFO */}
                          <div
                            onClick={() => handleClick(r.url)}
                            className="flex-1 min-w-0 w-full cursor-pointer"
                          >
                            <h3 className="text-sm font-bold text-gray-800 leading-snug truncate max-w-full group-hover:text-yellow-600">
                              {r.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SITE_COLORS[r.site] || 'bg-gray-100 text-gray-700'}`}>
                                {r.site}
                              </span>
                              <span className="text-[9px] text-gray-400">
                                Eklendi: {new Date(r.created_at).toLocaleDateString('tr-TR')}
                              </span>
                            </div>
                          </div>

                          {/* PRICE & ACTIONS */}
                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0 gap-2 flex-shrink-0">
                            
                            <div className="text-left sm:text-right">
                              <p className="text-blue-600 font-black text-lg whitespace-nowrap">
                                {formatPrice(r.price)} TL
                              </p>
                              {r.original_price && r.original_price > r.price && (
                                <p className="text-xs text-gray-400 line-through">
                                  {formatPrice(r.original_price)} TL
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {/* REMOVE FROM FAVORITES */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleFavorite(r as any)
                                }}
                                className="p-2 rounded-xl border bg-yellow-50 hover:bg-red-50 hover:text-red-500 hover:border-red-200 border-yellow-300 text-yellow-500 transition shadow-sm"
                                title="Favorilerden Kaldır"
                              >
                                ★
                              </button>
                              
                              <button
                                onClick={() => handleClick(r.url)}
                                className="bg-gray-900 hover:bg-blue-600 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition active:scale-95"
                              >
                                Siteye Git →
                              </button>
                            </div>

                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </>
          )}

        </main>
      </div>

      {/* AUTH MODAL DIALOG */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Tabs header */}
            <div className="flex border-b border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={() => { setAuthTab('login'); setAuthError(''); setAuthSuccess(''); }}
                className={`flex-1 py-4 text-sm font-bold transition-all ${authTab === 'login' || authTab === 'forgot_password' || authTab === 'verify_forgot_password' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Giriş Yap
              </button>
              <button
                type="button"
                onClick={() => { setAuthTab('register'); setAuthError(''); setAuthSuccess(''); }}
                className={`flex-1 py-4 text-sm font-bold transition-all ${authTab === 'register' || authTab === 'verify_register' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Kayıt Ol
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="p-6 space-y-4">
              
              {authError && (
                <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200 font-medium">
                  ⚠️ {authError}
                </div>
              )}

              {authSuccess && (
                <div className="bg-green-50 text-green-700 text-xs p-3 rounded-lg border border-green-200 font-medium">
                  ✓ {authSuccess}
                </div>
              )}

              {(authTab === 'verify_register' || authTab === 'verify_forgot_password') ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">E-posta adresinize gönderilen 6 haneli doğrulama kodunu girin.</p>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Doğrulama Kodu</label>
                    <input
                      type="text"
                      required
                      placeholder="000000"
                      maxLength={6}
                      value={inputCode}
                      onChange={e => setInputCode(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-center tracking-[1em] font-bold text-2xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
                    />
                  </div>
                </div>
              ) : (
                <>
                  {authTab === 'register' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ad Soyad</label>
                      <input
                        type="text"
                        required
                        placeholder="Adınızı ve soyadınızı girin..."
                        value={authFullName}
                        onChange={e => setAuthFullName(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">E-Posta Adresi</label>
                    <input
                      type="email"
                      required
                      placeholder="örnek@eposta.com"
                      value={authEmail}
                      onChange={e => setAuthEmail(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
                    />
                  </div>

                  {(authTab === 'login' || authTab === 'register' || authTab === 'forgot_password') && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {authTab === 'forgot_password' ? 'Yeni Şifre' : 'Şifre'}
                        </label>
                        {authTab === 'login' && (
                          <button
                            type="button"
                            onClick={() => { setAuthTab('forgot_password'); setAuthError(''); setAuthSuccess(''); }}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition"
                          >
                            Şifremi Unuttum
                          </button>
                        )}
                        {authTab === 'forgot_password' && (
                          <button
                            type="button"
                            onClick={() => { setAuthTab('login'); setAuthError(''); setAuthSuccess(''); }}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition"
                          >
                            Girişe Dön
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="••••••••"
                          value={authPassword}
                          onChange={e => setAuthPassword(e.target.value)}
                          className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                          tabIndex={-1}
                        >
                          {showPassword ? '👁️' : '👁️‍🗨️'}
                        </button>
                      </div>
                      {(authTab === 'register' || authTab === 'forgot_password') && (
                        <p className="text-[10px] text-gray-400">Şifre en az 6 karakter olmalıdır.</p>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition shadow-md shadow-blue-500/10 disabled:opacity-50"
                >
                  {authLoading 
                    ? 'Bekleyin...' 
                    : authTab === 'verify_register' || authTab === 'verify_forgot_password' 
                      ? 'Doğrula' 
                      : authTab === 'forgot_password'
                        ? 'Şifreyi Sıfırla'
                        : authTab === 'login' 
                          ? 'Giriş Yap' 
                          : 'Kayıt Ol'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  )
}