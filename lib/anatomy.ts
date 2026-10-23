import type { AssetChange, Component, Transaction } from "./model";
import { perspectiveAssets, reconcile } from "./normalize";

export function anatomyOutcomes(tx: Transaction, perspective: string) {
  return perspectiveAssets(tx, perspective).sort((a, b) => {
    const rank = (asset: AssetChange) =>
      asset.delta !== null && asset.delta !== "0"
        ? asset.native
          ? 1
          : 0
        : asset.native
          ? 2
          : 3;
    return rank(a) - rank(b);
  });
}

export type AnatomyPart = Omit<Component, "kind"> & {
  kind: Component["kind"] | "observed";
  before: string | null;
  after: string | null;
};

/** An accounting bridge, never an inferred execution timeline. */
export function explainBalance(tx: Transaction, asset: AssetChange) {
  const reconciliation = asset.native ? reconcile(tx, asset.account) : null;
  const order = { transfer: 0, funding: 1, fee: 2, unclassified: 3 };
  const components: Omit<AnatomyPart, "before" | "after">[] = reconciliation
    ? [...reconciliation.parts].sort((a, b) => order[a.kind] - order[b.kind])
    : asset.delta !== null && asset.delta !== "0"
      ? [
          {
            id: asset.id,
            label: "Recorded token change",
            amount: asset.delta,
            evidenceId: asset.evidenceId,
            kind: "observed",
          },
        ]
      : [];
  let running = asset.before === null ? null : BigInt(asset.before);
  const parts: AnatomyPart[] = components.map((part) => {
    const before = running?.toString() ?? null;
    if (running !== null) running += BigInt(part.amount);
    return { ...part, before, after: running?.toString() ?? null };
  });
  const known =
    asset.before !== null && asset.after !== null && asset.delta !== null;
  const reconciled = known && running?.toString() === asset.after;
  return {
    parts,
    known,
    reconciled,
    explained: reconciliation?.explained ?? false,
    // Include intermediate values: accounting components can offset one another.
    extent: [
      0n,
      ...[
        asset.before,
        asset.after,
        ...parts.flatMap((p) => [p.before, p.after]),
      ]
        .filter((value): value is string => value !== null)
        .map(BigInt),
    ],
  };
}

/** Scale only bounded ratios to Number; amounts always remain BigInt. */
export function balancePosition(value: string, extent: bigint[]) {
  const min = extent.reduce((a, b) => (a < b ? a : b), 0n);
  const max = extent.reduce((a, b) => (a > b ? a : b), 0n);
  if (min === max) return 0;
  return Number(((BigInt(value) - min) * 10000n) / (max - min)) / 100;
}

export function focusedRelationships(
  tx: Transaction,
  perspective: string,
  subject: string,
  selection: string,
  expanded: boolean,
) {
  const asset = tx.assets.find((a) => a.evidenceId === subject);
  const selected = tx.evidence.find((e) => e.id === selection);
  const instruction = tx.instructions.find((i) => i.evidenceId === selection);
  const focus =
    instruction?.program ?? selected?.account ?? asset?.account ?? perspective;
  const seeds = new Set([perspective, asset?.account ?? perspective, focus]);
  const scores = new Map<string, number>();
  const add = (address: string, score: number) => {
    if (tx.accounts.some((a) => a.address === address))
      scores.set(address, (scores.get(address) ?? 0) + score);
  };
  add(perspective, 10000);
  if (asset) add(asset.account, 9000);
  add(focus, 8000);
  // Selected program dependencies take precedence over unrelated transaction nodes.
  instruction?.accounts.forEach((address) => add(address, 500));
  const relevant = tx.relationships.filter(
    (edge) => seeds.has(edge.from) || seeds.has(edge.to),
  );
  for (const edge of relevant) {
    const score =
      edge.kind === "movement" ? 300 : edge.kind === "invocation" ? 100 : 30;
    add(edge.from, score);
    add(edge.to, score);
    const ix = tx.instructions.find((item) => item.id === edge.instructionId);
    if (ix) add(ix.program, 80);
  }
  // Reserve the perspective, outcome, and selected focus even in dense traces.
  // Repeated dependencies must not crowd the focus out of the bounded layout.
  const ranked = [...scores].sort(
    (a, b) => Number(seeds.has(b[0])) - Number(seeds.has(a[0])) || b[1] - a[1],
  );
  const addresses = ranked
    .slice(0, expanded ? 12 : 7)
    .map(([address]) => address);
  return {
    addresses,
    focus,
    hidden: Math.max(0, ranked.length - addresses.length),
    relevantCount: ranked.length,
  };
}
