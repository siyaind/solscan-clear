"use client";
import { useState, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Braces,
  ChevronDown,
  GitBranch,
  Layers3,
  Minus,
  Plus,
} from "lucide-react";
import type { AssetChange, Layer, Transaction } from "@/lib/model";
import { anatomyOutcomes } from "@/lib/anatomy";
import { short, units } from "@/lib/format";
import { Classification, CopyButton } from "./ui";
import { ImpactCanvas } from "./impact-canvas";
import { RelationshipCanvas } from "./relationship-canvas";
import { EvidenceView } from "./evidence-inspector";
import { ProofCard } from "./proof-card";

const depths: {
  layer: Layer;
  title: string;
  question: string;
  icon: typeof Layers3;
}[] = [
  {
    layer: "impact",
    title: "Outcome",
    question: "See what changed",
    icon: Layers3,
  },
  {
    layer: "connections",
    title: "Structure",
    question: "Unfold the connections",
    icon: GitBranch,
  },
  {
    layer: "evidence",
    title: "Proof",
    question: "Reveal the records",
    icon: Braces,
  },
];
function direction(asset: AssetChange) {
  return asset.delta === null
    ? "unknown"
    : BigInt(asset.delta) > 0n
      ? "positive"
      : BigInt(asset.delta) < 0n
        ? "negative"
        : "neutral";
}

