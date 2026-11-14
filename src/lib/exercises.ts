import { exLabel } from '../i18n/exercises'
import { lang, localize, localizeRecord } from './i18n'
import type { Equipment, Exercise, MuscleId } from './types'
import { fmtTarget } from './units'

export const MUSCLES: { id: MuscleId; name: string; ranked: boolean }[] = [
  { id: 'chest', name: 'Göğüs', ranked: true },
  { id: 'back', name: 'Sırt', ranked: true },
  { id: 'shoulders', name: 'Omuz', ranked: true },
  { id: 'biceps', name: 'Biceps', ranked: true },
  { id: 'triceps', name: 'Triceps', ranked: true },
  { id: 'quads', name: 'Ön bacak', ranked: true },
  { id: 'posterior', name: 'Arka zincir', ranked: true },
  { id: 'core', name: 'Karın', ranked: false },
  { id: 'calves', name: 'Baldır', ranked: false },
  { id: 'hyrox', name: 'Hyrox', ranked: false },
  { id: 'cardio', name: 'Kardiyo', ranked: false },
]

/** Her kas grubunun kendi rengi: merdivende, seçicide ve özetlerde kullanılır. */
export const MUSCLE_COLOR: Record<MuscleId, string> = {
  chest: '#ff5a1f',
  back: '#2f7bff',
  shoulders: '#ffab00',
  biceps: '#f0389b',
  triceps: '#8b5cf6',
  quads: '#10b8a6',
  posterior: '#22c55e',
  core: '#f43f5e',
  calves: '#06b6d4',
  hyrox: '#84cc16',
  cardio: '#fb7185',
}

export const RANKED_MUSCLES = MUSCLES.filter((m) => m.ranked).map((m) => m.id)

export const muscleName = (id: MuscleId) => MUSCLES.find((m) => m.id === id)?.name ?? id

export const EQUIPMENT_NAME: Record<Equipment, string> = {
  barbell: 'Halter',
  dumbbell: 'Dambıl',
  machine: 'Makine',
  cable: 'Kablo',
  bodyweight: 'Vücut ağırlığı',
  station: 'İstasyon',
  other: 'Diğer',
}

/** Kendi hareketini eklerken seçilebilen kas grupları ve ekipmanlar (Hyrox ve kardiyo hazır gelir). */
export const CUSTOM_MUSCLES = MUSCLES.filter((m) => m.id !== 'hyrox' && m.id !== 'cardio')
export const CUSTOM_EQUIPMENT = (Object.keys(EQUIPMENT_NAME) as Equipment[]).filter(
  (e) => e !== 'station',
)

type Row = [
  id: string,
  name: string,
  muscle: MuscleId,
  equipment: Equipment,
  std?: [start: number, elite: number],
]

/*
 * Standartlar erkek için 1TM / vücut ağırlığı oranıdır. Makine hareketlerinde
 * standart yok: makinenin kaldıraç oranı markadan markaya değiştiği için
 * rank'e sayılmazlar. Dambılda oran tek el içindir.
 */
