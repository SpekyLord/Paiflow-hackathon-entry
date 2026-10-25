import 'server-only';
import { Keypair } from '@stellar/stellar-sdk';
import { HttpError } from '@/server/http/respond';

const ADDRESS_PATTERN = /^G[A-Z2-7]{55}$/;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export function requireStellarAddress(value: unknown, field = 'address'): string {
  if (typeof value !== 'string' || !ADDRESS_PATTERN.test(value)) {
    throw new HttpError('VALIDATION', 'Enter a valid Stellar public address.', { fields: { [field]: 'invalid' } });
  }
  try {
    Keypair.fromPublicKey(value);
  } catch {
    throw new HttpError('VALIDATION', 'Enter a valid Stellar public address.', { fields: { [field]: 'invalid' } });
  }
  return value;
}

function decodeSignature(signedMessage: string): Buffer {
  if (signedMessage.length > 128 || !BASE64_PATTERN.test(signedMessage)) throw new HttpError('SIGNATURE_INVALID');
  const bytes = Buffer.from(signedMessage, 'base64');
  // Buffer's base64 decoder is permissive; require a canonical encoding (padding may be omitted by older clients).
  if (bytes.byteLength !== 64 || bytes.toString('base64').replace(/=+$/, '') !== signedMessage.replace(/=+$/, '')) {
    throw new HttpError('SIGNATURE_INVALID');
  }
  return bytes;
}

/** Verifies SEP-53: the original UTF-8 message plus a base64-encoded 64-byte Ed25519 signature. */
export function verifyWalletMessage(address: string, message: string, signedMessage: string): boolean {
  try {
    const signature = decodeSignature(signedMessage);
    return Keypair.fromPublicKey(address).verifyMessage(message, signature);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    return false;
  }
}
