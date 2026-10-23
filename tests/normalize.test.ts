import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import {
  compareAddresses,
  decodeBase58,
  integer,
  isAddress,
  isSignature,
  parseExactJson,
  units,
} from "../lib/format";
import { normalize, perspectiveAssets, reconcile } from "../lib/normalize";
import {
  DESIGN_PAYER,
  DESIGN_RECIPIENT,
  syntheticToken,
  syntheticTransfer,
} from "../lib/synthetic";
import { SYSTEM, TOKEN, USDC, WSOL, type RawTransaction } from "../lib/model";
import baselines from "../docs/fixtures-expected.json";
const source = {
  kind: "synthetic" as const,
  label: "Unit-test synthetic fixture",
};
function parsedInstruction(input: RawTransaction) {
  const parsed = input.transaction.message.instructions[0].parsed;
  if (!parsed || typeof parsed !== "object")
    throw new Error("Expected structured test instruction");
  return parsed;
}

describe("exact financial formatting", () => {
  it("formats lamports without rounding", () => {
    expect(units(1n)).toBe("0.000000001");
    expect(units(-250005000n)).toBe("−0.250005");
    expect(units(1000000000n)).toBe("1");
  });
  it("preserves large token units and decimals", () => {
    expect(units("123456789012345678901", 6)).toBe(
      "123,456,789,012,345.678901",
    );
    expect(units("1", 0)).toBe("1");
    expect(units("0", 6, true)).toBe("0");
  });
  it("does not accept already-rounded unsafe numbers", () => {
    expect(integer(Number.MAX_SAFE_INTEGER + 1)).toBeNull();
    expect(integer("9007199254740993")).toBe(9007199254740993n);
  });
  it("reads unsafe JSON integers losslessly", () => {
    expect(parseExactJson('{"balance":9007199254740993,"safe":5000}')).toEqual({
      balance: "9007199254740993",
      safe: 5000,
    });
  });
});

describe("public-key validation and comparison", () => {
  it("checks the decoded size rather than string length alone", () => {
    expect(isAddress(SYSTEM)).toBe(true);
    expect(isAddress(USDC)).toBe(true);
    expect(isAddress("1".repeat(31))).toBe(false);
    expect(isAddress("0".repeat(44))).toBe(false);
    expect(decodeBase58("O0Il")).toBeNull();
  });
  it("validates full real signatures", () => {
    expect(
      isSignature(
        "3JeVFqF2qrVPvhciy6hVHF7Bv4NQhuYvkGVkE6nWh2KsLVHedsFi2AFRRyFVwr5PMENgyfsJYjfVorM7zL7f8yfL",
      ),
    ).toBe(true);
    expect(isSignature(USDC)).toBe(false);
  });
  it("highlights exact character differences", () => {
    const r = compareAddresses(USDC, USDC.slice(0, -2) + "2v");
    expect(r.valid).toBe(true);
    expect(r.equal).toBe(false);
    expect(r.characters.filter((c) => !c.same)).toHaveLength(1);
    expect(compareAddresses(USDC, USDC).equal).toBe(true);
  });
});

