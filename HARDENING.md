# Kor — Sertleştirme (BLA / Counter-REA)

Bu proje, yayına çıkan web derlemesini (`dist/`) AI tabanlı tersine mühendislik
ajanlarına karşı sertleştirmek için [`bla-agents`](https://github.com/qybaihe/bla)
aracını **isteğe bağlı (opt-in)** kullanır.

## Önemli: varsayılan derleme değişmedi

`npm run build` ve `npm run ios:sync` **hiç dokunulmadan** kalır — normal akış
sertleştirme uygulamaz, bir şeyi bozma riski yoktur. Sertleştirme yalnızca aşağıdaki
komutları siz çalıştırınca devreye girer.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run build:hardened` | Önce normal derler, sonra `dist`'teki **yalnızca kendi JS kodumuzu** yerinde sertleştirir. |
| `npm run harden:apply` | Mevcut `dist`'e sertleştirmeyi uygular (yeniden derlemeden). |
| `npm run harden:restore` | Sertleştirmeyi geri alır, orijinal `dist` dosyalarını geri koyar. |

Ayarlar `.blarc` dosyasında: `intensity: balanced`, riskli katmanlar kapalı
(`llmDirectives`, `weaveDecoys`, `selfSeal`, `sidecarEntangle` → hepsi `false`),
deterministik `seed` (tekrarlanabilir çıktı).

## Neyi sertleştiriyor, neyi dışarıda bırakıyor

**Sertleştirilen** (yalnızca ilk-taraf kod): `assets/index-*.js`, `assets/src-*.js`,
`index.html`.

**Dışarıda bırakılan** (`.blarc` → `exclude`): `mediapipe/**`, `ocr/**`, `sw.js`,
`assets/vision_bundle-*`, tüm `**/*.wasm`.

Neden: tesseract (fotoğraftan program OCR'ı) ve MediaPipe (kamerayla şınav sayımı)
WebAssembly ikililerini ve büyük satıcı paketlerini sertleştirmek hem onları bozma
riski taşır hem de derlemeyi iki katına çıkarır (ölçüldü: tümü dahil edilince
`dist` 38 MB → 78 MB). Yalnızca kendi JS'imizi sertleştirince artış ~+1.8 MB
(uygulama paketi 748 KB → 2.5 MB) ve WASM dokunulmadan, olduğu gibi yayınlanır.

## Yayına sertleştirilmiş sürüm gönderme

```bash
npm run build:hardened      # dist artık sertleştirilmiş kendi JS'imizi tutar
npx cap sync ios            # sertleştirilmiş dist'i iOS kabuğuna kopyalar
# Xcode / CI ile IPA derle
```

Geri almak için: `npm run harden:restore` (ya da yeniden `npm run build`).

## ⚠️ Yayından önce cihazda test et

BLA kodun **yapısını** kontrol eder, **davranışını** değil. Masaüstü Chrome'da
sertleştirilmiş derlemenin açıldığı ve ana ekranların çizildiği doğrulandı (konsol
temiz). Ama IPA bu makinede (Mac olmadan) derlenip test edilemedi. İlk IPA'da şunları
bir kez dene:

- Uygulama açılıyor ve antrenman akışı çalışıyor.
- **Fotoğraftan program** (OCR) — tesseract hariç tutulduğu için etkilenmemeli.
- **Kamerayla şınav** — MediaPipe hariç tutulduğu için etkilenmemeli.

Bir şey bozulursa: `npm run harden:restore`, sonra ya daha düşük yoğunlukta
(`.blarc` → `intensity: "stealth"`) ya da bozan dosyayı `exclude`'a ekleyerek
yeniden dene.

## Notlar

- Sertleştirilmiş çıktı (`dist`) zaten `.gitignore`'da; sertleştirilmiş baytlar
  depoya commit edilmez. Her derleme yeniden sertleştirme gerektirir.
- `balanced` yoğunluk string literal'leri şifrelemez; birkaç satır okunur kalabilir.
  Daha sıkı isterseniz `maximum`/`bankrupt` vardır ama boyut ve kırılma riski artar —
  bu durumda mutlaka cihazda test edin.
- Anti-debug (Frida/CDP tespiti) ve WASM shield **bilinçli olarak kapalı**: fitness
  uygulaması için gereksiz ve yanlış-pozitif/kırılma riski taşır.
