// Level: MOCKED (RPC state is in-memory; signatures use generated test-only Ed25519 keys).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';

vi.mock('server-only', () => ({}));

const state = vi.hoisted(() => ({
  userId: '00000000-0000-4000-8000-000000000010' as string | null,
  challenge: null as null | {
    challengeId: string; address: string; nonce: string; origin: string; purpose: 'wallet-binding'; expiresAt: string;
  },
  consumed: false,
  bindError: null as string | null,
  unbindError: null as string | null,
}));

vi.mock('@/server/auth/session', () => ({ getAuthUserId: async () => state.userId, loadSession: async () => null }));

vi.mock('@/server/db/wallet-binding', () => ({
  issueWalletChallenge: async (input: { userId: string; address: string; origin: string; ttlSeconds: number }) => {
    state.challenge = {
      challengeId: '00000000-0000-4000-8000-000000000020',
      address: input.address,
      nonce: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      origin: input.origin,
      purpose: 'wallet-binding',
      expiresAt: new Date(Date.now() + input.ttlSeconds * 1000).toISOString(),
    };
    state.consumed = false;
    return { ok: true, value: { ...state.challenge } };
  },
  getWalletChallenge: async (_userId: string, challengeId: string) => {
    if (!state.challenge || state.challenge.challengeId !== challengeId || state.consumed || Date.parse(state.challenge.expiresAt) <= Date.now()) {
      return { ok: false, code: 'CHALLENGE_INVALID' };
    }
    return { ok: true, value: { ...state.challenge } };
  },
  consumeChallengeAndBind: async (_userId: string, challengeId: string, address: string) => {
    if (state.bindError) return { ok: false, code: state.bindError };
    if (!state.challenge || state.challenge.challengeId !== challengeId || state.challenge.address !== address || state.consumed) {
      return { ok: false, code: 'CHALLENGE_INVALID' };
    }
    state.consumed = true;
    return { ok: true, value: { address, verifiedAt: '2026-10-25T00:00:00.000Z' } };
  },
  unbindWallet: async () => state.unbindError ? { ok: false, code: state.unbindError } : { ok: true, value: {} },
}));

import { POST as challenge } from '@/app/api/wallet/challenge/route';
import { POST as bind } from '@/app/api/wallet/bind/route';
import { POST as unbind } from '@/app/api/wallet/unbind/route';
import { resetRateLimits } from '@/server/http/rate-limit';

const ORIGIN = 'http://localhost:3000';
const KEY = Keypair.random();
const OTHER_KEY = Keypair.random();