const ROWS: Row[] = [
  // Göğüs
  ['bench', 'Bench press', 'chest', 'barbell', [0.35, 2.0]],
  ['incline-bench', 'İncline bench press', 'chest', 'barbell', [0.3, 1.7]],
  ['db-bench', 'Dambıl bench press', 'chest', 'dumbbell', [0.15, 0.85]],
  ['db-incline', 'İncline dambıl press', 'chest', 'dumbbell', [0.13, 0.75]],
  ['dips', 'Dips', 'chest', 'bodyweight', [0.9, 2.0]],
  ['pushup', 'Şınav', 'chest', 'bodyweight'],
  ['chest-press', 'Göğüs press makinesi', 'chest', 'machine'],
  ['cable-fly', 'Kablo fly', 'chest', 'cable'],
  ['pec-deck', 'Pec deck', 'chest', 'machine'],
  // Sırt
  ['row', 'Barbell row', 'back', 'barbell', [0.3, 1.75]],
  ['pullup', 'Barfiks', 'back', 'bodyweight', [0.85, 1.9]],
  ['chinup', 'Chin-up', 'back', 'bodyweight', [0.85, 1.95]],
  ['db-row', 'Tek kol dambıl row', 'back', 'dumbbell', [0.15, 0.9]],
  ['lat-pulldown', 'Lat pulldown', 'back', 'cable', [0.35, 1.6]],
  ['seated-row', 'Oturarak kablo row', 'back', 'cable', [0.35, 1.7]],
  ['tbar-row', 'T-bar row', 'back', 'barbell'],
  ['face-pull', 'Face pull', 'back', 'cable'],
  // Omuz
  ['ohp', 'Overhead press', 'shoulders', 'barbell', [0.2, 1.3]],
  ['db-shoulder-press', 'Dambıl omuz press', 'shoulders', 'dumbbell', [0.1, 0.6]],
  ['lateral-raise', 'Lateral raise', 'shoulders', 'dumbbell', [0.04, 0.32]],
  ['shoulder-press-machine', 'Omuz press makinesi', 'shoulders', 'machine'],
  ['rear-delt-fly', 'Arka omuz fly', 'shoulders', 'dumbbell'],
  ['cable-lateral', 'Kablo lateral raise', 'shoulders', 'cable'],
  // Biceps
  ['curl', 'Barbell curl', 'biceps', 'barbell', [0.15, 1.0]],
  ['db-curl', 'Dambıl curl', 'biceps', 'dumbbell', [0.07, 0.48]],
  ['hammer-curl', 'Hammer curl', 'biceps', 'dumbbell', [0.07, 0.5]],
  ['preacher-curl', 'Preacher curl', 'biceps', 'barbell', [0.13, 0.9]],
  ['cable-curl', 'Kablo curl', 'biceps', 'cable'],
  // Triceps
  ['cg-bench', 'Dar tutuş bench press', 'triceps', 'barbell', [0.3, 1.7]],
  ['skullcrusher', 'Skull crusher', 'triceps', 'barbell', [0.12, 0.95]],
  ['pushdown', 'Triceps pushdown', 'triceps', 'cable', [0.2, 1.25]],
  ['overhead-ext', 'Baş üstü triceps extension', 'triceps', 'dumbbell'],
  // Ön bacak
  ['squat', 'Squat', 'quads', 'barbell', [0.45, 2.6]],
  ['front-squat', 'Front squat', 'quads', 'barbell', [0.4, 2.15]],
  ['leg-press', 'Leg press', 'quads', 'machine', [0.8, 4.5]],
  ['split-squat', 'Bulgarian split squat', 'quads', 'dumbbell', [0.1, 0.75]],
  ['leg-extension', 'Leg extension', 'quads', 'machine'],
  ['lunge', 'Lunge', 'quads', 'dumbbell'],
  // Arka zincir
  ['deadlift', 'Deadlift', 'posterior', 'barbell', [0.6, 3.0]],
  ['sumo-deadlift', 'Sumo deadlift', 'posterior', 'barbell', [0.6, 3.0]],
  ['rdl', 'Romanian deadlift', 'posterior', 'barbell', [0.45, 2.4]],
  ['hip-thrust', 'Hip thrust', 'posterior', 'barbell', [0.5, 3.2]],
  ['leg-curl', 'Leg curl', 'posterior', 'machine'],
  ['back-extension', 'Back extension', 'posterior', 'bodyweight'],
  // Karın, baldır
  ['hanging-leg-raise', 'Asılarak bacak kaldırma', 'core', 'bodyweight'],
  ['cable-crunch', 'Kablo crunch', 'core', 'cable'],
  ['ab-wheel', 'Ab wheel', 'core', 'bodyweight'],
  ['calf-raise', 'Ayakta calf raise', 'calves', 'machine'],
  ['seated-calf', 'Oturarak calf raise', 'calves', 'machine'],
]

/*
 * Hyrox: sekiz istasyon ve aralarındaki koşu, yarış sırasıyla. Süreyle kaydedilir;
 * yanındaki değer yarıştaki standart mesafe ya da tekrardır. Kilo isteğe bağlıdır
 * (kızak yükü, top ağırlığı). Rank'e sayılmaz.
 */
const HYROX: [id: string, name: string, target: string][] = [
  ['hyrox-run', 'Koşu', '1 km'],
  ['hyrox-skierg', 'SkiErg', '1000 m'],
  ['hyrox-sled-push', 'Sled push', '50 m'],
  ['hyrox-sled-pull', 'Sled pull', '50 m'],
  ['hyrox-burpee', 'Burpee broad jump', '80 m'],
  ['hyrox-row', 'Kürek ergometresi', '1000 m'],
  ['hyrox-farmers', 'Farmers carry', '200 m'],
  ['hyrox-lunge', 'Sandbag lunge', '100 m'],
  ['hyrox-wallball', 'Wall ball', '100 tekrar'],
]

/*
 * Ek hareketler: standardı yok, rank'e sayılmaz. Yapılış kareleri de yok.
 * 'single': tek dambılla yapılır (kilo iki elle çarpılmaz).
 * 'hold': süreyle kaydedilir ve uzun süre daha iyidir (plank, kardiyo).
 */
type Extra = [
  id: string,
  name: string,
  muscle: MuscleId,
  equipment: Equipment,
  flag?: 'single' | 'hold',
]

