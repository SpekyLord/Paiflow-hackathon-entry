// Fixture-mode only helper: hashes a chosen file in the browser so the tamper-check demo reacts to real bytes.
// Live mode never uses this; the server computes the candidate hash.
export async function sha256OfFile(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
