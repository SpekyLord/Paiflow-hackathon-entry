import 'server-only';
import { MAX_UPLOAD_BYTES } from '@/contracts/limits';
import { readLimitedBytes } from './json';
import { HttpError } from './respond';

const MULTIPART_OVERHEAD_BYTES = 64 * 1024; // boundaries and small text fields

export interface ParsedUpload {
  fields: Record<string, string>;
  file: { name: string; type: string; bytes: Uint8Array } | null;
}

/**
 * Size-limited multipart parse. The whole request is capped while streaming (413 before anything is parsed),
 * then exactly one file and a few short text fields are accepted. Type and magic-byte checks belong to src/server/files.
 */
export async function readMultipart(request: Request, maxFileBytes: number = MAX_UPLOAD_BYTES): Promise<ParsedUpload> {
  const bytes = await readLimitedBytes(request, maxFileBytes + MULTIPART_OVERHEAD_BYTES);
  let form: FormData;
  try {
    form = await new Response(bytes as BodyInit, {
      headers: { 'content-type': request.headers.get('content-type') ?? '' },
    }).formData();
  } catch {
    throw new HttpError('VALIDATION_SHAPE', 'The upload could not be read.');
  }
  const fields: Record<string, string> = {};
  let file: ParsedUpload['file'] = null;
  let count = 0;
  for (const [key, value] of form.entries()) {
    if (++count > 10) throw new HttpError('VALIDATION_SHAPE', 'Too many form fields.');
    if (typeof value === 'string') {
      if (value.length > 2000) throw new HttpError('VALIDATION_SHAPE', 'A form field is too long.');
      fields[key] = value;
    } else {
      if (file) throw new HttpError('VALIDATION_SHAPE', 'Upload exactly one file.');
      if (value.size > maxFileBytes) throw new HttpError('REQUEST_TOO_LARGE');
      file = { name: value.name, type: value.type, bytes: new Uint8Array(await value.arrayBuffer()) };
    }
  }
  return { fields, file };
}
