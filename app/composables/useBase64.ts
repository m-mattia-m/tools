export function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  let s = b64.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  s = s.padEnd(Math.ceil(s.length / 4) * 4, '=')
  return Uint8Array.from(atob(s), ch => ch.charCodeAt(0))
}

export const utf8ToBase64 = (text: string) => bytesToBase64(new TextEncoder().encode(text))
export const base64ToUtf8 = (b64: string) =>
  new TextDecoder('utf-8', { fatal: true }).decode(base64ToBytes(b64))
