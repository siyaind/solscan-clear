import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { classifyExplorerInput } from "../lib/explorer-input";
import {
  evidenceCategory,
  readViewState,
  writeViewState,
} from "../lib/view-state";
import { normalize, perspectiveAssets } from "../lib/normalize";
import { SYSTEM, TOKEN, TOKEN_2022, USDC } from "../lib/model";
import {
  syntheticToken,
  syntheticTransfer,
  DESIGN_PAYER,
  DESIGN_RECIPIENT,
} from "../lib/synthetic";
import { fetchTransaction } from "../lib/transaction-service";
import { fetchAccount } from "../lib/account-service";
import { rpc, RpcError, errorResponse } from "../lib/rpc";
import { parseExactJson } from "../lib/format";

const source = {
  kind: "synthetic" as const,
  label: "Explicit audit test fixture",
};
const recorded = (
  parseExactJson(
    readFileSync("public/fixtures/swap-success-6.json", "utf8"),
  ) as { result: unknown }
).result;
const signature =
  "4KxpWzijGzn5HSRNfCWGMpiEXUgKJs3J4qCCzMQoNxGAo2A1Evx9gciScLkqWHcj3Pwwjz5tTcwqgkByD3kzgAHb";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("parser bugs found in the audit", () => {
  it("accepts valid parsed text/memo instructions", () => {
    const tx = syntheticTransfer();
    tx.transaction.message.instructions.push({
      programId: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
      parsed: "Payment reference 123",
    });
    expect(normalize(tx, source).instructions[1].label).toBe(
      "Parsed text / memo",
    );
  });
  it("handles omitted metadata and null lookup data honestly", () => {
    const tx = syntheticTransfer();
    delete tx.meta;
    expect(normalize(tx, source).execution).toBe("unknown");
    const another = syntheticTransfer();
    another.meta!.loadedAddresses = null;
    expect(normalize(another, source).accounts).toHaveLength(3);
  });
  it("does not infer historical ownership from just the post owner", () => {
    const tx = syntheticToken();
    delete tx.meta!.preTokenBalances![0].owner;
    const normalized = normalize(tx, source);
    const token = normalized.assets.find((a) => !a.native)!;
    expect(token.owner).toBeUndefined();
    expect(token.ownership).toBe("incomplete");
    expect(
      perspectiveAssets(normalized, DESIGN_PAYER).filter(
        (a) => !a.native && a.account !== DESIGN_PAYER,
      ),
    ).toHaveLength(0);
  });
  it("retains both owners when token authority changes", () => {
    const tx = syntheticToken();
    tx.meta!.postTokenBalances![0].owner = DESIGN_RECIPIENT;
    const asset = normalize(tx, source).assets.find((a) => !a.native)!;
    expect(asset.owner).toBeUndefined();
    expect(asset.beforeOwner).toBe(DESIGN_PAYER);
    expect(asset.afterOwner).toBe(DESIGN_RECIPIENT);
    expect(asset.ownership).toBe("changed");
  });
  it("parses Token-2022 transferCheckedWithFee as an instruction amount, not net receipt", () => {
    const tx = syntheticToken();
    tx.transaction.message.instructions = [
      {
        programId: TOKEN_2022,
        parsed: {
          type: "transferCheckedWithFee",
          info: {
            source: DESIGN_PAYER,
            destination: DESIGN_RECIPIENT,
            mint: USDC,
            tokenAmount: { amount: "1000000", decimals: 6 },
            feeAmount: { amount: "10000", decimals: 6 },
          },
        },
      },
    ];
    const edge = normalize(tx, source).relationships.find(
      (e) => e.kind === "movement",
    )!;
    expect(edge.amount).toBe("1000000");
    expect(edge.transferFee).toBe("10000");
    expect(edge.amountBasis).toBe("instruction");
    expect(edge.symbol).toBe("USDC");
  });
  it("resolves nested CPI callers instead of connecting every call to the outer program", () => {
    const tx = syntheticTransfer();
    tx.meta!.innerInstructions = [
      {
        index: 0,
        instructions: [
          { programId: TOKEN, accounts: [0], stackHeight: 2 },
          { programId: TOKEN_2022, accounts: [0], stackHeight: 3 },
          { programId: TOKEN_2022, accounts: [0], stackHeight: 2 },
        ],
      },
    ];
    const edges = normalize(tx, source).relationships;
    expect(edges.find((e) => e.id === "ix:0:1:invoke")?.from).toBe(TOKEN);
    expect(edges.find((e) => e.id === "ix:0:2:invoke")?.from).toBe(SYSTEM);
  });
  it("does not invent a direct caller when CPI stack height is absent", () => {
    const tx = syntheticTransfer();
    tx.meta!.innerInstructions = [
      { index: 0, instructions: [{ programId: TOKEN, accounts: [0] }] },
    ];
    const edge = normalize(tx, source).relationships.find(
      (e) => e.id === "ix:0:0:group",
    );
    expect(edge?.kind).toBe("reference");
    expect(edge?.label).toContain("not determined");
  });
  it("does not promote inner amounts when failure logs leave their committed effect uncertain", () => {
    const tx = syntheticTransfer();
    tx.transaction.message.instructions = [
      { programId: TOKEN, accounts: [0, 1], data: "unknown" },
    ];
    tx.meta!.innerInstructions = [
      {
        index: 0,
        instructions: [
          {
            programId: SYSTEM,
            parsed: {
              type: "transfer",
              info: {
                source: DESIGN_PAYER,
                destination: DESIGN_RECIPIENT,
                lamports: 250000000,
              },
            },
            stackHeight: 2,
          },
        ],
      },
    ];
    tx.meta!.logMessages = [
      `Program ${SYSTEM} failed: custom program error: 0x1`,
    ];
    const normalized = normalize(tx, source);
    expect(
      normalized.relationships.filter((e) => e.kind === "movement"),
    ).toHaveLength(0);
    expect(
      normalized.warnings.some((w) => w.includes("Inner program failure")),
    ).toBe(true);
  });
});

