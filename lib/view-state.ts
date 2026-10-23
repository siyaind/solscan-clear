import type { Layer, Transaction } from "./model";
export type ViewState = {
  layer: Layer;
  perspective: string;
  selection: string;
};

export function readViewState(tx: Transaction, search: string): ViewState {
  const params = new URLSearchParams(search);
  const requestedLayer = params.get("layer");
  const perspective = tx.accounts.some(
    (a) => a.address === params.get("account"),
  )
    ? params.get("account")!
    : tx.feePayer;
  const fallback =
    tx.accounts.find((a) => a.address === perspective)?.evidenceId ?? "status";
  return {
    layer:
      requestedLayer === "connections" || requestedLayer === "evidence"
        ? requestedLayer
        : "impact",
    perspective,
    selection: tx.evidence.some((e) => e.id === params.get("focus"))
      ? params.get("focus")!
      : fallback,
  };
}

export function writeViewState(href: string, state: ViewState): string {
  const url = new URL(href);
  url.searchParams.set("layer", state.layer);
  url.searchParams.set("account", state.perspective);
  url.searchParams.set("focus", state.selection);
  return url.toString();
}

export const evidenceCategory = (selection: string) =>
  selection.startsWith("ix:") ? "instructions" : "balances";
