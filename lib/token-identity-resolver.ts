import "server-only";
import { PublicKey } from "@solana/web3.js";
import { isAddress } from "./format";
import { TOKEN, TOKEN_2022 } from "./model";
import { rpc } from "./rpc";
import {
  fallbackIdentity,
  knownTokenIdentity,
  metadataIdentity,
  NATIVE_SOL,
  type TokenIdentity,
} from "./token-identity";

const METAPLEX = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
type Call = (method: string, params: unknown[]) => Promise<unknown>;
type Account = { owner: string; executable?: boolean; data: unknown };
function accountValue(response: unknown): Account | null {
  if (!response || typeof response !== "object" || !("value" in response))
    return null;
  const value = response.value;
  return value &&
    typeof value === "object" &&
    "owner" in value &&
    typeof value.owner === "string" &&
    "data" in value
    ? (value as Account)
    : null;
}
function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
function bytes(data: unknown): Buffer | null {
  if (
    !Array.isArray(data) ||
    data[1] !== "base64" ||
    typeof data[0] !== "string" ||
    data[0].length > 90000 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(data[0])
  )
    return null;
  return Buffer.from(data[0], "base64");
}
function strings(data: Buffer, offset: number) {
  const result: string[] = [];
  for (let i = 0; i < 3; i++) {
    if (offset + 4 > data.length) throw new Error("Truncated metadata");
    const size = data.readUInt32LE(offset);
    offset += 4;
    if (size > 4096 || offset + size > data.length)
      throw new Error("Invalid metadata length");
    result.push(
      new TextDecoder("utf-8", { fatal: true }).decode(
        data.subarray(offset, offset + size),
      ),
    );
    offset += size;
  }
  return { name: result[0], symbol: result[1], uri: result[2] };
}
export function readToken2022Metadata(
  mint: string,
  account: Account,
): TokenIdentity | null {
  if (account.owner !== TOKEN_2022 || account.executable) return null;
  const parsed = object(object(account.data)?.parsed);
  const info = object(parsed?.info);
  if (parsed?.type === "mint" && Array.isArray(info?.extensions)) {
    for (const extension of info.extensions) {
      const item = object(extension);
      if (item?.extension !== "tokenMetadata") continue;
      const state = object(item.state);
      if (!state || state.mint !== mint)
        return fallbackIdentity(mint, "invalid");
      const additional = Array.isArray(state.additionalMetadata)
        ? state.additionalMetadata
        : [];
      const image = additional.find(
        (entry) => Array.isArray(entry) && entry[0] === "image",
      )?.[1];
      return metadataIdentity(mint, "token-2022", { ...state, image });
    }
  }
  const raw = bytes(account.data);
  if (!raw || raw.length < 166 || raw[165] !== 1 || raw[45] !== 1) return null;
  for (let offset = 166; offset + 4 <= raw.length;) {
    const type = raw.readUInt16LE(offset),
      size = raw.readUInt16LE(offset + 2);
    offset += 4;
    if (offset + size > raw.length) return fallbackIdentity(mint, "invalid");
    if (type === 19) {
      const record = raw.subarray(offset, offset + size);
      if (
        record.length < 64 ||
        !record.subarray(32, 64).equals(new PublicKey(mint).toBuffer())
      )
        return fallbackIdentity(mint, "invalid");
      return metadataIdentity(mint, "token-2022", strings(record, 64));
    }
    if (!type && !size) break;
    offset += size;
  }
  return null;
}
function isMint(account: Account) {
  if (account.executable || ![TOKEN, TOKEN_2022].includes(account.owner))
    return false;
  const parsed = object(object(account.data)?.parsed);
  if (parsed) return parsed.type === "mint";
  const raw = bytes(account.data);
  return (
    !!raw &&
    raw[45] === 1 &&
    (raw.length === 82 ||
      (account.owner === TOKEN_2022 && raw.length >= 166 && raw[165] === 1))
  );
}

export function createTokenIdentityResolver(
  call: Call = rpc,
  now: () => number = Date.now,
) {
  const cache = new Map<string, { expires: number; identity: TokenIdentity }>();
  const pending = new Map<string, Promise<TokenIdentity>>();
  async function load(mint: string): Promise<TokenIdentity> {
    try {
      const account = accountValue(
        await call("getAccountInfo", [
          mint,
          { encoding: "jsonParsed", commitment: "confirmed" },
        ]),
      );
      if (!account) return fallbackIdentity(mint, "missing");
      if (!isMint(account)) return fallbackIdentity(mint, "invalid");
      const extension = readToken2022Metadata(mint, account);
      if (extension) return extension;
      const program = new PublicKey(METAPLEX);
      const [address] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          program.toBuffer(),
          new PublicKey(mint).toBuffer(),
        ],
        program,
      );
      const metadata = accountValue(
        await call("getAccountInfo", [
          address.toBase58(),
          { encoding: "base64", commitment: "confirmed" },
        ]),
      );
      if (!metadata) return fallbackIdentity(mint, "missing");
      const raw = bytes(metadata.data);
      if (
        metadata.owner !== METAPLEX ||
        metadata.executable ||
        !raw ||
        raw[0] !== 4 ||
        raw.length < 65 ||
        !raw.subarray(33, 65).equals(new PublicKey(mint).toBuffer())
      )
        return fallbackIdentity(mint, "invalid");
      return metadataIdentity(mint, "metaplex", strings(raw, 65));
    } catch {
      return fallbackIdentity(mint, "unavailable");
    }
  }
  async function resolve(mint: string | null): Promise<TokenIdentity> {
    if (mint === null) return { ...NATIVE_SOL };
    if (!isAddress(mint)) return fallbackIdentity(mint, "invalid");
    const known = knownTokenIdentity(mint);
    if (known.source === "curated") return known;
    const hit = cache.get(mint);
    if (hit && hit.expires > now()) return hit.identity;
    if (pending.has(mint)) return pending.get(mint)!;
    if (pending.size >= 64) return fallbackIdentity(mint, "unavailable");
    const task = load(mint)
      .then((identity) => {
        if (cache.size >= 512) cache.delete(cache.keys().next().value!);
        cache.set(mint, {
          identity,
          expires:
            now() +
            (identity.status === "resolved"
              ? 3600000
              : identity.status === "unavailable"
                ? 15000
                : 300000),
        });
        return identity;
      })
      .finally(() => pending.delete(mint));
    pending.set(mint, task);
    return task;
  }
  async function resolveMany(mints: string[]) {
    const unique = [...new Set(mints)].slice(0, 32);
    const result: Record<string, TokenIdentity> = {};
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(4, unique.length) }, async () => {
        while (next < unique.length) {
          const mint = unique[next++];
          result[mint] = await resolve(mint);
        }
      }),
    );
    return result;
  }
  return { resolve, resolveMany };
}
export const tokenIdentityResolver = createTokenIdentityResolver();