describe("live transaction states", () => {
  it("keeps finality separate from execution on a real response", async () => {
    const result = await fetchTransaction(signature, async (method) =>
      method === "getTransaction"
        ? recorded
        : { value: [{ confirmationStatus: "finalized", err: null }] },
    );
    expect(result.state).toBe("ready");
    if (result.state === "ready") expect(result.tx.source.kind).toBe("live");
  });
  it("shows processed signatures as pending when metadata is unavailable", async () => {
    const result = await fetchTransaction(signature, async (method) =>
      method === "getTransaction"
        ? null
        : { value: [{ confirmationStatus: "processed", err: null }] },
    );
    expect(result.state).toBe("pending");
  });
  it("distinguishes finalized but unavailable history from pending", async () => {
    await expect(
      fetchTransaction(signature, async (method) =>
        method === "getTransaction"
          ? null
          : { value: [{ confirmationStatus: "finalized", err: null }] },
      ),
    ).rejects.toMatchObject({ status: 503, kind: "history-unavailable" });
  });
  it("does not claim a missing signature when the status provider failed", async () => {
    await expect(
      fetchTransaction(signature, async (method) => {
        if (method === "getTransaction") return null;
        throw new RpcError(429, "Busy", "throttled");
      }),
    ).rejects.toMatchObject({ status: 503, kind: "unavailable" });
  });
  it("reports missing only when both details and status are absent", async () => {
    await expect(
      fetchTransaction(signature, async (method) =>
        method === "getTransaction" ? null : { value: [null] },
      ),
    ).rejects.toMatchObject({ status: 404, kind: "missing" });
  });
  it("preserves a usable transaction if only finality lookup fails", async () => {
    const result = await fetchTransaction(signature, async (method) => {
      if (method === "getTransaction") return recorded;
      throw new Error("timeout");
    });
    expect(result.state).toBe("ready");
    if (result.state === "ready") expect(result.tx.finality).toBe("unknown");
  });
  it("rejects a response for a different signature", async () => {
    await expect(
      fetchTransaction("1".repeat(64), async (method) =>
        method === "getTransaction" ? recorded : { value: [null] },
      ),
    ).rejects.toMatchObject({ kind: "mismatch" });
  });
  it("starts independent lookups together", async () => {
    const methods: string[] = [];
    const pending: (() => void)[] = [];
    const request = fetchTransaction(signature, (method) => {
      methods.push(method);
      return new Promise((resolve) =>
        pending.push(() =>
          resolve(method === "getTransaction" ? recorded : { value: [null] }),
        ),
      );
    });
    expect(methods).toEqual(["getTransaction", "getSignatureStatuses"]);
    pending.forEach((resolve) => resolve());
    await request;
  });
});

