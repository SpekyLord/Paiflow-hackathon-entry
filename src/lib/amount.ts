// Integer stroop strings handled with bigint only. 1 XLM = 10,000,000 stroops.
const SCALE = 10_000_000n;
const MAX = (1n << 127n) - 1n;

export function toStroops(decimal: string): string {
  if (!/^\d+(?:\.\d{1,7})?$/.test(decimal) || decimal.length > 48)
    throw new Error(
      "Enter a positive decimal amount with at most 7 decimal places.",
    );
  const value = parseDecimal(decimal);
  if (value <= 0n || value > MAX)
    throw new Error(
      "Amount must be positive and fit contract i128 arithmetic.",
    );
  return value.toString();
}

export function fromStroops(stroops: string): string {
  if (!/^\d+$/.test(stroops) || stroops.length > 39)
    throw new Error("Invalid stroops.");
  const value = BigInt(stroops);
  if (value > MAX) throw new Error("Amount exceeds i128.");
  const fraction = (value % SCALE)
    .toString()
    .padStart(7, "0")
    .replace(/0+$/, "");
  return `${value / SCALE}${fraction ? `.${fraction}` : ""}`;
}

// Horizon reports balances as fixed 7-decimal strings, including "0.0000000".
// Zero is a valid balance here, unlike a payment amount.
export function parseHorizonBalance(balance: string): string {
  if (!/^\d+\.\d{7}$/.test(balance) || balance.length > 48)
    throw new Error("Unexpected Horizon balance format.");
  const value = parseDecimal(balance);
  if (value > MAX) throw new Error("Balance exceeds i128.");
  return value.toString();
}

function parseDecimal(decimal: string): bigint {
  const [whole = "0", fraction = ""] = decimal.split(".");
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(7, "0"));
}
