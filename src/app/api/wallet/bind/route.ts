import type { BindResponse } from '@/contracts/api';
import { parseUuid, requireUser } from '@/server/auth/guards';
import { consumeChallengeAndBind, getWalletChallenge } from '@/server/db/wallet-binding';
import { buildWalletChallengeMessage } from '@/server/wallet-binding/message';
import { requireStellarAddress, verifyWalletMessage } from '@/server/wallet-binding/verify';
import { asRecord, readJson } from '@/server/http/json';
import { limit } from '@/server/http/rate-limit';
import { handle, HttpError } from '@/server/http/respond';
import { sameOrigin } from '@/server/http/origin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return handle<BindResponse>(async () => {
    sameOrigin(request, 'json');
    const { userId } = await requireUser();
    limit('challenge', userId);

    const body = asRecord(await readJson(request));
    const keys = ['challengeId', 'address', 'signedMessage', 'signerAddress'];
    if (Object.keys(body).length !== keys.length || keys.some((key) => !(key in body)) ||
      typeof body.challengeId !== 'string' || typeof body.address !== 'string' ||
      typeof body.signedMessage !== 'string' || typeof body.signerAddress !== 'string' || body.signedMessage.length > 128) {
      throw new HttpError('VALIDATION_SHAPE', 'Provide the challenge and its wallet signature.');
    }
    const challengeId = parseUuid(body.challengeId, 'challenge');
    const address = requireStellarAddress(body.address);
    const signerAddress = requireStellarAddress(body.signerAddress, 'signerAddress');
    if (signerAddress !== address) throw new HttpError('SIGNATURE_INVALID');

    const origin = request.headers.get('origin')!;
    const challengeResult = await getWalletChallenge(userId, challengeId);
    if (!challengeResult.ok) throw new HttpError(challengeResult.code);
    const challenge = challengeResult.value;
    if (challenge.address !== address || challenge.origin !== origin || challenge.purpose !== 'wallet-binding' ||
      !Number.isFinite(Date.parse(challenge.expiresAt)) || Date.parse(challenge.expiresAt) <= Date.now()) {
      throw new HttpError('CHALLENGE_INVALID');
    }

    const message = buildWalletChallengeMessage({
      origin: challenge.origin,
      userId,
      address: challenge.address,
      nonce: challenge.nonce,
      expiresAt: challenge.expiresAt,
    });
    if (!verifyWalletMessage(address, message, body.signedMessage)) throw new HttpError('SIGNATURE_INVALID');

    const bound = await consumeChallengeAndBind(userId, challengeId, address);
    if (!bound.ok) throw new HttpError(bound.code);
    return { address: bound.value.address, verifiedAt: bound.value.verifiedAt };
  });
}
