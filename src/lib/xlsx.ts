/**
 * Küçük, bağımlılıksız .xlsx okuyucu. İlk çalışma sayfasını string[][] tabloya çevirir;
 * importer bu tabloyu CSV gibi işler. .xlsx bir ZIP'tir: merkezi dizini okuyup gerekli
 * girişleri tarayıcının DecompressionStream'iyle açar, XML'i DOMParser ile ayrıştırır.
 * Eski ikili .xls biçimi desteklenmez.
 */

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw')
  const stream = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(ds)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

interface Entry {
  name: string
  method: number
  offset: number
  compSize: number
}

/** ZIP merkezi dizininden giriş listesini çıkarır. */
function readCentralDirectory(buf: Uint8Array): Entry[] {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  // End of Central Directory imzasını (0x06054b50) sondan geriye doğru ara.
  let eocd = -1
  for (let i = buf.length - 22; i >= 0 && i >= buf.length - 22 - 65536; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('not-zip')
  let p = dv.getUint32(eocd + 16, true) // merkezi dizin başlangıcı
  const count = dv.getUint16(eocd + 10, true)
  const entries: Entry[] = []
  const dec = new TextDecoder('utf-8')
  for (let i = 0; i < count && p + 46 <= buf.length; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break
    const method = dv.getUint16(p + 10, true)
    const compSize = dv.getUint32(p + 20, true)
    const nameLen = dv.getUint16(p + 28, true)
    const extraLen = dv.getUint16(p + 30, true)
    const commentLen = dv.getUint16(p + 32, true)
    const offset = dv.getUint32(p + 42, true)
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nameLen))
    entries.push({ name, method, offset, compSize })
    p += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

/** Bir girişin ham baytlarını, yerel başlığı atlayıp açarak döndürür. */
async function readEntry(buf: Uint8Array, e: Entry): Promise<string> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  if (dv.getUint32(e.offset, true) !== 0x04034b50) throw new Error('bad-local-header')
  const nameLen = dv.getUint16(e.offset + 26, true)
  const extraLen = dv.getUint16(e.offset + 28, true)
  const start = e.offset + 30 + nameLen + extraLen
  const comp = buf.subarray(start, start + e.compSize)
  const raw = e.method === 0 ? comp : await inflateRaw(comp)
  return new TextDecoder('utf-8').decode(raw)
}

/** "A1" / "BC12" → sütun indeksi (0 tabanlı). */
function colIndex(ref: string): number {
  let n = 0
  for (const ch of ref) {
    const c = ch.charCodeAt(0)
    if (c >= 65 && c <= 90) n = n * 26 + (c - 64)
    else break
  }
  return n - 1
}

function textOf(el: Element | null): string {
  if (!el) return ''
  // <t> ya da birden çok <r><t> parçası.
  return Array.from(el.querySelectorAll('t'))
    .map((t) => t.textContent ?? '')
    .join('')
}

/** İlk çalışma sayfasını string[][] olarak döndürür. Boş satırlar atlanır. */
export async function xlsxToTable(ab: ArrayBuffer): Promise<string[][]> {
  const buf = new Uint8Array(ab)
  const entries = readCentralDirectory(buf)
  const sheet = entries
    .filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(e.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))[0]
  if (!sheet) throw new Error('no-sheet')

  const parser = new DOMParser()
  const shEntry = entries.find((e) => e.name === 'xl/sharedStrings.xml')
  let shared: string[] = []
  if (shEntry) {
    const doc = parser.parseFromString(await readEntry(buf, shEntry), 'application/xml')
    shared = Array.from(doc.getElementsByTagName('si')).map((si) => textOf(si))
  }

  const doc = parser.parseFromString(await readEntry(buf, sheet), 'application/xml')
  const rows: string[][] = []
  for (const row of Array.from(doc.getElementsByTagName('row'))) {
    const cells: string[] = []
    for (const c of Array.from(row.getElementsByTagName('c'))) {
      const ref = c.getAttribute('r') ?? ''
      const idx = ref ? colIndex(ref) : cells.length
      const type = c.getAttribute('t')
      let val = ''
      if (type === 's') {
        const i = Number(c.querySelector('v')?.textContent ?? '')
        val = shared[i] ?? ''
      } else if (type === 'inlineStr') {
        val = textOf(c.querySelector('is'))
      } else {
        val = c.querySelector('v')?.textContent ?? c.querySelector('t')?.textContent ?? ''
      }
      while (cells.length < idx) cells.push('')
      cells[idx] = val
    }
    if (cells.some((x) => x.trim() !== '')) rows.push(cells)
  }
  return rows
}

/** string[][] → CSV (gerekli hücreler tırnaklanır). */
export function tableToCsv(table: string[][]): string {
  const cell = (v: string) => (/[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v)
  return table.map((r) => r.map(cell).join(',')).join('\n')
}
