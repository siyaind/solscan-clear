import { isAddress, short } from "./format";
import { USDC, WSOL, type Transaction } from "./model";

export type TokenIdentity = {
  mint: string | null;
  symbol: string;
  name: string;
  source: "native" | "curated" | "metaplex" | "token-2022" | "fallback";
  trust: "native" | "curated-exact-mint" | "unverified" | "unresolved";
  status: "resolved" | "missing" | "invalid" | "unavailable";
  logo?: string;
  metadataUri?: string;
  warning?: string;
};

// Mainnet identities are keyed only by full mint, never by a claimed ticker.
export const TOKEN_REGISTRY: Readonly<
  Record<string, { symbol: string; name: string }>
> = {
  [USDC]: { symbol: "USDC", name: "USD Coin" },
  [WSOL]: { symbol: "wSOL", name: "Wrapped SOL" },
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: {
    symbol: "JUP",
    name: "Jupiter",
  },
};
export const NATIVE_SOL: TokenIdentity = {
  mint: null,
  symbol: "SOL",
  name: "Solana",
  source: "native",
  trust: "native",
  status: "resolved",
};
export function fallbackIdentity(
  mint: string,
  status: TokenIdentity["status"] = "missing",
): TokenIdentity {
  return {
    mint,
    symbol: isAddress(mint) ? short(mint, 4) : "Unknown",
    name: "Unknown token",
    source: "fallback",
    trust: "unresolved",
    status,
  };
}
export function knownTokenIdentity(mint: string): TokenIdentity {
  const record = Object.hasOwn(TOKEN_REGISTRY, mint)
    ? TOKEN_REGISTRY[mint]
    : undefined;
  return record
    ? {
        mint,
        ...record,
        source: "curated",
        trust: "curated-exact-mint",
        status: "resolved",
      }
    : fallbackIdentity(mint);
}
export function safeMetadataUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 2048) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password)
      return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}
export function metadataIdentity(
  mint: string,
  source: "metaplex" | "token-2022",
  metadata: {
    name?: unknown;
    symbol?: unknown;
    uri?: unknown;
    image?: unknown;
  },
): TokenIdentity {
  const clean = (value: unknown, limit: number) => {
    if (typeof value !== "string") return undefined;
    const text = value.replace(/\0+$/g, "").trim();
    // Reject controls, bidi overrides and invisible format characters rather than disguising them.
    return text && text.length <= limit && !/[\p{Cc}\p{Cf}]/u.test(text)
      ? text
      : undefined;
  };
  const name = clean(metadata.name, 128);
  const symbol = clean(metadata.symbol, 32);
  if (!name || !symbol) return fallbackIdentity(mint, "invalid");
  const collision = [
    "SOL",
    ...Object.values(TOKEN_REGISTRY).map((item) => item.symbol.toUpperCase()),
  ].includes(symbol.toUpperCase());
  return {
    mint,
    symbol,
    name,
    source,
    trust: "unverified",
    status: "resolved",
    metadataUri: safeMetadataUrl(metadata.uri),
    logo: safeMetadataUrl(metadata.image),
    warning: collision
      ? "This mint claims a familiar ticker but is not its curated mint. Tickers are not unique."
      : "Name and ticker are controlled by the token metadata authority; they do not verify identity.",
  };
}
export function applyTokenIdentities(
  tx: Transaction,
  identities: Record<string, TokenIdentity>,
): Transaction {
  const assets = tx.assets.map((asset) => {
    const identity = asset.native
      ? NATIVE_SOL
      : (identities[asset.mint] ?? knownTokenIdentity(asset.mint));
    return { ...asset, symbol: identity.symbol, identity };
  });
  return {
    ...tx,
    assets,
    relationships: tx.relationships.map((edge) => {
      const identity = edge.mint
        ? (identities[edge.mint] ?? knownTokenIdentity(edge.mint))
        : edge.amountBasis === "native"
          ? NATIVE_SOL
          : undefined;
      return identity ? { ...edge, symbol: identity.symbol, identity } : edge;
    }),
    evidence: tx.evidence.map((evidence) => {
      const asset = assets.find((item) => item.evidenceId === evidence.id);
      return asset && !asset.native
        ? {
            ...evidence,
            title: `${asset.symbol} · token account ${short(asset.account)}`,
          }
        : evidence;
    }),
  };
}
