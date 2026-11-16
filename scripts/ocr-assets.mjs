// Fotoğraftan program (OCR) için çevrimdışı dosyaları public/ocr altına kopyalar.
// tesseract.js sürümü değişince yeniden çalıştır: `node scripts/ocr-assets.mjs`
// Çıktı depoya işlenir (public/mediapipe gibi); uygulama internetsiz çalışır.
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nm = join(root, 'node_modules')
const out = join(root, 'public', 'ocr')
mkdirSync(join(out, 'lang'), { recursive: true })

const files = [
  ['tesseract.js/dist/worker.min.js', 'worker.min.js'],
  // oem=1 (yalnızca LSTM): cihazın SIMD desteğine göre bu üçünden biri yüklenir.
  ['tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js'],
  // Küçük ve hızlı tamsayı modeller (best_int).
  ['@tesseract.js-data/tur/4.0.0_best_int/tur.traineddata.gz', 'lang/tur.traineddata.gz'],
  ['@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'lang/eng.traineddata.gz'],
]
for (const [from, to] of files) {
  copyFileSync(join(nm, from), join(out, to))
  console.log('ocr:', to)
}