function jsonRequest(path: string, body: unknown, origin = ORIGIN): Request {
  return new Request(`${ORIGIN}${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { origin, 'content-type': 'application/json' },
  });
}

async function payload(response: Response): Promise<Record<string, unknown>> { return response.json(); }

async function issueChallenge(address = KEY.publicKey()) {
  const response = await challenge(jsonRequest('/api/wallet/challenge', { address }));
  return { response, body: await payload(response) };
}

async function bindMessage(message: string, challengeId: string, address = KEY.publicKey(), signerAddress = address) {
  const request = jsonRequest('/api/wallet/bind', {
    challengeId, address, signedMessage: Buffer.from(KEY.signMessage(message)).toString('base64'), signerAddress,
  });
  return bind(request);
}

beforeEach(() => {
  state.userId = '00000000-0000-4000-8000-000000000010';
  state.challenge = null;
  state.consumed = false;
  state.bindError = null;
  state.unbindError = null;
  resetRateLimits();
});

describe('wallet binding routes', () => {
  it('issues a challenge bound to origin, user, address, purpose, nonce and expiry', async () => {
    const { response, body } = await issueChallenge();
    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({ challengeId: state.challenge?.challengeId, expiresAt: state.challenge?.expiresAt });
    expect(body.data).toHaveProperty('message', [
      'CYFER wallet binding challenge',
      `Origin: ${ORIGIN}`,
      `User: ${state.userId}`,
      `Address: ${KEY.publicKey()}`,
      'Purpose: wallet-binding',
      `Nonce: ${state.challenge?.nonce}`,
      `Expires: ${state.challenge?.expiresAt}`,
    ].join('\n'));
  });

  it('binds only after verifying the SEP-53 signature and consumes the challenge', async () => {
    const { body } = await issueChallenge();
    const challengeBody = body.data as { challengeId: string; message: string };
    const response = await bindMessage(challengeBody.message, challengeBody.challengeId);
    const result = await payload(response);
    expect(response.status, JSON.stringify(result)).toBe(200);
    expect(result.data).toEqual({ address: KEY.publicKey(), verifiedAt: '2026-10-25T00:00:00.000Z' });
    expect(state.consumed).toBe(true);
  });

  it('rejects a replayed challenge', async () => {
    const { body } = await issueChallenge();
    const challengeBody = body.data as { challengeId: string; message: string };
    expect((await bindMessage(challengeBody.message, challengeBody.challengeId)).status).toBe(200);
    const replay = await bindMessage(challengeBody.message, challengeBody.challengeId);
    expect([replay.status, (await payload(replay)).error]).toMatchObject([400, { code: 'CHALLENGE_INVALID' }]);
  });

  it("rejects another address's signer claim and a signature over changed text", async () => {
    const { body } = await issueChallenge();
    const challengeBody = body.data as { challengeId: string; message: string };
    const otherSignature = Buffer.from(OTHER_KEY.signMessage(challengeBody.message)).toString('base64');
    const forgedAccount = await bind(jsonRequest('/api/wallet/bind', {
      challengeId: challengeBody.challengeId, address: KEY.publicKey(), signedMessage: otherSignature, signerAddress: KEY.publicKey(),
    }));
    expect([forgedAccount.status, (await payload(forgedAccount)).error]).toMatchObject([400, { code: 'SIGNATURE_INVALID' }]);

    const wrongAccountClaim = await bindMessage(challengeBody.message, challengeBody.challengeId, KEY.publicKey(), OTHER_KEY.publicKey());
    expect([wrongAccountClaim.status, (await payload(wrongAccountClaim)).error]).toMatchObject([400, { code: 'SIGNATURE_INVALID' }]);

    const changedText = await bindMessage(`${challengeBody.message}\nchanged`, challengeBody.challengeId);
    expect(changedText.status).toBe(400);
    expect((await payload(changedText)).error).toMatchObject({ code: 'SIGNATURE_INVALID' });
  });

  it('maps a wallet already bound elsewhere to 409', async () => {
    state.bindError = 'ADDRESS_ALREADY_BOUND';
    const { body } = await issueChallenge();
    const challengeBody = body.data as { challengeId: string; message: string };
    const response = await bindMessage(challengeBody.message, challengeBody.challengeId);
    expect([response.status, (await payload(response)).error]).toMatchObject([409, { code: 'ADDRESS_ALREADY_BOUND' }]);
  });

  it('refuses unbinding a wallet locked by an active plan', async () => {
    state.unbindError = 'BINDING_LOCKED';
    const response = await unbind(jsonRequest('/api/wallet/unbind', {}));
    expect([response.status, (await payload(response)).error]).toMatchObject([409, { code: 'BINDING_LOCKED' }]);
  });

  it('requires authentication and same-origin JSON mutations', async () => {
    state.userId = null;
    const anonymous = await challenge(jsonRequest('/api/wallet/challenge', { address: KEY.publicKey() }));
    expect(anonymous.status).toBe(401);
    state.userId = '00000000-0000-4000-8000-000000000010';
    const crossOrigin = await challenge(jsonRequest('/api/wallet/challenge', { address: KEY.publicKey() }, 'https://evil.example'));
    expect(crossOrigin.status).toBe(403);
  });
});
