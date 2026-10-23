"use client";
import { useState } from "react";
import { ArrowUpRight, Check, CircleHelp, Braces } from "lucide-react";
import { units } from "@/lib/format";
import { balancePosition, explainBalance } from "@/lib/anatomy";
import type { AssetChange, Transaction } from "@/lib/model";
import { TokenIdentityDetails } from "./token-identity";

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
  const [scale, setScale] = useState<"change" | "balance">("change");
  const bridge = explainBalance(tx, asset);
  const complete = asset.native ? bridge.explained : bridge.reconciled;
  const magnitude = (value: string) => {
    const amount = BigInt(value);
    return amount < 0n ? -amount : amount;
  };
  const maxChange = [
    asset.delta ?? "0",
    ...bridge.parts.map((part) => part.amount),
  ]
    .map(magnitude)
    .reduce((a, b) => (a > b ? a : b), 1n);
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
      <div
        className="balance-view-switch"
        role="group"
        aria-label="Balance chart scale"
      >
        <button
          aria-pressed={scale === "change"}
          onClick={() => setScale("change")}
        >
          Explain the change
        </button>
        <button
          aria-pressed={scale === "balance"}
          onClick={() => setScale("balance")}
        >
          Full balance scale
        </button>
      </div>
      {bridge.known && scale === "change" && (
        <div
          className="change-explanation"
          aria-label="Components of balance change"
        >
          <div className="change-equation">
            <span>
              Before{" "}
              <strong>
                {units(asset.before!, asset.decimals)} {asset.symbol}
              </strong>
            </span>
            <span>
              Recorded change{" "}
              <strong>
                {units(asset.delta!, asset.decimals, true)} {asset.symbol}
              </strong>
            </span>
            <span>
              After{" "}
              <strong>
                {units(asset.after!, asset.decimals)} {asset.symbol}
              </strong>
            </span>
          </div>
          {bridge.parts.map((part) => {
            const exactWidth = Number(
              (magnitude(part.amount) * 100n) / maxChange,
            );
            const amplified = exactWidth < 6 && part.amount !== "0";
            return (
              <button
                key={part.id}
                className={`change-part ${part.kind}`}
                onClick={() => onSelect(part.evidenceId)}
              >
                <span>
                  <strong>{part.label}</strong>
                  <small>
                    {units(part.amount, asset.decimals, true)} {asset.symbol}
                  </small>
                </span>
                <span
                  className={`change-bar ${part.kind} ${BigInt(part.amount) < 0n ? "outgoing" : "incoming"}`}
                  aria-hidden="true"
                >
                  <i
                    style={{
                      width: `${part.amount === "0" ? 0 : Math.max(6, exactWidth)}%`,
                    }}
                  />
                </span>
                {amplified && (
                  <small className="amplified-label">
                    Small value shown with a minimum marker
                  </small>
                )}
              </button>
            );
          })}
          {!bridge.parts.length && <p>No component change was recorded.</p>}
          <p className="change-scale-note">
            Bar lengths compare changes, not full account balances. Minimum
            markers are labeled; exact values appear above.
          </p>
        </div>
      )}
      {bridge.known && scale === "balance" && (
        <p className="waterfall-scroll-cue">
          Scroll sideways to inspect each component →
        </p>
      )}
      {bridge.known && scale === "balance" ? (
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
      ) : !bridge.known ? (
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
      ) : null}
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
          {scale === "balance"
            ? "Full balances share one proportional scale. Tiny components may be subpixel; exact values remain in the ledger."
            : "Every component retains its exact recorded or parsed amount; unclassified residuals remain visible."}
        </p>
        <button
          className="text-link"
          onClick={() => onEvidence(asset.evidenceId)}
        >
          <Braces size={14} />
          Reveal balance proof <ArrowUpRight size={13} />
        </button>
      </div>
      <TokenIdentityDetails identity={asset.identity} account={asset.account} />
    </section>
  );
}
