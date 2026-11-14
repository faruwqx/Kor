import { describe, expect, it } from 'vitest'
import { SAMPLE_BOARD, placeBoard } from './leaderboard'

describe('placeBoard', () => {
  it("RP'ye göre büyükten küçüğe dizer ve kullanıcıyı yerleştirir", () => {
    const { rows, mine } = placeBoard(SAMPLE_BOARD, { name: 'Ben', rp: 1000 })
    expect(rows).toHaveLength(SAMPLE_BOARD.length + 1)
    expect(rows.map((r) => r.rp)).toEqual([...rows.map((r) => r.rp)].sort((a, b) => b - a))
    expect(mine).toMatchObject({ name: 'Ben', place: 10, me: true })
  })

  it('eşit RP aynı sırayı paylaşır, kullanıcı üstte durur', () => {
    const { rows } = placeBoard(
      [
        { id: 'a', name: 'A', rp: 500 },
        { id: 'b', name: 'B', rp: 300 },
      ],
      { name: 'Ben', rp: 500 },
    )
    expect(rows.map((r) => [r.name, r.place])).toEqual([
      ['Ben', 1],
      ['A', 1],
      ['B', 3],
    ])
  })

  it('kullanıcı yoksa liste olduğu gibi sıralanır', () => {
    const { rows, mine } = placeBoard(
      [
        { id: 'a', name: 'A', rp: 100 },
        { id: 'b', name: 'B', rp: 900, me: true },
      ],
      null,
    )
    expect(rows.map((r) => r.name)).toEqual(['B', 'A'])
    expect(mine?.place).toBe(1)
  })
})
