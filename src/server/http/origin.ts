import 'server-only';
import { HttpError } from './respond';

const mediaType = (request: Request) => request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? '';

/**
 * Every mutation needs a same-origin Origin header and must not be flagged cross-site by the browser.
 * `kind` also requires the content type: JSON routes need application/json, uploads need multipart/form-data.
 */
export function sameOrigin(request: Request, kind: 'json' | 'multipart' | 'none' = 'json'): void {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new HttpError('FORBIDDEN', 'Same-origin requests are required.');
  }
  if (kind === 'json' && mediaType(request) !== 'application/json') throw new HttpError('UNSUPPORTED_MEDIA_TYPE');
  if (kind === 'multipart' && mediaType(request) !== 'multipart/form-data') throw new HttpError('UNSUPPORTED_MEDIA_TYPE');
}
