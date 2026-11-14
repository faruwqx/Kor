import type { Routine } from './types'

/** İlk kurulumda gelen hazır programlar. Kullanıcı düzenleyebilir veya silebilir. */
import { localize } from './i18n'

export const PRESET_ROUTINES: Routine[] = [
  {
    id: 'preset-push',
    name: 'İtiş',
    items: [
      { exerciseId: 'bench', sets: 4, reps: 6 },
      { exerciseId: 'ohp', sets: 3, reps: 8 },
      { exerciseId: 'db-incline', sets: 3, reps: 10 },
      { exerciseId: 'lateral-raise', sets: 3, reps: 12 },
      { exerciseId: 'pushdown', sets: 3, reps: 10 },
    ],
  },
  {
    id: 'preset-pull',
    name: 'Çekiş',
    items: [
      { exerciseId: 'deadlift', sets: 3, reps: 5 },
      { exerciseId: 'pullup', sets: 3, reps: 8 },
      { exerciseId: 'row', sets: 3, reps: 8 },
      { exerciseId: 'lat-pulldown', sets: 3, reps: 10 },
      { exerciseId: 'curl', sets: 3, reps: 10 },
    ],
  },
  {
    id: 'preset-legs',
    name: 'Bacak',
    items: [
      { exerciseId: 'squat', sets: 4, reps: 6 },
      { exerciseId: 'rdl', sets: 3, reps: 8 },
      { exerciseId: 'leg-press', sets: 3, reps: 10 },
      { exerciseId: 'leg-curl', sets: 3, reps: 12 },
      { exerciseId: 'calf-raise', sets: 3, reps: 12 },
    ],
  },
  {
    id: 'preset-upper',
    name: 'Üst vücut',
    items: [
      { exerciseId: 'db-bench', sets: 3, reps: 8 },
      { exerciseId: 'chinup', sets: 3, reps: 6 },
      { exerciseId: 'db-shoulder-press', sets: 3, reps: 10 },
      { exerciseId: 'skullcrusher', sets: 3, reps: 10 },
      { exerciseId: 'db-curl', sets: 3, reps: 10 },
    ],
  },
]
localize(PRESET_ROUTINES, 'name')
