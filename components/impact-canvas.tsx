"use client";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Check,
  CircleHelp,
  Braces,
  Minus,
  Plus,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { units, short } from "@/lib/format";
import { perspectiveAssets, reconcile } from "@/lib/normalize";
import type { Transaction } from "@/lib/model";

export function ImpactCanvas({
  tx,
  perspective,
  selection,
  onSelect,
  onEvidence,
}: {
  tx: Transaction;
  perspective: string;
  selection: string;
  onSelect: (id: string) => void;
  onEvidence: (id: string) => void;
}) {
  const assets = perspectiveAssets(tx, perspective);
  const native = assets.find((a) => a.native);
  const tokens = assets.filter((a) => !a.native);
  const reconciliation = reconcile(tx, perspective);
  const positive =
    native?.delta !== null &&
    native?.delta !== undefined &&
    BigInt(native.delta) > 0n;
  const unknown = native?.delta === null || native?.delta === undefined;
  const unchanged = !unknown && native.delta === "0";
  const max = reconciliation.parts.reduce(
    (sum, part) =>
      sum +
      (BigInt(part.amount) < 0n ? -BigInt(part.amount) : BigInt(part.amount)),
    0n,
  );
  return (
    <>
      <section
        className={`balance-canvas panel ${tx.execution === "failed" ? "failed-canvas" : ""}`}
      >
        <div className="panel-heading">
          <div>
            <span className="eyebrow">01 / THE BALANCE SHEET</span>
            <h2>
              {tx.execution === "failed"
                ? "The cost of an attempt."
                : "What changed, exactly?"}
            </h2>
          </div>
          <span className="canvas-corner">
            <span />
            NATIVE SOL
          </span>
        </div>
        <div className="delta-hero">
          <span
            className={`delta-direction ${unknown || unchanged ? "neutral" : positive ? "positive" : "negative"}`}
          >
            {unknown ? (
              <CircleHelp size={26} />
            ) : unchanged ? (
              <Minus size={26} />
            ) : positive ? (
              <ArrowDownLeft size={26} />
            ) : tx.execution === "failed" ? (
              <Minus size={26} />
            ) : (
              <ArrowUpRight size={26} />
            )}
          </span>
          <div>
            <span className="small-label">NET ACCOUNT CHANGE</span>
            <button
              className={`delta-number ${positive ? "positive" : ""} ${selection === native?.evidenceId ? "focused-number" : ""}`}
              onClick={() => onSelect(native?.evidenceId ?? "status")}
            >
              {native?.delta === null || native?.delta === undefined
                ? "Not determined"
                : units(native.delta, 9, true)}
              <span>
                {native?.delta === null || native?.delta === undefined
                  ? ""
                  : "SOL"}
              </span>
            </button>
          </div>
        </div>
        <div className="balance-journey">
          <button
            className="balance-endpoint"
            onClick={() => onSelect(native?.evidenceId ?? "status")}
          >
            <span className="small-label">BEFORE</span>
            <strong>
              {native?.before !== null && native?.before !== undefined
                ? units(native.before)
                : "Unknown"}
              <small>SOL</small>
            </strong>
            <span className="journey-node before" />
          </button>
          <div className="journey-line">
            <span className="journey-dash" />
            <span className="journey-text">ONE ATOMIC TRANSACTION</span>
            <ArrowRight size={17} />
          </div>
          <button
            className="balance-endpoint after"
            onClick={() => onSelect(native?.evidenceId ?? "status")}
          >
            <span className="small-label">AFTER</span>
            <strong>
              {native?.after !== null && native?.after !== undefined
                ? units(native.after)
                : "Unknown"}
              <small>SOL</small>
            </strong>
            <span className="journey-node" />
          </button>
        </div>
        <div className="reconciliation-heading">
          <span>Let’s account for the difference.</span>
          <span
            className={`reconcile-status ${reconciliation.explained ? "complete" : "partial"}`}
          >
            {reconciliation.explained ? (
              <Check size={13} />
            ) : (
              <CircleHelp size={13} />
            )}{" "}
            {reconciliation.explained
              ? "Amounts reconcile"
              : "Not fully explained"}
          </span>
        </div>
        <div
          className="reconciliation-bar"
          aria-label="Balance change decomposition"
        >
          {reconciliation.parts.map((part) => {
            const absolute =
              BigInt(part.amount) < 0n
                ? -BigInt(part.amount)
                : BigInt(part.amount);
            const proportion = max
              ? Number((absolute * 10000n) / max) / 100
              : 0;
            return (
              <button
                key={part.id}
                className={`bar-segment ${part.kind} ${selection === part.evidenceId ? "selected" : ""}`}
                style={{ flexGrow: Math.max(proportion, 1) }}
                title={`${part.label}: ${units(part.amount, 9, true)} SOL`}
                aria-label={`Inspect ${part.label}`}
                onClick={() => onSelect(part.evidenceId)}
              />
            );
          })}
          {reconciliation.parts.length === 0 && <span className="empty-bar" />}
        </div>
        <div className="impact-breakdown">
          {reconciliation.parts.map((part) => (
            <button
              key={part.id}
              className={`breakdown-row ${selection === part.evidenceId ? "selected" : ""}`}
              onClick={() => onSelect(part.evidenceId)}
            >
              <span className={`part-dot ${part.kind}`} />
              <span>
                {part.label}
                <small>
                  {part.kind === "fee"
                    ? "Charged to the fee payer"
                    : part.kind === "unclassified"
                      ? "Observed in balances; meaning not determined"
                      : part.kind === "funding"
                        ? "Account funding is separate from the network fee"
                        : "Supported by a parsed System instruction"}
                </small>
              </span>
              <strong className={BigInt(part.amount) > 0n ? "positive" : ""}>
                {units(part.amount, 9, true)}
                <small>SOL</small>
              </strong>
              <ArrowUpRight size={14} />
            </button>
          ))}
        </div>
        <button
          className="evidence-bridge"
          onClick={() => onEvidence(native?.evidenceId ?? "status")}
        >
          <Braces size={16} />
          <span>Where did these numbers come from?</span>
          <ArrowRight size={16} />
        </button>
      </section>
      <section className="token-section">
        <div className="section-heading">
          <h2>Beyond the native balance.</h2>
          <span>
            {tokens.length} token account{tokens.length === 1 ? "" : "s"}
          </span>
        </div>
        {tokens.length ? (
          <div className="token-cards">
            {tokens.map((asset) => (
              <button
                key={asset.id}
                className={`asset-card ${selection === asset.evidenceId ? "selected" : ""}`}
                onClick={() => onSelect(asset.evidenceId)}
              >
                <div className="asset-top">
                  <span
                    className={`token-icon ${asset.symbol === "USDC" ? "usdc" : asset.symbol === "wSOL" ? "wsol" : ""}`}
                  >
                    {asset.symbol === "USDC"
                      ? "$"
                      : asset.symbol === "wSOL"
                        ? "◎"
                        : "T"}
                  </span>
                  <div>
                    <strong>{asset.symbol}</strong>
                    <small>
                      {asset.symbol === "wSOL"
                        ? "Wrapped SOL · separate SPL balance"
                        : `Token account ${short(asset.account, 4)}`}
                    </small>
                  </div>
                  <ChevronRight size={15} />
                </div>
                <div
                  className={`asset-delta ${asset.delta !== null && BigInt(asset.delta) > 0n ? "positive" : "negative"}`}
                >
                  {asset.delta === null
                    ? "Not determined"
                    : units(asset.delta, asset.decimals, true)}
                  {asset.delta !== null &&
                    (BigInt(asset.delta) > 0n ? (
                      <Plus size={14} />
                    ) : (
                      <Minus size={14} />
                    ))}
                </div>
                <div className="asset-before-after">
                  <span>
                    {asset.before !== null
                      ? units(asset.before, asset.decimals)
                      : "Unknown"}
                  </span>
                  <ArrowRight size={13} />
                  <span>
                    {asset.after !== null
                      ? units(asset.after, asset.decimals)
                      : "Unknown"}
                  </span>
                </div>
                <div className="asset-bottom">
                  <span>{asset.decimals} decimal places</span>
                  <span>
                    Inspect balance <ArrowUpRight size={12} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="no-token-state">
            <ShieldCheck size={21} />
            <div>
              <strong>No token balances linked to this perspective.</strong>
              <p>
                Choose another account to inspect its changes. Native SOL and
                token accounts remain separate.
              </p>
            </div>
          </div>
        )}
      </section>
      <div className="quiet-note">
        <ShieldCheck size={14} />
        <p>
          Balance changes are facts. Explanations are labeled. Nothing gets
          guessed.
        </p>
      </div>
    </>
  );
}