export function AnatomyStage({
  tx,
  perspective,
  subject,
  selection,
  layer,
  onLayer,
  onSubject,
  onSelect,
  onEvidence,
  onPerspective,
  inspector,
}: {
  tx: Transaction;
  perspective: string;
  subject: string;
  selection: string;
  layer: Layer;
  onLayer: (layer: Layer) => void;
  onSubject: (id: string) => void;
  onSelect: (id: string) => void;
  onEvidence: (id: string) => void;
  onPerspective: (address: string) => void;
  inspector: ReactNode;
}) {
  const [expandedBalance, setExpandedBalance] = useState<Layer | null>(null);
  const outcomes = anatomyOutcomes(tx, perspective);
  const asset =
    outcomes.find((item) => item.evidenceId === subject) ?? outcomes[0];
  const selected = tx.evidence.find((e) => e.id === selection);
  const depth = depths.findIndex((item) => item.layer === layer);
  const balanceOpen = depth === 0 || expandedBalance === layer;
  if (!asset)
    return (
      <p className="anatomy-unknown">
        No balance records are available for this perspective.
      </p>
    );
  const tone = direction(asset);
  return (
    <section
      className="transaction-anatomy"
      aria-label="Transaction Anatomy"
      data-depth={depth}
    >
      <div className="anatomy-intro">
        <div>
          <span className="eyebrow">TRANSACTION ANATOMY</span>
          <h2>
            One transaction. <em>Open it up.</em>
          </h2>
        </div>
        <p>
          Keep the outcome in sight.
          <br />
          Go as deep as you need.
        </p>
      </div>
      <div
        className="anatomy-outcomes"
        aria-label="Recorded outcomes for selected perspective"
      >
        {outcomes.map((item) => (
          <button
            key={item.id}
            className={`anatomy-outcome ${!item.native ? "asset-card" : ""} ${direction(item)} ${asset.id === item.id ? "selected" : ""}`}
            aria-pressed={asset.id === item.id}
            onClick={() => onSubject(item.evidenceId)}
          >
            <span className="outcome-label">
              {item.native ? "Native SOL" : item.symbol}
              <span>
                {item.native
                  ? "Account balance"
                  : `Token account ${short(item.account, 3)}`}
              </span>
            </span>
            <strong>
              {item.delta === null
                ? "Not determined"
                : units(item.delta, item.decimals, true)}
              <small>{item.symbol}</small>
            </strong>
            <span className="outcome-hint">
              {item.delta === null
                ? "Incomplete record"
                : item.delta === "0"
                  ? "No net change"
                  : BigInt(item.delta) > 0n
                    ? "Net increase"
                    : "Net decrease"}
              <ArrowUpRight size={13} />
            </span>
          </button>
        ))}
      </div>
      {outcomes.length > 1 && (
        <p className="outcome-scroll-cue">
          Scroll sideways to inspect all {outcomes.length} recorded balances →
        </p>
      )}
      <div className="anatomy-depth-control">
        <div className="depth-description">
          <span className="eyebrow">EXPLORE DEPTH</span>
          <span className="mono">0{depth + 1} / 03</span>
        </div>
        <div className="depth-track">
          <label className="sr-only" htmlFor="anatomy-depth">
            Exploration depth
          </label>
          <input
            id="anatomy-depth"
            type="range"
            min="0"
            max="2"
            step="1"
            value={depth}
            aria-valuetext={depths[depth].title}
            onChange={(event) =>
              onLayer(depths[Number(event.target.value)].layer)
            }
          />
          <div
            className="depth-stops"
            role="group"
            aria-label="Exploration depths"
          >
            {depths.map((item, index) => (
              <button
                key={item.layer}
                className={
                  index === depth ? "active" : index < depth ? "revealed" : ""
                }
                aria-pressed={index === depth}
                onClick={() => onLayer(item.layer)}
              >
                <item.icon size={17} />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.question}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div
        id="anatomy-anchor"
        className={`anatomy-anchor ${tone}`}
        data-evidence-id={asset.evidenceId}
      >
        <span className="anchor-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
          {tone === "positive" ? (
            <ArrowDownLeft size={27} />
          ) : tone === "negative" ? (
            <ArrowUpRight size={27} />
          ) : (
            <Minus size={27} />
          )}
        </span>
        <div className="anchor-outcome">
          <span className="eyebrow">THE OUTCOME IN FOCUS</span>
          <strong>
            {asset.delta === null
              ? "Not determined"
              : units(asset.delta, asset.decimals, true)}{" "}
            <span>{asset.symbol}</span>
          </strong>
          <p>
            {asset.native
              ? "Native account balance"
              : "Recorded token-account balance"}{" "}
            · <code>{short(asset.account, 5)}</code>
          </p>
        </div>
        <div className="anchor-balances">
          <div>
            <span>BEFORE</span>
            <strong>
              {asset.before === null
                ? "Unknown"
                : units(asset.before, asset.decimals)}
            </strong>
          </div>
          <ArrowRight size={17} />
          <div>
            <span>AFTER</span>
            <strong>
              {asset.after === null
                ? "Unknown"
                : units(asset.after, asset.decimals)}
            </strong>
          </div>
          <small>
            {asset.symbol} · {asset.decimals} decimals
          </small>
        </div>
      </div>
      <div className="anatomy-workbench">
        <div className="anatomy-panels">
          {depth > 0 && (
            <button
              className="anatomy-fold"
              aria-expanded={balanceOpen}
              aria-controls="anatomy-money"
              onClick={() => setExpandedBalance(balanceOpen ? null : layer)}
            >
              <span>
                <Layers3 size={16} />
                Money anatomy <small>The outcome stays with you.</small>
              </span>
              {balanceOpen ? <Minus size={16} /> : <Plus size={16} />}
            </button>
          )}
          <div id="anatomy-money" hidden={!balanceOpen}>
            <ImpactCanvas
              tx={tx}
              asset={asset}
              selection={selection}
              onSelect={onSelect}
              onEvidence={onEvidence}
            />
          </div>
          {depth === 1 && (
            <div className="anatomy-structure" id="anatomy-structure">
              <RelationshipCanvas
                tx={tx}
                perspective={perspective}
                subject={asset.evidenceId}
                selection={selection}
                onSelect={onSelect}
                onEvidence={onEvidence}
                onPerspective={onPerspective}
              />
            </div>
          )}
          {depth === 2 && (
            <div className="anatomy-path-summary">
              <GitBranch size={16} />
              <span>
                Selected path: {asset.symbol} balance →{" "}
                {selected?.title ?? "record"}
              </span>
              <button onClick={() => onLayer("connections")}>
                Inspect structure
              </button>
            </div>
          )}
          <section
            className={`evidence-peel ${depth === 2 ? "open" : ""}`}
            id="anatomy-proof"
            aria-label="Selected evidence proof"
          >
            <div className="peel-thread" aria-hidden="true" />
            <div className="peel-header">
              <span className="eyebrow">
                {depth === 2
                  ? "03 / THE EVIDENCE, REVEALED"
                  : "SELECTED DETAIL"}
              </span>
              <Classification
                kind={selected?.kind ?? "unknown"}
                synthetic={tx.source.kind === "synthetic"}
              />
            </div>
            <h3>{selected?.title ?? "Choose an element to inspect."}</h3>
            <p>{selected?.description}</p>
            {depth === 2 && selected ? (
              <>
                <ProofCard tx={tx} evidence={selected} />
                <div className="peel-reference">
                  <span className="small-label">SOURCE RPC FIELDS</span>
                  <code>{selected.path}</code>
                  <CopyButton
                    value={selected.path}
                    label="Copy evidence path"
                  />
                </div>
                <details className="peel-json">
                  <summary>
                    View original RPC fields <ChevronDown size={16} />
                  </summary>
                  <div>
                    <span>Underlying record</span>
                    <CopyButton
                      value={JSON.stringify(selected.data, null, 2)}
                      label="Copy revealed proof JSON"
                    />
                  </div>
                  <pre tabIndex={0} aria-label="Selected evidence JSON">
                    {JSON.stringify(selected.data, null, 2)}
                  </pre>
                </details>
                <p className="peel-context">
                  Outcome retained above: {asset.symbol} ·{" "}
                  {short(asset.account)}. Selecting evidence does not change
                  whose balance you are viewing.
                </p>
              </>
            ) : (
              <button
                className="peel-open"
                onClick={() => onEvidence(selection)}
              >
                <Braces size={16} />
                Reveal this proof
                <ArrowRight size={16} />
              </button>
            )}
          </section>
          {depth === 2 && (
            <details className="anatomy-all-evidence">
              <summary>
                Browse the complete transaction record
                <ChevronDown size={16} />
              </summary>
              <EvidenceView
                tx={tx}
                selection={selection}
                onSelect={onSelect}
                perspective={perspective}
              />
            </details>
          )}
          <div className="anatomy-navigation">
            <p>
              {depth === 0
                ? "The balances are the outcome. Next, see the relationships around them."
                : depth === 1
                  ? "Each connection has a record. Open the proof behind the selected detail."
                  : "You can trace every claim back to the record that supports it."}
            </p>
            <button
              className="button primary"
              onClick={() => onLayer(depths[depth === 2 ? 0 : depth + 1].layer)}
            >
              {depth === 2 ? "Return to outcome" : "Go deeper"}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
        {inspector}
      </div>
    </section>
  );
}
