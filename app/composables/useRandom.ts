/** Unbiased random integer in [0, max) using the Web Crypto API. */
export function randomInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max
  const buf = new Uint32Array(1)
  do {
    crypto.getRandomValues(buf)
  } while (buf[0]! >= limit)
  return buf[0]! % max
}

export function randomString(charset: string, length: number): string {
  let out = ''
  for (let i = 0; i < length; i++) out += charset[randomInt(charset.length)]
  return out
}

export function pick<T>(items: readonly T[]): T {
  return items[randomInt(items.length)]!
}