describe("transaction accounting", () => {
  it("reconciles a native transfer and payer fee exactly", () => {
    const tx = normalize(syntheticTransfer(), source, "finalized");
    expect(tx.accounts[0].delta).toBe("-250005000");
    expect(tx.fee).toBe("5000");
    const r = reconcile(tx, DESIGN_PAYER);
    expect(r.explained).toBe(true);
    expect(r.parts.reduce((sum, p) => sum + BigInt(p.amount), 0n)).toBe(
      -250005000n,
    );
    expect(r.parts.map((p) => p.kind)).toEqual(["fee", "transfer"]);
  });
  it("changes perspective without charging a recipient the payer fee", () => {
    const tx = normalize(syntheticTransfer(), source);
    const r = reconcile(tx, DESIGN_RECIPIENT);
    expect(r.explained).toBe(true);
    expect(r.parts).toHaveLength(1);
    expect(r.delta).toBe("250000000");
    expect(perspectiveAssets(tx, DESIGN_RECIPIENT)[0].account).toBe(
      DESIGN_RECIPIENT,
    );
  });
  it("keeps unsupported changes as an explicit remainder", () => {
    const input = syntheticTransfer();
    input.transaction.message.instructions = [];
    const r = reconcile(normalize(input, source), DESIGN_PAYER);
    expect(r.explained).toBe(false);
    expect(r.parts.find((p) => p.kind === "unclassified")?.amount).toBe(
      "-250000000",
    );
  });
  it("does not label account funding as a network fee or refundable rent", () => {
    const input = syntheticTransfer();
    parsedInstruction(input).type = "createAccount";
    parsedInstruction(input).info = {
      source: DESIGN_PAYER,
      newAccount: DESIGN_RECIPIENT,
      lamports: 250000000,
    };
    const tx = normalize(input, source);
    expect(reconcile(tx, DESIGN_PAYER).parts.map((p) => p.kind)).toEqual([
      "fee",
      "funding",
    ]);
  });
  it("does not double-count self-transfers", () => {
    const input = syntheticTransfer();
    parsedInstruction(input).info!.destination = DESIGN_PAYER;
    input.meta!.postBalances = [1999995000, 1000000000, 1];
    const result = reconcile(normalize(input, source), DESIGN_PAYER);
    expect(result.explained).toBe(true);
    expect(result.parts).toHaveLength(1);
  });
  it("keeps failed attempted transfers out of committed movements", () => {
    const input = syntheticTransfer();
    input.meta!.err = { InstructionError: [0, "InsufficientFunds"] };
    input.meta!.postBalances = [1999995000, 1000000000, 1];
    const tx = normalize(input, source, "finalized");
    expect(tx.execution).toBe("failed");
    expect(tx.finality).toBe("finalized");
    expect(tx.relationships.filter((r) => r.kind === "movement")).toHaveLength(
      0,
    );
    expect(reconcile(tx, DESIGN_PAYER).parts.map((p) => p.kind)).toEqual([
      "fee",
    ]);
  });
  it("keeps failed unexpected balance effects visible without inventing successful transfers", () => {
    const input = syntheticTransfer();
    input.meta!.err = "failure";
    const tx = normalize(input, source);
    expect(reconcile(tx, DESIGN_PAYER).explained).toBe(false);
    expect(tx.relationships.filter((r) => r.kind === "movement")).toHaveLength(
      0,
    );
  });
  it("does not assume execution success or zero balances with missing metadata", () => {
    const input = syntheticTransfer();
    input.meta = null;
    const tx = normalize(input, source);
    expect(tx.execution).toBe("unknown");
    expect(tx.fee).toBeNull();
    expect(tx.accounts[0].delta).toBeNull();
    expect(tx.relationships.some((r) => r.kind === "movement")).toBe(false);
  });
  it("rejects unsafe or structurally invalid metadata", () => {
    const input = syntheticTransfer();
    input.meta!.preBalances![0] = Number.MAX_SAFE_INTEGER + 1;
    expect(() => normalize(input, source)).toThrow();
  });
});