describe("RPC transport safeguards", () => {
  it("preserves unsafe integer lexemes in RPC results", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(
          '{"jsonrpc":"2.0","id":1,"result":{"lamports":9007199254740993}}',
        ),
    );
    expect(await rpc("getBalance", [])).toEqual({
      lamports: "9007199254740993",
    });
  });
  for (const text of [
    "<html>bad gateway</html>",
    '{"jsonrpc":"2.0","id":1}',
    '{"jsonrpc":"2.0","id":2,"result":null}',
    '{"jsonrpc":"2.0","id":1,"result":null,"error":{}}',
  ])
    it(`rejects a malformed RPC envelope: ${text.slice(0, 30)}`, async () => {
      vi.stubGlobal("fetch", async () => new Response(text));
      await expect(rpc("getTransaction", [])).rejects.toMatchObject({
        status: 502,
        kind: "invalid-response",
      });
    });
  it("handles HTTP-200 JSON-RPC throttling without exposing provider details", async () => {
    vi.stubGlobal("fetch", async () =>
      Response.json({
        jsonrpc: "2.0",
        id: 1,
        error: { code: -32005, message: "secret-provider-url?api-key=example" },
      }),
    );
    await expect(rpc("getTransaction", [])).rejects.toMatchObject({
      status: 429,
      kind: "throttled",
    });
  });
  it("rejects an oversized response before parsing", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response("{}", { headers: { "content-length": "5000000" } }),
    );
    await expect(rpc("getTransaction", [])).rejects.toMatchObject({
      kind: "oversized",
    });
  });
  it("marks rate-limited responses noncacheable with retry guidance", () => {
    const response = errorResponse(new RpcError(429, "Busy", "throttled"));
    expect(response.status).toBe(429);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Retry-After")).toBe("5");
  });
});

describe("independent account and history availability", () => {
  const account = {
    value: {
      lamports: "1000000000",
      owner: SYSTEM,
      executable: false,
      data: ["", "base64"],
    },
  };
  it("retains account details when history is rate limited", async () => {
    const result = await fetchAccount(
      DESIGN_PAYER,
      undefined,
      async (method) => {
        if (method === "getAccountInfo") return account;
        throw new RpcError(429, "Busy", "throttled");
      },
    );
    expect(result.accountAvailable).toBe(true);
    expect(result.historyAvailable).toBe(false);
    expect(result.account?.lamports).toBe("1000000000");
  });
  it("retains history when account details cannot be returned", async () => {
    const result = await fetchAccount(
      DESIGN_PAYER,
      undefined,
      async (method) => {
        if (method === "getSignaturesForAddress")
          return [{ signature, slot: 1, blockTime: null, err: null }];
        throw new Error("unavailable");
      },
    );
    expect(result.accountAvailable).toBe(false);
    expect(result.historyAvailable).toBe(true);
    expect(result.signatures).toHaveLength(1);
  });
  it("does not call getAccountInfo again while paging history", async () => {
    const call = vi.fn<(method: string, params: unknown[]) => Promise<unknown>>(
      async () => [],
    );
    const result = await fetchAccount(DESIGN_PAYER, signature, call);
    expect(call).toHaveBeenCalledTimes(1);
    expect(call.mock.calls[0][0]).toBe("getSignaturesForAddress");
    expect(result.nextCursor).toBeNull();
  });
});

describe("explorer input and shareable investigation context", () => {
  it("accepts complete mainnet explorer links", () => {
    expect(
      classifyExplorerInput(
        `https://solscan.io/tx/${signature}?cluster=mainnet-beta`,
      ),
    ).toMatchObject({ kind: "transaction", value: signature });
    expect(
      classifyExplorerInput(`https://explorer.solana.com/address/${USDC}`),
    ).toMatchObject({ kind: "account", value: USDC });
  });
  it("rejects a devnet link rather than querying it on mainnet", () => {
    expect(
      classifyExplorerInput(
        `https://solscan.io/tx/${signature}?cluster=devnet`,
      ),
    ).toMatchObject({ kind: "invalid" });
  });
  it("rejects lookalike explorer domains and mismatched paths", () => {
    expect(
      classifyExplorerInput(`https://solscan.io.evil.test/tx/${signature}`),
    ).toMatchObject({ kind: "invalid" });
    expect(
      classifyExplorerInput(`https://solscan.io/tx/${USDC}`),
    ).toMatchObject({ kind: "invalid" });
  });
  it("restores the same account, layer, and evidence after refresh", () => {
    const tx = normalize(syntheticTransfer(), source);
    const state = {
      layer: "evidence" as const,
      perspective: DESIGN_RECIPIENT,
      selection: "ix:0",
    };
    const url = writeViewState(
      "https://clear.example/tx/demo-design-transfer",
      state,
    );
    expect(readViewState(tx, new URL(url).search)).toEqual(state);
  });
  it("falls back from invalid query selections safely", () => {
    const tx = normalize(syntheticTransfer(), source);
    expect(
      readViewState(tx, "?layer=nonsense&account=unknown&focus=made-up"),
    ).toEqual({
      layer: "impact",
      perspective: DESIGN_PAYER,
      selection: "account:0",
    });
  });
  it("opens the matching evidence category", () => {
    expect(evidenceCategory("ix:4:2")).toBe("instructions");
    expect(evidenceCategory("token:4:mint")).toBe("balances");
  });
});
