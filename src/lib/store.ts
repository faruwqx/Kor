import { useSyncExternalStore } from 'react'
import { uid } from './format'
import { LEGAL_VERSION } from './legal'
import { PRESET_ROUTINES } from './presets'
import { DEFAULT_REST_SEC, shiftRestEnd } from './rest'
import { isWorkSet, lastSets } from './stats'
import type {
  AppState,
  Exercise,
  Profile,
  PushupResult,
  Routine,
  SetEntry,
  Settings,
  Workout,
  WorkoutExercise,
} from './types'

const KEY = 'kor:v1'

export const DEFAULT_BODYWEIGHT = 75

function initial(): AppState {
  return {
    profile: null,
    bodyweights: [],
    workouts: [],
    routines: [],
    customExercises: [],
    active: null,
    settings: { restSec: DEFAULT_REST_SEC, vibrate: true },
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...initial(), ...(JSON.parse(raw) as Partial<AppState>) }
  } catch {
    // Bozuk veya erişilemeyen depolama: temiz başla, kullanıcıyı kilitleme.
  }
  return initial()
}

let state: AppState = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Depolama dolu veya kapalı: oturum bellekte sürer.
  }
}

function set(next: AppState | ((s: AppState) => AppState)) {
  state = typeof next === 'function' ? next(state) : next
  persist()
  listeners.forEach((l) => l())
}

export function getState(): AppState {
  return state
}

/** React dışındaki dinleyiciler için (bulut eşitleme). Aboneliği kaldıran fonksiyonu döner. */
export function onChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useApp(): AppState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

export function currentBodyweight(s: AppState = state): number {
  return s.bodyweights.length ? s.bodyweights[s.bodyweights.length - 1].kg : DEFAULT_BODYWEIGHT
}

const emptySet = (): SetEntry => ({ kg: null, reps: null, done: false })

function mapExercise(uidKey: string, fn: (we: WorkoutExercise) => WorkoutExercise) {
  set((s) =>
    s.active
      ? {
          ...s,
          active: {
            ...s.active,
            exercises: s.active.exercises.map((we) => (we.uid === uidKey ? fn(we) : we)),
          },
        }
      : s,
  )
}