const EXTRA: Extra[] = [
  // Göğüs
  ['decline-bench', 'Decline bench press', 'chest', 'barbell'],
  ['db-decline', 'Decline dambıl press', 'chest', 'dumbbell'],
  ['smith-bench', 'Smith bench press', 'chest', 'machine'],
  ['guillotine-press', 'Guillotine press', 'chest', 'barbell'],
  ['hex-press', 'Hex press', 'chest', 'dumbbell'],
  ['svend-press', 'Svend press', 'chest', 'other'],
  ['plate-press', 'Plaka press', 'chest', 'other'],
  ['wide-pushup', 'Geniş şınav', 'chest', 'bodyweight'],
  ['diamond-pushup', 'Elmas şınav', 'chest', 'bodyweight'],
  ['decline-pushup', 'Decline şınav', 'chest', 'bodyweight'],
  ['incline-pushup', 'İncline şınav', 'chest', 'bodyweight'],
  ['low-cable-fly', 'Alttan kablo fly', 'chest', 'cable'],
  ['high-cable-fly', 'Üstten kablo fly', 'chest', 'cable'],
  ['single-cable-fly', 'Tek kol kablo fly', 'chest', 'cable'],
  // Sırt
  ['rack-pull', 'Rack pull', 'back', 'barbell'],
  ['neutral-pullup', 'Nötr tutuş barfiks', 'back', 'bodyweight'],
  ['wide-pullup', 'Geniş tutuş barfiks', 'back', 'bodyweight'],
  ['close-pulldown', 'Dar tutuş lat pulldown', 'back', 'cable'],
  ['reverse-pulldown', 'Ters tutuş lat pulldown', 'back', 'cable'],
  ['straight-arm-pulldown', 'Düz kol pulldown', 'back', 'cable'],
  ['pendlay-row', 'Pendlay row', 'back', 'barbell'],
  ['seal-row', 'Seal row', 'back', 'barbell'],
  ['chest-supported-row', 'Göğüs destekli row', 'back', 'dumbbell'],
  ['single-cable-row', 'Tek kol kablo row', 'back', 'cable'],
  ['meadows-row', 'Meadows row', 'back', 'barbell'],
  ['inverted-row', 'Inverted row', 'back', 'bodyweight'],
  ['shrug', 'Shrug', 'back', 'barbell'],
  // Omuz
  ['military-press', 'Military press', 'shoulders', 'barbell'],
  ['push-press', 'Push press', 'shoulders', 'barbell'],
  ['landmine-press', 'Landmine press', 'shoulders', 'barbell'],
  ['arnold-press', 'Arnold press', 'shoulders', 'dumbbell'],
  ['front-raise', 'Front raise', 'shoulders', 'dumbbell'],
  ['plate-front-raise', 'Plaka front raise', 'shoulders', 'other'],
  ['reverse-pec-deck', 'Reverse pec deck', 'shoulders', 'machine'],
  ['upright-row', 'Upright row', 'shoulders', 'barbell'],
  ['cuban-press', 'Cuban press', 'shoulders', 'dumbbell'],
  ['handstand-pushup', 'Amuda şınav', 'shoulders', 'bodyweight'],
  ['y-raise', 'Y raise', 'shoulders', 'dumbbell'],
  ['w-raise', 'W raise', 'shoulders', 'dumbbell'],
  ['scaption', 'Scaption', 'shoulders', 'dumbbell'],
  // Biceps
  ['ez-curl', 'EZ bar curl', 'biceps', 'barbell'],
  ['alt-curl', 'Dönüşümlü dambıl curl', 'biceps', 'dumbbell'],
  ['cross-hammer-curl', 'Çapraz hammer curl', 'biceps', 'dumbbell'],
  ['incline-curl', 'İncline dambıl curl', 'biceps', 'dumbbell'],
  ['spider-curl', 'Spider curl', 'biceps', 'dumbbell'],
  ['concentration-curl', 'Concentration curl', 'biceps', 'dumbbell'],
  ['bayesian-curl', 'Bayesian curl', 'biceps', 'cable'],
  ['reverse-curl', 'Reverse curl', 'biceps', 'barbell'],
  ['zottman-curl', 'Zottman curl', 'biceps', 'dumbbell'],
  ['drag-curl', 'Drag curl', 'biceps', 'barbell'],
  ['machine-curl', 'Curl makinesi', 'biceps', 'machine'],
  // Triceps
  ['ez-skullcrusher', 'EZ bar skull crusher', 'triceps', 'barbell'],
  ['jm-press', 'JM press', 'triceps', 'barbell'],
  ['french-press', 'French press', 'triceps', 'barbell'],
  ['rope-pushdown', 'Halat pushdown', 'triceps', 'cable'],
  ['reverse-pushdown', 'Ters tutuş pushdown', 'triceps', 'cable'],
  ['single-pushdown', 'Tek kol pushdown', 'triceps', 'cable'],
  ['overhead-rope-ext', 'Baş üstü halat extension', 'triceps', 'cable'],
  ['cable-kickback', 'Kablo triceps kickback', 'triceps', 'cable'],
  ['kickback', 'Dambıl kickback', 'triceps', 'dumbbell'],
  ['tate-press', 'Tate press', 'triceps', 'dumbbell'],
  ['bench-dip', 'Bench dip', 'triceps', 'bodyweight'],
  // Ön bacak
  ['goblet-squat', 'Goblet squat', 'quads', 'dumbbell', 'single'],
  ['hack-squat', 'Hack squat', 'quads', 'machine'],
  ['smith-squat', 'Smith squat', 'quads', 'machine'],
  ['cyclist-squat', 'Cyclist squat', 'quads', 'barbell'],
  ['walking-lunge', 'Yürüyerek lunge', 'quads', 'dumbbell'],
  ['reverse-lunge', 'Geriye lunge', 'quads', 'dumbbell'],
  ['curtsy-lunge', 'Curtsy lunge', 'quads', 'dumbbell'],
  ['step-up', 'Step-up', 'quads', 'dumbbell'],
  ['sissy-squat', 'Sissy squat', 'quads', 'bodyweight'],
  ['pistol-squat', 'Pistol squat', 'quads', 'bodyweight'],
  // Arka zincir
  ['stiff-leg-deadlift', 'Stiff-leg deadlift', 'posterior', 'barbell'],
  ['seated-leg-curl', 'Oturarak leg curl', 'posterior', 'machine'],
  ['nordic-curl', 'Nordic curl', 'posterior', 'bodyweight'],
  ['glute-ham-raise', 'Glute ham raise', 'posterior', 'bodyweight'],
  ['glute-bridge', 'Glute bridge', 'posterior', 'bodyweight'],
  ['frog-pump', 'Frog pump', 'posterior', 'bodyweight'],
  ['cable-pull-through', 'Kablo pull-through', 'posterior', 'cable'],
  ['glute-kickback', 'Kablo kalça kickback', 'posterior', 'cable'],
  // Baldır
  ['donkey-calf', 'Donkey calf raise', 'calves', 'machine'],
  // Karın
  ['crunch', 'Crunch', 'core', 'bodyweight'],
  ['situp', 'Mekik', 'core', 'bodyweight'],
  ['reverse-crunch', 'Reverse crunch', 'core', 'bodyweight'],
  ['bicycle-crunch', 'Bisiklet crunch', 'core', 'bodyweight'],
  ['toe-touch', 'Toe touch', 'core', 'bodyweight'],
  ['v-up', 'V-up', 'core', 'bodyweight'],
  ['jackknife', 'Jackknife', 'core', 'bodyweight'],
  ['hanging-knee-raise', 'Asılarak diz çekme', 'core', 'bodyweight'],
  ['dead-bug', 'Dead bug', 'core', 'bodyweight'],
  ['bird-dog', 'Bird dog', 'core', 'bodyweight'],
  ['russian-twist', 'Russian twist', 'core', 'bodyweight'],
  ['dragon-flag', 'Dragon flag', 'core', 'bodyweight'],
  ['mountain-climber', 'Mountain climber', 'core', 'bodyweight'],
  ['wood-chop', 'Kablo wood chop', 'core', 'cable'],
  ['pallof-press', 'Pallof press', 'core', 'cable'],
  ['plank', 'Plank', 'core', 'bodyweight', 'hold'],
  ['side-plank', 'Yan plank', 'core', 'bodyweight', 'hold'],
  // Kardiyo
  ['walk', 'Yürüyüş', 'cardio', 'bodyweight', 'hold'],
  ['jog', 'Hafif koşu', 'cardio', 'bodyweight', 'hold'],
  ['run', 'Koşu (serbest)', 'cardio', 'bodyweight', 'hold'],
  ['sprint', 'Sprint', 'cardio', 'bodyweight', 'hold'],
  ['swimming', 'Yüzme', 'cardio', 'bodyweight', 'hold'],
  ['cycling', 'Bisiklet', 'cardio', 'machine', 'hold'],
  ['rowing', 'Kürek makinesi', 'cardio', 'machine', 'hold'],
  ['elliptical', 'Eliptik', 'cardio', 'machine', 'hold'],
  ['stair-climber', 'Merdiven makinesi', 'cardio', 'machine', 'hold'],
  ['assault-bike', 'Assault bike', 'cardio', 'machine', 'hold'],
  ['jump-rope', 'İp atlama', 'cardio', 'other', 'hold'],
  ['battle-rope', 'Battle rope', 'cardio', 'other', 'hold'],
  ['burpee', 'Burpee', 'cardio', 'bodyweight'],
  ['high-knees', 'High knees', 'cardio', 'bodyweight'],
  ['jumping-jack', 'Jumping jack', 'cardio', 'bodyweight'],
  ['box-jump', 'Box jump', 'cardio', 'bodyweight'],
]

