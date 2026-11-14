/** Sıralama: genel RP'ye göre dizilir, eşit RP aynı sırayı paylaşır. */

export interface BoardEntry {
  id: string
  name: string
  rp: number
  /** Bu cihazdaki kullanıcının satırı. */
  me?: boolean
}

export interface PlacedEntry extends BoardEntry {
  place: number
}

const SAMPLE: [name: string, rp: number][] = [
  ['Deniz K.', 2140],
  ['Emre A.', 1985],
  ['Zeynep T.', 1870],
  ['Mert Y.', 1720],
  ['Elif Ş.', 1610],
  ['Can B.', 1490],
  ['Selin D.', 1365],
  ['Burak Ö.', 1240],
  ['Ayşe N.', 1110],
  ['Kaan U.', 980],
  ['Ece G.', 845],
  ['Onur P.', 700],
  ['İrem C.', 560],
  ['Tolga M.', 410],
  ['Naz E.', 260],
]

/**
 * Hesap bağlı değilken gösterilen uydurma liste. Gerçek kişileri temsil etmez;
 * ekranda her zaman "örnek" diye etiketlenir.
 */
export const SAMPLE_BOARD: BoardEntry[] = SAMPLE.map(([name, rp], i) => ({
  id: `sample-${i}`,
  name,
  rp,
}))

/** `me` verilirse listeye eklenir. Eşit RP'de kullanıcının satırı üstte durur. */
export function placeBoard(
  entries: BoardEntry[],
  me: { name: string; rp: number } | null,
): { rows: PlacedEntry[]; mine: PlacedEntry | null } {
  const all: BoardEntry[] = me ? [...entries, { id: 'me', name: me.name, rp: me.rp, me: true }] : [...entries]
  all.sort((a, b) => b.rp - a.rp || Number(!!b.me) - Number(!!a.me))
  let place = 0
  let last = Number.NaN
  const rows = all.map((e, i) => {
    if (e.rp !== last) {
      place = i + 1
      last = e.rp
    }
    return { ...e, place }
  })
  return { rows, mine: rows.find((e) => e.me) ?? null }
}
