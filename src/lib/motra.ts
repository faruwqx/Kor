/**
 * Motra hareket kütüphanesinin Kor'a aktarımı. Kor'un kaba `muscle` + rank modeli
 * bozulmadan, her harekete ince Motra kategorileri (`cats`) ve ekipman (`gear`)
 * eklenir; Library bunları Motra tarzı sekme + ekipman filtresiyle gösterir.
 * Standardı olmayan hareketler kişisel rank alır (bkz. personalRank).
 *
 * Veri parti parti (kategori kategori) ekleniyor. Her harekette birincil kategori
 * ilk sırada; Kor kas grubu ve ekipmanı buradan türetilir.
 */
import type { Equipment, Exercise, MuscleId } from './types'

/** İnce Motra kas kategorileri (id → TR ad). Library sekme sırası budur. */
export const MCATS: { id: string; name: string }[] = [
  { id: 'abs', name: 'Karın' },
  { id: 'obliques', name: 'Yan karın' },
  { id: 'hipflexors', name: 'Kalça fleksörü' },
  { id: 'lats', name: 'Lat' },
  { id: 'traps', name: 'Trapez' },
  { id: 'lowerback', name: 'Bel' },
  { id: 'hamstrings', name: 'Arka bacak' },
  { id: 'glutes', name: 'Kalça' },
  { id: 'quads', name: 'Ön bacak' },
  { id: 'adductors', name: 'İç bacak' },
  { id: 'abductors', name: 'Dış bacak' },
  { id: 'calves', name: 'Baldır' },
  { id: 'chest', name: 'Göğüs' },
  { id: 'shoulders', name: 'Omuz' },
  { id: 'biceps', name: 'Biceps' },
  { id: 'triceps', name: 'Triceps' },
  { id: 'forearms', name: 'Ön kol' },
]
export const MCAT_NAME: Record<string, string> = Object.fromEntries(MCATS.map((c) => [c.id, c.name]))

/** Motra ekipman etiketleri (id → TR ad). "All Equipment" filtresi budur. */
export const MGEAR: { id: string; name: string }[] = [
  { id: 'barbell', name: 'Halter' },
  { id: 'dumbbell', name: 'Dambıl' },
  { id: 'kettlebell', name: 'Kettlebell' },
  { id: 'cable', name: 'Kablo makinesi' },
  { id: 'machine', name: 'Makine' },
  { id: 'bodyweight', name: 'Vücut ağırlığı' },
  { id: 'ezbar', name: 'EZ bar' },
  { id: 'medicineball', name: 'Sağlık topu' },
  { id: 'resistanceband', name: 'Direnç bandı' },
  { id: 'suspension', name: 'Askı bandı' },
  { id: 'balance', name: 'Denge aleti' },
  { id: 'stabilityball', name: 'Pilates topu' },
  { id: 'plate', name: 'Plaka' },
  { id: 'sandbag', name: 'Kum torbası' },
  { id: 'other', name: 'Diğer' },
]
export const MGEAR_NAME: Record<string, string> = Object.fromEntries(MGEAR.map((g) => [g.id, g.name]))

/** Motra ince kategori → Kor kaba kas grubu (rank için). */
const CAT2MUSCLE: Record<string, MuscleId> = {
  abs: 'core',
  obliques: 'core',
  hipflexors: 'core',
  lats: 'back',
  traps: 'back',
  lowerback: 'posterior',
  hamstrings: 'posterior',
  glutes: 'posterior',
  abductors: 'posterior',
  quads: 'quads',
  adductors: 'quads',
  calves: 'calves',
  chest: 'chest',
  shoulders: 'shoulders',
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'biceps',
}

/** Motra ekipman → Kor ekipman (yük tipi ve rank için). */
const GEAR2EQUIP: Record<string, Equipment> = {
  barbell: 'barbell',
  ezbar: 'barbell',
  dumbbell: 'dumbbell',
  cable: 'cable',
  machine: 'machine',
  bodyweight: 'bodyweight',
  kettlebell: 'other',
  medicineball: 'other',
  resistanceband: 'other',
  suspension: 'other',
  balance: 'other',
  stabilityball: 'other',
  plate: 'other',
  sandbag: 'other',
  other: 'other',
}

