import { createAuthClient } from '@/server/auth/session';
import { sameOrigin } from '@/server/http/origin';
import { handle } from '@/server/http/respond';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request, 'json');
    const supabase = await createAuthClient();
    await supabase.auth.signOut(); // clears the session cookies via setAll
    return {};
  });
}
