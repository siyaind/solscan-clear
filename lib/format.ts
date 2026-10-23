const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function decodeBase58(value: string): Uint8Array | null {
  if (!value || value.length > 100) return null;
  let n = 0n;
  for (const character of value) {
    const digit = ALPHABET.indexOf(character);
    if (digit < 0) return null;
    n = n * 58n + BigInt(digit);
  }
  const bytes: number[] = [];
  while (n > 0n) {
    bytes.unshift(Number(n & 255n));
    n >>= 8n;
  }
  for (const character of value) {
    if (character !== "1") break;
    bytes.unshift(0);
  }
  return new Uint8Array(bytes);
}

export const isAddress = (value: string) => decodeBase58(value)?.length === 32;
export const isSignature = (value: string) =>
  decodeBase58(value)?.length === 64;
export const short = (value: string, size = 5) =>
  value.length > size * 2 + 2
    ? `${value.slice(0, size)}…${value.slice(-size)}`
    : value;

export function integer(value: unknown): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isSafeInteger(value))
    return BigInt(value);
  if (typeof value === "string" && /^-?\d+$/.test(value)) return BigInt(value);
  return null;
}

export function units(
  value: string | bigint,
  decimals = 9,
  signed = false,
): string {
  const amount = BigInt(value);
  const negative = amount < 0n;
  const digits = (negative ? -amount : amount)
    .toString()
    .padStart(decimals + 1, "0");
  const whole = decimals ? digits.slice(0, -decimals) : digits;
  const fraction = decimals ? digits.slice(-decimals).replace(/0+$/, "") : "";
  return `${negative ? "−" : signed && amount > 0n ? "+" : ""}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${fraction ? `.${fraction}` : ""}`;
}

export function compareAddresses(a: string, b: string) {
  return {
    valid: isAddress(a) && isAddress(b),
    equal: a === b,
    characters: Array.from(
      { length: Math.min(100, Math.max(a.length, b.length)) },
      (_, index) => ({
        a: a[index] ?? "",
        b: b[index] ?? "",
        same: a[index] === b[index],
      }),
    ),
  };
}

// Node >=22 exposes the source lexeme to a reviver. Preserve unsafe RPC integers as strings.
export function parseExactJson(text: string): unknown {
  return JSON.parse(
    text,
    function (_key: string, value: unknown, context?: { source?: string }) {
      if (
        typeof value === "number" &&
        Number.isInteger(value) &&
        !Number.isSafeInteger(value)
      ) {
        if (!context?.source || !/^-?\d+$/.test(context.source))
          throw new Error(
            "This runtime cannot preserve RPC integer precision.",
          );
        return context.source;
      }
      return value;
    },
  );
}