export const actions = {
  /** startRoutineId: önerilen program listenin başına alınır. */
  completeOnboarding(profile: Profile, bodyweight: number, startRoutineId?: string) {
    set((s) => {
      const routines = s.routines.length ? s.routines : PRESET_ROUTINES.map((r) => ({ ...r }))
      const first = routines.find((r) => r.id === startRoutineId)
      return {
        ...s,
        profile,
        bodyweights: [{ at: Date.now(), kg: bodyweight }],
        settings: { ...s.settings, legal: { version: LEGAL_VERSION, at: Date.now() } },
        routines: first ? [first, ...routines.filter((r) => r !== first)] : routines,
      }
    })
  },

  updateProfile(patch: Partial<Profile>) {
    set((s) => (s.profile ? { ...s, profile: { ...s.profile, ...patch } } : s))
  },

  updateSettings(patch: Partial<Settings>) {
    set((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
  },

  logBodyweight(kg: number) {
    set((s) => ({ ...s, bodyweights: [...s.bodyweights, { at: Date.now(), kg }] }))
  },

  startWorkout(routine?: Routine) {
    const hour = new Date().getHours()
    const part = hour < 11 ? 'Sabah' : hour < 17 ? 'Öğlen' : hour < 21 ? 'Akşam' : 'Gece'
    set((s) => ({
      ...s,
      active: {
        name: routine?.name ?? `${part} antrenmanı`,
        startedAt: Date.now(),
        routineId: routine?.id,
        exercises: (routine?.items ?? []).map((it) => ({
          uid: uid(),
          exerciseId: it.exerciseId,
          sets: Array.from({ length: it.sets }, () => ({ ...emptySet(), reps: null })),
        })),
      },
    }))
  },

  renameActive(name: string) {
    set((s) => (s.active ? { ...s, active: { ...s.active, name } } : s))
  },

  addExercises(ids: string[]) {
    set((s) => {
      if (!s.active) return s
      const added = ids.map((exerciseId) => {
        const prev = lastSets(exerciseId, s.workouts).length
        return {
          uid: uid(),
          exerciseId,
          sets: Array.from({ length: Math.min(Math.max(prev, 3), 6) }, emptySet),
        }
      })
      return { ...s, active: { ...s.active, exercises: [...s.active.exercises, ...added] } }
    })
  },

  removeExercise(uidKey: string) {
    set((s) =>
      s.active
        ? {
            ...s,
            active: {
              ...s.active,
              exercises: s.active.exercises.filter((we) => we.uid !== uidKey),
            },
          }
        : s,
    )
  },

  moveExercise(uidKey: string, dir: -1 | 1) {
    set((s) => {
      if (!s.active) return s
      const list = [...s.active.exercises]
      const i = list.findIndex((we) => we.uid === uidKey)
      const j = i + dir
      if (i < 0 || j < 0 || j >= list.length) return s
      ;[list[i], list[j]] = [list[j], list[i]]
      return { ...s, active: { ...s.active, exercises: list } }
    })
  },

  addSet(uidKey: string) {
    mapExercise(uidKey, (we) => ({ ...we, sets: [...we.sets, emptySet()] }))
  },

  removeSet(uidKey: string, index: number) {
    mapExercise(uidKey, (we) => ({ ...we, sets: we.sets.filter((_, i) => i !== index) }))
  },

  updateSet(uidKey: string, index: number, patch: Partial<SetEntry>) {
    mapExercise(uidKey, (we) => ({
      ...we,
      sets: we.sets.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }))
  },

  /**
   * Seti tamamlar ve dinlenme sayacını baştan başlatır: sayaç bir sonraki set
   * tamamlanana kadar yukarı sayar. `sec`: süreli harekette setin süresi.
   */
  completeSet(uidKey: string, index: number, kg: number, reps: number, sec?: number) {
    mapExercise(uidKey, (we) => ({
      ...we,
      sets: we.sets.map((s, i) =>
        i === index
          ? { ...s, kg, reps, done: true, startedAt: undefined, ...(sec != null ? { sec } : {}) }
          : s,
      ),
    }))
    const rest = state.settings.restSec
    const now = Date.now()
    set((s) =>
      s.active
        ? {
            ...s,
            active: {
              ...s.active,
              restStartedAt: rest > 0 ? now : undefined,
              restEndsAt: rest > 0 ? now + rest * 1000 : undefined,
            },
          }
        : s,
    )
  },

  /** Süreli setin sayacını başlatır. Aynı anda tek sayaç çalışır; dinlenme sayacı kapanır. */
  startSetTimer(uidKey: string, index: number) {
    const now = Date.now()
    set((s) =>
      s.active
        ? {
            ...s,
            active: {
              ...s.active,
              restStartedAt: undefined,
              restEndsAt: undefined,
              exercises: s.active.exercises.map((we) => ({
                ...we,
                sets: we.sets.map((x, i) =>
                  we.uid === uidKey && i === index
                    ? { ...x, startedAt: now }
                    : x.startedAt != null
                      ? { ...x, startedAt: undefined }
                      : x,
                ),
              })),
            },
          }
        : s,
    )
  },

  uncompleteSet(uidKey: string, index: number) {
    mapExercise(uidKey, (we) => ({
      ...we,
      sets: we.sets.map((s, i) => (i === index ? { ...s, done: false } : s)),
    }))
  },

  adjustRest(deltaSec: number) {
    set((s) => {
      const { restStartedAt, restEndsAt } = s.active ?? {}
      if (!s.active || !restStartedAt || !restEndsAt) return s
      return {
        ...s,
        active: { ...s.active, restEndsAt: shiftRestEnd(restStartedAt, restEndsAt, deltaSec) },
      }
    })
  },

  clearRest() {
    set((s) =>
      s.active
        ? { ...s, active: { ...s.active, restStartedAt: undefined, restEndsAt: undefined } }
        : s,
    )
  },

  discardWorkout() {
    set((s) => ({ ...s, active: null }))
  },

  /** Tamamlanmış setleri kaydeder. Hiç set yoksa null döner ve antrenman açık kalır. */
  finishWorkout(): string | null {
    const a = state.active
    if (!a) return null
    const exercises = a.exercises
      .map((we) => ({
        ...we,
        sets: we.sets
          .filter((s) => s.done && s.reps != null && s.reps > 0)
          .map((s) => ({ ...s, startedAt: undefined })),
      }))
      .filter((we) => we.sets.length)
    if (!exercises.some((we) => we.sets.some(isWorkSet))) return null
    const workout: Workout = {
      id: uid(),
      name: a.name.trim() || 'Antrenman',
      startedAt: a.startedAt,
      endedAt: Date.now(),
      bodyweight: currentBodyweight(),
      routineId: a.routineId,
      exercises,
    }
    set((s) => ({ ...s, active: null, workouts: [...s.workouts, workout] }))
    return workout.id
  },

  deleteWorkout(id: string) {
    set((s) => ({ ...s, workouts: s.workouts.filter((w) => w.id !== id) }))
  },

  saveRoutine(routine: Routine) {
    set((s) => ({
      ...s,
      routines: s.routines.some((r) => r.id === routine.id)
        ? s.routines.map((r) => (r.id === routine.id ? routine : r))
        : [...s.routines, routine],
    }))
  },

  deleteRoutine(id: string) {
    set((s) => ({ ...s, routines: s.routines.filter((r) => r.id !== id) }))
  },

  /** Antrenmanı programa çevirir: her hareketin set sayısı ve en sık tekrarı. */
  routineFromWorkout(w: Workout): string {
    const id = uid()
    const routine: Routine = {
      id,
      name: w.name,
      items: w.exercises.map((we) => {
        const work = we.sets.filter(isWorkSet)
        return {
          exerciseId: we.exerciseId,
          sets: Math.max(1, work.length),
          reps: work.length ? Math.round(work.reduce((a, s) => a + s.reps, 0) / work.length) : 8,
        }
      }),
    }
    actions.saveRoutine(routine)
    return id
  },

  addCustomExercise(ex: Omit<Exercise, 'id' | 'custom'>): string {
    const id = 'custom-' + uid()
    set((s) => ({ ...s, customExercises: [...s.customExercises, { ...ex, id, custom: true }] }))
    return id
  },

  addPushup(r: Omit<PushupResult, 'id' | 'at'>) {
    set((s) => ({ ...s, pushups: [...(s.pushups ?? []), { ...r, id: uid(), at: Date.now() }] }))
  },

  /** İçe aktarma: antrenmanlar ve yeni özel hareketler mevcut veriye eklenir, hiçbir şey silinmez. */
  importData(workouts: Workout[], custom: Exercise[]) {
    set((s) => {
      const ids = new Set(s.customExercises.map((e) => e.id))
      const wids = new Set(s.workouts.map((w) => w.id))
      return {
        ...s,
        customExercises: [...s.customExercises, ...custom.filter((e) => !ids.has(e.id))],
        workouts: [...s.workouts, ...workouts.filter((w) => !wids.has(w.id))].sort(
          (a, b) => a.startedAt - b.startedAt,
        ),
      }
    })
  },

  replaceAll(next: AppState) {
    set({ ...initial(), ...next })
  },

  resetAll() {
    set(initial())
  },
}

/** Yedek dosyası için doğrulama: en azından profil ve antrenman listesi olmalı. */
export function parseBackup(text: string): AppState | null {
  try {
    const data = JSON.parse(text) as Partial<AppState>
    if (!data || typeof data !== 'object') return null
    if (!data.profile || !Array.isArray(data.workouts)) return null
    return { ...initial(), ...data, active: null }
  } catch {
    return null
  }
}
