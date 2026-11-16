/**
 * Cihaz üstünde, çevrimdışı metin tanıma (tesseract.js, WebAssembly). Dosyalar public/ocr
 * altında uygulamayla gelir; internet ya da API anahtarı gerekmez, fotoğraf cihazdan çıkmaz.
 * Kütüphane yalnızca bu özellik kullanılınca yüklenir (ana pakete girmez).
 */
import type { Worker } from 'tesseract.js'

export type OcrProgress = (p: { stage: 'load' | 'read'; progress: number }) => void

let worker: Promise<Worker> | null = null
let listener: OcrProgress | null = null

function getWorker(): Promise<Worker> {
  if (!worker) {
    const base = new URL('ocr/', document.baseURI).href
    worker = import('tesseract.js')
      .then(({ createWorker, OEM, PSM }) =>
        createWorker(['tur', 'eng'], OEM.LSTM_ONLY, {
          workerPath: base + 'worker.min.js',
          corePath: base,
          langPath: base + 'lang',
          gzip: true,
          // Capacitor/WebView'da blob işçisi yerine doğrudan dosya: aynı köken, CSP sorunu yok.
          workerBlobURL: false,
          logger: (m: { status: string; progress: number }) => {
            if (!listener) return
            const read = m.status === 'recognizing text'
            listener({ stage: read ? 'read' : 'load', progress: m.progress ?? 0 })
          },
        }).then(async (w) => {
          // Tek sütunlu liste için en iyi bölütleme: satır sırası korunur.
          await w.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN, preserve_interword_spaces: '1' })
          return w
        }),
      )
      .catch((e) => {
        worker = null
        throw e
      })
  }
  return worker
}

/** Büyük fotoğrafı küçültür ve griye çevirir: telefonda hız ve doğruluk için. */
async function prepare(file: Blob): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = () => rej(new Error('Görüntü açılamadı'))
      i.src = url
    })
    const max = 2000
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(img.naturalWidth * scale))
    c.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = c.getContext('2d')!
    ctx.filter = 'grayscale(1) contrast(1.25)'
    ctx.drawImage(img, 0, 0, c.width, c.height)
    return c
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Fotoğraftaki metni satırlarıyla döndürür. */
export async function recognizeImage(file: Blob, onProgress?: OcrProgress): Promise<string> {
  listener = onProgress ?? null
  try {
    onProgress?.({ stage: 'load', progress: 0 })
    const [w, canvas] = await Promise.all([getWorker(), prepare(file)])
    const { data } = await w.recognize(canvas)
    return data.text ?? ''
  } finally {
    listener = null
  }
}
