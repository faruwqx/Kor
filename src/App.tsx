import { ChartNoAxesColumn, Dumbbell, Medal, Trophy, User } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { RANKED_MUSCLES } from './lib/exercises'
import { timer } from './lib/format'
import { useCloud } from './lib/cloud'
import { useNow } from './lib/hooks'
import { go, segments, usePath } from './lib/router'
import { useApp } from './lib/store'
import { setUnitSystem } from './lib/units'
import type { MuscleId } from './lib/types'
import { Premium, RecoverySheet } from './screens/Account'
import { Active } from './screens/Active'
import { ExerciseDetail } from './screens/ExerciseDetail'
import { History } from './screens/History'
import { Import } from './screens/Import'
import { Legal } from './ui/Legal'
import { Leaderboard } from './screens/Leaderboard'
import { Library } from './screens/Library'
import { MuscleDetail } from './screens/MuscleDetail'
import { Onboarding } from './screens/Onboarding'
import { Profile } from './screens/Profile'
import { Pushups } from './screens/Pushups'
import { RankScreen } from './screens/Rank'
import { PhotoPlan } from './screens/PhotoPlan'
import { RoutineEdit } from './screens/RoutineEdit'
import { Today } from './screens/Today'
import { Trends } from './screens/Trends'
import { WorkoutDetail } from './screens/WorkoutDetail'
import { Mark } from './ui/Emblem'
import { ToastHost } from './ui/kit'
import { setLang, t } from './lib/i18n'

const TABS = () => [
  { id: 'today', path: '/', label: t('Bugün'), icon: Dumbbell },
  { id: 'rank', path: '/rank', label: t('Rank'), icon: Trophy },
  { id: 'board', path: '/leaderboard', label: t('Sıralama'), icon: Medal },
  { id: 'trends', path: '/trends', label: t('Trendler'), icon: ChartNoAxesColumn },
  { id: 'profile', path: '/profile', label: t('Profil'), icon: User },
] as const

type TabId = ReturnType<typeof TABS>[number]['id']

interface Route {
  tab: TabId
  title: string
  node: ReactNode
  bare?: boolean
}

function resolve(seg: string[]): Route {
  const [a, b, c] = seg
  if (a === 'rank') {
    if (b && (RANKED_MUSCLES as string[]).includes(b))
      return { tab: 'rank', title: t('Rank'), node: <MuscleDetail muscle={b as MuscleId} /> }
    return { tab: 'rank', title: t('Rank'), node: <RankScreen /> }
  }
  if (a === 'leaderboard') return { tab: 'board', title: t('Sıralama'), node: <Leaderboard /> }
  if (a === 'import') return { tab: 'profile', title: t('İçe aktar'), node: <Import /> }
  if (a === 'legal') return { tab: 'profile', title: t('Yasal'), node: <Legal id={b} /> }
  if (a === 'pushup')
    return { tab: 'board', title: t('Şınav düellosu'), node: <Pushups />, bare: true }
  if (a === 'trends') return { tab: 'trends', title: t('Trendler'), node: <Trends /> }
  if (a === 'exercises') return { tab: 'trends', title: t('Hareketler'), node: <Library /> }
  if (a === 'exercise' && b)
    return { tab: 'trends', title: t('Hareket'), node: <ExerciseDetail id={b} /> }
  // Geçmiş artık Profil → Pano → Antrenmanlar altında.
  if (a === 'history') return { tab: 'profile', title: t('Geçmiş'), node: <History /> }
  if (a === 'workout' && b)
    return {
      tab: 'profile',
      title: t('Antrenman'),
      node: <WorkoutDetail id={b} fresh={c === 'yeni'} />,
      bare: c === 'yeni',
    }
  if (a === 'profile') return { tab: 'profile', title: t('Profil'), node: <Profile /> }
  if (a === 'premium') return { tab: 'profile', title: t('Premium'), node: <Premium /> }
  if (a === 'routine' && b === 'photo')
    return { tab: 'profile', title: t('Fotoğraftan program'), node: <PhotoPlan /> }
  if (a === 'routine' && b)
    return { tab: 'profile', title: t('Program'), node: <RoutineEdit key={b} id={b} /> }
  return { tab: 'today', title: t('Bugün'), node: <Today /> }
}

export default function App() {
  const s = useApp()
  const path = usePath()
  const seg = segments(path)
  const isActive = seg[0] === 'active'
  const route = resolve(seg)

  useEffect(() => {
    document.title = !s.profile
      ? t('Kor')
      : isActive
        ? t('{0} · Kor', s.active?.name ?? t('Antrenman'))
        : t('{0} · Kor', route.title)
  }, [s.profile, s.active?.name, isActive, route.title])

  // Birim sistemi: çocuklar çizilmeden önce bildirilir (veri kg'de kalır, yalnızca gösterim değişir).
  setUnitSystem(s.settings.units)
  setLang(s.settings.lang)

  // Seçim yapılmadıysa koyu tema.
  const theme = s.settings.theme ?? 'dark'
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        'content',
        theme === 'dark' ? '#0e0d0c' : theme === 'blue' ? '#0a0e1a' : '#edf3f4',
      )
  }, [theme])

  if (!s.profile)
    return (
      <>
        <Onboarding />
        <Overlays />
      </>
    )

  if (isActive)
    return (
      <>
        <Active />
        <Overlays />
      </>
    )

  const showMini = !!s.active && !route.bare
  return (
    <div className={'shell' + (route.bare ? '' : ' shell--tabs')}>
      <main
        className={
          'screen' + (route.bare ? ' screen--bare' : '') + (showMini ? ' screen--mini' : '')
        }
        key={path}
      >
        {route.node}
      </main>
      {showMini && <MiniBar name={s.active!.name} startedAt={s.active!.startedAt} />}
      {!route.bare && (
        <nav className="tabbar" aria-label={t('Ana gezinme')}>
          <a className="brand" href="#/">
            <Mark size={26} />
            {t('Kor')}
          </a>
          <div className="tabbar__row">
            {TABS().map((tab) => (
              <a
                key={tab.id}
                className="tab"
                href={'#' + tab.path}
                aria-current={route.tab === tab.id ? 'page' : undefined}
                onClick={() => window.scrollTo(0, 0)}
              >
                <tab.icon strokeWidth={1.75} />
                {tab.label}
              </a>
            ))}
          </div>
        </nav>
      )}
      <Overlays />
    </div>
  )
}

/** Her ekranın üstünde duranlar: bildirim ve şifre sıfırlama dönüşü. */
function Overlays() {
  const { recovery } = useCloud()
  return (
    <>
      {recovery && <RecoverySheet />}
      <ToastHost />
    </>
  )
}

function MiniBar({ name, startedAt }: { name: string; startedAt: number }) {
  const now = useNow()
  return (
    <div className="mini">
      <button className="mini__bar" onClick={() => go('/active')}>
        <span className="mini__name">{name}</span>
        <span className="fig mini__time">{timer((now - startedAt) / 1000)}</span>
        <span className="mini__go">{t('Devam et')}</span>
      </button>
    </div>
  )
}
