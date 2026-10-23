"use client";
import {
  ArrowRight,
  ArrowUpRight,
  Braces,
  Check,
  FileJson,
  Hash,
  ListTree,
  Terminal,
  X,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import type { Evidence, Layer, Transaction } from "@/lib/model";
import { short, units } from "@/lib/format";
import { Address, Classification, CopyButton } from "./ui";
import { evidenceCategory } from "@/lib/view-state";

export function EvidenceInspector({
  tx,
  evidence,
  layer,
  onEvidence,
  onClose,
}: {
  tx: Transaction;
  evidence?: Evidence;
  layer: Layer;
  onEvidence: () => void;
  onClose: () => void;
}) {
  const account = tx.accounts.find((a) => a.address === evidence?.account);
  const asset = tx.assets.find((item) => item.evidenceId === evidence?.id);
  const balance =
    asset ?? (evidence?.id.startsWith("account:") ? account : undefined);
  const symbol = asset?.symbol ?? "SOL";
  return (
    <div className="inspector panel">
      <div className="inspector-top">
        <span className="eyebrow">
          <span className="small-line" />
          THE INSPECTOR
        </span>
        <button
          className="icon-button close-inspector"
          onClick={onClose}
          aria-label="Close evidence inspector"
        >
          <X size={18} />
        </button>
        <Braces className="desktop-inspector-icon" size={16} />
      </div>
      <div className="inspector-content">
        <span className="inspector-number">
          {layer === "impact" ? "01" : layer === "connections" ? "02" : "03"}
          <small>/ IN FOCUS</small>
        </span>
        <h2>{evidence?.title ?? "Choose a detail."}</h2>
        <p>
          {evidence?.description ??
            "Select a balance, account, or instruction. Its supporting evidence will appear here."}
        </p>
        {evidence && (
          <>
            <Classification
              kind={evidence.kind}
              synthetic={tx.source.kind === "synthetic"}
            />
            {evidence.account && (
              <div className="inspector-account">
                <span className="small-label">
                  {account?.role.toUpperCase() ?? "RELATED ACCOUNT"}
                </span>
                <Address value={evidence.account} full />
              </div>
            )}
            <div className="inspector-path">
              <span className="small-label">EVIDENCE REFERENCE</span>
              <code>{evidence.path}</code>
            </div>
            {balance && (
              <dl className="inspector-stats">
                <div>
                  <dt>Asset / precision</dt>
                  <dd>
                    {symbol} · {asset?.decimals ?? 9} decimals
                  </dd>
                </div>
                <div>
                  <dt>Before</dt>
                  <dd>
                    {balance.before === null
                      ? "Unknown"
                      : units(balance.before, asset?.decimals ?? 9)}{" "}
                    <small>{symbol}</small>
                  </dd>
                </div>
                <div>
                  <dt>After</dt>
                  <dd>
                    {balance.after === null
                      ? "Unknown"
                      : units(balance.after, asset?.decimals ?? 9)}{" "}
                    <small>{symbol}</small>
                  </dd>
                </div>
              </dl>
            )}
            <details
              className="inspector-data"
              key={evidence.id}
              open={layer === "evidence"}
            >
              <summary>
                <FileJson size={14} />
                Underlying record <ChevronDown size={13} />
              </summary>
              <div className="json-copy">
                <CopyButton
                  value={JSON.stringify(evidence.data, null, 2)}
                  label="Copy selected evidence JSON"
                />
              </div>
              <pre>{JSON.stringify(evidence.data, null, 2)}</pre>
            </details>
            <button className="inspector-action" onClick={onEvidence}>
              {layer === "evidence"
                ? "Show selected proof"
                : "Reveal selected proof"}
              <ArrowUpRight size={16} />
            </button>
          </>
        )}
      </div>
      <div className="inspector-footer">
        <Check size={14} />
        <p>
          {tx.source.kind === "synthetic"
            ? "Explicitly synthetic design data."
            : "Grounded in the transaction record."}
          <br />
          <span>Interpretation stays distinguishable from fact.</span>
        </p>
      </div>
    </div>
  );
}

export function EvidenceView({
  tx,
  selection,
  onSelect,
  perspective,
}: {
  tx: Transaction;
  selection: string;
  onSelect: (id: string) => void;
  perspective: string;
}) {
  const [manualTab, setManualTab] = useState({
    selection,
    tab: evidenceCategory(selection),
  });
  const tab =
    manualTab.selection === selection
      ? manualTab.tab
      : evidenceCategory(selection);
  const setTab = (next: string) => setManualTab({ selection, tab: next });
  const tabs = [
    { id: "balances", label: "Balances", icon: Hash },
    { id: "instructions", label: "Instructions", icon: ListTree },
    { id: "logs", label: "Logs", icon: Terminal },
    { id: "raw", label: "Raw JSON", icon: FileJson },
  ];
  const balances = tx.evidence
    .filter(
      (e) =>
        e.id.startsWith("account:") ||
        e.id.startsWith("token:") ||
        e.id === "fee" ||
        e.id === "status",
    )
    .sort(
      (a, b) =>
        Number(b.account === perspective) - Number(a.account === perspective),
    );
  return (
    <section className="evidence-view panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">03 / NOTHING BEHIND THE CURTAIN</span>
          <h2>The record behind the story.</h2>
        </div>
        <Braces size={21} />
      </div>
      <p className="panel-description">
        Inspect the exact fields that support each claim. Select a record to
        open its evidence.
      </p>
      <div
        className="evidence-tabs"
        role="tablist"
        aria-label="Evidence categories"
      >
        {tabs.map((t) => (
          <button
            role="tab"
            aria-selected={tab === t.id}
            id={`evidence-tab-${t.id}`}
            aria-controls="evidence-category-panel"
            tabIndex={tab === t.id ? 0 : -1}
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowRight" && event.key !== "ArrowLeft")
                return;
              event.preventDefault();
              const index = tabs.findIndex((entry) => entry.id === t.id);
              const next =
                tabs[
                  (index +
                    (event.key === "ArrowRight" ? 1 : -1) +
                    tabs.length) %
                    tabs.length
                ];
              setTab(next.id);
              document.getElementById(`evidence-tab-${next.id}`)?.focus();
            }}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="evidence-category-panel"
        aria-labelledby={`evidence-tab-${tab}`}
      >
        {tab === "balances" && (
          <div className="evidence-record-list">
            {balances.map((e) => (
              <button
                className={`evidence-record ${selection === e.id ? "selected" : ""}`}
                key={e.id}
                onClick={() => onSelect(e.id)}
              >
                <span className="evidence-record-icon">
                  {e.id === "fee" ? "ƒ" : e.id === "status" ? "✓" : "◎"}
                </span>
                <span>
                  <strong>{e.title}</strong>
                  <code>{e.path}</code>
                </span>
                <span className={`record-kind ${e.kind}`}>
                  {e.kind === "record"
                    ? tx.source.kind === "synthetic"
                      ? "Synthetic"
                      : "On-chain"
                    : "Unknown"}
                </span>
                <ArrowUpRight size={14} />
              </button>
            ))}
          </div>
        )}
        {tab === "instructions" && (
          <div className="instruction-tree">
            <p className="quiet-caption">
              Outer instructions followed by inner CPI records. Grouping does
              not imply independently committed steps.
            </p>
            {tx.instructions.map((ix) => (
              <button
                key={ix.id}
                className={`instruction-row ${ix.innerIndex !== undefined ? "inner" : ""} ${selection === ix.evidenceId ? "selected" : ""}`}
                onClick={() => onSelect(ix.evidenceId)}
              >
                <span className="instruction-index">
                  {ix.outerIndex + 1}
                  {ix.innerIndex !== undefined ? `.${ix.innerIndex + 1}` : ""}
                </span>
                <span>
                  <strong>{ix.label}</strong>
                  <code>{short(ix.program, 9)}</code>
                </span>
                <span
                  className={`record-kind ${ix.parsed ? "parsed" : "unknown"}`}
                >
                  {ix.parsed ? "Parsed" : "Encoded"}
                </span>
                <ArrowUpRight size={13} />
              </button>
            ))}
          </div>
        )}
        {tab === "logs" && (
          <div className="log-view">
            <div className="raw-toolbar">
              <span>
                {tx.logs.length} messages · {tx.computeUnits ?? "Unknown"}{" "}
                compute units
              </span>
              <CopyButton
                value={tx.logs.join("\n")}
                label="Copy execution logs"
              />
            </div>
            {tx.logs.length ? (
              <pre>
                {tx.logs.map((line, index) => (
                  <span
                    className={
                      /error|failed/i.test(line)
                        ? "log-error"
                        : /success/i.test(line)
                          ? "log-success"
                          : ""
                    }
                    key={index}
                  >
                    <i>{String(index + 1).padStart(3, "0")}</i>
                    {line}
                    {"\n"}
                  </span>
                ))}
              </pre>
            ) : (
              <div className="empty-state">
                Execution logs were not returned by the provider.
              </div>
            )}
          </div>
        )}
        {tab === "raw" && (
          <div className="raw-view">
            <div className="raw-toolbar">
              <span>
                Original getTransaction result · exact integer values preserved
              </span>
              <CopyButton
                value={JSON.stringify(tx.raw, null, 2)}
                label="Copy raw transaction JSON"
              />
            </div>
            <details open>
              <summary>
                Transaction response <ChevronDown size={14} />
              </summary>
              <pre>{JSON.stringify(tx.raw, null, 2)}</pre>
            </details>
          </div>
        )}
      </div>
      <div className="evidence-view-footer">
        <span>Fact. Interpretation. Unknown. Always distinguishable.</span>
        <button className="text-link" onClick={() => onSelect(selection)}>
          Inspect selection <ArrowRight size={13} />
        </button>
      </div>
    </section>
  );
}