/** [ad, kategoriler ('|' ayraçlı, ilki ana), ekipman] */
type MRow = [name: string, cats: string, gear: string]

// — Karın (Abs) —
const ABS: MRow[] = [
  ['Bodyweight Decline Sit-Up with Twist', 'abs|obliques', 'bodyweight'],
  ['L-Sit', 'abs|hipflexors', 'bodyweight'],
  ['Dumbbell Push Crunch', 'abs', 'dumbbell'],
  ['Dumbbell Reverse Crunch', 'abs', 'dumbbell'],
  ['Dumbbell Side Plank', 'obliques|abs|glutes', 'dumbbell'],
  ['Weighted Sit-Up on Stability Ball', 'abs', 'stabilityball'],
  ['Dumbbell Sit-Up & Press', 'obliques|shoulders|abs', 'dumbbell'],
  ['Dumbbell V-Up', 'abs|hipflexors', 'dumbbell'],
  ['Medicine Ball Decline Sit Up with Toss', 'abs|obliques', 'medicineball'],
  ['Kettlebell Dead Bug', 'abs|obliques', 'kettlebell'],
  ['Kettlebell Decline Overhead Sit-Up', 'abs', 'kettlebell'],
  ['Kettlebell Decline Sit-Up with Twist', 'abs|obliques', 'kettlebell'],
  ['Kettlebell Half Kneeling Chop', 'obliques|abs', 'kettlebell'],
  ['Kettlebell High Low Carry', 'shoulders|abs|obliques|forearms', 'kettlebell'],
  ['Kettlebell Overhead Carry', 'shoulders|traps|abs|obliques', 'kettlebell'],
  ['Kettlebell Overhead March', 'abs|obliques|shoulders', 'kettlebell'],
  ['Kettlebell Push Crunch', 'abs', 'kettlebell'],
  ['Kettlebell Reverse Crunch', 'abs', 'kettlebell'],
  ['Plate Overhead Carry', 'shoulders|traps|abs|obliques', 'plate'],
  ['Plate Overhead March', 'abs|obliques|shoulders', 'plate'],
  ['Plate Push Crunch', 'abs', 'plate'],
  ['Plate Reverse Crunch', 'abs', 'plate'],
  ['Plate Sit-Up & Press', 'abs|shoulders|obliques', 'plate'],
  ['Plate Suitcase Hold', 'obliques|abs|lowerback', 'plate'],
  ['Forearm Plank Hip Abduction', 'abs|obliques|abductors', 'bodyweight'],
  ['Hollow Rock', 'abs|obliques', 'bodyweight'],
  ['In And Out', 'abs|hipflexors', 'bodyweight'],
  ['Resistance Band Pallof Press and Twist', 'obliques|abs', 'resistanceband'],
  ['Resistance Band Standing Crunch', 'abs|obliques', 'resistanceband'],
  ['Resistance Band Toe-Touch Crunch', 'abs', 'resistanceband'],
  ['Reverse Bear Crawl', 'shoulders|abs', 'bodyweight'],
  ['Sandbag Bear Hug Walk', 'abs', 'sandbag'],
  ['Shadow Boxing', 'shoulders|triceps|abs', 'bodyweight'],
  ['Mini Loop Band Mountain Climber', 'abs|obliques|hipflexors', 'resistanceband'],
  ['Mini Loop Band Plank Row', 'lats|abs', 'resistanceband'],
  ['Plate Decline Overhead Sit-Up', 'abs', 'plate'],
  ['Stability Ball Ab Rollout', 'abs', 'stabilityball'],
  ['Stability Ball Deadbug', 'abs', 'stabilityball'],
  ['Stability Ball Leg Raise', 'abs|hipflexors', 'stabilityball'],
  ['Stability Ball Mountain Climbers', 'abs|hipflexors', 'stabilityball'],
  ['Stability Ball Pike', 'abs|obliques', 'stabilityball'],
  ['Stability Ball Pull In', 'abs|obliques', 'stabilityball'],
  ['Stability Ball Push-Up', 'chest|abs', 'stabilityball'],
  ['Stability Ball Rollout', 'abs|obliques', 'stabilityball'],
  ['Stability Ball Sprinters', 'abs|obliques|hipflexors', 'stabilityball'],
  ['Kettlebell Wood Chop', 'obliques|abs|lats', 'kettlebell'],
  ['Kipping Pull-Up', 'lats|abs', 'bodyweight'],
  ['Medicine Ball Overhead Lunge', 'quads|glutes|abs', 'medicineball'],
  ['Dumbbell Goblet Carry', 'abs|obliques|forearms', 'dumbbell'],
  ['Dumbbell Kneeling Wood Chop', 'obliques|abs', 'dumbbell'],
  ['Barbell Ab Rollout', 'abs', 'barbell'],
  ['Squat Thrust', 'quads|abs', 'bodyweight'],
  ['Stability Ball Abdominal Twist', 'obliques|abs', 'stabilityball'],
  ['Stability Ball Bicycle Crunch', 'abs|obliques', 'stabilityball'],
  ['Stability Ball Crunch', 'abs', 'stabilityball'],
  ['Kettlebell Goblet Carry', 'abs|obliques|forearms', 'kettlebell'],
  ['Kettlebell Kneeling Wood Chop', 'obliques|abs', 'kettlebell'],
  ['Kettlebell Renegade Row', 'lats|abs', 'kettlebell'],
  ['Boat Hold', 'abs|obliques|hipflexors', 'bodyweight'],
  ['Dumbbell Plank Pull Through', 'abs|obliques', 'dumbbell'],
  ['Dumbbell Sit-Up', 'abs', 'dumbbell'],
  ['Dumbbell Wood Chop', 'obliques|abs', 'dumbbell'],
  ['Elevated Plank', 'abs|obliques', 'bodyweight'],
  ['Kettlebell Turkish Get Up', 'shoulders|abs', 'kettlebell'],
  ['Prone Abdominal Stretch', 'abs', 'bodyweight'],
  ['Resistance Band High-to-Low Wood Chop', 'obliques|abs', 'resistanceband'],
  ['Resistance Band Kneeling Pallof Press', 'obliques|abs', 'resistanceband'],
  ['Resistance Band Low-to-High Wood Chop', 'obliques|abs', 'resistanceband'],
  ['Flutter Kick', 'abs|hipflexors', 'bodyweight'],
  ['Hanging Leg Raise', 'abs|hipflexors', 'bodyweight'],
  ['Hollow Hold', 'abs|obliques', 'bodyweight'],
  ['Jumping Mountain Climber', 'abs|obliques|hipflexors', 'bodyweight'],
  ['Rotating Mountain Climber', 'obliques|abs', 'bodyweight'],
  ['Scissor Kick', 'abs|obliques', 'bodyweight'],
  ['Navy Seal Burpee', 'chest|shoulders|abs|glutes|quads', 'bodyweight'],
  ['Resistance Band Pallof Press Walk Out', 'abs|obliques', 'resistanceband'],
  ['Pelvic Tilt', 'abs', 'bodyweight'],
  ['Plank Jack', 'abs|obliques', 'bodyweight'],
  ['Plank Jack on Elbows', 'abs|obliques', 'bodyweight'],
  ['Plank Reach Through', 'abs|obliques', 'bodyweight'],
  ['Plank Walk Out', 'abs|obliques', 'bodyweight'],
  ['Plate Sit-Up', 'abs', 'plate'],
  ['V-Up', 'abs|hipflexors', 'bodyweight'],
  ['Warrior 3 Pose', 'abs|glutes', 'bodyweight'],
  ['Weighted Decline Sit-Up', 'abs', 'other'],
  ['Weighted Hanging Knee Raise', 'abs|obliques', 'other'],
  ['Trunk Rotation', 'obliques|abs', 'bodyweight'],
  ['Crunch Kicks', 'abs', 'bodyweight'],
  ['Medicine Ball Decline Overhead Sit-Up', 'abs', 'medicineball'],
  ['Dumbbell Decline Overhead Sit-Up', 'abs', 'dumbbell'],
  ['Dumbbell Bird Dog', 'abs', 'dumbbell'],
  ['Cross Body Mountain Climber', 'obliques|abs', 'bodyweight'],
  ['Plank to Downward Facing Dog', 'abs|shoulders', 'bodyweight'],
  ['Plank Twist', 'obliques|abs', 'bodyweight'],
  ['Plate Crunch', 'abs', 'plate'],
  ['Plate Russian Twist', 'obliques|abs', 'plate'],
  ['Kettlebell Crunch', 'abs', 'kettlebell'],
  ['Kettlebell Front Rack Squat', 'quads|glutes|abs', 'kettlebell'],
  ['Decline Sit-Up', 'abs', 'bodyweight'],
  ['Lying Leg Raise', 'abs|hipflexors', 'bodyweight'],
  ['Dumbbell Crunch', 'abs', 'dumbbell'],
  ['Burpee with Tuck Jump', 'quads|abs|glutes', 'bodyweight'],
  ['Cable Pallof Hold', 'obliques|abs', 'cable'],
  ["Captain's Chair Knee Raise", 'abs|hipflexors', 'machine'],
  ["Captain's Chair Leg Raise", 'abs|hipflexors', 'machine'],
  ['Double Crunch', 'abs|hipflexors', 'bodyweight'],
  ['Resistance Band Pallof Hold', 'obliques|abs', 'resistanceband'],
  ['Resistance Band Pallof Press', 'obliques|abs', 'resistanceband'],
  ['Stability Ball Jackknife Sit-Up', 'hipflexors|abs|obliques', 'stabilityball'],
  ['Stability Ball Plank', 'abs|obliques', 'stabilityball'],
  ['Toes to Bar', 'abs|hipflexors|obliques', 'bodyweight'],
  ['Suspension Trainer Forearm Plank', 'abs|obliques', 'suspension'],
  ['Suspension Trainer Knee Tuck', 'abs', 'suspension'],
  ['Suspension Trainer Mountain Climber', 'abs|obliques', 'suspension'],
  ['Suspension Trainer Plank', 'abs|obliques', 'suspension'],
  ['Up Downs', 'quads|glutes|abs', 'bodyweight'],
  ['Kettlebell Russian Twist', 'obliques|abs', 'kettlebell'],
  ['Crunch', 'abs', 'bodyweight'],
  ['Sit-Up', 'abs|hipflexors', 'bodyweight'],
  ['Dead Bug', 'abs', 'bodyweight'],
  ['Reverse Crunch', 'abs', 'bodyweight'],
  ['Dumbbell Russian Twist', 'obliques|abs', 'dumbbell'],
  ['Mountain Climber', 'abs|hipflexors', 'bodyweight'],
  ['Plank Tap', 'abs|obliques', 'bodyweight'],
  ['Bicycle Crunch', 'abs|obliques', 'bodyweight'],
  ['Bird Dog', 'abs|glutes', 'bodyweight'],
]

const slug = (s: string) =>
  'm-' +
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

function build(rows: MRow[]): Exercise[] {
  return rows.map(([name, cats, gear]) => {
    const cat = cats.split('|')
    const equipment = GEAR2EQUIP[gear] ?? 'other'
    return {
      id: slug(name),
      name,
      muscle: CAT2MUSCLE[cat[0]] ?? 'core',
      equipment,
      load: equipment === 'bodyweight' ? 'bodyweight' : 'external',
      cats: cat,
      gear,
    }
  })
}

/** Aktarılan tüm Motra hareketleri (parti parti büyür). */
export const MOTRA_EXERCISES: Exercise[] = [...build(ABS)]
