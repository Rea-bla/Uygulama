# SmartScan Automator — Geliştirme Dökümantasyonu

Bu belge, projenin orijinal halinden itibaren ekibimiz tarafından yapılan tüm geliştirmeleri kronolojik sırayla ve detaylı biçimde açıklamaktadır.

---

## 📅 Geliştirme Zaman Çizelgesi

| Tarih | Geliştirici | Commit | Özet |
|-------|-------------|--------|------|
| 30.04.2026 | Yusuf (Rea-bla) | `6b5b4ba` | Başlangıç — Temel proje yüklendi |
| 20.05.2026 | Yağız Van | `213ac27` | Puan sistemi, akıllı yönlendirme, Akakçe tarzı sıralama arayüzü |
| 21.05.2026 | Yağız Van | `8a3d9d6` | Performans devrimi (curl_cffi), rozet entegrasyonu, önbellek sistemi |
| 21.05.2026 | Yağız Van | `a422ac6` | Proje optimizasyon raporu eklendi |
| 04.06.2026 | Canberk Gür | `5da094e` | Web arayüz modernizasyonu, üyelik sistemi, favoriler entegrasyonu |
| 04.06.2026 | Hüseyinalp Yüksel | `b4659b6` | EmailJS entegrasyonu, veritabanı göçleri, arama optimizasyonu |
| 04.06.2026 | Hüseyinalp Yüksel | `6c2ac8f` | Arama filtreleri için otomatik tetikleme (auto-search) |

---

## 🔄 Başlangıç Durumu (İlk Commit — 30.04.2026)

İlk commit'te (`6b5b4ba`) mevcut bir açık kaynak fiyat karşılaştırma projesi (SmartScan-Automator) repoya yüklenmiştir. Bu temel proje aşağıdaki basit yapıyı içeriyordu:

- FastAPI tabanlı bir backend iskelet yapısı
- Temel scraper'lar (Trendyol, Hepsiburada, Amazon TR, n11, Vatan Bilgisayar, Teknosa, MediaMarkt)
- Basit bir Next.js frontend arayüzü
- Docker Compose yapılandırması
- PostgreSQL veritabanı bağlantısı

**Eksik olan özellikler:** Puan sistemi yoktu, sıralama/filtreleme yoktu, üyelik sistemi yoktu, favori özelliği yoktu, cache sistemi yoktu, güvenlik altyapısı yoktu, botlar yavaştı.

---

## 📌 Commit #1 — Puan Sistemi ve Akıllı Yönlendirme (20.05.2026)
**Geliştirici:** Yağız Van (`skazabi`)
**Commit:** `213ac27`
**Mesaj:** `feat: Rating system, Smart Routing, and Akakce-style sorting UI`

### Değiştirilen Dosyalar (7 dosya, +188 / -54 satır):
- `backend/app/scrapers/base.py`
- `backend/app/api/v1/search.py`
- `backend/app/scrapers/amazon_tr.py`
- `backend/app/scrapers/hepsiburada.py`
- `backend/app/scrapers/trendyol.py`
- `backend/app/core/database.py`
- `frontend/app/page.tsx`

### Yapılan Değişiklikler:

#### 1. Veri Modeli Genişletildi (`base.py`)
`ProductPrice` dataclass'ına üç kritik alan eklendi:
- `rating: float = 0.0` — Ürünün yıldız puanı (0-5 arası)
- `review_count: int = 0` — Kullanıcı değerlendirme sayısı
- `badge: str = ""` — Satıcı/kargo/kampanya rozeti

