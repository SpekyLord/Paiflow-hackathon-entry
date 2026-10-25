// SHA-256 file hashing utility using Web Crypto API

/**
 * Hash a file (browser-side) using SHA-256
 * @param file - File object from browser input
 * @returns Hex-encoded SHA-256 hash
 */
export async function hashFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  return bufferToHex(hashBuffer);
}

/**
 * Hash a buffer (server-side) using SHA-256
 * @param buffer - Node.js Buffer or ArrayBuffer
 * @returns Hex-encoded SHA-256 hash
 */
export async function hashBuffer(buffer: Buffer | ArrayBuffer): Promise<string> {
  // Convert Buffer to ArrayBuffer if needed
  let arrayBuffer: ArrayBuffer;

  if (buffer instanceof Buffer) {
    // For Node.js Buffer, we need to create a new ArrayBuffer
    arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  } else if (buffer instanceof ArrayBuffer) {
    arrayBuffer = buffer;
  } else {
    // Fallback - should never happen, but TypeScript wants  this
    throw new Error('Invalid buffer type');
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  return bufferToHex(hashBuffer);
}

/**
 * Hash a string using SHA-256
 * @param str - String to hash
 * @returns Hex-encoded SHA-256 hash
 */
export async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

/**
 * Convert ArrayBuffer to hex string
 * @param buffer - ArrayBuffer to convert
 * @returns Hex-encoded string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  const hexCodes = Array.from(byteArray).map((byte) => {
    const hex = byte.toString(16);
    return hex.padStart(2, '0');
  });
  return hexCodes.join('');
}
