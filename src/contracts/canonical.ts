// Canonical JSON for plan hashes and deployment graph snapshot hashes (FRANCIS-PHASETASK §3.1, F-01).
// Sorted keys, no whitespace, strings escaped by JSON.stringify. Money stays as stroop strings, so
// numbers are limited to safe integers; floats, NaN, bigint and undefined are rejected.

export type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalValue[]
  | { readonly [key: string]: CanonicalValue };

export function canonicalJson(value: CanonicalValue): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'string':
      return JSON.stringify(value);
    case 'number':
      if (!Number.isSafeInteger(value)) throw new TypeError('canonicalJson: only safe integers are allowed');
      return String(value);
    case 'object': {
      if (Array.isArray(value)) return `[${(value as readonly CanonicalValue[]).map(canonicalJson).join(',')}]`;
      const obj = value as { readonly [key: string]: CanonicalValue };
      const keys = Object.keys(obj).sort();
      const parts: string[] = [];
      for (const k of keys) {
        const v = obj[k];
        if (v === undefined) throw new TypeError(`canonicalJson: undefined at "${k}"`);
        parts.push(`${JSON.stringify(k)}:${canonicalJson(v)}`);
      }
      return `{${parts.join(',')}}`;
    }
    default:
      throw new TypeError(`canonicalJson: unsupported type ${typeof value}`);
  }
}

/** Keys sort by UTF-16 code unit (default sort, not locale). Keep keys ASCII so SQL and JS agree. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function canonicalSha256(value: CanonicalValue): Promise<string> {
  return sha256Hex(canonicalJson(value));
}
