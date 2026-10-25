// Parse and canonicalise a budget plan. Pure: no I/O, so it is unit-testable. The database re-derives and re-checks
// everything (deployment, signer address, hash vs text); this layer only shapes input and builds the hashed text.
import { canonicalJson, canonicalSha256, type CanonicalValue } from '@/contracts/canonical';
import type { CreatePlanInput } from '@/contracts/dto';
import { BPS_TOTAL, G_ADDRESS_PATTERN, STROOPS_PATTERN, UUID_PATTERN } from '@/contracts/limits';
import { HttpError } from '@/server/http/respond';

const PHP_PATTERN = /^[0-9]{1,18}$/;
const bad = (fields: Record<string, string>) => new HttpError('VALIDATION', undefined, { fields });

/** Strict shape validation. Throws VALIDATION with per-field messages; never trusts extra fields. */
export function parseCreatePlan(body: Record<string, unknown>): CreatePlanInput {
  const fields: Record<string, string> = {};
  const purpose = typeof body.purpose === 'string' ? body.purpose.trim() : '';
  if (purpose.length < 1 || purpose.length > 200) fields.purpose = 'Enter a purpose of 1 to 200 characters.';
  const totalStroops = typeof body.totalStroops === 'string' ? body.totalStroops : '';
  if (!STROOPS_PATTERN.test(totalStroops)) fields.totalStroops = 'Enter the total as a positive whole number of stroops.';
  const signerUserId = typeof body.signerUserId === 'string' ? body.signerUserId.toLowerCase() : '';
  if (!UUID_PATTERN.test(signerUserId)) fields.signerUserId = 'Choose the authorised signer.';

  const rawEnv = Array.isArray(body.envelopes) ? body.envelopes : null;
  const envelopes: CreatePlanInput['envelopes'] = [];
  if (!rawEnv || rawEnv.length < 1 || rawEnv.length > 10) {
    fields.envelopes = 'Provide 1 to 10 envelopes.';
  } else {
    rawEnv.forEach((raw, i) => {
      const e = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
      const label = typeof e.label === 'string' ? e.label.trim() : '';
      const position = e.position;
      const bps = e.bps;
      const addr = typeof e.recipientAddress === 'string' ? e.recipientAddress : '';
      const php = e.planningPhpCentavos === undefined ? null : e.planningPhpCentavos;
      if (position !== i) fields[`envelopes.${i}.position`] = 'Positions must be 0, 1, 2 ... in order.';
      if (label.length < 1 || label.length > 80) fields[`envelopes.${i}.label`] = 'Enter a label of 1 to 80 characters.';
      if (typeof bps !== 'number' || !Number.isInteger(bps) || bps <= 0 || bps > BPS_TOTAL) fields[`envelopes.${i}.bps`] = 'Share must be a whole number of basis points above 0.';
      if (!G_ADDRESS_PATTERN.test(addr)) fields[`envelopes.${i}.recipientAddress`] = 'Enter a valid Stellar address.';
      if (php !== null && (typeof php !== 'string' || !PHP_PATTERN.test(php))) fields[`envelopes.${i}.planningPhpCentavos`] = 'Planning figure must be whole centavos.';
      envelopes.push({
        position: i, label, bps: bps as number, recipientAddress: addr, planningPhpCentavos: (php as string | null) ?? null,
      });
    });
  }

  let attachmentDocumentIds: string[] | undefined;
  if (body.attachmentDocumentIds !== undefined) {
    const a = body.attachmentDocumentIds;
    if (!Array.isArray(a) || a.length > 10 || a.some((x) => typeof x !== 'string' || !UUID_PATTERN.test(x))) {
      fields.attachmentDocumentIds = 'Attachments must be up to 10 document IDs.';
    } else {
      attachmentDocumentIds = [...new Set(a.map((x) => (x as string).toLowerCase()))];
    }
  }

  if (Object.keys(fields).length === 0) {
    const dup = new Set(envelopes.map((e) => e.recipientAddress)).size !== envelopes.length;
    if (dup) throw new HttpError('DUPLICATE_RECIPIENT');
    if (envelopes.reduce((s, e) => s + e.bps, 0) !== BPS_TOTAL) throw new HttpError('BPS_TOTAL_INVALID');
  }
  if (Object.keys(fields).length > 0) throw bad(fields);
  return { purpose, totalStroops, signerUserId, envelopes, ...(attachmentDocumentIds ? { attachmentDocumentIds } : {}) };
}

export interface CanonicalPlanParts {
  orgId: string;
  deploymentId: string;
  signerAddress: string;
  attachmentSha256: string[]; // sorted
}

/**
 * The exact text that is hashed and stored. Same plan -> same text -> same hash. Keys are sorted by canonicalJson; the
 * database re-hashes this text and cross-checks deploymentId, totalStroops, signerAddress and the envelopes.
 */
export async function buildCanonicalPlan(input: CreatePlanInput, parts: CanonicalPlanParts): Promise<{ canonicalText: string; planSha256: string }> {
  const plan: CanonicalValue = {
    asset: { kind: 'native' },
    attachments: [...parts.attachmentSha256].sort(),
    deploymentId: parts.deploymentId,
    envelopes: input.envelopes.map((e) => ({
      bps: e.bps, label: e.label, planningPhpCentavos: e.planningPhpCentavos, position: e.position, recipientAddress: e.recipientAddress,
    })),
    orgId: parts.orgId,
    purpose: input.purpose,
    signerAddress: parts.signerAddress,
    totalStroops: input.totalStroops,
  };
  return { canonicalText: canonicalJson(plan), planSha256: await canonicalSha256(plan) };
}
