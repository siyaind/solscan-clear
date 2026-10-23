import { describe, expect, it, vi } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { TOKEN, TOKEN_2022, USDC, WSOL } from "../lib/model";
import {
  NATIVE_SOL,
  knownTokenIdentity,
  metadataIdentity,
  safeMetadataUrl,
} from "../lib/token-identity";
import { createTokenIdentityResolver } from "../lib/token-identity-resolver";

const mint = new PublicKey(new Uint8Array(32).fill(7)).toBase58();
const otherMint = new PublicKey(new Uint8Array(32).fill(8)).toBase58();
const mintAccount = (owner = TOKEN) => ({
  value: {
    owner,
    executable: false,
    data: { parsed: { type: "mint", info: { decimals: 6 } } },
  },
});
describe("token identity", () => {
  it("keeps native SOL separate from wrapped SOL and curated mint identities", async () => {
    const call = vi.fn();
    const resolver = createTokenIdentityResolver(call);
    expect(NATIVE_SOL.mint).toBeNull();
    expect(NATIVE_SOL.symbol).toBe("SOL");
    expect(await resolver.resolve(null)).toEqual(NATIVE_SOL);
    expect((await resolver.resolve(WSOL)).symbol).toBe("wSOL");
    expect((await resolver.resolve(USDC)).trust).toBe("curated-exact-mint");
    expect(call).not.toHaveBeenCalled();
  });
  it("retains duplicate tickers as separate unverified mint identities", () => {
    const a = metadataIdentity(mint, "metaplex", {
      name: "One",
      symbol: "SAME",
    });
    const b = metadataIdentity(otherMint, "metaplex", {
      name: "Two",
      symbol: "SAME",
    });
    expect(a.symbol).toBe(b.symbol);
    expect(a.mint).not.toBe(b.mint);
    expect(a.trust).toBe("unverified");
  });
  it("does not promote spoofed symbols and rejects invisible format controls", () => {
    const spoof = metadataIdentity(mint, "token-2022", {
      name: "USD Coin",
      symbol: "USDC",
    });
    expect(spoof.trust).toBe("unverified");
    expect(spoof.warning).toContain("not its curated mint");
    expect(
      metadataIdentity(mint, "metaplex", { name: "Coin", symbol: "U\u202eSDC" })
        .status,
    ).toBe("invalid");
    expect(
      metadataIdentity(mint, "metaplex", { name: "Coin", symbol: "SOL" }).trust,
    ).toBe("unverified");
  });
  it("reads Token-2022 metadata only for the matching mint", async () => {
    const call = vi
      .fn()
      .mockResolvedValue({
        value: {
          owner: TOKEN_2022,
          data: {
            parsed: {
              type: "mint",
              info: {
                extensions: [
                  {
                    extension: "tokenMetadata",
                    state: {
                      mint,
                      name: "Example Token",
                      symbol: "EXM",
                      uri: "https://example.com/token.json",
                    },
                  },
                ],
              },
            },
          },
        },
      });
    const identity = await createTokenIdentityResolver(call).resolve(mint);
    expect(identity).toMatchObject({
      mint,
      symbol: "EXM",
      name: "Example Token",
      source: "token-2022",
      trust: "unverified",
    });
    expect(
      (await createTokenIdentityResolver(call).resolve(otherMint)).status,
    ).toBe("invalid");
  });
  it("decodes a Metaplex record and validates its embedded mint", async () => {
    const encode = (text: string) => {
      const value = Buffer.from(text);
      const length = Buffer.alloc(4);
      length.writeUInt32LE(value.length);
      return Buffer.concat([length, value]);
    };
    const data = Buffer.concat([
      Buffer.from([4]),
      Buffer.alloc(32),
      new PublicKey(mint).toBuffer(),
      encode("Example"),
      encode("EXM"),
      encode("https://example.com/token.json"),
    ]);
    const call = vi
      .fn()
      .mockResolvedValueOnce(mintAccount())
      .mockResolvedValueOnce({
        value: {
          owner: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
          data: [data.toString("base64"), "base64"],
        },
      });
    expect(await createTokenIdentityResolver(call).resolve(mint)).toMatchObject(
      { mint, name: "Example", source: "metaplex", trust: "unverified" },
    );
  });
  it("handles missing and unavailable metadata and caches failures temporarily", async () => {
    let time = 0;
    const call = vi.fn().mockResolvedValue(null);
    const resolver = createTokenIdentityResolver(call, () => time);
    expect((await resolver.resolve(mint)).status).toBe("missing");
    await resolver.resolve(mint);
    expect(call).toHaveBeenCalledTimes(1);
    time = 300001;
    await resolver.resolve(mint);
    expect(call).toHaveBeenCalledTimes(2);
    const unavailable = createTokenIdentityResolver(
      vi.fn().mockRejectedValue(new Error("offline")),
    );
    expect((await unavailable.resolve(mint)).status).toBe("unavailable");
  });
  it("rejects wallet, token-account and program addresses as mints", async () => {
    for (const value of [
      { owner: "11111111111111111111111111111111", data: [] },
      {
        owner: TOKEN,
        data: { parsed: { type: "account", info: { mint: USDC } } },
      },
      { owner: TOKEN, executable: true, data: { parsed: { type: "mint" } } },
    ])
      expect(
        (
          await createTokenIdentityResolver(
            vi.fn().mockResolvedValue({ value }),
          ).resolve(mint)
        ).status,
      ).toBe("invalid");
  });
  it("falls back without changing the full mint and refuses unsafe logo protocols", () => {
    expect(knownTokenIdentity(mint)).toMatchObject({
      mint,
      source: "fallback",
      trust: "unresolved",
    });
    expect(safeMetadataUrl("javascript:alert(1)")).toBeUndefined();
    expect(
      safeMetadataUrl("https://user:secret@example.com/logo.png"),
    ).toBeUndefined();
    expect(safeMetadataUrl("https://example.com/logo.png")).toBe(
      "https://example.com/logo.png",
    );
  });
});
