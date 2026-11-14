/**
 * Çalışılan bölgeleri gösteren vücut haritası: ön ve arka silüet, her bölge çalışma
 * yoğunluğuna göre soluk griden vurgu rengine ("kor") doğru boyanır. Yoğunluk, grup
 * hacminin o dönemdeki en yüksek gruba oranıdır (0–1). Trends ekranı besler.
 */

/** LOAD_GROUPS kimliği → 0..1 yoğunluk. */
export type BodyLoad = Record<string, number>

/** Bölgeyi yoğunluğa göre doldurur: 0 → nötr, 1 → vurgu. */
function fill(intensity: number | undefined): string {
  const i = Math.max(0, Math.min(1, intensity ?? 0))
  if (i <= 0.001) return 'var(--raised)'
  const pct = Math.round(18 + i * 72)
  return `color-mix(in srgb, var(--accent) ${pct}%, var(--control))`
}

// Basit ama tanınır bir insan silüeti; her <path> bir LOAD_GROUPS grubuna karşılık gelir.
// viewBox 0 0 120 220. Baş/boyun nötr; kollar-bacaklar iki yana simetrik.
function Figure({ load, back }: { load: BodyLoad; back: boolean }) {
  const st = { stroke: 'var(--ground)', strokeWidth: 1.5, strokeLinejoin: 'round' as const }
  const torso = back ? 'back' : 'chest'
  return (
    <svg viewBox="0 0 120 220" width="100%" height="100%" aria-hidden="true">
      {/* Baş + boyun (nötr) */}
      <circle cx="60" cy="18" r="12" fill="var(--raised)" {...st} />
      <rect x="54" y="28" width="12" height="8" rx="3" fill="var(--raised)" {...st} />
      {/* Omuz / trapez */}
      <path d="M34 40 Q60 30 86 40 L82 54 Q60 46 38 54 Z" fill={fill(load.shoulders)} {...st} />
      {/* Gövde: önde göğüs+karın, arkada sırt */}
      <path d="M40 52 Q60 48 80 52 L78 96 Q60 102 42 96 Z" fill={fill(load[torso])} {...st} />
      {/* Karın / bel: önde karın, arkada bel de sırt grubuna girer */}
      <path
        d="M44 96 Q60 102 76 96 L74 124 Q60 130 46 124 Z"
        fill={fill(back ? load.back : load.core)}
        {...st}
      />
      {/* Kollar (üst kol) */}
      <path d="M30 44 Q24 46 24 60 L28 92 L36 90 L34 52 Z" fill={fill(load.arms)} {...st} />
      <path d="M90 44 Q96 46 96 60 L92 92 L84 90 L86 52 Z" fill={fill(load.arms)} {...st} />
      {/* Ön kol */}
      <path d="M26 92 L24 122 L31 122 L36 92 Z" fill={fill(load.arms)} {...st} />
      <path d="M94 92 L96 122 L89 122 L84 92 Z" fill={fill(load.arms)} {...st} />
      {/* Üst bacak (uyluk) */}
      <path d="M44 126 L42 168 L54 168 L58 128 Z" fill={fill(load.legs)} {...st} />
      <path d="M76 126 L78 168 L66 168 L62 128 Z" fill={fill(load.legs)} {...st} />
      {/* Alt bacak (baldır) — bacak grubuna dahil */}
      <path d="M44 170 L46 206 L54 206 L54 170 Z" fill={fill(load.legs)} {...st} />
      <path d="M76 170 L74 206 L66 206 L66 170 Z" fill={fill(load.legs)} {...st} />
    </svg>
  )
}

export function BodyMap({ load }: { load: BodyLoad }) {
  return (
    <div className="bodymap">
      <div className="bodymap__fig">
        <Figure load={load} back={false} />
      </div>
      <div className="bodymap__fig">
        <Figure load={load} back={true} />
      </div>
    </div>
  )
}
