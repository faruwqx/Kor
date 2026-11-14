# Kor

Kuvvet antrenmanı takibi ve kas grubu başına rank. Telefona kurulabilen, çevrimdışı çalışan bir web uygulaması (PWA). Veri cihazda durur; isteğe bağlı hesapla buluta yedeklenir.

## Çalıştırma

```
npm install
npm run dev        # geliştirme, http://localhost:5173
npm run build      # derleme, çıktı dist/ klasörüne
npm run preview    # derlenmiş sürüm, http://localhost:4173
npx vitest run     # testler
```

`?demo=1` ile açılırsa (örneğin `http://localhost:4173/?demo=1`) ve henüz kurulum yapılmamışsa, 14 haftalık örnek veriyle başlar. Örnek veri Profil ekranından silinir.

## Telefona kurma

`dist/` klasörü statik dosyalardan oluşur; HTTPS sunan herhangi bir yere (Netlify, Vercel, GitHub Pages, Cloudflare Pages) yüklenebilir. Telefonda adresi açıp tarayıcı menüsünden "Ana ekrana ekle" seçilir. Servis çalışanı yalnızca HTTPS veya `localhost` üzerinde çalışır; ev ağındaki `http://192.168...` adresinde uygulama açılır ama çevrimdışı çalışmaz ve kurulamaz.

## Rank nasıl hesaplanır

1. Her çalışma setinden tahmini tek tekrar maksimumu (1TM) çıkar: `kilo × (1 + tekrar / 30)`. 12 tekrarın üstü ve ısınma setleri sayılmaz.
2. 1TM vücut ağırlığına bölünür. Barfiks ve dips gibi hareketlerde yük, vücut ağırlığı artı eklenen kilodur.
3. Oran, hareketin kendi standardında 0 ile 2100 RP arasına oturur. Ölçek doğrusal değildir (`RANK_CURVE = 0,7`, `src/lib/rank.ts`): alt ve orta kademeler daha erken açılır, Kor eşiği değişmez. Standartlar `src/lib/exercises.ts` içindedir (`start` merdivenin dibi, `elite` Kor eşiği). Kadınlarda üst vücut 0,60, alt vücut 0,75 ile çarpılır.
4. Sekiz kademe vardır: Kömür, Demir, Bronz, Gümüş, Altın, Platin, Elmas, Kor. İlk yedisi üçer basamaktır, her basamak 100 RP. 2100 RP ve üstü Kor'dur.
5. Kas grubunun rank'ini o grubun en yüksek RP'li hareketi belirler. Genel rank, sıralanmış grupların ortalamasıdır ve en az dört grup ister.

Standartlar bu uygulamanın kendi tablosudur; başka kullanıcılarla karşılaştırma veya yüzdelik dilim değildir. Standardı olmayan hareketler (çoğu makine ve kullanıcının eklediği hareketler) kaydedilir ama rank'e sayılmaz.

## Yapı

- `src/lib/` — mantık: `rank.ts` (rank hesabı), `stats.ts` (hacim, rekor, seri), `store.ts` (durum ve `localStorage`), `exercises.ts` (hareket kütüphanesi), `demo.ts` (örnek veri), `cloud.ts` ve `cloud-core.ts` (hesap, yedek, Premium hakkı), `pricing.ts` (bölgesel fiyat).
- `supabase/schema.sql` — veritabanı tabloları ve güvenlik kuralları.
- `src/screens/` — ekranlar: Bugün, antrenman kaydı, Rank, kas grubu, hareket, Geçmiş, antrenman özeti, Profil, program düzenleme.
- `src/ui/` — amblem, grafikler, ortak bileşenler.
- `public/sw.js` — çevrimdışı önbellek.

Veri `localStorage` içinde `kor:v1` anahtarında tutulur. Profil ekranından JSON yedeği alınır ve geri yüklenir.

## Hesap, yedek ve Premium

Hesap katmanı Supabase üzerinde çalışır ve isteğe bağlıdır: `.env.local` içinde anahtar yoksa uygulama yalnızca cihazda çalışır, hesap bölümü görünmez.

Kurulum:

1. [supabase.com](https://supabase.com) üzerinde ücretsiz bir proje aç.
2. SQL Editor'de `supabase/schema.sql` dosyasının tamamını çalıştır.
3. `.env.example` dosyasını `.env.local` adıyla kopyala; Project Settings > API sayfasındaki proje adresini ve `anon` anahtarını yaz. `service_role` anahtarını hiçbir zaman bu dosyaya ya da koda koyma.
4. Authentication > URL Configuration: Site URL ve Redirect URLs alanlarına uygulamanın adresini ekle (geliştirmede `http://localhost:5173`).
5. Authentication > Providers:
   - **Email** varsayılan olarak açıktır.
   - **Google**: Google Cloud Console'da bir OAuth istemcisi oluştur, istemci kimliğini ve sırrını Supabase'e gir. Ücretsizdir.
   - **Apple**: Apple Developer üyeliği (yıllık 99 $) gerekir. Kurduktan sonra `.env.local` içinde `VITE_AUTH_APPLE=1` yap; o zamana kadar düğme gizlidir.

Güvenlik: tarayıcıdaki `anon` anahtarı herkese açıktır. Veriyi `schema.sql` içindeki satır düzeyi güvenlik kuralları korur: herkes yalnızca kendi satırını okur ve yazar, abonelik tablosu tarayıcıdan yazılamaz.

Eşitleme: tüm veri kullanıcı başına tek belge olarak `user_data` tablosunda durur. İki cihaz aynı anda değiştirirse kayıtlar birleştirilir; silme bilgisi taşınmadığı için bir cihazda silinen antrenman öbüründen geri gelebilir. Kurallar `src/lib/cloud-core.ts` içinde, testleriyle birlikte.

Premium: hak `subscriptions` tablosundan okunur. 7 günlük deneme `start_trial()` ile kartsız başlar. Ödeme henüz bağlı değil: `VITE_CHECKOUT_URL` boşken satın alma düğmesi bunu söyler. Ödeme sağlayıcısı bağlanınca, webhook'u `subscriptions` satırını `service_role` anahtarıyla (sunucuda) güncellemelidir.

Kilitler arayüzdedir: analiz cihazdaki veriden hesaplandığı için kararlı bir kullanıcı kilidi aşabilir. Sunucuda zorlanan şey hakkın kendisidir.

Fiyatlar `src/lib/pricing.ts` içindedir ve yalnızca gösterim içindir; aynı tablo ödeme sağlayıcısında da tanımlanmalıdır.

| Katman | Ülkeler | Aylık | Yıllık |
|---|---|---|---|
| `tr` | Türkiye | ₺99 | ₺699 |
| `high` | AB/AEA, İsviçre, Birleşik Krallık, ABD ve diğer yüksek gelirli ülkeler | 7,99 € / 6,99 £ / 7,99 $ | 49,99 € / 44,99 £ / 49,99 $ |
| `low` | Geri kalan herkes | 1,99 $ | 14,99 $ |

`low` katmanı Türkiye fiyatının dolar karşılığıdır (yaklaşık 48 TL/USD); kur belirgin değişirse güncellenmeli.

## Yapılış kareleri

`public/moves/` altındaki hareket kareleri, kamu malı (Unlicense) olan
[free-exercise-db](https://github.com/yuhonas/free-exercise-db) veri setinden alınıp küçültüldü.
Her hareket için başlangıç ve bitiş karesi var; hareket sayfasında döngü olarak oynar.
