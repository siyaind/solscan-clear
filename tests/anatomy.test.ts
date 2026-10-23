import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import {
  anatomyOutcomes,
  balancePosition,
  explainBalance,
  focusedRelationships,
} from "../lib/anatomy";
import { normalize } from "../lib/normalize";
import { readViewState, writeViewState } from "../lib/view-state";
import { parseExactJson } from "../lib/format";
import { SYSTEM, TOKEN, TOKEN_2022 } from "../lib/model";
import {
  syntheticTransfer,
  syntheticToken,
  DESIGN_PAYER,
  DESIGN_RECIPIENT,
} from "../lib/synthetic";
const source = { kind: "synthetic" as const, label: "Anatomy test fixture" };

describe("Transaction Anatomy accounting", () => {
  it("bridges a sender's starting balance through transfer and tiny fee exactly", () => {
    const tx = normalize(syntheticTransfer(), source);
    const bridge = explainBalance(tx, anatomyOutcomes(tx, DESIGN_PAYER)[0]);
    expect(
      bridge.parts.map((part) => [part.kind, part.amount, part.after]),
    ).toEqual([
      ["transfer", "-250000000", "1750000000"],
      ["fee", "-5000", "1749995000"],
    ]);
    expect(bridge.reconciled).toBe(true);
    expect(bridge.explained).toBe(true);
  });
  it("recomputes the recipient independently and does not charge them the payer fee", () => {
    const tx = normalize(syntheticTransfer(), source);
    const bridge = explainBalance(tx, anatomyOutcomes(tx, DESIGN_RECIPIENT)[0]);
    expect(bridge.parts).toHaveLength(1);
    expect(bridge.parts[0]).toMatchObject({
      amount: "250000000",
      before: "1000000000",
      after: "1250000000",
    });
    expect(bridge.reconciled).toBe(true);
  });
  it("retains unexplained residuals as unknown even when the arithmetic reconciles", () => {
    const raw = syntheticTransfer();
    raw.meta!.postBalances![0] = 1749985000;
    const tx = normalize(raw, source);
    const bridge = explainBalance(tx, anatomyOutcomes(tx, DESIGN_PAYER)[0]);
    expect(bridge.parts.at(-1)).toMatchObject({
      kind: "unclassified",
      amount: "-10000",
    });
    expect(bridge.reconciled).toBe(true);
    expect(bridge.explained).toBe(false);
  });
  it("keeps a failed transaction's fee but never invents a transfer component", () => {
    const raw = syntheticTransfer();
    raw.meta!.err = { InstructionError: [0, "Custom"] };
    raw.meta!.postBalances = [1999995000, 1000000000, 1];
    const tx = normalize(raw, source);
    const bridge = explainBalance(tx, anatomyOutcomes(tx, DESIGN_PAYER)[0]);
    expect(bridge.parts.map((part) => part.kind)).toEqual(["fee"]);
    expect(bridge.reconciled).toBe(true);
  });
  it("does not construct a balance bridge from missing metadata", () => {
    const raw = syntheticTransfer();
    raw.meta = null;
    const tx = normalize(raw, source);
    const bridge = explainBalance(tx, anatomyOutcomes(tx, DESIGN_PAYER)[0]);
    expect(bridge.known).toBe(false);
    expect(bridge.reconciled).toBe(false);
    expect(bridge.parts).toEqual([]);
  });
  it("keeps an exactly recorded fee inspectable when the before balance is absent", () => {
    const raw = syntheticTransfer();
    delete raw.meta!.preBalances;
    const tx = normalize(raw, source);
    const bridge = explainBalance(tx, anatomyOutcomes(tx, DESIGN_PAYER)[0]);
    expect(bridge.known).toBe(false);
    expect(bridge.parts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "fee",
          amount: "-5000",
          before: null,
          after: null,
        }),
        expect.objectContaining({
          kind: "transfer",
          amount: "-250000000",
          before: null,
          after: null,
        }),
      ]),
    );
  });
  it("shows token net records instead of reconstructing receipt from gross Token-2022 instructions", () => {
    const raw = syntheticToken();
    raw.transaction.message.instructions[0].programId = TOKEN_2022;
    raw.meta!.preTokenBalances![0].uiTokenAmount.amount = "1000000";
    raw.meta!.postTokenBalances![1].uiTokenAmount.amount = "990000";
    const tx = normalize(raw, source);
    const token = anatomyOutcomes(tx, DESIGN_RECIPIENT).find((a) => !a.native)!;
    const bridge = explainBalance(tx, token);
    expect(bridge.parts[0]).toMatchObject({
      amount: "990000",
      kind: "observed",
      evidenceId: token.evidenceId,
    });
    expect(bridge.explained).toBe(false);
    expect(bridge.reconciled).toBe(true);
  });
  it("preserves integer precision above Number.MAX_SAFE_INTEGER while scaling chart positions", () => {
    const tx = normalize(syntheticToken(), source);
    const token = anatomyOutcomes(tx, DESIGN_PAYER)[0];
    const bridge = explainBalance(tx, token);
    expect(bridge.parts[0].amount).toBe("-123456789012345678901");
    expect(bridge.parts[0].after).toBe("0");
    expect(balancePosition(token.before!, bridge.extent)).toBe(100);
    expect(balancePosition("0", bridge.extent)).toBe(0);
    expect(balancePosition("0", [0n])).toBe(0);
  });
  it("does not merge separate token accounts sharing a mint", () => {
    const raw = syntheticToken();
    raw.meta!.postTokenBalances![1].owner = DESIGN_PAYER;
    const tx = normalize(raw, source);
    expect(
      anatomyOutcomes(tx, DESIGN_PAYER).filter((a) => !a.native),
    ).toHaveLength(2);
  });
  for (const filename of readdirSync("public/fixtures").filter(
    (name) => name.endsWith(".json") && name !== "manifest.json",
  )) {
    it(`reconciles every known outcome in the real capture ${filename}`, () => {
      const raw = (
        parseExactJson(readFileSync(`public/fixtures/${filename}`, "utf8")) as {
          result: unknown;
        }
      ).result;
      const tx = normalize(raw, { kind: "recorded", label: filename });
      for (const asset of tx.assets) {
        const bridge = explainBalance(tx, asset);
        if (bridge.known) expect(bridge.reconciled, asset.id).toBe(true);
        for (const part of bridge.parts)
          expect(tx.evidence.some((e) => e.id === part.evidenceId)).toBe(true);
      }
    });
  }
});