/*
 * Ek rank standartları (erkek, 1TM / vücut ağırlığı; dambılda tek el).
 * Makine ve kablo hareketlerinde değerler yaygın istif ağırlıklarına göredir;
 * makineden makineye kaldıraç farkı olabilir.
 */
const MORE_STD: Record<string, [start: number, elite: number]> = {
  // Göğüs
  'chest-press': [0.4, 2.0],
  'pec-deck': [0.3, 1.6],
  'decline-bench': [0.4, 2.1],
  'db-decline': [0.16, 0.9],
  'smith-bench': [0.35, 2.0],
  'guillotine-press': [0.25, 1.5],
  'hex-press': [0.12, 0.7],
  // Sırt
  'tbar-row': [0.35, 2.0],
  'face-pull': [0.15, 0.9],
  'rack-pull': [0.7, 3.4],
  'neutral-pullup': [0.85, 1.9],
  'wide-pullup': [0.8, 1.8],
  'close-pulldown': [0.35, 1.6],
  'reverse-pulldown': [0.35, 1.6],
  'straight-arm-pulldown': [0.15, 0.9],
  'pendlay-row': [0.3, 1.7],
  'seal-row': [0.25, 1.5],
  'chest-supported-row': [0.13, 0.8],
  'single-cable-row': [0.15, 0.9],
  'meadows-row': [0.15, 1.0],
  shrug: [0.5, 2.8],
  // Omuz
  'shoulder-press-machine': [0.25, 1.4],
  'rear-delt-fly': [0.03, 0.25],
  'cable-lateral': [0.03, 0.25],
  'military-press': [0.2, 1.3],
  'push-press': [0.25, 1.6],
  'landmine-press': [0.12, 0.9],
  'arnold-press': [0.09, 0.55],
  'front-raise': [0.04, 0.3],
  'reverse-pec-deck': [0.15, 0.9],
  'upright-row': [0.2, 1.2],
  // Biceps
  'cable-curl': [0.15, 1.0],
  'ez-curl': [0.15, 1.05],
  'alt-curl': [0.07, 0.48],
  'cross-hammer-curl': [0.07, 0.5],
  'incline-curl': [0.05, 0.4],
  'spider-curl': [0.05, 0.4],
  'concentration-curl': [0.05, 0.42],
  'bayesian-curl': [0.05, 0.45],
  'reverse-curl': [0.12, 0.8],
  'zottman-curl': [0.05, 0.4],
  'drag-curl': [0.13, 0.9],
  'machine-curl': [0.15, 1.0],
  // Triceps
  'ez-skullcrusher': [0.12, 0.95],
  'jm-press': [0.25, 1.5],
  'french-press': [0.1, 0.85],
  'rope-pushdown': [0.18, 1.1],
  'reverse-pushdown': [0.12, 0.85],
  'single-pushdown': [0.08, 0.55],
  'overhead-rope-ext': [0.15, 1.0],
  'cable-kickback': [0.03, 0.3],
  kickback: [0.03, 0.3],
  'tate-press': [0.05, 0.45],
  // Ön bacak
  'leg-extension': [0.3, 1.8],
  lunge: [0.1, 0.7],
  'goblet-squat': [0.15, 0.9],
  'hack-squat': [0.5, 3.0],
  'smith-squat': [0.45, 2.6],
  'cyclist-squat': [0.35, 2.0],
  'walking-lunge': [0.1, 0.7],
  'reverse-lunge': [0.1, 0.7],
  'curtsy-lunge': [0.08, 0.6],
  'step-up': [0.1, 0.65],
  // Arka zincir
  'leg-curl': [0.25, 1.4],
  'seated-leg-curl': [0.25, 1.4],
  'stiff-leg-deadlift': [0.45, 2.4],
  'cable-pull-through': [0.2, 1.3],
  'glute-kickback': [0.05, 0.5],
}

