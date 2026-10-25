import { createAuthClient, loadSession } from '@/server/auth/session';
import { asRecord, readJson } from '@/server/http/json';
import { sameOrigin } from '@/server/http/origin';
import { limit } from '@/server/http/rate-limit';
import { HttpError, handle } from '@/server/http/respond';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request, 'json');
    const body = asRecord(await readJson(request));
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || email.length > 254 || !password || password.length > 256) {
      throw new HttpError('VALIDATION_SHAPE', undefined, { fields: { email: 'Enter your email.', password: 'Enter your password.' } });
    }
    // Throttle by the submitted email (global bucket too), so one account cannot be guessed at without a limit.
    limit('signIn', `email:${email}`);

    const supabase = await createAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) throw new HttpError('UNAUTHENTICATED', 'Invalid email or password.'); // never reveal which part
    const session = await loadSession(data.user.id);
    if (!session) {
      await supabase.auth.signOut();
      throw new HttpError('FORBIDDEN', 'This account is not set up for CYFER.');
    }
    return session;
  });
}
