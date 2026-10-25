// Level: MOCKED (static scan). G7 copy review, automated part: user-facing source must not overclaim.
// Never "tampered" (a mismatch only means the bytes differ), never "tamper-proof" / "immutable" / "anchored on Stellar"
// (the ledger is an application hash chain in a database the team controls, not Stellar and not public anchoring).
// Comment-only lines are skipped. The human copy review with Shanti (S-23) is still required.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd(), 'src');
const SKIP_FILES = new Set([join('contracts', 'state-copy.ts')]); // states the rules themselves
const BANNED: [string, RegExp][] = [
  ['"tampered"', /tampered/i],
  ['"tamper-proof"', /tamper-?proof/i],
  ['"immutable"', /\bimmutable\b/i],
  ['"anchored on Stellar"', /anchored\s+(on|to)\s+stellar/i],
  ['"stored on Stellar"', /stored\s+on\s+stellar/i],
  ['"guaranteed"', /\bguaranteed\b/i],
];

function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* files(full);
    else if (/\.(tsx?|css)$/.test(name)) yield full;
  }
}

describe('copy guard', () => {
  it('no overclaiming words in user-facing source', () => {
    const hits: string[] = [];
    for (const file of files(ROOT)) {
      const rel = relative(ROOT, file);
      if (SKIP_FILES.has(rel)) continue;
      readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
        const t = line.trim();
        if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return; // comments are not shown to users
        for (const [label, re] of BANNED) if (re.test(line)) hits.push(`${rel}:${i + 1} contains ${label}`);
      });
    }
    expect(hits).toEqual([]);
  });

  it('the scan really finds things (sensitivity check)', () => {
    expect(BANNED.every(([, re]) => re.test('This is Tamper-proof, immutable, guaranteed, tampered, anchored on Stellar, stored on Stellar'))).toBe(true);
  });
});
