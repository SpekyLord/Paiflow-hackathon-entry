import { requireSession } from '@/server/auth/guards';
import { limit } from '@/server/http/rate-limit';
import { handle } from '@/server/http/respond';

export const runtime = 'nodejs';

export async function GET() {
  return handle(async () => {
    const session = await requireSession();
    limit('request', session.userId);
    return session.orgs;
  });
}
