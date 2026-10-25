import 'server-only';

export interface WalletChallengeMessageInput {
  origin: string;
  userId: string;
  address: string;
  nonce: string;
  expiresAt: string;
}

/** Stable, human-readable message for SEP-53. Every value is server-bound to the stored challenge. */
export function buildWalletChallengeMessage(input: WalletChallengeMessageInput): string {
  return [
    'CYFAI wallet binding challenge',
    `Origin: ${input.origin}`,
    `User: ${input.userId}`,
    `Address: ${input.address}`,
    'Purpose: wallet-binding',
    `Nonce: ${input.nonce}`,
    `Expires: ${input.expiresAt}`,
  ].join('\n');
}
