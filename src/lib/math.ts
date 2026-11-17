export const DEG2RAD = Math.PI / 180
export const RAD2DEG = 180 / Math.PI
export const norm360 = (d: number) => ((d % 360) + 360) % 360

export function fmtDMS(deg: number) {
  const d = Math.floor(deg)
  const mf = (deg - d) * 60
  const m = Math.floor(mf)
  const s = Math.floor((mf - m) * 60)
  return `${String(d).padStart(2, '0')}°${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"`
}
export function fmtDM(deg: number) {
  const d = Math.floor(deg)
  const m = Math.floor((deg - d) * 60)
  return `${String(d).padStart(2, '0')}°${String(m).padStart(2, '0')}'`
}