const toStd = (s?: [number, number]) => (s ? { start: s[0], elite: s[1] } : undefined)

const BASE: Exercise[] = [
  ...ROWS.map(
    ([id, name, muscle, equipment, std]): Exercise => ({
      id,
      name,
      muscle,
      equipment,
      load: equipment === 'bodyweight' ? 'bodyweight' : 'external',
      perHand: equipment === 'dumbbell' || undefined,
      std: toStd(std ?? MORE_STD[id]),
    }),
  ),
  ...EXTRA.map(
    ([id, name, muscle, equipment, flag]): Exercise => ({
      id,
      name,
      muscle,
      equipment,
      load: equipment === 'bodyweight' ? 'bodyweight' : 'external',
      perHand: (equipment === 'dumbbell' && flag !== 'single') || undefined,
      timed: flag === 'hold' || undefined,
      longer: flag === 'hold' || undefined,
      std: toStd(MORE_STD[id]),
    }),
  ),
]

/*
 * Varyasyonlar: ana hareketin tutuş, duruş, tempo ya da ekipman değişikliği.
 * Adı "Ana hareket (varyasyon)" biçimindedir; kendi geçmişi ve rekoru ayrı tutulur.
 * Ana hareketin standardı varsa varyasyon da rank'e sayılır; eşik, varyasyonun
 * zorluğuna göre ölçeklenir (VARIANT_STD). Bant, patlayıcı, tek bacak ve ağırlıklı
 * varyasyonlarda yük karşılaştırılamaz, onlar rank dışıdır.
 */
