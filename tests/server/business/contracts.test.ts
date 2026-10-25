// Level: MOCKED (pure functions and fixtures). F-01 acceptance.
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '@/contracts/canonical';
import { splitShares } from '@/contracts/split';
import { allPlanStateFixtures, FIXTURE_MARKER, walletSummaryFixture } from '@/contracts/fixtures';
import { PLAN_STATES, toDashboardState } from '@/contracts/states';

const env = [{ position: 0, bps: 5000 }, { position: 1, bps: 3000 }, { position: 2, bps: 2000 }];

describe('splitShares', () => {
  it('splits 1 XLM 50/30/20', () => {
    expect(splitShares('10000000', env).map((s) => s.shareStroops)).toEqual(['5000000', '3000000', '2000000']);
  });
  it('puts the remainder on the last envelope', () => {
    expect(splitShares('10000001', env).map((s) => s.shareStroops)).toEqual(['5000000', '3000000', '2000001']);
  });
  it('rejects bad input', () => {
    expect(() => splitShares('0', env)).toThrow();
    expect(() => splitShares('100', [{ position: 0, bps: 9999 }])).toThrow();
  });
  it('shares always sum to the total', () => {
    for (const total of ['1', '7', '99999999', '123456789012345678901234567890']) {
      const sum = splitShares(total, env).reduce((a, s) => a + BigInt(s.shareStroops), BigInt(0));
      expect(sum.toString()).toBe(total);
    }
  });
});

describe('canonicalJson', () => {
  it('is identical for permuted key order and has no whitespace', () => {
    expect(canonicalJson({ b: 1, a: { d: 'x', c: [2, 1] } })).toBe(canonicalJson({ a: { c: [2, 1], d: 'x' }, b: 1 }));
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });
  it('rejects floats and undefined', () => {
    expect(() => canonicalJson(1.5)).toThrow();
    expect(() => canonicalJson({ a: undefined as never })).toThrow();
  });
});

describe('fixtures', () => {
  it('cover every plan state, carry the marker, and map to a dashboard state', () => {
    const fx = allPlanStateFixtures();
    expect(fx.map((f) => f.state).sort()).toEqual([...PLAN_STATES].sort());
    for (const f of fx) {
      expect(f.purpose.startsWith(FIXTURE_MARKER)).toBe(true);
      expect(f.dashboardState).toBe(toDashboardState(f.state));
    }
    expect(fx.find((f) => f.state === 'payment_confirmed')?.payoutsVerified).toEqual({ verified: 2, total: 3 });
  });
  it('never shows an unavailable balance as zero', () => {
    expect(walletSummaryFixture('unavailable').balance.state).toBe('unavailable');
  });
});
