import { describe, expect, it } from 'vitest'
import { isCode, newRoomCode, normalizeCode, parsePeer, parseReps } from './duel'
import { pushBoard, pushRp, repsForRp } from './pushRank'
import { angle, initPush, readPose, stepPush, type Pose, type Pt } from './pushup'

const pose = (elbow: number, body = 175, tilt = 10): Pose => ({ elbow, body, tilt, points: [] })
const run = (frames: Pose[]) => frames.reduce(stepPush, initPush())

describe('şınav sayacı', () => {
  it('açı hesabı', () => {
    expect(angle({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90)
    expect(angle({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(180)
  })

  it('tam iniş ve kalkış bir tekrar sayılır', () => {
    const s = run([pose(170), pose(130), pose(80), pose(75), pose(120), pose(170), pose(170)])
    expect(s.reps).toBe(1)
    expect(s.phase).toBe('up')
  })

  it('üç tekrar', () => {
    const rep = [pose(170), pose(80), pose(80), pose(170), pose(170)]
    expect(run([...rep, ...rep, ...rep]).reps).toBe(3)
  })

  it('yarım iniş sayılmaz ve "daha aşağı" uyarısı verir', () => {
    const s = run([pose(170), pose(125), pose(120), pose(170), pose(170)])
    expect(s.reps).toBe(0)
    expect(s.feedback).toBe('lower')
  })

  it('inişte kalça düşerse tekrar sayılmaz', () => {
    const s = run([pose(170), pose(80), pose(80, 120), pose(170), pose(170)])
    expect(s.reps).toBe(0)
    expect(s.feedback).toBe('straight')
  })

  it('ayaktayken (dik gövde) ve vücut görünmezken sayılmaz', () => {
    expect(run([pose(170, 175, 80), pose(80, 175, 80), pose(170, 175, 80)]).reps).toBe(0)
    expect(stepPush(initPush(), null).feedback).toBe('nobody')
  })

  it('yan profilden plank pozunu okur, görünmeyen noktada null döner', () => {
    const lm: Pt[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }))
    // Sol yan: omuz, dirsek, bilek, kalça, diz, ayak bileği. Kol 90°, gövde düz, yatay.
    const set = (i: number, x: number, y: number) => (lm[i] = { x, y, visibility: 0.9 })
    set(11, 0.3, 0.5)
    set(13, 0.3, 0.6)
    set(15, 0.4, 0.6)
    set(23, 0.55, 0.5)
    set(25, 0.68, 0.5)
    set(27, 0.8, 0.5)
    const p = readPose(lm, 1)!
    expect(p.elbow).toBeCloseTo(90)
    expect(p.body).toBeCloseTo(180)
    expect(p.tilt).toBeCloseTo(0)
    lm[13].visibility = 0.1
    expect(readPose(lm, 1)).toBeNull()
  })
})

describe('düello mesajları', () => {
  it('oda kodu 6 karakter, karışan harf yok; yazılan kod temizlenir', () => {
    const c = newRoomCode()
    expect(isCode(c)).toBe(true)
    expect(c).not.toMatch(/[O0I1]/)
    expect(normalizeCode(' ab-c2d3e ')).toBe('ABC2D3')
  })

  it('geçersiz mesaj yok sayılır, ad ve puan sınırlanır', () => {
    expect(parsePeer({ id: 'abcd-1', name: '  Ali  ', rp: 9999 })).toEqual({
      id: 'abcd-1',
      name: 'Ali',
      rp: 2400,
    })
    expect(parsePeer({ id: 'x', rp: 10 })).toBeNull()
    expect(parsePeer({ id: 'abcd-1', name: 'a'.repeat(80), rp: 1 })!.name).toHaveLength(24)
    expect(parseReps(12)).toBe(12)
    expect(parseReps(-1)).toBeNull()
    expect(parseReps(1.5)).toBeNull()
    expect(parseReps('5')).toBeNull()
  })
})

describe('şınav rank\'i', () => {
  it('erkekte dakikada 52, kadında 31 şınav Kor eşiği; eşikler tutarlı', () => {
    expect(pushRp(52, 'm')).toBe(2100)
    expect(pushRp(31, 'f')).toBe(2100)
    expect(pushRp(0, 'm')).toBe(0)
    expect(pushRp(repsForRp(300, 'm'), 'm')).toBeGreaterThanOrEqual(300)
    expect(pushRp(repsForRp(300, 'm') - 1, 'm')).toBeLessThan(300)
  })

  it('en iyi seans rank\'i belirler; düello galibiyetleri sayılır', () => {
    const b = pushBoard(
      [
        { id: 'a', at: 1, reps: 20, seconds: 60, mode: 'solo' },
        { id: 'b', at: 2, reps: 31, seconds: 60, mode: 'duel', opponent: 'Ali', opponentReps: 25 },
        { id: 'c', at: 3, reps: 18, seconds: 60, mode: 'duel', opponent: 'Can', opponentReps: 22 },
      ],
      'm',
    )
    expect(b.best?.reps).toBe(31)
    expect(b.rank?.rp).toBe(pushRp(31, 'm'))
    expect(b.duels).toEqual({ played: 2, won: 1 })
    expect(pushBoard([], 'm').rank).toBeNull()
  })
})
