import 'server-only';
import { createHash } from 'node:crypto';
import { ALLOWED_UPLOAD_MEDIA_TYPES, MAX_UPLOAD_BYTES } from '@/contracts/limits';
import type { ParsedUpload } from '@/server/http/multipart';
import { HttpError } from '@/server/http/respond';

export interface ValidatedFile {
  filename: string;
  mediaType: (typeof ALLOWED_UPLOAD_MEDIA_TYPES)[number];
  bytes: Uint8Array;
  sha256: string;
}

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const ZIP_LOCAL = [0x50, 0x4b, 0x03, 0x04];
const ZIP_EMPTY = [0x50, 0x4b, 0x05, 0x06];
const ZIP_SPANNED = [0x50, 0x4b, 0x07, 0x08];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function begins(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

function isZip(bytes: Uint8Array): boolean {
  return begins(bytes, ZIP_LOCAL) || begins(bytes, ZIP_EMPTY) || begins(bytes, ZIP_SPANNED);
}

function safeFilename(input: string): string {
  const leaf = input.normalize('NFC').split(/[\\/]/).pop() ?? '';
  const clean = Array.from(leaf.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim()).slice(0, 255).join('');
  if (!clean || clean === '.' || clean === '..') throw new HttpError('VALIDATION', 'Choose a filename with at least one visible character.');
  return clean;
}

function assertSignature(mediaType: string, filename: string, bytes: Uint8Array): void {
  const valid = (() => {
    switch (mediaType) {
      case 'application/pdf':
        return bytes.length >= 5 && new TextDecoder().decode(bytes.subarray(0, 5)) === '%PDF-';
      case 'image/png':
        return begins(bytes, PNG);
      case 'image/jpeg':
        return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      case 'application/zip':
        return isZip(bytes);
      case DOCX: {
        if (!isZip(bytes) || !filename.toLowerCase().endsWith('.docx')) return false;
        // DOCX files are ZIP containers. The central directory contains this entry name; we do not unpack user data.
        return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).includes(Buffer.from('word/document.xml'));
      }
      case 'text/plain':
        try {
          return !bytes.includes(0) && (new TextDecoder('utf-8', { fatal: true }).decode(bytes), true);
        } catch {
          return false;
        }
      default:
        return false;
    }
  })();
  if (!valid) throw new HttpError('UNSUPPORTED_MEDIA_TYPE', 'The file contents do not match the declared file type.');
}

/** Apply the declared-type allowlist, a format signature check, filename normalization and server-side SHA-256. */
export function validateUpload(file: NonNullable<ParsedUpload['file']>): ValidatedFile {
  if (file.bytes.byteLength === 0) throw new HttpError('VALIDATION', 'The file is empty.');
  if (file.bytes.byteLength > MAX_UPLOAD_BYTES) throw new HttpError('REQUEST_TOO_LARGE');
  const mediaType = file.type.split(';', 1)[0].trim().toLowerCase();
  if (!(ALLOWED_UPLOAD_MEDIA_TYPES as readonly string[]).includes(mediaType)) {
    throw new HttpError('UNSUPPORTED_MEDIA_TYPE', 'Choose a PDF, PNG, JPEG, ZIP, TXT or DOCX file.');
  }
  const filename = safeFilename(file.name);
  assertSignature(mediaType, filename, file.bytes);
  const sha256 = createHash('sha256').update(file.bytes).digest('hex');
  return { filename, mediaType: mediaType as ValidatedFile['mediaType'], bytes: file.bytes, sha256 };
}
