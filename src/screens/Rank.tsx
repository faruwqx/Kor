import { ChevronRight, Swords, Trophy } from 'lucide-react'
import { MUSCLE_COLOR, RANKED_MUSCLES, findExercise, muscleName } from '../lib/exercises'
import { int } from '../lib/format'
import { useBoard } from '../lib/hooks'
import { KOR_RP, RP_PER_TIER, TIERS } from '../lib/rank'
import { go } from '../lib/router'
import { useApp } from '../lib/store'
import { Emblem } from '../ui/Emblem'
import { RankBar } from '../ui/kit'
import { t } from '../lib/i18n'

/** Yedi kademelik ortak ölçek: dolan her dilim bir kademe. Kor'da hepsi dolu. */
export function Scale({ rp, color }: { rp: number; color?: string }) {
  return (
    <div className="scale" aria-hidden="true">
      {Array.from({ length: TIERS.length - 1 }, (_, i) => {
        const fill = Math.min(1, Math.max(0, (rp - i * RP_PER_TIER) / RP_PER_TIER))
        return (
          <i key={i}>
            <b style={{ width: `${fill * 100}%`, background: color }} />
          </i>
        )
      })}
    </div>
  )
}

export function RankScreen() {
  const s = useApp()
  const board = useBoard(s)
  const overall = board.overall
  const here = overall?.tier ?? -1

  let finding: string
  if (overall) {
    const ranked = board.muscles.filter((m) => m.rank)
    const top = ranked.reduce((a, b) => (b.rank!.rp > a.rank!.rp ? b : a))
    const low = ranked.reduce((a, b) => (b.rank!.rp < a.rank!.rp ? b : a))
    finding =
      top.muscle === low.muscle
        ? t('{0} kas grubunun ortalaması.', ranked.length)
        : t('En güçlü grubun {0}, en geride kalan {1}: aralarında {2} RP var.', muscleName(top.muscle), muscleName(low.muscle), int(top.rank!.rp - low.rank!.rp))
  } else {
    finding = t('İlk rank\'li setini kaydet, genel rankın açılsın.')
  }

  return (
    <>
      <header className="head">
        <div>
          <h1>{t('Rank')}</h1>
          <p>{finding}</p>
        </div>
      </header>

      <section
        className="card card--tint"
        style={{ ['--tint' as string]: overall?.color ?? 'var(--control)' }}
        aria-label={t('Genel rank')}
      >
        {overall ? (
          <>
            <div className="rankhero" style={{ marginBottom: 16 }}>
              <Emblem rank={overall} size={76} />
              <div className="rankhero__body">
                <div className="fig rankhero__label">{overall.label}</div>
                <div className="rankhero__rp">
                  {board.rankedCount < RANKED_MUSCLES.length
                    ? t('{0}/{1} grup sıralandı · kalanları ekledikçe yükselir', board.rankedCount, RANKED_MUSCLES.length)
                    : t('{0} kas grubunun ortalaması', board.rankedCount)}
                </div>
              </div>
            </div>
            <RankBar rank={overall} />
          </>
        ) : (
          <div className="rankhero">
            <Emblem rank={null} size={76} />
            <div className="rankhero__body">
              <div className="fig rankhero__label">{t('Rank yok')}</div>
              <div className="rankhero__rp">
                {t('Rank\'li bir harekette tek set, genel rankını başlatır.')}
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="card card--flush rows menu" style={{ padding: '4px 12px' }}>
        <button className="row" onClick={() => go('/leaderboard')}>
          <Trophy />
          <div className="row__main">
            <div>{t('Sıralama')}</div>
            <div className="row__sub">{t('Genel rank\'ine göre diğer sporcular arasındaki yerin')}</div>
          </div>
          <ChevronRight className="chev" />
        </button>
        <button className="row" onClick={() => go('/pushup')}>
          <Swords />
          <div className="row__main">
            <div>{t('Şınav düellosu')}</div>
            <div className="row__sub">{t('Kamerayla sayılır, ayrı şınav rank\'i')}</div>
          </div>
          <ChevronRight className="chev" />
        </button>
      </div>

      <div className="section">
        <h2>{t('Kas grupları')}</h2>
      </div>
      <div className="card card--flush">
        {board.muscles.map((m) => (
          <button
            key={m.muscle}
            className="ladder__row"
            onClick={() => go(`/rank/${m.muscle}`)}
          >
            <Emblem rank={m.rank} size={36} />
            <div>
              <div className="ladder__name">
                <span className="dot" style={{ background: MUSCLE_COLOR[m.muscle] }} />
                {muscleName(m.muscle)}
              </div>
              <div className="ladder__rank">
                {m.rank
                  ? `${m.rank.label} · ${findExercise(m.lift!.exerciseId, s.customExercises).name}`
                  : t('Sıralanmadı')}
              </div>
            </div>
            <div className="fig ladder__rp">
              {m.rank ? (
                <>
                  {int(m.rank.rp)}
                  <span className="unit">{t('RP')}</span>
                </>
              ) : (
                <span className="faint">–</span>
              )}
            </div>
            <Scale rp={m.rank?.rp ?? 0} color={MUSCLE_COLOR[m.muscle]} />
          </button>
        ))}
      </div>

      <div className="section">
        <h2>{t('Merdiven')}</h2>
      </div>
      <div className="card card--flush rows tierlist">
        {TIERS.map((tier, i) => {
          const from = i * RP_PER_TIER
          return (
            <div className="row" key={tier.id}>
              <Emblem rank={{ tier: i, division: 2 }} size={30} />
              <div className="row__main">
                <span className="row__title">{tier.name}</span>
                {i === here && <span className="here">{t('Buradasın')}</span>}
              </div>
              <span className="row__sub num">
                {i === TIERS.length - 1
                  ? t('{0} RP ve üstü', int(KOR_RP))
                  : t('{0}–{1} RP', int(from), int(from + RP_PER_TIER - 1))}
              </span>
            </div>
          )
        })}
      </div>

      <div className="section">
        <h2>{t('Nasıl hesaplanır')}</h2>
      </div>
      <div className="card">
        <p className="muted" style={{ fontSize: 14, lineHeight: 1.55 }}>
          {t('Kaldırdığın kilonun vücut ağırlığına oranı RP\'ye çevrilir. Her kas grubunu en iyi hareketin belirler; genel rank tüm grupların ortalamasıdır.')}
        </p>
        <p className="note" style={{ marginTop: 10 }}>
          {t('12 tekrar üstü, ısınma setleri ve standardı olmayan hareketler sayılmaz.')}
        </p>
      </div>
    </>
  )
}