const MOD_NAME = {
  paused: 'duraklamalı',
  tempo: 'tempolu',
  explosive: 'patlayıcı',
  wide: 'geniş tutuş',
  close: 'dar tutuş',
  neutral: 'nötr tutuş',
  reverse: 'ters tutuş',
  single: 'tek kol',
  leg: 'tek bacak',
  alt: 'dönüşümlü',
  band: 'direnç bandı',
  kb: 'kettlebell',
  smith: 'Smith',
  seated: 'oturarak',
  standing: 'ayakta',
  weighted: 'ağırlıklı',
  sw: 'geniş duruş',
  sc: 'dar duruş',
  incline: 'incline',
  decline: 'decline',
} as const
type Mod = keyof typeof MOD_NAME

/** Güç hareketlerinin hepsine duraklamalı ve tempolu varyasyon eklenir. */
const STRENGTH: MuscleId[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'posterior',
  'calves',
]
const NO_TEMPO = new Set(['push-press'])

/** Harekete özel varyasyonlar: yalnızca gerçekten yapılanlar. */
const VARIANTS: Record<string, string> = {
  bench: 'explosive wide reverse band',
  'incline-bench': 'wide close reverse smith',
  'decline-bench': 'wide close smith',
  'db-bench': 'single alt neutral kb',
  'db-incline': 'single alt neutral',
  'db-decline': 'single alt',
  'chest-press': 'single incline decline',
  pushup: 'explosive single leg band weighted',
  'pec-deck': 'single',
  row: 'wide reverse smith explosive',
  pullup: 'explosive band',
  chinup: 'band',
  'lat-pulldown': 'wide neutral single band',
  'seated-row': 'wide neutral band',
  'tbar-row': 'wide close',
  'db-row': 'kb',
  'face-pull': 'band seated',
  shrug: 'smith kb',
  'inverted-row': 'weighted reverse',
  ohp: 'seated wide smith band kb',
  'db-shoulder-press': 'single alt neutral standing',
  'lateral-raise': 'single seated band',
  'rear-delt-fly': 'seated band',
  'front-raise': 'alt band',
  'upright-row': 'wide band kb smith',
  'arnold-press': 'standing single',
  'push-press': 'kb single',
  curl: 'wide close band',
  'db-curl': 'seated single',
  'hammer-curl': 'alt seated band',
  'preacher-curl': 'single reverse',
  'cable-curl': 'single reverse',
  'incline-curl': 'alt',
  'ez-curl': 'wide close reverse',
  'cg-bench': 'smith',
  skullcrusher: 'incline decline',
  pushdown: 'band',
  'overhead-ext': 'single seated band',
  kickback: 'alt',
  'bench-dip': 'weighted leg',
  squat: 'sw sc explosive band',
  'front-squat': 'kb smith',
  'leg-press': 'leg sw sc',
  'leg-extension': 'leg',
  'split-squat': 'smith kb',
  lunge: 'kb smith',
  'hack-squat': 'sc sw',
  'goblet-squat': 'kb',
  'step-up': 'kb',
  deadlift: 'band kb',
  rdl: 'leg kb smith band',
  'hip-thrust': 'leg band smith',
  'glute-bridge': 'leg weighted band',
  'back-extension': 'weighted leg',
  'stiff-leg-deadlift': 'kb',
  'cable-pull-through': 'band',
  'leg-curl': 'leg',
  'seated-leg-curl': 'leg',
  'calf-raise': 'leg',
  'seated-calf': 'leg',
}

