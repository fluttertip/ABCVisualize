/**
 * Tiny ZIP writer (no library): "stored" entries, i.e. no compression. That is the right choice here because the files are PNGs,
 * which are already compressed, so deflating them again would save nothing.
 */
let CRC_TABLE: Uint32Array | null = null
export function crc32(data: Uint8Array): number {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256)
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC_TABLE[n] = c >>> 0 }
  }
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export interface ZipFile { name: string; data: Uint8Array }

export function makeZip(files: ZipFile[], when: Date = new Date()): Blob {
  const enc = new TextEncoder()
  const dosTime = (when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1)
  const dosDate = (Math.max(0, when.getFullYear() - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate()
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  const u16 = (v: DataView, o: number, n: number) => v.setUint16(o, n, true)
  const u32 = (v: DataView, o: number, n: number) => v.setUint32(o, n, true)

  for (const f of files) {
    const name = enc.encode(f.name)
    const crc = crc32(f.data), size = f.data.length

    const lh = new Uint8Array(30 + name.length), lv = new DataView(lh.buffer)
    u32(lv, 0, 0x04034b50); u16(lv, 4, 20); u16(lv, 6, 0x0800); u16(lv, 8, 0)      // version 2.0, UTF-8 names, method 0 = stored
    u16(lv, 10, dosTime); u16(lv, 12, dosDate); u32(lv, 14, crc); u32(lv, 18, size); u32(lv, 22, size)
    u16(lv, 26, name.length); u16(lv, 28, 0); lh.set(name, 30)

    const ch = new Uint8Array(46 + name.length), cv = new DataView(ch.buffer)
    u32(cv, 0, 0x02014b50); u16(cv, 4, 20); u16(cv, 6, 20); u16(cv, 8, 0x0800); u16(cv, 10, 0)
    u16(cv, 12, dosTime); u16(cv, 14, dosDate); u32(cv, 16, crc); u32(cv, 20, size); u32(cv, 24, size)
    u16(cv, 28, name.length); u16(cv, 30, 0); u16(cv, 32, 0); u16(cv, 34, 0); u16(cv, 36, 0); u32(cv, 38, 0); u32(cv, 42, offset)
    ch.set(name, 46)

    parts.push(lh, f.data); central.push(ch)
    offset += lh.length + size
  }

  const cdSize = central.reduce((a, c) => a + c.length, 0)
  const end = new Uint8Array(22), ev = new DataView(end.buffer)
  u32(ev, 0, 0x06054b50); u16(ev, 4, 0); u16(ev, 6, 0); u16(ev, 8, files.length); u16(ev, 10, files.length)
  u32(ev, 12, cdSize); u32(ev, 16, offset); u16(ev, 20, 0)
  return new Blob([...parts, ...central, end] as BlobPart[], { type: 'application/zip' })
}
