/**
 * Kamera ve poz modeli: ön kamerayı açar, her kareyi cihazda MediaPipe Pose ile işler,
 * şınavları sayar. Görüntü <video> öğesinden başka hiçbir yere gitmez; ağa yalnızca
 * model ve wasm dosyaları (uygulamanın kendi sunucusundan) bir kez indirilir.
 */
import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  FEEDBACK_TEXT,
  MAX_TILT_DEG,
  STRAIGHT_DEG,
  initPush,
  readPose,
  stepPush,
  type Feedback,
  type Pose,
  type PushState,
} from '../lib/pushup'
import { t } from '../lib/i18n'

function cameraError(e: unknown): string {
  const name = e instanceof Error ? e.name : ''
  const msg = e instanceof Error ? e.message : ''
  if (msg === 'insecure')
    return t('Kamera yalnızca güvenli bağlantıda (https ya da localhost) açılır. Uygulamayı https adresinden aç.')
  if (name === 'NotAllowedError')
    return t('Kamera izni verilmedi. Tarayıcının site ayarlarından kameraya izin verip tekrar dene.')
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return t('Ön kamera bulunamadı.')
  if (name === 'NotReadableError') return t('Kamera başka bir uygulamada açık. Onu kapatıp tekrar dene.')
  return t('Kamera ya da poz modeli açılamadı. Sayfayı yenileyip tekrar dene.')
}

/** Seçilen yanın iskeletini çizer: kol ve gövde çizgisi. */
function draw(c: HTMLCanvasElement | null, v: HTMLVideoElement, pose: Pose | null, fb: Feedback) {
  if (!c) return
  if (c.width !== v.videoWidth || c.height !== v.videoHeight) {
    c.width = v.videoWidth
    c.height = v.videoHeight
  }
  const g = c.getContext('2d')
  if (!g) return
  g.clearRect(0, 0, c.width, c.height)
  if (!pose) return
  const [sh, el, wr, hip, leg] = pose.points.map((p) => [p.x * c.width, p.y * c.height] as const)
  const color = fb === 'ok' ? '#22c55e' : '#ff7a1f'
  g.lineWidth = Math.max(4, c.width / 110)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.strokeStyle = color
  g.beginPath()
  g.moveTo(...wr)
  g.lineTo(...el)
  g.lineTo(...sh)
  g.lineTo(...hip)
  g.lineTo(...leg)
  g.stroke()
  g.fillStyle = '#fff'
  for (const p of [sh, el, wr, hip, leg]) {
    g.beginPath()
    g.arc(p[0], p[1], g.lineWidth * 0.9, 0, Math.PI * 2)
    g.fill()
  }
}

export function PushCam({
  counting,
  onReps,
  onReady,
  children,
}: {
  /** true iken tekrar sayılır; false→true geçişinde sayaç sıfırlanır. */
  counting: boolean
  onReps: (n: number) => void
  onReady?: (ready: boolean) => void
  /** Görüntünün üstüne binen sayaç, süre, geri sayım. */
  children?: ReactNode
}) {
  const video = useRef<HTMLVideoElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState<Feedback>('nobody')

  const push = useRef<PushState>(initPush())
  const countingRef = useRef(counting)
  const onRepsRef = useRef(onReps)
  const onReadyRef = useRef(onReady)
  useEffect(() => {
    onRepsRef.current = onReps
    onReadyRef.current = onReady
  })
  useEffect(() => {
    countingRef.current = counting
    if (counting) push.current = initPush()
  }, [counting])

  useEffect(() => {
    let stop = false
    let raf = 0
    let stream: MediaStream | null = null
    let lm: PoseLandmarker | null = null
    let lastTime = -1
    let lastFb: Feedback | null = null
    let lastReps = 0

    void (async () => {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
          throw new Error('insecure')
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        if (stop) return
        const v = video.current!
        v.srcObject = stream
        await v.play()

        // Model kodu ayrı parçada: uygulamanın geri kalanını ağırlaştırmaz.
        const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision')
        const files = await FilesetResolver.forVisionTasks(new URL('mediapipe', document.baseURI).href)
        const opts = (delegate: 'GPU' | 'CPU') => ({
          baseOptions: {
            modelAssetPath: new URL('models/pose_landmarker_lite.task', document.baseURI).href,
            delegate,
          },
          runningMode: 'VIDEO' as const,
          numPoses: 1,
        })
        try {
          lm = await PoseLandmarker.createFromOptions(files, opts('GPU'))
        } catch {
          lm = await PoseLandmarker.createFromOptions(files, opts('CPU'))
        }
        if (stop) {
          lm.close()
          return
        }
        setStatus('ready')
        onReadyRef.current?.(true)

        const loop = () => {
          if (stop) return
          raf = requestAnimationFrame(loop)
          if (!lm || v.readyState < 2 || v.currentTime === lastTime) return
          lastTime = v.currentTime
          const res = lm.detectForVideo(v, performance.now())
          const pts = res.landmarks[0]
          const pose = pts ? readPose(pts, v.videoWidth / v.videoHeight) : null
          let fb: Feedback
          if (countingRef.current) {
            push.current = stepPush(push.current, pose)
            fb = push.current.feedback
            if (push.current.reps !== lastReps) {
              lastReps = push.current.reps
              onRepsRef.current(lastReps)
            }
          } else {
            // Sayım başlamadan yalnızca konum rehberliği.
            fb = !pose
              ? 'nobody'
              : pose.tilt > MAX_TILT_DEG
                ? 'position'
                : pose.body < STRAIGHT_DEG
                  ? 'straight'
                  : 'ok'
            lastReps = 0
          }
          if (fb !== lastFb) {
            lastFb = fb
            setFeedback(fb)
          }
          draw(canvas.current, v, pose, fb)
        }
        loop()
      } catch (e) {
        if (stop) return
        setStatus('error')
        setError(cameraError(e))
        onReadyRef.current?.(false)
      }
    })()

    return () => {
      stop = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((track) => track.stop())
      lm?.close()
    }
  }, [])

  return (
    <div className="pcam">
      <video ref={video} playsInline muted autoPlay aria-hidden="true" />
      <canvas ref={canvas} aria-hidden="true" />
      {status === 'loading' && (
        <div className="pcam__msg" role="status">
          {t('Kamera ve poz modeli açılıyor…')}
        </div>
      )}
      {status === 'error' && (
        <div className="pcam__msg" role="alert">
          {error}
        </div>
      )}
      {status === 'ready' && (
        <div className="pcam__fb" data-ok={feedback === 'ok'} aria-live="polite">
          {FEEDBACK_TEXT[feedback]}
        </div>
      )}
      {children}
    </div>
  )
}