/** Varyasyon kimliği → ana hareket kimliği. */
const VARIANT_BASE = new Map<string, string>()

/** Varyasyonun standart çarpanı; null: rank'e sayılmaz. */
function variantStd(base: Exercise, mod: Mod): number | null {
  switch (mod) {
    case 'paused':
      return 0.9
    case 'tempo':
      return 0.85
    case 'wide':
    case 'neutral':
    case 'seated':
    case 'smith':
      return 0.95
    case 'close':
    case 'sc':
      return 0.9
    case 'reverse':
    case 'incline':
      return 0.85
    case 'decline':
      return 1.05
    case 'standing':
    case 'sw':
    case 'alt':
      return 1
    case 'kb':
      return base.equipment === 'dumbbell' ? 1 : null
    case 'single':
      // Tek dambıl: eşik zaten tek el içindir. Kablo ve makinede yük yarıya iner.
      return base.equipment === 'dumbbell'
        ? 1
        : base.equipment === 'cable' || base.equipment === 'machine'
          ? 0.5
          : null
    default:
      return null
  }
}

function variant(base: Exercise, mod: Mod): Exercise {
  // Ekipman değişince addaki eski ekipman düşer: "Barbell row" → "Row (Smith)".
  const swap = mod === 'band' || mod === 'kb' || mod === 'smith'
  const stem = swap ? base.name.replace(/^Barbell |[Dd]ambıl /, '') : base.name
  const equipment: Equipment =
    mod === 'smith' ? 'machine' : mod === 'band' || mod === 'kb' ? 'other' : base.equipment
  const id = `${base.id}-v-${mod}`
  VARIANT_BASE.set(id, base.id)
  const k = base.std ? variantStd(base, mod) : null
  return {
    id,
    name: `${stem[0].toLocaleUpperCase('tr-TR')}${stem.slice(1)} (${MOD_NAME[mod]})`,
    muscle: base.muscle,
    equipment,
    load: base.load,
    perHand: (equipment === 'dumbbell' && mod !== 'single' && base.perHand) || undefined,
    std:
      base.std && k != null
        ? { start: +(base.std.start * k).toFixed(3), elite: +(base.std.elite * k).toFixed(3) }
        : undefined,
  }
}

function withVariants(base: Exercise[]): Exercise[] {
  const taken = new Set(base.map((e) => e.name.toLocaleLowerCase('tr-TR')))
  return base.flatMap((ex) => {
    if (ex.timed) return [ex]
    const mods: Mod[] = [
      ...((VARIANTS[ex.id]?.split(' ') ?? []) as Mod[]),
      ...(STRENGTH.includes(ex.muscle) && !NO_TEMPO.has(ex.id) ? (['paused', 'tempo'] as Mod[]) : []),
    ]
    const out = [ex]
    for (const m of mods) {
      const v = variant(ex, m)
      const key = v.name.toLocaleLowerCase('tr-TR')
      if (taken.has(key)) continue
      taken.add(key)
      out.push(v)
    }
    return out
  })
}

export const BUILTIN: Exercise[] = [
  ...withVariants(BASE),
  ...HYROX.map(
    ([id, name, target]): Exercise => ({
      id,
      name,
      muscle: 'hyrox',
      equipment: 'station',
      load: 'external',
      timed: true,
      target,
    }),
  ),
]

for (const e of BUILTIN) {
  const tr = e.name
  Object.defineProperty(e, 'name', { get: () => exLabel(tr, lang()), enumerable: true, configurable: true })
}

const BY_ID = new Map(BUILTIN.map((e) => [e.id, e]))

/** Hareketin çalıştırdığı bölgeler: kas grubundan daha ince ayrım. */
export const REGION_NAME = {
  chest: 'Göğüs',
  shoulders: 'Omuz',
  triceps: 'Triceps',
  biceps: 'Biceps',
  forearms: 'Ön kol',
  lats: 'Kanat',
  midback: 'Orta sırt',
  lowback: 'Bel',
  traps: 'Trapez',
  quads: 'Ön bacak',
  hams: 'Arka bacak',
  glutes: 'Kalça',
  adductors: 'İç bacak',
  calves: 'Baldır',
  abs: 'Karın',
} as const

export type Region = keyof typeof REGION_NAME
localize(MUSCLES, 'name')
localizeRecord(EQUIPMENT_NAME)
localizeRecord(REGION_NAME)

