export type MuscleId =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'posterior'
  | 'core'
  | 'calves'
  | 'hyrox'
  | 'cardio'

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'station'
  /** Plaka, halat, landmine gibi diğer araçlar. */
  | 'other'

/** external: yazılan kg kaldırılan yüktür. bodyweight: yazılan kg vücut ağırlığına eklenir. */
export type LoadType = 'external' | 'bodyweight'

/** 1TM / vücut ağırlığı oranı: start = merdivenin dibi, elite = Kor eşiği (erkek). */
export interface Standard {
  start: number
  elite: number
}

export interface Exercise {
  id: string
  name: string
  muscle: MuscleId
  equipment: Equipment
  load: LoadType
  /** Dambılda tek el için yazılır. */
  perHand?: boolean
  std?: Standard
  custom?: boolean
  /** Süreyle kaydedilir (Hyrox istasyonları): set tekrar yerine saniye tutar. */
  timed?: boolean
  /** Süreli harekette uzun süre daha iyidir (plank, kardiyo). Yoksa kısa süre iyidir. */
  longer?: boolean
  /** Süreli hareketin standart mesafesi veya tekrarı, örneğin "1000 m". */
  target?: string
}

export interface SetEntry {
  kg: number | null
  reps: number | null
  done: boolean
  warmup?: boolean
  /** Süreli harekette setin süresi (saniye). */
  sec?: number
  /** Süreli harekette çalışan sayacın başladığı an. Antrenman kaydedilirken atılır. */
  startedAt?: number
}

export interface WorkoutExercise {
  uid: string
  exerciseId: string
  sets: SetEntry[]
}

export interface Workout {
  id: string
  name: string
  startedAt: number
  endedAt: number
  /** Antrenman günü vücut ağırlığı (kg). Rank oranı bununla hesaplanır. */
  bodyweight: number
  routineId?: string
  exercises: WorkoutExercise[]
}

export interface ActiveWorkout {
  name: string
  /** Kullanıcı ya da program adlandırdıysa true; false ise bitişte otomatik ad verilir. */
  named?: boolean
  startedAt: number
  routineId?: string
  exercises: WorkoutExercise[]
  /** Son setin tamamlandığı an: dinlenme sayacı buradan yukarı sayar. */
  restStartedAt?: number
  /** Dinlenme hedefinin dolduğu an: sonrasında sayaç kırmızıya döner. */
  restEndsAt?: number
}

export interface RoutineItem {
  exerciseId: string
  sets: number
  reps: number
}

export interface Routine {
  id: string
  name: string
  items: RoutineItem[]
}

export interface Profile {
  name: string
  sex: 'm' | 'f'
  weeklyGoal: number
  createdAt: number
  /** Profil fotoğrafı (küçültülmüş JPEG data URL). */
  photo?: string
  /** Boy (cm). */
  heightCm?: number
  /** Yaş (yıl). */
  age?: number
  /** Kurulum cevapları. Eski profillerde yoktur. */
  experience?: 'new' | 'mid' | 'adv'
  goal?: 'strength' | 'muscle' | 'fit' | 'rank'
  /** İlk seçilen odak bölge: ilk rank hedefini belirler. */
  focus?: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'balanced'
  /** Seçilen tüm odak bölgeler, seçim sırasıyla. */
  focuses?: NonNullable<Profile['focus']>[]
  obstacle?: 'consistency' | 'knowhow' | 'time' | 'motivation'
}

export interface BodyweightEntry {
  at: number
  kg: number
}

export interface Settings {
  restSec: number
  vibrate: boolean
  /** Dinlenme dolunca uyarı sesi. Tanımsızsa açık sayılır. */
  sound?: boolean
  /** Sıralamada adı ve genel RP'si görünsün: kullanıcı açıkça katıldıysa true. */
  leaderboard?: boolean
  /** Açık, koyu veya mavi (Liftoff tarzı) tema. */
  theme?: 'light' | 'dark' | 'blue'
  /** Birim sistemi: metrik (kg, m) ya da imperial (lb, ft). Tanımsızsa metrik. */
  units?: 'metric' | 'imperial'
  lang?: 'tr' | 'en' | 'es'
  /** Girilen Premium kodu (yerel kilit açma). */
  redeem?: string
  /** Kurulumda kabul edilen hukuki metin sürümü ve zamanı. */
  legal?: { version: string; at: number }
}

/** Kamerayla sayılan bir şınav seansı. Görüntü saklanmaz, yalnızca sayı. */
export interface PushupResult {
  id: string
  at: number
  reps: number
  /** Seans süresi, saniye. */
  seconds: number
  mode: 'solo' | 'duel'
  /** Düelloda rakibin adı ve son sayısı. */
  opponent?: string
  opponentReps?: number
}

export interface AppState {
  /** Şınav seansları; ayrı rank'in kaynağı. Eski kayıtlarda yok. */
  pushups?: PushupResult[]
  profile: Profile | null
  bodyweights: BodyweightEntry[]
  workouts: Workout[]
  routines: Routine[]
  customExercises: Exercise[]
  active: ActiveWorkout | null
  settings: Settings
  demo?: boolean
}
