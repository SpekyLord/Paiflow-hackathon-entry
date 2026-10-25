import type { GAddress } from '@/contracts/dto';
import { requireUser } from '@/server/auth/guards';
import { issueWalletChallenge } from '@/server/db/wallet-binding';
import { buildWalletChallengeMessage } from '@/server/wallet-binding/message';
import { requireStellarAddress } from '@/server/wallet-binding/verify';
import { asRecord, readJson } from '@/server/http/json';
import { limit } from '@/server/http/rate-limit';
import { handle, HttpError } from '@/server/http/respond';
import { sameOrigin } from '@/server/http/origin';

export const runtime = 'nodejs';
const CHALLENGE_TTL_SECONDS = 300;

export async function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request, 'json');
    const { userId } = await requireUser();
    limit('challenge', userId);

    const body = asRecord(await readJson(request));
    if (Object.keys(body).length !== 1 || typeof body.address !== 'string') {
      throw new HttpError('VALIDATION_SHAPE', 'Provide only the wallet address.');
    }
    const address = requireStellarAddress(body.address) as GAddress;
    const origin = request.headers.get('origin')!;
    const result = await issueWalletChallenge({ userId, address, origin, ttlSeconds: CHALLENGE_TTL_SECONDS });
    if (!result.ok) throw new HttpError(result.code);

    const challenge = result.value;
    if (challenge.origin !== origin || challenge.purpose !== 'wallet-binding') throw new HttpError('INTERNAL');
    const message = buildWalletChallengeMessage({
      origin,
      userId,
      address,
      nonce: challenge.nonce,
      expiresAt: challenge.expiresAt,
    });
    return { challengeId: challenge.challengeId, message, expiresAt: challenge.expiresAt };
  });
}