/** [ana bölgeler, yardımcı bölgeler] */
const TARGETS: Record<string, [Region[], Region[]]> = {
  bench: [['chest'], ['shoulders', 'triceps']],
  'incline-bench': [['chest'], ['shoulders', 'triceps']],
  'db-bench': [['chest'], ['shoulders', 'triceps']],
  'db-incline': [['chest'], ['shoulders', 'triceps']],
  dips: [['chest'], ['triceps', 'shoulders']],
  pushup: [['chest'], ['shoulders', 'triceps', 'abs']],
  'chest-press': [['chest'], ['shoulders', 'triceps']],
  'cable-fly': [['chest'], ['shoulders']],
  'pec-deck': [['chest'], []],
  row: [['midback'], ['lats', 'biceps', 'lowback']],
  pullup: [['lats'], ['biceps', 'midback', 'forearms']],
  chinup: [['lats'], ['biceps', 'midback', 'forearms']],
  'db-row': [['midback'], ['lats', 'biceps']],
  'lat-pulldown': [['lats'], ['biceps', 'midback']],
  'seated-row': [['midback'], ['lats', 'biceps']],
  'tbar-row': [['midback'], ['lats', 'biceps', 'lowback']],
  'face-pull': [['shoulders'], ['midback', 'traps']],
  ohp: [['shoulders'], ['triceps', 'traps', 'abs']],
  'db-shoulder-press': [['shoulders'], ['triceps']],
  'lateral-raise': [['shoulders'], ['traps']],
  'shoulder-press-machine': [['shoulders'], ['triceps']],
  'rear-delt-fly': [['shoulders'], ['midback', 'traps']],
  'cable-lateral': [['shoulders'], ['traps']],
  curl: [['biceps'], ['forearms']],
  'db-curl': [['biceps'], ['forearms']],
  'hammer-curl': [['biceps'], ['forearms']],
  'preacher-curl': [['biceps'], ['forearms']],
  'cable-curl': [['biceps'], ['forearms']],
  'cg-bench': [['triceps'], ['chest', 'shoulders']],
  skullcrusher: [['triceps'], []],
  pushdown: [['triceps'], []],
  'overhead-ext': [['triceps'], []],
  squat: [['quads'], ['glutes', 'hams', 'lowback']],
  'front-squat': [['quads'], ['glutes', 'abs']],
  'leg-press': [['quads'], ['glutes', 'hams']],
  'split-squat': [['quads'], ['glutes', 'hams']],
  'leg-extension': [['quads'], []],
  lunge: [['quads'], ['glutes', 'hams']],
  deadlift: [['hams', 'glutes', 'lowback'], ['quads', 'midback', 'traps', 'forearms']],
  'sumo-deadlift': [['glutes', 'hams'], ['quads', 'adductors', 'lowback', 'traps', 'forearms']],
  rdl: [['hams'], ['glutes', 'lowback', 'forearms']],
  'hip-thrust': [['glutes'], ['hams']],
  'leg-curl': [['hams'], []],
  'back-extension': [['lowback'], ['glutes', 'hams']],
  'hanging-leg-raise': [['abs'], ['forearms']],
  'cable-crunch': [['abs'], []],
  'ab-wheel': [['abs'], ['shoulders', 'lats']],
  'calf-raise': [['calves'], []],
  'seated-calf': [['calves'], []],
}

export function targets(id: string): { main: Region[]; assist: Region[] } | null {
  // Varyasyon, ana hareketinin bölgelerini çalıştırır.
  const t = TARGETS[id] ?? TARGETS[VARIANT_BASE.get(id) ?? '']
  return t ? { main: t[0], assist: t[1] } : null
}

/** Yapılış kareleri yalnızca hazır hareketlerde var: public/moves/<id>-0.webp ve -1.webp. */
const DEMO_IDS = new Set(ROWS.map((r) => r[0]))
export const hasDemo = (id: string) => DEMO_IDS.has(id)

/** Hareketin alt satırı: "Göğüs · Halter", süreli harekette "Hyrox · 1000 m". */
export function exerciseMeta(ex: Exercise): string {
  const tail = ex.timed && ex.target ? fmtTarget(ex.target) : EQUIPMENT_NAME[ex.equipment]
  return `${muscleName(ex.muscle)} · ${tail}${ex.perHand ? ' · tek el' : ''}`
}
export const demoFrames = (id: string): [string, string] => [
  `./moves/${id}-0.webp`,
  `./moves/${id}-1.webp`,
]

export function allExercises(custom: Exercise[]): Exercise[] {
  return [...BUILTIN, ...custom]
}

export function findExercise(id: string, custom: Exercise[] = []): Exercise {
  return (
    BY_ID.get(id) ??
    custom.find((e) => e.id === id) ?? {
      id,
      name: 'Silinmiş hareket',
      muscle: 'core',
      equipment: 'machine',
      load: 'external',
    }
  )
}

/** Türkçe karakterleri sadeleştirerek arama yapar: "sinav" → "Şınav". */
export function fold(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
}
