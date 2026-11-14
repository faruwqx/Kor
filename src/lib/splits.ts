/**
 * Hazır split'ler: en bilinen on antrenman bölümü. "Program oluştur" ekranında
 * seçilir; bir gün hemen başlatılır ya da tüm günler programlara eklenir.
 * Hareket kimlikleri BUILTIN'de olmalı (splits.test.ts denetler).
 */
import type { Routine, RoutineItem } from './types'

export interface Split {
  id: string
  name: string
  /** Haftada kaç gün. */
  days: number
  level: 'Başlangıç' | 'Orta' | 'İleri'
  summary: string
  workouts: { name: string; items: RoutineItem[] }[]
}

const x = (exerciseId: string, sets: number, reps: number): RoutineItem => ({
  exerciseId,
  sets,
  reps,
})

export const SPLITS: Split[] = [
  {
    id: 'bro',
    name: 'Bro split',
    days: 5,
    level: 'Orta',
    summary: 'Her gün tek kas grubu. Haftada bir kez, yüksek hacimle.',
    workouts: [
      {
        name: 'Göğüs',
        items: [x('bench', 4, 8), x('db-incline', 3, 10), x('decline-bench', 3, 10), x('cable-fly', 3, 12), x('pec-deck', 3, 15)],
      },
      {
        name: 'Sırt',
        items: [x('deadlift', 3, 5), x('pullup', 4, 8), x('row', 4, 8), x('lat-pulldown', 3, 10), x('seated-row', 3, 12)],
      },
      {
        name: 'Omuz',
        items: [x('ohp', 4, 8), x('arnold-press', 3, 10), x('lateral-raise', 4, 12), x('rear-delt-fly', 3, 15), x('shrug', 3, 12)],
      },
      {
        name: 'Bacak',
        items: [x('squat', 4, 8), x('leg-press', 3, 10), x('rdl', 3, 10), x('leg-extension', 3, 12), x('leg-curl', 3, 12), x('calf-raise', 4, 15)],
      },
      {
        name: 'Kol',
        items: [x('curl', 4, 10), x('cg-bench', 3, 8), x('hammer-curl', 3, 12), x('skullcrusher', 3, 10), x('preacher-curl', 3, 12), x('pushdown', 3, 12)],
      },
    ],
  },
  {
    id: 'ppl',
    name: 'Push Pull Legs',
    days: 6,
    level: 'Orta',
    summary: 'İtiş, çekiş, bacak; hafta içinde iki tur döner.',
    workouts: [
      {
        name: 'İtiş',
        items: [x('bench', 4, 6), x('ohp', 3, 8), x('db-incline', 3, 10), x('lateral-raise', 3, 12), x('pushdown', 3, 10)],
      },
      {
        name: 'Çekiş',
        items: [x('deadlift', 3, 5), x('pullup', 3, 8), x('row', 3, 8), x('face-pull', 3, 15), x('curl', 3, 10)],
      },
      {
        name: 'Bacak',
        items: [x('squat', 4, 6), x('rdl', 3, 8), x('leg-press', 3, 10), x('leg-curl', 3, 12), x('calf-raise', 3, 12)],
      },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Üst / Alt',
    days: 4,
    level: 'Başlangıç',
    summary: 'Üst vücut ve alt vücut sırayla; her bölge haftada iki kez.',
    workouts: [
      {
        name: 'Üst A',
        items: [x('bench', 4, 6), x('row', 4, 6), x('ohp', 3, 8), x('lat-pulldown', 3, 10), x('curl', 2, 12), x('pushdown', 2, 12)],
      },
      {
        name: 'Alt A',
        items: [x('squat', 4, 6), x('rdl', 3, 8), x('leg-press', 3, 10), x('leg-curl', 3, 12), x('calf-raise', 3, 12)],
      },
      {
        name: 'Üst B',
        items: [x('db-incline', 3, 10), x('pullup', 3, 8), x('db-shoulder-press', 3, 10), x('seated-row', 3, 10), x('hammer-curl', 2, 12), x('overhead-ext', 2, 12)],
      },
      {
        name: 'Alt B',
        items: [x('deadlift', 3, 5), x('front-squat', 3, 8), x('split-squat', 3, 10), x('hip-thrust', 3, 10), x('seated-calf', 3, 15)],
      },
    ],
  },
  {
    id: 'full-body',
    name: 'Tüm vücut',
    days: 3,
    level: 'Başlangıç',
    summary: 'Her antrenmanda tüm vücut. Az günle en sık tekrar.',
    workouts: [
      {
        name: 'Tüm vücut A',
        items: [x('squat', 3, 8), x('bench', 3, 8), x('row', 3, 8), x('lateral-raise', 2, 12), x('curl', 2, 12)],
      },
      {
        name: 'Tüm vücut B',
        items: [x('deadlift', 3, 5), x('ohp', 3, 8), x('pullup', 3, 8), x('leg-press', 3, 10), x('pushdown', 2, 12)],
      },
      {
        name: 'Tüm vücut C',
        items: [x('front-squat', 3, 8), x('db-incline', 3, 10), x('seated-row', 3, 10), x('rdl', 3, 10), x('hanging-leg-raise', 3, 12)],
      },
    ],
  },
  {
    id: 'arnold',
    name: 'Arnold split',
    days: 6,
    level: 'İleri',
    summary: 'Göğüs + sırt, omuz + kol, bacak; haftada iki tur.',
    workouts: [
      {
        name: 'Göğüs ve sırt',
        items: [x('bench', 4, 8), x('pullup', 4, 8), x('db-incline', 3, 10), x('row', 3, 10), x('cable-fly', 3, 12), x('dips', 3, 10)],
      },
      {
        name: 'Omuz ve kol',
        items: [x('ohp', 4, 8), x('lateral-raise', 4, 12), x('upright-row', 3, 10), x('curl', 3, 10), x('skullcrusher', 3, 10), x('concentration-curl', 3, 12)],
      },
      {
        name: 'Bacak',
        items: [x('squat', 5, 8), x('leg-press', 3, 10), x('leg-extension', 3, 12), x('leg-curl', 3, 12), x('stiff-leg-deadlift', 3, 10), x('calf-raise', 5, 15)],
      },
    ],
  },
  {
    id: 'phul',
    name: 'PHUL',
    days: 4,
    level: 'Orta',
    summary: 'Güç ve hipertrofi: iki ağır, iki hacim günü.',
    workouts: [
      {
        name: 'Üst güç',
        items: [x('bench', 4, 4), x('row', 4, 4), x('ohp', 3, 6), x('lat-pulldown', 3, 8), x('curl', 3, 8), x('skullcrusher', 3, 8)],
      },
      {
        name: 'Alt güç',
        items: [x('squat', 4, 4), x('deadlift', 3, 4), x('leg-press', 3, 10), x('leg-curl', 3, 8), x('calf-raise', 4, 8)],
      },
      {
        name: 'Üst hipertrofi',
        items: [x('db-incline', 4, 10), x('cable-fly', 3, 12), x('seated-row', 4, 10), x('db-row', 3, 10), x('lateral-raise', 3, 12), x('db-curl', 3, 12), x('pushdown', 3, 12)],
      },
      {
        name: 'Alt hipertrofi',
        items: [x('front-squat', 4, 10), x('split-squat', 3, 12), x('leg-extension', 3, 15), x('seated-leg-curl', 3, 15), x('seated-calf', 4, 15)],
      },
    ],
  },
  {
    id: 'phat',
    name: 'PHAT',
    days: 5,
    level: 'İleri',
    summary: 'Layne Norton tarzı: iki güç günü, üç hipertrofi günü.',
    workouts: [
      {
        name: 'Üst güç',
        items: [x('pendlay-row', 3, 5), x('pullup', 2, 8), x('bench', 3, 5), x('dips', 2, 8), x('ohp', 3, 8), x('curl', 3, 8), x('skullcrusher', 3, 8)],
      },
      {
        name: 'Alt güç',
        items: [x('squat', 3, 5), x('hack-squat', 2, 8), x('leg-extension', 2, 10), x('stiff-leg-deadlift', 3, 8), x('leg-curl', 2, 8), x('calf-raise', 3, 8)],
      },
      {
        name: 'Sırt ve omuz hipertrofi',
        items: [x('row', 6, 3), x('tbar-row', 3, 10), x('seated-row', 3, 10), x('lat-pulldown', 3, 12), x('db-shoulder-press', 3, 10), x('lateral-raise', 3, 15), x('shrug', 2, 15)],
      },
      {
        name: 'Bacak hipertrofi',
        items: [x('squat', 6, 3), x('hack-squat', 3, 10), x('leg-press', 2, 15), x('leg-extension', 3, 15), x('rdl', 3, 10), x('seated-leg-curl', 2, 15), x('seated-calf', 4, 15)],
      },
      {
        name: 'Göğüs ve kol hipertrofi',
        items: [x('db-bench', 6, 3), x('db-incline', 3, 10), x('chest-press', 3, 12), x('cable-fly', 2, 15), x('preacher-curl', 3, 12), x('incline-curl', 2, 15), x('cg-bench', 3, 12), x('pushdown', 2, 15)],
      },
    ],
  },
  {
    id: 'stronglifts',
    name: 'StrongLifts 5×5',
    days: 3,
    level: 'Başlangıç',
    summary: 'İki antrenman sırayla: A, B, A. Her seansta kilo ekle.',
    workouts: [
      { name: '5×5 A', items: [x('squat', 5, 5), x('bench', 5, 5), x('row', 5, 5)] },
      { name: '5×5 B', items: [x('squat', 5, 5), x('ohp', 5, 5), x('deadlift', 1, 5)] },
    ],
  },
  {
    id: 'starting-strength',
    name: 'Starting Strength',
    days: 3,
    level: 'Başlangıç',
    summary: "Mark Rippetoe'nun temel programı: 3×5, ağır temel hareketler.",
    workouts: [
      { name: 'SS A', items: [x('squat', 3, 5), x('bench', 3, 5), x('deadlift', 1, 5)] },
      { name: 'SS B', items: [x('squat', 3, 5), x('ohp', 3, 5), x('chinup', 3, 8)] },
    ],
  },
  {
    id: 'bbb',
    name: '5/3/1 Boring But Big',
    days: 4,
    level: 'Orta',
    summary: 'Wendler: günde bir ana hareket, ardından 5×10 aynı hareket.',
    workouts: [
      { name: 'OHP günü', items: [x('ohp', 3, 5), x('ohp', 5, 10), x('lat-pulldown', 5, 10)] },
      { name: 'Deadlift günü', items: [x('deadlift', 3, 5), x('deadlift', 5, 10), x('hanging-leg-raise', 5, 12)] },
      { name: 'Bench günü', items: [x('bench', 3, 5), x('bench', 5, 10), x('db-row', 5, 10)] },
      { name: 'Squat günü', items: [x('squat', 3, 5), x('squat', 5, 10), x('leg-curl', 5, 10)] },
    ],
  },
]

/** Split'in günleri program olarak. Kimlik sabittir: aynı split iki kez eklenince çoğalmaz. */
export function splitRoutines(split: Split): Routine[] {
  return split.workouts.map((w, i) => ({
    id: `split-${split.id}-${i}`,
    name: `${w.name} · ${split.name}`,
    items: w.items,
  }))
}
