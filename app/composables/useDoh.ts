export type DohProvider = 'cloudflare' | 'google'

export interface DohAnswer { name: string, type: number, TTL: number, data: string }
export interface DohResponse { Status: number, Answer?: DohAnswer[] }

export const DNS_TYPES: Record<number, string> = {
  1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 15: 'MX', 16: 'TXT', 28: 'AAAA', 257: 'CAA'
}

export const DNS_STATUS: Record<number, string> = {
  0: 'NOERROR', 1: 'FORMERR', 2: 'SERVFAIL', 3: 'NXDOMAIN', 4: 'NOTIMP', 5: 'REFUSED'
}

/** DNS-over-HTTPS lookup; both providers allow cross-origin requests from the browser. */
export async function resolveDns(name: string, type: string, provider: DohProvider = 'cloudflare'): Promise<DohResponse> {
  const base = provider === 'cloudflare' ? 'https://cloudflare-dns.com/dns-query' : 'https://dns.google/resolve'
  const res = await fetch(`${base}?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`, {
    headers: { accept: 'application/dns-json' }
  })
  if (!res.ok) throw new Error(`${provider} returned HTTP ${res.status}`)
  return res.json()
}
