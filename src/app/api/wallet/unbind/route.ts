import { requireUser } from '@/server/auth/guards';
import { unbindWallet } from '@/server/db/wallet-binding';
import { asRecord, readJson } from '@/server/http/json';
import { limit } from '@/server/http/rate-limit';
import { handle, HttpError } from '@/server/http/respond';
import { sameOrigin } from '@/server/http/origin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request, 'json');
    const { userId } = await requireUser();
    limit('request', userId);

    const body = asRecord(await readJson(request));
    if (Object.keys(body).length !== 0) throw new HttpError('VALIDATION_SHAPE', 'Unbind takes no request fields.');
    const result = await unbindWallet(userId);
    if (!result.ok) throw new HttpError(result.code);
    return {};
  });
}
