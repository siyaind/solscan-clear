"use client";
import { ArrowUpRight, Check, CircleHelp, Braces } from "lucide-react";
import { units } from "@/lib/format";
import { balancePosition, explainBalance } from "@/lib/anatomy";
import type { AssetChange, Transaction } from "@/lib/model";

export function ImpactCanvas({
  tx,
  asset,
  selection,
  onSelect,
  onEvidence,
}: {
  tx: Transaction;
  asset: AssetChange;
  selection: string;
  onSelect: (id: string) => void;
  onEvidence: (id: string) => void;
}) {
  const bridge = explainBalance(tx, asset);
  const complete = asset.native ? bridge.explained : bridge.reconciled;
  const steps = [
    {
      id: "before",
      label: "Before",
      amount: asset.before,
      before: "0",
      after: asset.before,
      kind: "endpoint",
      evidenceId: asset.evidenceId,
    },
    ...bridge.parts,
    {
      id: "after",
      label: "After",
      amount: asset.after,
      before: "0",
      after: asset.after,
      kind: "endpoint",
      evidenceId: asset.evidenceId,
    },
  ];
  return (
    <section className="money-anatomy" aria-label="Money anatomy">
      <div className="anatomy-section-heading">
        <div>
          <span className="eyebrow">01 / MONEY ANATOMY</span>
          <h2>
            {asset.native
              ? "Account for every difference."
              : "The balance, before and after."}
          </h2>
        </div>
        <span
          className={`reconcile-status ${complete ? "complete" : "partial"}`}
        >
          {complete ? <Check size={14} /> : <CircleHelp size={14} />}
          {asset.native
            ? bridge.explained
              ? "Amounts reconcile"
              : "Not fully explained"
            : bridge.known
              ? "Net balance recorded"
              : "Balance incomplete"}
        </span>
      </div>
      <p className="anatomy-note">
        {asset.native
          ? "A balance breakdown, not execution order. Every component opens its supporting record."
          : "These are net token-account balances. Transfer instructions can include fees and do not by themselves establish the amount received."}
      </p>
      {bridge.known ? (
        <div
          className="waterfall-scroll"
          tabIndex={0}
          role="region"
          aria-label={`${asset.symbol} balance waterfall; scroll to see all components`}
        >
          <div
            className="money-waterfall"
            style={{
              gridTemplateColumns: `repeat(${steps.length}, minmax(max(160px, ${Math.max(...steps.map((step) => units(step.amount ?? "0", asset.decimals, step.kind !== "endpoint").length)) + 4}ch), 1fr))`,
            }}
          >
            {steps.map((step, index) => {
              const a = balancePosition(step.before!, bridge.extent);
              const b = balancePosition(step.after!, bridge.extent);
              const positive = BigInt(step.amount!) > 0n;
              return (
                <button
                  key={step.id}
                  className={`waterfall-step ${step.kind} ${positive ? "incoming" : "outgoing"} ${selection === step.evidenceId ? "selected" : ""}`}
                  onClick={() => onSelect(step.evidenceId)}
                >
                  <span className="waterfall-label">{step.label}</span>
                  <span className="waterfall-plot" aria-hidden="true">
                    <span
                      className="waterfall-bar"
                      style={{
                        bottom: `${Math.min(a, b)}%`,
                        height: `${Math.abs(a - b)}%`,
                      }}
                    />
                    {index < steps.length - 1 && (
                      <span
                        className="waterfall-connector"
                        style={{ bottom: `${b}%` }}
                      />
                    )}
                  </span>
                  <strong>
                    {units(
                      step.amount!,
                      asset.decimals,
                      step.kind !== "endpoint",
                    )}
                  </strong>
                  <small>{asset.symbol}</small>
                  <span className="waterfall-source">
                    {step.kind === "endpoint" || step.kind === "observed"
                      ? "Balance record"
                      : step.kind === "unclassified"
                        ? "Meaning unknown"
                        : step.kind === "fee"
                          ? "Recorded fee"
                          : "Parsed instruction"}
                    <ArrowUpRight size={11} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="anatomy-unknown">
          <CircleHelp size={24} />
          <div>
            <strong>
              There isn’t enough balance data to draw this bridge.
            </strong>
            <p>
              Before:{" "}
              {asset.before === null
                ? "Unknown"
                : units(asset.before, asset.decimals)}{" "}
              · After:{" "}
              {asset.after === null
                ? "Unknown"
                : units(asset.after, asset.decimals)}
            </p>
          </div>
        </div>
      )}
      <div className="money-ledger" aria-label="Exact balance components">
        {bridge.parts.map((part) => (
          <button
            key={part.id}
            className={`money-ledger-row ${selection === part.evidenceId ? "selected" : ""}`}
            onClick={() => onSelect(part.evidenceId)}
          >
            <span className={`part-dot ${part.kind}`} />
            <span>
              {part.label}
              <small>
                {part.kind === "unclassified"
                  ? "Observed residual; its cause is not determined"
                  : part.kind === "funding"
                    ? "Account funding, separate from the network fee"
                    : part.kind === "fee"
                      ? "Charged to the fee payer"
                      : part.kind === "observed"
                        ? "Change recorded for this token account"
                        : "Supported by a parsed System instruction"}
              </small>
            </span>
            <strong>
              {units(part.amount, asset.decimals, true)}{" "}
              <small>{asset.symbol}</small>
            </strong>
            <ArrowUpRight size={14} />
          </button>
        ))}
        {bridge.known && !bridge.parts.length && (
          <p className="anatomy-note">This balance did not change.</p>
        )}
      </div>
      <div className="money-footnote">
        <p>
          Small changes use a minimum-height marker. Exact amounts are always
          shown.
        </p>
        <button
          className="text-link"
          onClick={() => onEvidence(asset.evidenceId)}
        >
          <Braces size={14} />
          Reveal balance proof <ArrowUpRight size={13} />
        </button>
      </div>
    </section>
  );
}
