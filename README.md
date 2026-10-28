# mustafatumuklu.com

Mustafa Tümüklü'nün kişisel sitesi. Tek sayfa, framework yok, paket kurulumu yok.
Bölümler: Hakkımda, Kariyer, Projeler, Dersler, Dosyalar.

## Klasörler

| Yol | Ne işe yarar |
|---|---|
| `index.html` | Sitenin tüm içeriği. Bölümler yorum satırlarıyla işaretli (`===== PROJELER =====` gibi). |
| `dosyalar/` | Sitede listelenecek dosyalar. Alt klasör adı kategori olur (`cv`, `projeler`, `raporlar`, `sunumlar`, `sertifikalar`...). |
| `dosyalar/aciklamalar.json` | İsteğe bağlı: dosyalara başlık, açıklama, tarih ve sıra vermek için. |
| `ayarlar.json` | Sitenin adresi (`https://mustafatumuklu.com`). Alan adı değişirse burayı düzelt. |
| `scripts/build.mjs` | Siteyi `_site/` klasörüne derler; dosya listesini, sitemap.xml ve robots.txt'yi üretir. |
| `fontlar/`, `favicon.svg`, `og-gorsel.png` | Yazı tipi, sekme simgesi ve LinkedIn/WhatsApp paylaşım görseli. |
| `_headers` | Cloudflare için önbellek ayarları (hız için). |
| `404.html` | Yanlış adrese girilince açılan sayfa. |

## 1. Siteyi yayına alma (bir kerelik, yaklaşık 20 dakika)

### a) Kodu GitHub'a koy
1. github.com'da sağ üstten **New repository**. Ad: `kisisel-site`, **Public** seç, oluştur.
2. Açılan sayfada **uploading an existing file** bağlantısına tıkla.
3. Bu klasörün **içindekileri** (index.html, dosyalar, fontlar, scripts... hepsini) sürükleyip bırak, **Commit changes**.

### b) Alan adını al
1. cloudflare.com'da ücretsiz hesap aç.
2. Sol menüden **Domain Registration → Register Domains**, `mustafatumuklu.com` yazıp ara.
3. Boştaysa satın al. (Türkçe karakterli `mustafatümüklü.com` yerine bunu öneririm: herkes yazabilir, e-postada bozulmaz.)
   Doluysa `mustafatumuklu.dev` veya `mtumuklu.com` gibi bir alternatif seç ve `ayarlar.json` dosyasını güncelle.

### c) Siteyi Cloudflare Pages'te yayınla
1. Cloudflare'de **Workers & Pages → Create → Pages → Connect to Git**, GitHub hesabını bağla, `kisisel-site` reposunu seç.
2. Ayarlar:
   - Framework preset: **None**
   - Build command: `node scripts/build.mjs`
   - Build output directory: `_site`
3. **Save and Deploy**. Bir dakika içinde site `kisisel-site.pages.dev` gibi bir adreste açılır.
4. Proje sayfasında **Custom domains → Set up a custom domain**, `mustafatumuklu.com` yaz. Alan adı Cloudflare'de olduğu için DNS kendiliğinden ayarlanır. Aynı şeyi `www.mustafatumuklu.com` için de yap.

Menü adları Cloudflare arayüzünde zamanla biraz değişebilir; adımlar aynı kalır.

## 2. Dosya yükleme (her seferinde 1 dakika)

1. GitHub'da `kisisel-site` reposunda `dosyalar` klasörüne, sonra kategori klasörüne gir (ör. `projeler`).
2. **Add file → Upload files**, dosyayı sürükle, **Commit changes**.
3. 1–2 dakika sonra dosya sitede "Dosyalar" bölümünde çıkar. Başka bir şey yapmana gerek yok.

- **Her tür dosya olur:** PDF, Word, PowerPoint, zip, MATLAB (.m), resim... Resimlerin küçük önizlemesi gösterilir.
- **Yeni kategori:** yüklerken yeni bir klasör adı kullan (ör. `yarisma-belgeleri`). Klasör adı başlık olarak görünür.
- **Telefondan:** tarayıcıda github.com'u aç, aynı adımları izle.
- **Boyut sınırı:** GitHub web arayüzü dosya başına 25 MB kabul eder. Daha büyük videoları YouTube veya Drive'a koyup bağlantısını ekle.
- **Silmek için:** dosyayı GitHub'da aç, çöp kutusu simgesi, **Commit changes**.
- **Dikkat:** `dosyalar/` içindeki her şey herkese açıktır. Kimlik, öğrenci numarası, transkript gibi kişisel bilgiler içeren dosyaları koymadan önce iki kez düşün.

### Dosyaya başlık ve açıklama vermek (isteğe bağlı)
Normalde dosya adı düzeltilip başlık yapılır (`bitirme_ara_rapor.pdf` → "Bitirme ara rapor").
Özel başlık istersen `dosyalar/aciklamalar.json` dosyasına ekle:

```json
{
  "raporlar/bitirme_ara_rapor.pdf": {
    "baslik": "Bitirme projesi ara raporu",
    "aciklama": "DRM alıcı, RF ön uç tasarımı",
    "tarih": "2026-12-15",
    "sira": 1
  }
}
```

`sira` küçük olan üstte görünür. `tarih` verilmezse dosyanın GitHub'a yüklendiği tarih kullanılır.

## 3. İçeriği güncelleme

`index.html` dosyasını GitHub'da aç, kalem simgesine tıkla, değiştir, **Commit changes**.
Örnekler:
- Yeni proje: `<article class="proje">` bloğunu kopyalayıp altına yapıştır, metni değiştir.
- Durum etiketi: `<span class="durum">Devam ediyor</span>` → bitince `<span class="durum bitti">Tamamlandı</span>`.
- DRM projesindeki yol haritasında şu anki adımı değiştirmek için `class="su-an" aria-current="step"` kısmını ilgili `<li>`'ye taşı.
- CV'yi güncellerken yeni PDF'i aynı adla (`Mustafa_Tumuklu_CV.pdf`) yükle; butonlar otomatik yenisini indirir.

## 4. Bilgisayarda önizleme (isteğe bağlı)

Node.js kuruluysa:

```
node scripts/build.mjs
cd _site && python -m http.server 8000
```

Sonra tarayıcıda `http://localhost:8000` adresini aç.
