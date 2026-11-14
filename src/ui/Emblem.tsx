import { TIERS } from '../lib/rank'
import { t } from '../lib/i18n'

/*
 * Rank amblemi. Altıgen kalkan iki düz tonla ikiye bölünür (metal yüzü),
 * içindeki çentik sayısı basamağı söyler: III tek, II çift, I üç çentik.
 * Kademe yükseldikçe gövdeye parça eklenir: Bronz'dan itibaren iç çerçeve,
 * Altın'dan itibaren yan kanatlar, Elmas'tan itibaren tepe. Kor'da çentik
 * yerine çekirdek vardır.
 */
export function Emblem({
  rank,
  size = 40,
  className,
}: {
  rank: { tier: number; division: number } | null
  size?: number
  className?: string
}) {
  const h = (size * 60) / 56
  if (!rank) {
    return (
      <svg
        className={className}
        width={size}
        height={h}
        viewBox="-4 -6 56 60"
        role="img"
        aria-label={t('Sıralanmadı')}
      >
        <path
          d="M24 2 44 13V35L24 50 4 35V13Z"
          fill="none"
          stroke="var(--control)"
          strokeWidth="2"
          strokeDasharray="4 4"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  const { tier, division } = rank
  const color = TIERS[tier].color
  const dark = t('color-mix(in srgb, {0}, #000 30%)', color)
  const isKor = tier === TIERS.length - 1
  const n = division + 1
  const top = 26 - (n - 1) * 3.5 - 2.5
  return (
    <svg
      className={className}
      width={size}
      height={h}
      viewBox="-4 -6 56 60"
      role="img"
      aria-label={TIERS[tier].name}
    >
      {tier >= 4 && (
        <>
          <path d="M4 17-3 24 4 31Z" style={{ fill: dark }} />
          <path d="M44 17 51 24 44 31Z" style={{ fill: dark }} />
        </>
      )}
      {tier >= 6 && <path d="M17 6 24-5 31 6Z" style={{ fill: color }} />}
      <path d="M24 2 44 13V35L24 50 4 35V13Z" style={{ fill: dark }} />
      <path d="M24 2V50L4 35V13Z" style={{ fill: color }} />
      {tier >= 2 && (
        <path
          d="M24 8.5 38.5 16.5V32L24 43 9.5 32V16.5Z"
          fill="none"
          stroke="var(--emblem-cut)"
          strokeOpacity="0.4"
          strokeWidth="1.5"
        />
      )}
      {isKor ? (
        <>
          <path d="M24 13 34 26 24 39 14 26Z" fill="var(--emblem-cut)" />
          <path d="M24 20 28.5 26 24 32 19.5 26Z" style={{ fill: color }} />
        </>
      ) : (
        Array.from({ length: n }, (_, i) => (
          <path
            key={i}
            d={`M15.5 ${top + i * 7 + 5} 24 ${top + i * 7} 32.5 ${top + i * 7 + 5}`}
            fill="none"
            stroke="var(--emblem-cut)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))
      )}
    </svg>
  )
}

/** Uygulamanın işareti: Kor kademesinin amblemi. */
export function Mark({ size = 28 }: { size?: number }) {
  return <Emblem rank={{ tier: TIERS.length - 1, division: 0 }} size={size} />
}
