import { describe, expect, it } from "vitest";
import { fromStroops, parseHorizonBalance, toStroops } from "@/lib/amount";

describe("amount conversion", () => {
  it.each([
    ["1", "10000000"],
    ["0.0000001", "1"],
    ["10.5", "105000000"],
    ["9007199254740993.1234567", "90071992547409931234567"],
  ])("converts %s without floating point", (decimal, stroops) => {
    expect(toStroops(decimal)).toBe(stroops);
    expect(fromStroops(stroops)).toBe(decimal);
  });

  it.each([
    "0",
    "-1",
    "1e7",
    "NaN",
    "Infinity",
    "1.12345678",
    " 1",
    "1.",
    ".5",
    "1,000",
    "9".repeat(40),
  ])("rejects invalid payment %s", (value) =>
    expect(() => toStroops(value)).toThrow(),
  );

  it("handles the i128 limit", () => {
    const max = ((1n << 127n) - 1n).toString();
    expect(toStroops(fromStroops(max))).toBe(max);
    expect(() => fromStroops((1n << 127n).toString())).toThrow();
    expect(fromStroops("0")).toBe("0");
  });

  it("splits the 1 XLM demo payment into exact envelope shares", () => {
    const total = BigInt(toStroops("1"));
    expect([5000n, 3000n, 2000n].map((bps) => (total * bps) / 10000n)).toEqual(
      [5_000_000n, 3_000_000n, 2_000_000n],
    );
  });
});

describe("parseHorizonBalance", () => {
  it.each([
    ["0.0000000", "0"],
    ["10000.0000000", "100000000000"],
    ["1.2345678", "12345678"],
  ])("parses %s", (balance, stroops) =>
    expect(parseHorizonBalance(balance)).toBe(stroops),
  );

  it.each(["", "1", "1.5", "-1.0000000", "1e7", "abc"])(
    "rejects %s",
    (balance) => expect(() => parseHorizonBalance(balance)).toThrow(),
  );
});