describe("token and account-index edge cases", () => {
  it("calculates token deltas in base units with exact decimals", () => {
    const tx = normalize(syntheticToken(), source);
    expect(
      tx.assets.find((a) => a.owner === DESIGN_PAYER && !a.native)?.delta,
    ).toBe("-123456789012345678901");
  });
  it("does not merge two token accounts of the same mint", () => {
    const input = syntheticToken();
    input.meta!.postTokenBalances![1].owner = DESIGN_PAYER;
    const assets = perspectiveAssets(normalize(input, source), DESIGN_PAYER);
    expect(assets.filter((a) => !a.native)).toHaveLength(2);
  });
  it("does not assume zero when an entire metadata side is unavailable", () => {
    const input = syntheticToken();
    input.meta!.preTokenBalances = null;
    expect(
      normalize(input, source)
        .assets.filter((a) => !a.native)
        .every((a) => a.before === null && a.delta === null),
    ).toBe(true);
  });
  it("uses zero for a new token account only when both balance lists are present", () => {
    const tx = normalize(syntheticToken(), source);
    expect(
      tx.assets.find((a) => !a.native && a.account === DESIGN_RECIPIENT)
        ?.before,
    ).toBe("0");
  });
  it("keeps closed token account balances and metadata", () => {
    const input = syntheticToken();
    input.meta!.postTokenBalances = [];
    const tx = normalize(input, source);
    const asset = tx.assets.find((a) => !a.native)!;
    expect(asset.after).toBe("0");
    expect(asset.owner).toBe(DESIGN_PAYER);
  });
  it("does not guess ownership when metadata is absent or ownership changes", () => {
    const input = syntheticToken();
    input.meta!.preTokenBalances![0].owner = undefined;
    input.meta!.postTokenBalances![0].owner = undefined;
    const tx = normalize(input, source);
    expect(tx.assets.find((a) => !a.native)?.owner).toBeUndefined();
    expect(
      perspectiveAssets(tx, DESIGN_RECIPIENT).filter((a) => !a.native),
    ).toHaveLength(1);
  });
  it("disables token arithmetic on inconsistent decimals", () => {
    const input = syntheticToken();
    input.meta!.postTokenBalances![0].uiTokenAmount.decimals = 9;
    expect(
      normalize(input, source).assets.find((a) => !a.native)?.delta,
    ).toBeNull();
  });
  it("keeps wrapped SOL separate from native SOL", () => {
    const input = syntheticToken();
    input.meta!.preTokenBalances![0].mint = WSOL;
    input.meta!.postTokenBalances![0].mint = WSOL;
    const assets = perspectiveAssets(normalize(input, source), DESIGN_PAYER);
    expect(assets.find((a) => a.symbol === "wSOL")?.native).toBe(false);
    expect(assets.filter((a) => a.native)).toHaveLength(1);
  });
  it("resolves compiled lookup-table accounts once, writable before readonly", () => {
    const input = syntheticTransfer();
    input.transaction.message.accountKeys = [DESIGN_PAYER, SYSTEM];
    input.transaction.message.header = { numRequiredSignatures: 1 };
    input.meta!.loadedAddresses = {
      writable: [DESIGN_RECIPIENT],
      readonly: [TOKEN],
    };
    input.transaction.message.instructions = [
      { programIdIndex: 1, accounts: [0, 2], data: "encoded" },
    ];
    input.meta!.preBalances = [2000000000, 1, 1000000000, 1];
    input.meta!.postBalances = [1999995000, 1, 1000000000, 1];
    const tx = normalize(input, source);
    expect(tx.accounts.map((a) => a.address)).toEqual([
      DESIGN_PAYER,
      SYSTEM,
      DESIGN_RECIPIENT,
      TOKEN,
    ]);
    expect(tx.instructions[0].accounts).toEqual([
      DESIGN_PAYER,
      DESIGN_RECIPIENT,
    ]);
  });
  it("does not append loaded addresses twice for jsonParsed account keys", () => {
    const input = syntheticTransfer();
    input.meta!.loadedAddresses = {
      writable: [DESIGN_RECIPIENT],
      readonly: [],
    };
    expect(normalize(input, source).accounts).toHaveLength(3);
  });
  it("preserves inner instruction evidence paths", () => {
    const input = syntheticTransfer();
    input.meta!.innerInstructions = [
      { index: 42, instructions: [] },
      {
        index: 0,
        instructions: [
          { programId: TOKEN, accounts: [0, 1], data: "abc", stackHeight: 2 },
        ],
      },
    ];
    const tx = normalize(input, source);
    expect(tx.instructions[1].evidenceId).toBe("ix:0:0");
    expect(tx.evidence.find((e) => e.id === "ix:0:0")?.path).toBe(
      "meta.innerInstructions[1].instructions[0]",
    );
  });
});

describe("recorded mainnet regression corpus", () => {
  const files = readdirSync("public/fixtures").filter(
    (f) => f.endsWith(".json") && f !== "manifest.json",
  );
  for (const file of files)
    it(`normalizes ${file} with traceable selections`, () => {
      const record = parseExactJson(
        readFileSync(`public/fixtures/${file}`, "utf8"),
      ) as { result: RawTransaction };
      const tx = normalize(
        record.result,
        { kind: "recorded", label: "Mainnet regression capture" },
        "finalized",
      );
      const baseline = baselines.find((entry) => `${entry.id}.json` === file)!;
      expect(tx.signature).toBe(baseline.signature);
      expect(tx.execution).toBe(baseline.execution);
      expect(tx.fee).toBe(baseline.feeLamports);
      expect(tx.accounts.length).toBe(baseline.accounts);
      expect(tx.accounts[0].delta).toBe(baseline.nativePayerDelta);
      const ids = new Set(tx.evidence.map((e) => e.id));
      expect(tx.assets.every((a) => ids.has(a.evidenceId))).toBe(true);
      expect(tx.relationships.every((r) => ids.has(r.evidenceId))).toBe(true);
      expect(tx.instructions.every((i) => ids.has(i.evidenceId))).toBe(true);
      for (const account of tx.accounts) {
        if (account.delta === null) continue;
        const r = reconcile(tx, account.address);
        expect(
          r.parts.reduce((sum, p) => sum + BigInt(p.amount), 0n).toString(),
        ).toBe(account.delta);
      }
      if (tx.execution === "failed") {
        expect(tx.relationships.some((r) => r.kind === "movement")).toBe(false);
        expect(tx.fee).not.toBeNull();
      }
      expect(isSignature(tx.signature)).toBe(true);
    });
});