describe("Anatomy focus and shareable state", () => {
  it("keeps the outcome anchored when an instruction is selected and the page is reloaded", () => {
    const tx = normalize(syntheticToken(), source);
    const subject = anatomyOutcomes(tx, DESIGN_PAYER)[0].evidenceId;
    const state = {
      layer: "evidence" as const,
      perspective: DESIGN_PAYER,
      selection: "ix:0",
      subject,
    };
    expect(
      readViewState(
        tx,
        new URL(writeViewState("https://clear.example/tx/demo", state)).search,
      ),
    ).toEqual(state);
  });
  it("rejects an asset from another perspective and repairs invalid depths and evidence", () => {
    const tx = normalize(syntheticTransfer(), source);
    const restored = readViewState(
      tx,
      "?asset=account:1&layer=bad&focus=missing",
    );
    expect(restored).toMatchObject({
      subject: "account:0",
      selection: "account:0",
      layer: "impact",
    });
  });
  it("keeps old shared links usable and selects their token outcome", () => {
    const tx = normalize(syntheticToken(), source);
    const token = anatomyOutcomes(tx, DESIGN_PAYER)[0];
    expect(
      readViewState(
        tx,
        `?layer=evidence&focus=${encodeURIComponent(token.evidenceId)}`,
      ).subject,
    ).toBe(token.evidenceId);
  });
  it("prioritizes actual counterparties over unrelated changed accounts", () => {
    const tx = normalize(syntheticTransfer(), source);
    tx.accounts.push({
      ...tx.accounts[1],
      address: TOKEN,
      id: "unrelated",
      evidenceId: "unrelated",
    });
    const focus = focusedRelationships(
      tx,
      DESIGN_PAYER,
      "account:0",
      "account:0",
      false,
    );
    expect(focus.addresses).toContain(DESIGN_RECIPIENT);
    expect(focus.addresses).toContain(SYSTEM);
    expect(focus.addresses).not.toContain(TOKEN);
  });
  it("expands the selected program's recorded dependencies", () => {
    const tx = normalize(syntheticTransfer(), source);
    const focus = focusedRelationships(
      tx,
      DESIGN_PAYER,
      "account:0",
      "ix:0",
      false,
    );
    expect(focus.focus).toBe(SYSTEM);
    expect(focus.addresses).toEqual(
      expect.arrayContaining([DESIGN_PAYER, DESIGN_RECIPIENT, SYSTEM]),
    );
  });
  it("keeps the selected focus within the node limit under dense repeated dependencies", () => {
    const tx = normalize(syntheticTransfer(), source);
    for (let index = 0; index < 15; index++) {
      const address = `dense-account-${index}`;
      tx.accounts.push({
        ...tx.accounts[1],
        address,
        id: address,
        evidenceId: address,
      });
      for (let repeat = 0; repeat < 40; repeat++)
        tx.relationships.push({
          ...tx.relationships.find((edge) => edge.kind === "movement")!,
          id: `${address}-${repeat}`,
          from: DESIGN_PAYER,
          to: address,
        });
    }
    for (const expanded of [false, true]) {
      const focus = focusedRelationships(
        tx,
        DESIGN_PAYER,
        "account:0",
        "account:1",
        expanded,
      );
      expect(focus.addresses).toContain(DESIGN_RECIPIENT);
      expect(focus.addresses).toContain(DESIGN_PAYER);
      expect(focus.addresses).toHaveLength(expanded ? 12 : 7);
      expect(new Set(focus.addresses).size).toBe(focus.addresses.length);
    }
  });
});
