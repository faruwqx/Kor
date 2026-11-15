/**
 * Uygulamanın çizgi stiline uyan sade bir yüz: deri, saç, gözler, kaşlar ve hafif
 * gülümseme. Hem profil avatarı (fotoğraf yoksa) hem de vücut haritasının ön başında
 * kullanılır. FaceGlyph 0..40 kutusunda çizer; Face onu bir <svg>'ye sarar.
 */
import type { FaceConfig } from '../lib/types'

export const SKINS: { id: string; color: string }[] = [
  { id: 'light', color: '#f1c9a5' },
  { id: 'tan', color: '#e0a878' },
  { id: 'brown', color: '#a9714b' },
  { id: 'deep', color: '#6b4530' },
]
export const HAIR_COLORS: { id: string; color: string }[] = [
  { id: 'black', color: '#1c1917' },
  { id: 'brown', color: '#6b4423' },
  { id: 'blonde', color: '#d6a94a' },
  { id: 'red', color: '#a23b1e' },
  { id: 'gray', color: '#9ca3af' },
]
export const HAIRS = ['short', 'buzz', 'curly', 'bun', 'none']
export const EYES = ['round', 'happy', 'sleepy']
export const MOUTHS = ['smile', 'grin', 'neutral']

export const DEFAULT_FACE: FaceConfig = {
  skin: 'light',
  hair: 'short',
  hairColor: 'brown',
  eyes: 'round',
  mouth: 'smile',
}

const skinColor = (id: string) => SKINS.find((s) => s.id === id)?.color ?? SKINS[0].color
const hairColor = (id: string) => HAIR_COLORS.find((h) => h.id === id)?.color ?? HAIR_COLORS[1].color

function Hair({ style, color }: { style: string; color: string }) {
  const st = { fill: color, stroke: 'var(--ground)', strokeWidth: 1, strokeLinejoin: 'round' as const }
  if (style === 'none') return null
  if (style === 'buzz') return <path d="M7 19 Q20 7 33 19 L31 21 Q20 13 9 21 Z" {...st} />
  if (style === 'curly')
    return (
      <g {...st}>
        <circle cx="10" cy="14" r="5" />
        <circle cx="16" cy="10" r="5.5" />
        <circle cx="24" cy="10" r="5.5" />
        <circle cx="30" cy="14" r="5" />
      </g>
    )
  if (style === 'bun')
    return (
      <g {...st}>
        <circle cx="20" cy="5" r="3.5" />
        <path d="M6 18 Q20 4 34 18 Q30 11 20 10 Q10 11 6 18 Z" />
      </g>
    )
  // short
  return <path d="M6 19 Q20 3 34 19 Q31 10 20 9 Q9 10 6 19 Z" {...st} />
}

function Eyes({ style }: { style: string }) {
  const ink = 'var(--ground)'
  if (style === 'happy')
    return (
      <g fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round">
        <path d="M11 21 Q14 18 17 21" />
        <path d="M23 21 Q26 18 29 21" />
      </g>
    )
  if (style === 'sleepy')
    return (
      <g stroke={ink} strokeWidth="1.6" strokeLinecap="round">
        <line x1="11.5" y1="21" x2="16.5" y2="21" />
        <line x1="23.5" y1="21" x2="28.5" y2="21" />
      </g>
    )
  // round
  return (
    <g fill={ink}>
      <circle cx="14" cy="21" r="1.8" />
      <circle cx="26" cy="21" r="1.8" />
    </g>
  )
}

function Mouth({ style }: { style: string }) {
  const ink = 'var(--ground)'
  if (style === 'neutral')
    return <line x1="15" y1="29" x2="25" y2="29" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
  if (style === 'grin')
    return (
      <g>
        <path d="M13 28 Q20 35 27 28 Z" fill="#fff" stroke={ink} strokeWidth="1.4" strokeLinejoin="round" />
        <line x1="13.5" y1="28.6" x2="26.5" y2="28.6" stroke={ink} strokeWidth="1" />
      </g>
    )
  // smile
  return <path d="M14 28 Q20 33 26 28" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
}

/** Yüzü 0..40 koordinat kutusunda çizer (gövde haritasının başına da gömülebilir). */
export function FaceGlyph({ config = DEFAULT_FACE }: { config?: FaceConfig }) {
  const c = { ...DEFAULT_FACE, ...config }
  return (
    <g>
      <circle cx="20" cy="21" r="15" fill={skinColor(c.skin)} stroke="var(--ground)" strokeWidth="1.2" />
      <g stroke="var(--ground)" strokeWidth="1.3" strokeLinecap="round">
        <line x1="11" y1="16.5" x2="16.5" y2="16" />
        <line x1="23.5" y1="16" x2="29" y2="16.5" />
      </g>
      <Eyes style={c.eyes} />
      <Mouth style={c.mouth} />
      <Hair style={c.hair} color={hairColor(c.hairColor)} />
    </g>
  )
}

/** Avatar olarak kullanım: kendi <svg>'sinde, kabı (yuvarlak) doldurur. */
export function Face({ config, size = 64 }: { config?: FaceConfig; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <FaceGlyph config={config} />
    </svg>
  )
}
