// Pure bigint Split share calculator (FRANCIS-PHASETASK §3.1). Single implementation shared by
// Francis (plan view) and Carlos (payout verifier). Floor division per envelope; the LAST envelope in
// deployment order also receives the remainder (PRD §H.5, llms.md Split).

import { BPS_TOTAL, STROOPS_PATTERN } from './limits';

export interface SplitEnvelopeInput {
  position: number;
  bps: number;
}

export interface SplitShare {
  position: number;
  shareStroops: string;
}

export function splitShares(totalStroops: string, envelopes: readonly SplitEnvelopeInput[]): SplitShare[] {
  if (!STROOPS_PATTERN.test(totalStroops)) throw new RangeError('totalStroops must be a positive integer string');
  if (envelopes.length === 0) throw new RangeError('at least one envelope is required');

  const ordered = [...envelopes].sort((a, b) => a.position - b.position);
  let bpsSum = 0;
  for (const e of ordered) {
    if (!Number.isInteger(e.bps) || e.bps <= 0) throw new RangeError('bps must be a positive integer');
    bpsSum += e.bps;
  }
  if (bpsSum !== BPS_TOTAL) throw new RangeError(`bps must total ${BPS_TOTAL}`);

  const total = BigInt(totalStroops);
  const base = ordered.map((e) => (total * BigInt(e.bps)) / BigInt(BPS_TOTAL));
  const distributed = base.reduce((acc, v) => acc + v, BigInt(0));
  base[base.length - 1] += total - distributed;

  return ordered.map((e, i) => ({ position: e.position, shareStroops: base[i].toString() }));
}