Hatalı puanların (örn: 104104 gibi MediaMarkt'tan gelen bozuk veriler) otomatik düzeltilmesi için `__post_init__` doğrulama metodu eklendi: puan 0-5 aralığı dışındaysa otomatik olarak 0.0'a çevriliyor.

#### 2. Akıllı Kategori Algılama (`search.py`)
`CLOTHING_KEYWORDS` listesi tanımlandı: `kazak, tişört, pantolon, etek, elbise, gömlek, ceket, mont, ayakkabı, terlik, şort, hoodie` vb.

Kullanıcı giyim ürünü aradığında, teknoloji odaklı siteler (MediaMarkt, Vatan Bilgisayar, Teknosa) otomatik olarak arama listesinden çıkarılıyor. Bu, hem alakasız sonuçları engelliyor hem de gereksiz scraping yapılmasını önlüyor.

#### 3. Puan ve Yorum Çıkarma (3 Scraper)
Trendyol, Hepsiburada ve Amazon TR scraper'larına yıldız puanı ve yorum sayısı çıkarma mantığı eklendi. Her scraper, sitenin kendine özgü HTML yapısından bu bilgileri çekecek şekilde güncellendi.

#### 4. Frontend Sıralama/Filtreleme Arayüzü (`page.tsx`)
- Sol panele `FilterSection` bileşeni eklendi (açılır/kapanır filtre grupları)
- Site bazlı filtreleme: 7 site için checkbox'lar
- Sıralama seçenekleri: Popülerlik, En Düşük Fiyat, En Yüksek Fiyat, En Yüksek Puan
- Fiyat aralığı: Min/Max TL girişi
- Depolama kapasitesi filtresi: 64GB – 1TB
- Her site için özel renk kodlaması (Trendyol=turuncu, Hepsiburada=mavi vb.)

---

## 📌 Commit #2 — Performans Devrimi ve Rozet Sistemi (21.05.2026)
**Geliştirici:** Yağız Van (`skazabi`)
**Commit:** `8a3d9d6`
**Mesaj:** `feat: Sistem optimizasyonu, rozet entegrasyonu ve dahili önbellek (in-memory cache) sistemi eklendi.`

### Değiştirilen Dosyalar (9 dosya, +309 / -251 satır):
- `backend/app/scrapers/mediamarkt.py` — Tamamen yeniden yazıldı
- `backend/app/scrapers/n11.py` — Tamamen yeniden yazıldı
- `backend/app/scrapers/teknosa.py` — Tamamen yeniden yazıldı
- `backend/app/scrapers/vatanbilgisayar.py` — Tamamen yeniden yazıldı
- `backend/app/scrapers/trendyol.py` — Bug fix
- `backend/app/scrapers/hepsiburada.py` — Badge eklendi
- `backend/app/scrapers/base.py` — Badge alanı
- `backend/app/api/v1/search.py` — Cache sistemi
- `frontend/app/page.tsx` — Badge gösterimi

### Yapılan Değişiklikler:

#### 1. Playwright → curl_cffi Geçişi (4 Scraper)
**Motivasyon:** MediaMarkt, Vatan, Teknosa ve n11 siteleri her aramada arka planda gerçek bir Chromium tarayıcı (Playwright) açıp kapatıyordu. Bu işlem her site için 15-20 saniye sürüyordu.

**Çözüm:** `curl_cffi` kütüphanesi kullanılarak `chrome120` taklidi yapan HTTP istekleri gönderildi. Siteler, gelen isteği gerçek bir Chrome tarayıcıdan geliyormuş gibi algıladı.

**Sonuç:** 4 sitenin arama süresi **15-20 saniyeden 1-3 saniyeye** düştü. Yaklaşık **5-10x hız artışı** sağlandı.

#### 2. Satıcı Rozeti (Badge) Sistemi
Tüm scraper'lara kampanya ve satıcı bilgisi çıkarma yeteneği eklendi:
- **MediaMarkt:** `a[data-test='mms-third-party-provider-link']` ile 3. parti satıcı bilgisi
- **N11:** `.badge.shipping` ile kargo bilgisi
- **Teknosa:** Kampanya etiketleri
- **Hepsiburada:** Satıcı ve kargo rozetleri

Frontend'te ürün kartlarında site isminin altında bu rozetler renkli etiketler olarak gösterilmeye başlandı.

#### 3. In-Memory Cache (Önbellekleme) Sistemi
`search.py`'ye Python dictionary tabanlı RAM önbellek sistemi eklendi:
- Her `(sorgu, site_adı)` çifti 5 dakika (300 sn) boyunca hafızada tutuluyor
- Filtre değişikliklerinde (örn: sadece Trendyol'u seçme) scraper'lar tekrar çalıştırılmıyor
- Önbellekten **< 1ms** içinde yanıt dönülüyor

#### 4. Kritik Bug Fix'ler
- **N11:** Yeni arayüzünde ürün kartı doğrudan `<a>` tag'i olduğu için eski URL çıkarma algoritması bozulmuştu. Tüm ürünlerin URL'si boş (`""`) okunuyor, deduplication filtresi hepsini aynı ürün sanıp 1 ürüne düşürüyordu. Link çıkarma mantığı yeniden yazıldı.
- **Trendyol:** Fiyat çekerken sadece indirimli fiyat seçicisi (`.prc-box-dscntd`) kullanılıyordu. Normal satış fiyatı (`.prc-box-sllng`) olan ürünler atlanıyordu. Seçiciler genişletilerek 16 üründen 80'e çıkarıldı.

---

## 📌 Commit #3 — Optimizasyon Raporu (21.05.2026)
**Geliştirici:** Yağız Van (`skazabi`)
**Commit:** `a422ac6`
**Mesaj:** `docs: Proje optimizasyon ve geliştirme raporu eklendi`

`rapor.md` dosyası oluşturularak yapılan tüm teknik iyileştirmeler belgelendi.

---

## 📌 Commit #4 — Web Arayüz Modernizasyonu ve Üyelik Sistemi (04.06.2026)
**Geliştirici:** Canberk Gür (`cnbrkgr53-debug`)
**Commit:** `5da094e`
**Mesaj:** `feat: Web arayüz modernizasyonu, üyelik sistemi ve favoriler entegrasyonu`

### Değiştirilen/Eklenen Dosyalar (32 dosya, +5110 / -163 satır):

### Bu commitin en büyük katkısı: Projeyi basit bir arama aracından tam özellikli bir web uygulamasına dönüştürmesi.

### Yapılan Değişiklikler:

#### 1. Tam Kimlik Doğrulama Sistemi (Backend)
- **`auth.py`**: JWT tabanlı kayıt, giriş, şifre sıfırlama API endpoint'leri
- **`security.py`**: bcrypt ile şifre hashleme, HS256 JWT token üretimi (7 gün geçerlilik)
- **`user.py` modeli**: UUID, email, hashed_password, full_name, avatar_url, phone, bio, preferred_sites, notification_enabled, theme_preference, language, search_count, last_login_at, is_active, is_verified, created_at, updated_at

#### 2. Favori Sistemi (`favorites.py`)
- Favori ekleme (aynı URL varsa mevcut olanı döndüren idempotent yapı)
- Favori listeleme (tarihe göre azalan sırada)
- Favori kaldırma (URL bazlı)
- `favorite.py` modeli: UUID, user_id, site, name, price, original_price, url, image_url, created_at

#### 3. Analitik Dashboard (`analytics.py`)
- Kişisel dashboard: Günlük/haftalık/aylık arama sayıları, favori site dağılım yüzdeleri, son 10 aktivite, tasarruf tahmini
- Global istatistikler: Toplam kullanıcı, günlük arama, favori, aktif alarm

#### 4. Bildirim Sistemi (`notifications.py`)
- Bildirim CRUD (oluşturma, listeleme, okundu işaretleme, silme)
- Okunmamış bildirim sayaçları
- Programatik bildirim oluşturma yardımcı fonksiyonu

#### 5. Fiyat Alarmı ve Arama Geçmişi
- **`price_alerts.py`**: Hedef fiyat belirleme, otomatik tetikleme, alarm yönetimi
- **`search_history.py`**: Arama sorgusu, sonuç sayısı, fiyat istatistikleri kaydı
- **`price_checker.py`**: Arka plan fiyat kontrol görevi

#### 6. Güvenlik Katmanları (`middleware.py`)
- **RequestLoggingMiddleware**: Her istek için süre ölçümü, `X-Process-Time` ve `X-Request-ID` header'ları
- **RateLimitMiddleware**: IP bazlı istek sınırlama (60 istek/dk), `Retry-After` header'ı
- **SecurityHeadersMiddleware**: XSS, Clickjacking, MIME koruması header'ları

#### 7. Sistem Sağlık Kontrolü (`health.py`)
- Veritabanı bağlantı durumu ve tablo sayıları
- Scraper'ların durumu
- Sistem bilgileri (Python versiyonu, platform, mimari)
- `healthy` / `degraded` durum raporlaması

#### 8. Frontend Tam Yeniden Tasarım
- **`page.tsx` (1081 satır)**: Ana sayfa bileşeni — auth modal, favori sistemi, filtreler, responsive tasarım, skeleton loading
- **`ui.tsx` (465 satır)**: Yeniden kullanılabilir bileşen kütüphanesi — Toast, StatCard, EmptyState, ConfirmDialog, LoadingSpinner, Badge, ProgressBar, Tabs, Skeleton, SearchInput
- **`types.ts` (302 satır)**: TypeScript tip tanımları, sabitler, yardımcı fonksiyonlar (formatPrice, formatDate, getTimeAgo, calculateDiscount vb.)
- **`api-client.ts` (290 satır)**: Tüm API endpoint'leri için istemci fonksiyonları
- **`hooks.ts` (255 satır)**: React custom hook'ları

#### 9. Veritabanı Tabloları
Alembic migration'ları ile `users`, `favorites` tabloları oluşturuldu.

---

## 📌 Commit #5 — EmailJS ve Veritabanı Genişletme (04.06.2026)
**Geliştirici:** Hüseyinalp Yüksel (`huseynalpyuksel`)
**Commit:** `b4659b6`
**Mesaj:** `feat: EmailJS entegrasyonu, veritabani gocleri ve arama optimizasyonu`

### Değiştirilen/Eklenen Dosyalar (9 dosya, +394 / -103 satır):

### Yapılan Değişiklikler:

#### 1. EmailJS E-posta Entegrasyonu (`email.ts`)
- **`sendVerificationCode()`**: Kayıt sırasında kullanıcıya 6 haneli doğrulama kodu e-postası gönderme
- **`sendResetCode()`**: Şifre sıfırlama kodu e-postası gönderme
- **`generateCode()`**: 6 haneli rastgele sayısal kod üretimi (100000-999999)
- EmailJS şablonları ve servis yapılandırması entegre edildi

#### 2. Kapsamlı Veritabanı Migration'ı (`f3e8b4cfead3_add_missing_fields.py`)
Üç yeni tablo oluşturuldu:
- **`notifications`**: Bildirim başlığı, mesaj, tip, okundu durumu, link, ikon
- **`price_alerts`**: Ürün adı, hedef fiyat, güncel fiyat, tetiklenme durumu, kontrol sayısı, son kontrol tarihi
- **`search_history`**: Arama sorgusu, sonuç sayısı, min/max/ortalama fiyat, uygulanan filtreler

`users` tablosuna 12 yeni alan eklendi: avatar_url, phone, bio, preferred_sites, notification_enabled, theme_preference, language, search_count, last_login_at, is_active, is_verified, updated_at

#### 3. Arama Optimizasyonu
- API arama endpoint'inde ince ayarlar ve performans iyileştirmeleri
- Frontend arama deneyiminin geliştirilmesi

---

## 📌 Commit #6 — Otomatik Filtre Tetikleme (04.06.2026)
**Geliştirici:** Hüseyinalp Yüksel (`huseynalpyuksel`)
**Commit:** `6c2ac8f`
**Mesaj:** `feat: Arama filtreleri için otomatik tetikleme (auto-search) eklendi`

### Değiştirilen Dosyalar (1 dosya, +7 satır):
- `frontend/app/page.tsx`

### Yapılan Değişiklikler:
Filtre değişikliklerinde (site seçimi, sıralama, fiyat aralığı vb.) aramanın otomatik olarak yeniden tetiklenmesi sağlandı. Kullanıcının filtreyi değiştirdikten sonra tekrar "Ara" butonuna basmasına gerek kalmıyor.

---

## 📈 Toplam Geliştirme Özeti

### Eklenen Dosya Sayıları

| Kategori | Dosya Sayısı |
|----------|-------------|
| Backend API Endpoint'leri | 10 |
| Backend Core Modülleri | 5 |
| Veritabanı Modelleri | 7 |
| Veritabanı Migration'ları | 2 |
| Frontend Sayfa/Bileşen | 5 |
| Arka Plan Görevleri | 1 |
| **Toplam yeni dosya** | **~30** |

### Kod Satır İstatistikleri

| Commit | Eklenen | Silinen | Net |
|--------|---------|---------|-----|
| `213ac27` (Yağız) | +188 | -54 | +134 |
| `8a3d9d6` (Yağız) | +309 | -251 | +58 |
| `a422ac6` (Yağız) | +25 | 0 | +25 |
| `5da094e` (Canberk) | +5110 | -163 | +4947 |
| `b4659b6` (Hüseyinalp) | +394 | -103 | +291 |
| `6c2ac8f` (Hüseyinalp) | +7 | 0 | +7 |
| **Toplam** | **+6033** | **-571** | **+5462** |

### Kişi Bazlı Katkı Dağılımı

| Geliştirici | Commit Sayısı | Net Satır | Ana Odak Alanları |
|-------------|---------------|-----------|-------------------|
| Yağız Van | 3 | +217 | Performans, scraping motoru, cache, bug fix |
| Canberk Gür | 1 | +4947 | Full-stack mimari, üyelik, güvenlik, UI |
| Hüseyinalp Yüksel | 2 | +298 | E-posta, veritabanı, UX iyileştirmeleri |

---

*Bu dökümantasyon, SmartScan Automator projesinin ekibimiz tarafından gerçekleştirilen tüm geliştirmelerini kapsamaktadır.*
