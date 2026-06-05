<p align="center">
  <h1 align="center">🔍 SmartScan Automator</h1>
  <p align="center">
    <strong>Türkiye'nin En Kapsamlı Akıllı Fiyat Karşılaştırma Platformu</strong>
  </p>
  <p align="center">
    7 büyük e-ticaret sitesinden anlık fiyat tarama · Akıllı filtreleme · Üyelik sistemi · Favoriler · Fiyat alarmları
  </p>
</p>

---

## 📋 İçindekiler

- [Proje Hakkında](#-proje-hakkında)
- [Özellikler](#-özellikler)
- [Mimari & Teknoloji Yığını](#-mimari--teknoloji-yığını)
- [Proje Yapısı](#-proje-yapısı)
- [Kurulum](#-kurulum)
- [API Referansı](#-api-referansı)
- [Desteklenen Siteler](#-desteklenen-siteler)
- [Ekran Görüntüleri](#-ekran-görüntüleri)
- [Ekip & Katkılar](#-ekip--katkılar)
- [Lisans](#-lisans)

---

## 🎯 Proje Hakkında

**SmartScan Automator**, kullanıcıların tek bir arama çubuğundan Türkiye'deki 7 büyük e-ticaret platformunda eş zamanlı ürün araması yapmasını sağlayan, modern ve tam özellikli bir fiyat karşılaştırma web uygulamasıdır.

Proje, açık kaynak bir temel üzerine inşa edilmiş olup, ekibimiz tarafından **performans optimizasyonu, kullanıcı deneyimi, güvenlik altyapısı ve özellik zenginliği** açısından kapsamlı biçimde geliştirilmiştir.

### Temel Hedefler
- 🚀 **Hız:** Saniyeler içinde 7 siteden yüzlerce ürün sonucu
- 🎨 **Modern Arayüz:** Responsive, kullanıcı dostu, mobil uyumlu tasarım
- 🔒 **Güvenlik:** JWT kimlik doğrulama, rate limiting, güvenlik header'ları
- 📊 **Akıllı Analiz:** Otomatik kategori algılama, sıralama, filtreleme

---

## ✨ Özellikler

### 🔍 Akıllı Arama Motoru
- **7 e-ticaret sitesinde** eş zamanlı, paralel arama (`asyncio.gather`)
- **Akıllı Kategori Algılama:** Giyim ürünleri arandığında teknoloji siteleri (MediaMarkt, Vatan, Teknosa) otomatik devre dışı
- **In-Memory Cache:** 5 dakikalık önbellekleme ile filtre değişikliklerinde anında (< 1ms) sonuç
- **Çift Motorlu Scraping:** Hız gerektiren siteler için `curl_cffi`, güçlü güvenlik duvarı olan siteler için `Playwright`

### 🎛️ Gelişmiş Filtreleme & Sıralama
- **Site bazlı filtreleme** (checkbox ile çoklu seçim)
- **Sıralama seçenekleri:** Popülerlik, En Düşük/Yüksek Fiyat, En Yüksek Puan
- **Fiyat aralığı:** Min/Max TL girişi
- **Depolama kapasitesi** filtresi (64GB – 1TB)
- **Otomatik tetikleme:** Filtre değişikliklerinde anında yeniden arama

### 👤 Üyelik & Kimlik Doğrulama Sistemi
- JWT tabanlı güvenli kayıt ve giriş
- **E-posta doğrulama** (6 haneli kod, EmailJS entegrasyonu)
- **Şifremi unuttum** akışı (kod gönder → doğrula → yeni şifre belirle)
- Bcrypt ile şifre hashleme
- Oturum yönetimi (localStorage + otomatik token yükleme)

### ⭐ Favoriler Sistemi
- Ürün kartlarında tek tıkla favori ekleme/çıkarma
- Ayrı "Favorilerim" sekmesi ile kolay erişim
- Favoriler üzerinde arama, fiyat ve site bazlı filtreleme
- Eklenme tarihi gösterimi

### 🏷️ Satıcı Rozetleri (Badge)
- **Kargo bilgisi:** "ÜCRETSİZ KARGO"
- **Satıcı bilgisi:** "Satıcı: Tekramarket" (3. parti distribütör ayrımı)
- **Kampanya etiketleri:** "Kuponlu Ürün", "SEPETTE İNDİRİM"

### ⭐ Puan & Değerlendirme Sistemi
- Ürün yıldız puanı (1-5)
- Değerlendirme sayısı gösterimi
- Puana göre sıralama desteği

### 📊 Analitik Dashboard
- Kişisel arama istatistikleri (günlük, haftalık, aylık)
- Favori site dağılım yüzdeleri
- Toplam tasarruf tahmini
- Platform geneli global istatistikler

### 🔔 Bildirim Sistemi
- Uygulama içi bildirimler (okundu/okunmadı yönetimi)
- Fiyat alarmları (hedef fiyat belirleme, otomatik tetikleme)
- Arama geçmişi kaydı

### 🛡️ Güvenlik Altyapısı
- Rate Limiting (IP bazlı istek sınırlama)
- Güvenlik Header'ları (XSS, Clickjacking, MIME koruması)
- Request Loglama ve izleme
- Sistem sağlık kontrol endpoint'leri

---

## 🏗️ Mimari & Teknoloji Yığını

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js)                │
│  React 19 · TypeScript · Tailwind CSS · EmailJS     │
│  Responsive UI · Auth Modal · Favoriler · Filtreler │
└───────────────────────┬─────────────────────────────┘
                        │ REST API (JSON)
┌───────────────────────▼─────────────────────────────┐
│                  BACKEND (FastAPI)                   │
│  Python 3.12 · Async/Await · Pydantic · JWT Auth    │
│  Rate Limiting · Security Headers · Logging         │
├─────────────────────────────────────────────────────┤
│              SCRAPING ENGINE (Hibrit)                │
│  curl_cffi (Hızlı)  ·  Playwright (Güçlü)          │
│  BeautifulSoup4 · lxml · In-Memory Cache            │
├─────────────────────────────────────────────────────┤
│              VERİTABANI (PostgreSQL)                 │
│  SQLAlchemy 2.0 (Async) · Alembic Migrations        │
│  Users · Favorites · PriceAlerts · SearchHistory    │
└─────────────────────────────────────────────────────┘
```

### Kullanılan Teknolojiler

| Katman | Teknoloji | Versiyon |
|--------|-----------|----------|
| **Frontend** | Next.js (React) | 15.x |
| **Frontend** | TypeScript | 5.x |
| **Frontend** | Tailwind CSS | 4.x |
| **Frontend** | EmailJS | 4.x |
| **Backend** | Python | 3.12 |
| **Backend** | FastAPI | 0.110.0 |
| **Backend** | Uvicorn | 0.27.0 |
| **Veritabanı** | PostgreSQL | 16 |
| **ORM** | SQLAlchemy (Async) | 2.0.25 |
| **Migration** | Alembic | 1.13.1 |
| **Scraping** | curl_cffi | 0.7.4 |
| **Scraping** | Playwright | 1.42.0 |
| **Scraping** | BeautifulSoup4 | 4.12.3 |
| **Güvenlik** | python-jose (JWT) | 3.3.0 |
| **Güvenlik** | passlib + bcrypt | 1.7.4 |
| **Container** | Docker & Docker Compose | — |

---

## 📁 Proje Yapısı

```
SmartScan-Automator/
├── backend/
│   ├── app/
│   │   ├── api/v1/                    # API Endpoint'leri
│   │   │   ├── search.py             # Ürün arama (ana motor)
│   │   │   ├── auth.py               # Kayıt, giriş, şifre sıfırlama
│   │   │   ├── favorites.py          # Favori CRUD işlemleri
│   │   │   ├── analytics.py          # Dashboard istatistikleri
│   │   │   ├── health.py             # Sistem sağlık kontrolü
│   │   │   ├── notifications.py      # Bildirim yönetimi
│   │   │   ├── price_alerts.py       # Fiyat alarmları
│   │   │   ├── profile.py            # Kullanıcı profili
│   │   │   ├── search_history.py     # Arama geçmişi
│   │   │   └── export.py             # Veri dışa aktarma
│   │   ├── core/                      # Çekirdek Modüller
│   │   │   ├── database.py           # Veritabanı bağlantısı
│   │   │   ├── security.py           # JWT & bcrypt
│   │   │   ├── middleware.py         # Rate limit, logging, security headers
│   │   │   ├── exceptions.py         # Özel hata sınıfları
│   │   │   ├── pagination.py         # Sayfalama
│   │   │   └── utils.py              # Yardımcı fonksiyonlar
│   │   ├── models/                    # Veritabanı Modelleri (SQLAlchemy)
│   │   │   ├── user.py               # Kullanıcı modeli
│   │   │   ├── favorite.py           # Favori modeli
│   │   │   ├── product.py            # Ürün modeli
│   │   │   ├── price.py              # Fiyat geçmişi modeli
│   │   │   ├── price_alert.py        # Fiyat alarmı modeli
│   │   │   ├── notification.py       # Bildirim modeli
│   │   │   └── search_history.py     # Arama geçmişi modeli
│   │   ├── scrapers/                  # Web Kazıma Botları
│   │   │   ├── base.py               # Soyut temel sınıf (ProductPrice)
│   │   │   ├── trendyol.py           # Trendyol botu (Playwright)
│   │   │   ├── hepsiburada.py        # Hepsiburada botu (curl_cffi)
│   │   │   ├── amazon_tr.py          # Amazon TR botu (Playwright)
│   │   │   ├── mediamarkt.py         # MediaMarkt botu (curl_cffi)
│   │   │   ├── vatanbilgisayar.py    # Vatan Bilgisayar botu (curl_cffi)
│   │   │   ├── teknosa.py            # Teknosa botu (curl_cffi)
│   │   │   └── n11.py                # N11 botu (curl_cffi)
│   │   ├── tasks/
│   │   │   └── price_checker.py      # Otomatik fiyat kontrol görevi
│   │   └── main.py                    # FastAPI uygulama başlatıcı
│   ├── alembic/                       # Veritabanı Migration'ları
│   ├── requirements.txt               # Python bağımlılıkları
│   ├── Dockerfile                     # Backend Docker dosyası
│   └── run.py                         # Çalıştırma betiği
├── frontend/
│   ├── app/
│   │   └── page.tsx                   # Ana sayfa bileşeni (1081 satır)
│   ├── components/
│   │   └── ui.tsx                     # Yeniden kullanılabilir UI bileşenleri
│   ├── lib/
│   │   ├── types.ts                   # TypeScript tip tanımları
│   │   ├── api-client.ts             # API istemci fonksiyonları
│   │   ├── hooks.ts                  # React custom hook'ları
│   │   └── email.ts                  # EmailJS entegrasyonu
│   └── package.json                   # Node.js bağımlılıkları
├── docker-compose.yml                 # Docker Compose yapılandırması
└── README.md                          # Bu dosya
```

---

## 🚀 Kurulum

### Ön Gereksinimler

- **Python** 3.10+
- **Node.js** 18+
- **PostgreSQL** 14+
- **Git**

### 1. Projeyi Klonlayın

```bash
git clone https://github.com/Rea-bla/Uygulama.git
cd Uygulama/SmartScan-Automator-main/SmartScan-Automator-main
```

### 2. Backend Kurulumu

```bash
cd backend

# Sanal ortam oluşturun
python -m venv venv

# Sanal ortamı aktifleştirin
# Windows:
.\venv\Scripts\Activate.ps1
# Linux/macOS:
source venv/bin/activate

# Bağımlılıkları yükleyin
pip install -r requirements.txt

# Playwright tarayıcılarını kurun (Trendyol & Amazon için gerekli)
playwright install chromium

# .env dosyasını yapılandırın
cp .env.example .env
# .env dosyasını düzenleyerek veritabanı bilgilerinizi girin

# Veritabanı migration'larını çalıştırın
alembic upgrade head

# Backend sunucusunu başlatın
python run.py
# veya
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Kurulumu

```bash
cd frontend

# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev
```

### 4. Docker ile Kurulum (Alternatif)

```bash
docker-compose up --build
```

### 5. Uygulamayı Kullanın

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Dokümantasyonu (Swagger):** http://localhost:8000/docs

---

## 📡 API Referansı

Tüm API endpoint'leri `/api/v1` prefix'i altında çalışmaktadır.

### 🔍 Arama

| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| `GET` | `/api/v1/search?q={query}&sites={sites}&limit={limit}` | Ürün arama |

**Parametreler:**
- `q` (zorunlu): Arama sorgusu
- `sites` (opsiyonel): Virgülle ayrılmış site isimleri (Örn: `Trendyol,n11`)
- `limit` (opsiyonel): Maksimum sonuç sayısı (varsayılan: 500)

### 🔐 Kimlik Doğrulama

| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| `POST` | `/api/v1/auth/register` | Yeni kullanıcı kaydı |
| `POST` | `/api/v1/auth/login` | Giriş yapma |
| `POST` | `/api/v1/auth/reset-password` | Şifre sıfırlama |
| `GET` | `/api/v1/auth/me` | Mevcut kullanıcı bilgisi |

### ⭐ Favoriler

| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| `GET` | `/api/v1/favorites` | Favorileri listeleme |
| `POST` | `/api/v1/favorites` | Favori ekleme |
| `DELETE` | `/api/v1/favorites?url={url}` | Favori kaldırma |

### 🔔 Bildirimler

| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| `GET` | `/api/v1/notifications` | Bildirimleri listeleme |
| `GET` | `/api/v1/notifications/count` | Bildirim sayıları |
| `PUT` | `/api/v1/notifications/{id}/read` | Okundu işaretleme |
| `PUT` | `/api/v1/notifications/read-all` | Tümünü okundu işaretleme |
| `DELETE` | `/api/v1/notifications/{id}` | Bildirim silme |

### 📊 Analitik

| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| `GET` | `/api/v1/analytics/dashboard` | Kişisel dashboard |
| `GET` | `/api/v1/analytics/global` | Platform istatistikleri |

### 💚 Sistem Sağlığı

| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| `GET` | `/api/v1/health` | Detaylı sistem durumu |
| `GET` | `/api/v1/health/ping` | Basit ping/pong |
| `GET` | `/api/v1/health/ready` | Hazırlık kontrolü |

---

## 🌐 Desteklenen Siteler

| Site | Scraping Yöntemi | Hız | Özellikler |
|------|------------------|-----|------------|
| 🟠 **Trendyol** | Playwright (Headless Chrome) | ~8-12 sn | Puan, yorum, badge |
| 🔵 **Hepsiburada** | curl_cffi | ~2-4 sn | Puan, yorum, badge, 2 sayfa |
| 🟡 **Amazon TR** | Playwright (Headless Chrome) | ~8-12 sn | Puan, yorum |
| 🔴 **MediaMarkt** | curl_cffi | ~1-3 sn | Satıcı rozeti, puan |
| 🟣 **Vatan Bilgisayar** | curl_cffi | ~1-3 sn | Puan, yorum |
| 🟢 **Teknosa** | curl_cffi | ~1-3 sn | Puan, yorum, badge |
| 🔷 **n11** | curl_cffi | ~1-3 sn | Puan, yorum, kargo badge |

### Scraping Motor Karşılaştırması

| Özellik | curl_cffi | Playwright |
|---------|-----------|------------|
| **Hız** | ⚡ Çok hızlı (1-3 sn) | 🐢 Yavaş (8-15 sn) |
| **Kaynak Kullanımı** | 💚 Düşük (HTTP isteği) | 🔴 Yüksek (gerçek tarayıcı) |
| **Bot Algılama** | ✅ chrome120 taklidi | ✅ Gerçek tarayıcı |
| **JavaScript** | ❌ Desteklemez | ✅ Tam destek |
| **Kullanım Alanı** | Statik HTML siteleri | JS-ağırlıklı SPA'lar |

---

## 👥 Ekip & Katkılar

Bu proje, açık kaynak bir fiyat karşılaştırma altyapısı temel alınarak ekibimiz tarafından kapsamlı biçimde geliştirilmiştir. İlk commit'ten sonra yapılan tüm geliştirmeler aşağıdaki üç ekip üyesi tarafından gerçekleştirilmiştir:

---

### 🟢 Yağız Van (`skazabi`)
**Odak Alanı:** Performans Optimizasyonu, Scraping Motoru, Veri Modeli Mimarisi

**Yapılan Geliştirmeler:**

1. **Puan ve Değerlendirme Sistemi**
   - `ProductPrice` veri modeline `rating`, `review_count` ve `badge` alanları eklendi
   - Tüm scraper'lara (Trendyol, Hepsiburada, Amazon TR) yıldız puanı ve yorum sayısı çıkarma mantığı yazıldı
   - Hatalı puanların (örn: 104104) otomatik düzeltilmesi için `__post_init__` doğrulama eklendi

2. **Akıllı Kategori Algılama (Smart Routing)**
   - Giyim anahtar kelimelerini otomatik algılayan `CLOTHING_KEYWORDS` sistemi kuruldu
   - "Kazak", "pantolon" gibi aramalar yapıldığında MediaMarkt, Vatan, Teknosa otomatik devre dışı bırakılarak alakasız sonuçlar engellendi

3. **Akakçe Tarzı Sıralama Arayüzü**
   - Frontend'e popülerlik, fiyat ve puan bazlı sıralama seçenekleri eklendi
   - Site bazlı filtreleme checkbox'ları ve fiyat aralığı filtreleri entegre edildi

4. **Playwright → curl_cffi Performans Devrimi**
   - MediaMarkt, Vatan Bilgisayar, Teknosa ve n11 botları tamamen `curl_cffi` kütüphanesine geçirildi
   - `chrome120` taklidi ile bot algılama aşılarak gerçek tarayıcı ihtiyacı ortadan kaldırıldı
   - **Arama süresi 15-20 saniyeden 1-3 saniyeye düşürüldü** (5-10x hız artışı)

5. **Satıcı Rozeti (Badge) Entegrasyonu**
   - Her siteden "ÜCRETSİZ KARGO", "Satıcı: XYZ" gibi kampanya ve satıcı bilgileri çekildi
   - Frontend'te ürün kartlarında rozetler görsel olarak gösterilmeye başlandı

6. **In-Memory Cache (Önbellekleme) Sistemi**
   - 5 dakikalık RAM tabanlı cache sistemi yazıldı
   - Filtre değişikliklerinde siteler tekrar taranmıyor, önbellekten anında (< 1ms) yanıt veriliyor

7. **Kritik Bug Fix'ler**
   - **N11:** Yeni HTML yapısına (ürün kartı = link) uyum, deduplication hatası çözümü
   - **Trendyol:** İndirimli + normal fiyat seçicileri genişletilerek 16 üründen 80'e çıkarıldı

---

### 🔵 Canberk Gür (`cnbrkgr53-debug`)
**Odak Alanı:** Full-Stack Mimari, Üyelik Sistemi, Güvenlik Altyapısı

**Yapılan Geliştirmeler:**

1. **Tam Üyelik ve Kimlik Doğrulama Sistemi**
   - JWT tabanlı kayıt (`/auth/register`), giriş (`/auth/login`), şifre sıfırlama (`/auth/reset-password`) API endpoint'leri
   - `User` modeli: UUID, email, hashed_password, full_name, avatar, telefon, bio, tercih edilen siteler, tema, dil ve daha fazlası
   - bcrypt ile güvenli şifre hashleme, HS256 algoritmalı JWT token üretimi (7 gün geçerlilik)

2. **Favori Sistemi (Full CRUD)**
   - Favori ekleme, listeleme, kaldırma API endpoint'leri
   - Aynı URL'nin tekrar eklenmesini engelleyen idempotent yapı
   - Frontend'te yıldız butonu ile anlık favori ekleme/çıkarma ve ayrı "Favorilerim" sekmesi

3. **Analitik Dashboard**
   - Kişisel dashboard: Günlük/haftalık/aylık arama sayıları, favori site dağılımları, son aktiviteler
   - Global istatistikler: Toplam kullanıcı, günlük arama, favori, aktif alarm sayıları
   - Toplam tasarruf tahmini hesaplama

4. **Bildirim Sistemi**
   - Uygulama içi bildirimler (CRUD), okundu/okunmadı yönetimi, bildirim sayaçları
   - Programatik bildirim oluşturma fonksiyonu

5. **Fiyat Alarmı ve Arama Geçmişi**
   - Fiyat alarmı CRUD endpoint'leri, hedef fiyat belirleme, otomatik tetikleme
   - Arama geçmişi kaydı ve listeleme

6. **Güvenlik Katmanları**
   - `RateLimitMiddleware`: IP bazlı istek sınırlama (60 istek/dk), `Retry-After` header'ı
   - `SecurityHeadersMiddleware`: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
   - `RequestLoggingMiddleware`: Her istek için süre ölçümü, `X-Request-ID` izleme

7. **Frontend Modernizasyonu**
   - 1081 satırlık kapsamlı ana sayfa bileşeni (page.tsx)
   - Yeniden kullanılabilir UI bileşen kütüphanesi (ui.tsx): Toast, StatCard, EmptyState, ConfirmDialog, Tabs, Skeleton
   - TypeScript tip tanımları (types.ts): Tüm veri modelleri, yardımcı fonksiyonlar, site renk kodları
   - API istemci kütüphanesi (api-client.ts) ve React custom hook'ları (hooks.ts)

8. **Veritabanı Altyapısı**
   - `users`, `favorites`, `notifications`, `price_alerts`, `search_history` tabloları
   - Alembic migration'ları ile veritabanı şema yönetimi

---

### 🟡 Hüseyinalp Yüksel (`huseynalpyuksel`)
**Odak Alanı:** E-posta Entegrasyonu, Veritabanı Genişletme, Arama UX İyileştirmeleri

**Yapılan Geliştirmeler:**

1. **EmailJS E-posta Entegrasyonu**
   - Kayıt sırasında 6 haneli doğrulama kodu gönderen `sendVerificationCode()` fonksiyonu
   - Şifre sıfırlama için `sendResetCode()` fonksiyonu
   - `generateCode()` ile 6 haneli rastgele sayısal kod üretimi (100000-999999)
   - EmailJS şablonları ile profesyonel e-posta tasarımı

2. **Veritabanı Migration'ları**
   - `notifications` tablosu: Bildirim başlığı, mesaj, tip, okundu durumu, link, ikon
   - `price_alerts` tablosu: Ürün adı, hedef fiyat, güncel fiyat, tetiklenme durumu, kontrol sayısı
   - `search_history` tablosu: Arama sorgusu, sonuç sayısı, min/max/ortalama fiyat, filtreler
   - `users` tablosuna 12 yeni alan: avatar, telefon, bio, tercih edilen siteler, tema, dil, arama sayacı, son giriş vb.

3. **Arama Optimizasyonu**
   - Arama sonuçlarının API'den daha verimli alınması için ince ayarlar
   - Frontend'te arama deneyimi iyileştirmeleri

4. **Otomatik Filtre Tetikleme (Auto-Search)**
   - Filtre değişikliklerinde otomatik olarak aramanın yeniden tetiklenmesi
   - Kullanıcının "Ara" butonuna tekrar basmasına gerek kalmadan anlık güncelleme

---

## 📊 Geliştirme İstatistikleri

| Metrik | Değer |
|--------|-------|
| **Toplam Commit** | 6 (ilk commit hariç) |
| **Eklenen Dosya** | 30+ yeni dosya |
| **Eklenen Kod** | ~6.000+ satır |
| **API Endpoint** | 10 router, 25+ endpoint |
| **Desteklenen Site** | 7 e-ticaret platformu |
| **Veritabanı Tablosu** | 7 tablo |
| **Frontend Bileşen** | 10+ yeniden kullanılabilir bileşen |

---

## 📄 Lisans

Bu proje eğitim amaçlı geliştirilmiştir.

---

<p align="center">
  <strong>SmartScan Automator</strong> — Akıllı alışverişin başlangıç noktası 🛒
</p>
