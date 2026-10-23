"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ArrowLeft,
  ChevronRight,
  Check,
  Layers3,
  GitBranch,
  Braces,
  ChevronDown,
  CircleAlert,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { parseExactJson, short, units } from "@/lib/format";
import { examples } from "@/lib/examples";
import { normalize, transactionSummary } from "@/lib/normalize";
import { syntheticTransfer } from "@/lib/synthetic";
import type { Layer, Transaction } from "@/lib/model";
import { Classification, CopyButton, ErrorState, Loading } from "./ui";
import { ImpactCanvas } from "./impact-canvas";
import { RelationshipCanvas } from "./relationship-canvas";
import { EvidenceView, EvidenceInspector } from "./evidence-inspector";
import { ResponsiveInspector } from "./responsive-inspector";
import {
  readViewState,
  writeViewState,
  type ViewState,
} from "@/lib/view-state";

export function TransactionWorkspace({ signature }: { signature: string }) {
  const router = useRouter();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [error, setError] = useState<{ message: string; kind?: string } | null>(
    null,
  );
  const [attempt, setAttempt] = useState(0);
  const [layer, setLayer] = useState<Layer>("impact");
  const [perspective, setPerspective] = useState("");
  const [selection, setSelection] = useState("account:0");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [fullSignature, setFullSignature] = useState(false);
  const [chapter, setChapter] = useState(0);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setTx(null);
      setError(null);
      try {
        let transaction: Transaction;
        const demo = signature.startsWith("demo-");
        if (demo) {
          const id = signature.slice(5);
          const example = examples.find((e) => e.id === id);
          if (id === "design-transfer")
            transaction = normalize(
              syntheticTransfer(),
              { kind: "synthetic", label: "Synthetic design fixture" },
              "not applicable",
            );
          else if (example?.record) {
            const response = await fetch(example.record.file, {
              signal: controller.signal,
            });
            if (!response.ok)
              throw new Error("The recorded fixture could not be loaded.");
            const record = parseExactJson(await response.text()) as {
              result: unknown;
            };
            transaction = normalize(
              record.result,
              {
                kind: "recorded",
                label: "Recorded mainnet example",
                capturedAt: example.record.capturedAt,
                file: example.record.file,
              },
              "finalized",
            );
            if (transaction.signature !== example.record.signature)
              throw new Error(
                "Recorded fixture signature does not match its provenance manifest.",
              );
          } else
            throw new Error(
              "This example does not exist. Choose an available recorded example.",
            );
        } else {
          const response = await fetch(
            `/api/transactions/${encodeURIComponent(signature)}`,
            { signal: controller.signal },
          );
          const result = await response.json();
          if (!response.ok || result.error) {
            setError({ message: result.error, kind: result.kind });
            return;
          }
          transaction = result;
        }
        if (controller.signal.aborted) return;
        const saved = readViewState(transaction, window.location.search);
        setTx(transaction);
        setPerspective(saved.perspective);
        setSelection(saved.selection);
        setLayer(saved.layer);
        setSheetOpen(false);
        setChapter(0);
        setFullSignature(false);
      } catch (caught) {
        if (!controller.signal.aborted)
          setError({
            message:
              caught instanceof Error
                ? caught.message
                : "The transaction could not be safely loaded.",
            kind: "unavailable",
          });
      }
    }
    void load();
    return () => controller.abort();
  }, [signature, attempt]);
  useEffect(() => {
    if (!tx) return;
    const restore = () => {
      const saved = readViewState(tx, window.location.search);
      setLayer(saved.layer);
      setPerspective(saved.perspective);
      setSelection(saved.selection);
      closeSheet();
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [tx, closeSheet]);

  function updateContext(patch: Partial<ViewState>) {
    const next = { layer, perspective, selection, ...patch };
    setLayer(next.layer);
    setPerspective(next.perspective);
    setSelection(next.selection);
    window.history.replaceState(
      null,
      "",
      writeViewState(window.location.href, next),
    );
  }
  function changeLayer(next: Layer) {
    updateContext({ layer: next });
  }
  function select(id: string) {
    updateContext({ selection: id });
  }
  function showEvidence(id: string) {
    updateContext({ selection: id, layer: "evidence" });
    setSheetOpen(true);
  }
  if (error)
    return (
      <div className="page-container">
        <ErrorState {...error} retry={() => setAttempt((n) => n + 1)} />
      </div>
    );
  if (!tx)
    return (
      <div className="page-container">
        <Loading />
      </div>
    );
  const account = tx.accounts.find((a) => a.address === perspective);
  const selected = tx.evidence.find((e) => e.id === selection);
  const synthetic = tx.source.kind === "synthetic";
  const title =
    tx.execution === "failed"
      ? "Even a failure tells a story."
      : "Follow the change.";
  const status =
    tx.execution === "success"
      ? "Executed successfully"
      : tx.execution === "failed"
        ? "Execution failed"
        : "Outcome unknown";
  const perspectives = tx.accounts.filter(
    (a) =>
      a.signer ||
      (a.delta !== null && a.delta !== "0") ||
      tx.assets.some(
        (b) => !b.native && (b.account === a.address || b.owner === a.address),
      ),
  );
  const dates =
    tx.timestamp !== null
      ? new Date(tx.timestamp * 1000).toLocaleString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
        }) + " UTC"
      : "Time unavailable";
  const layers: {
    id: Layer;
    number: string;
    title: string;
    question: string;
    icon: typeof Layers3;
  }[] = [
    {
      id: "impact",
      number: "01",
      title: "Impact",
      question: "What changed?",
      icon: Layers3,
    },
    {
      id: "connections",
      number: "02",
      title: "Connections",
      question: "How is it connected?",
      icon: GitBranch,
    },
    {
      id: "evidence",
      number: "03",
      title: "Evidence",
      question: "How can I verify it?",
      icon: Braces,
    },
  ];
  function chooseChapter(index: number) {
    setChapter(index);
    if (index === 0) {
      select(account?.evidenceId ?? "account:0");
    }
    if (index === 1) {
      updateContext({
        layer: "connections",
        selection: tx?.instructions[0]?.evidenceId ?? "status",
      });
    }
    if (index === 2) {
      updateContext({
        layer: "impact",
        selection: account?.evidenceId ?? "account:0",
      });
    }
    if (index === 3) {
      select("fee");
    }
  }

  return (
    <div className="transaction-page page-container">
      <div className="transaction-breadcrumb">
        <Link href="/">
          <ArrowLeft size={13} />
          Explorer
        </Link>
        <ChevronRight size={12} />
        <span>Transaction MRI</span>
        <span className={`source-label ${synthetic ? "synthetic" : ""}`}>
          <span />
          {tx.source.label}
        </span>
      </div>
      <div className="transaction-heading">
        <div>
          <span className="eyebrow">THE TRANSACTION, TRANSLATED.</span>
          <h1>{title}</h1>
          <p>{transactionSummary(tx, perspective)}</p>
        </div>
        <div className="transaction-heading-aside">
          <span className={`execution-badge ${tx.execution}`}>
            {tx.execution === "success" ? (
              <Check size={15} />
            ) : (
              <CircleAlert size={15} />
            )}{" "}
            {status}
          </span>
          <span className="finality">
            <span className="status-dot" />
            {tx.finality} <span>· mainnet-beta</span>
          </span>
        </div>
      </div>
      <div className="transaction-metadata">
        <div className="signature-field">
          <span className="small-label">SIGNATURE</span>
          <div>
            <button
              className="signature-reveal"
              onClick={() => setFullSignature(!fullSignature)}
              aria-label={`${fullSignature ? "Hide full signature" : "Reveal full signature"}: ${fullSignature ? tx.signature : short(tx.signature, 9)}`}
            >
              {fullSignature ? tx.signature : short(tx.signature, 9)}
            </button>
            <CopyButton
              value={tx.signature}
              label="Copy transaction signature"
            />
          </div>
        </div>
        <div>
          <span className="small-label">BLOCK</span>
          <span className="mono">
            {synthetic ? "Synthetic" : units(tx.slot, 0)}
          </span>
        </div>
        <div>
          <span className="small-label">TIMESTAMP</span>
          <span>{dates}</span>
        </div>
        <button className="metadata-fee" onClick={() => showEvidence("fee")}>
          <span className="small-label">
            NETWORK FEE <ArrowUpRight size={11} />
          </span>
          <span className="mono">
            {tx.fee === null ? "Not determined" : `${units(tx.fee)} SOL`}
          </span>
        </button>
      </div>
      <div className="perspective-toolbar">
        <div className="perspective-control">
          <span className="perspective-avatar" aria-hidden="true">
            {short(perspective, 1).slice(0, 1)}
          </span>
          <div>
            <label htmlFor="perspective">Viewing impact for</label>
            <div className="select-wrap">
              <select
                id="perspective"
                aria-label="Viewing impact for"
                value={perspective}
                onChange={(e) => {
                  const next = tx.accounts.find(
                    (a) => a.address === e.target.value,
                  )!;
                  updateContext({
                    perspective: next.address,
                    selection: next.evidenceId,
                  });
                }}
              >
                {perspectives.map((a) => (
                  <option key={a.id} value={a.address}>
                    {short(a.address, 6)} · {a.role}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} />
            </div>
          </div>
          <CopyButton value={perspective} label="Copy selected account" />
        </div>
        <div className="perspective-right">
          <span className="share-view">
            <CopyButton
              value={() => window.location.href}
              label="Copy link to this view"
            />
            <span>Share view</span>
          </span>
          <div className="example-picker">
            <label className="sr-only" htmlFor="example-select">
              Choose an example transaction
            </label>
            <select
              id="example-select"
              value={
                signature.startsWith("demo-") ? signature.slice(5) : "live"
              }
              onChange={(e) => router.push(`/tx/demo-${e.target.value}`)}
            >
              {!signature.startsWith("demo-") && (
                <option value="live">Live transaction</option>
              )}
              {examples.map((e) => (
                <option value={e.id} key={e.id}>
                  {e.category}
                </option>
              ))}
            </select>
            <ChevronDown size={13} />
          </div>
          {!synthetic && (
            <a
              href={`https://solscan.io/tx/${tx.signature}`}
              className="text-link"
              target="_blank"
              rel="noreferrer"
            >
              View on Solscan <ArrowUpRight size={14} />
            </a>
          )}
        </div>
      </div>
      <div
        className="mri-controls"
        role="tablist"
        aria-label="Transaction MRI layers"
      >
        {layers.map((item) => (
          <button
            key={item.id}
            id={`tab-${item.id}`}
            role="tab"
            aria-controls="mri-panel"
            aria-selected={layer === item.id}
            tabIndex={layer === item.id ? 0 : -1}
            onClick={() => changeLayer(item.id)}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const index = layers.findIndex((entry) => entry.id === item.id);
              const nextIndex =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? layers.length - 1
                    : (index +
                        (event.key === "ArrowRight" ? 1 : -1) +
                        layers.length) %
                      layers.length;
              changeLayer(layers[nextIndex].id);
              document.getElementById(`tab-${layers[nextIndex].id}`)?.focus();
            }}
            className={`mri-tab ${layer === item.id ? "selected" : ""}`}
          >
            <span className="layer-number">{item.number}</span>
            <item.icon size={19} />
            <span>
              <strong>{item.title}</strong>
              <small>{item.question}</small>
            </span>
            <ArrowUpRight className="tab-arrow" size={16} />
          </button>
        ))}
      </div>
      {tx.execution !== "success" && (
        <div className={`outcome-notice ${tx.execution}`}>
          <CircleAlert size={20} />
          <div>
            <strong>
              {tx.execution === "failed"
                ? "Requested asset changes were not committed."
                : "Execution outcome cannot be determined."}
            </strong>
            <p>
              {tx.execution === "failed"
                ? `Recorded fee: ${tx.fee !== null ? `${units(tx.fee)} SOL` : "unavailable"}. Inspect balances and logs for the observed outcome.`
                : "Metadata is missing. We will not show inferred transfers or assume success."}
            </p>
          </div>
          <button className="text-link" onClick={() => showEvidence("status")}>
            Inspect outcome <ArrowRight size={14} />
          </button>
        </div>
      )}
      <div className="mri-layout">
        <div
          className="mri-main"
          role="tabpanel"
          id="mri-panel"
          aria-labelledby={`tab-${layer}`}
          key={layer}
        >
          {layer === "impact" && (
            <ImpactCanvas
              tx={tx}
              perspective={perspective}
              selection={selection}
              onSelect={select}
              onEvidence={showEvidence}
            />
          )}
          {layer === "connections" && (
            <RelationshipCanvas
              tx={tx}
              perspective={perspective}
              selection={selection}
              onSelect={select}
              onEvidence={showEvidence}
              chapter={chapter}
            />
          )}
          {layer === "evidence" && (
            <EvidenceView
              tx={tx}
              selection={selection}
              onSelect={(id) => {
                select(id);
                setSheetOpen(true);
              }}
              perspective={perspective}
            />
          )}
        </div>
        <ResponsiveInspector open={sheetOpen} onClose={closeSheet}>
          <EvidenceInspector
            tx={tx}
            evidence={selected}
            layer={layer}
            onEvidence={() => changeLayer("evidence")}
            onClose={closeSheet}
          />
        </ResponsiveInspector>
      </div>
      <div className="mobile-inspect">
        <button
          id="mobile-inspect-trigger"
          className="button primary"
          onClick={() => setSheetOpen(true)}
        >
          <Braces size={16} />
          Inspect selected evidence <ArrowUpRight size={15} />
        </button>
      </div>
      <section className="storyboard" aria-label="Logical explanation chapters">
        <div className="story-label">
          <span className="eyebrow">FOLLOW THE STORY</span>
          <p>Logical chapters, one atomic transaction.</p>
        </div>
        <div className="story-steps">
          {[
            "The request",
            "Program interactions",
            "The result",
            "Fees & outcome",
          ].map((title, i) => (
            <button
              className={chapter === i ? "active" : ""}
              key={title}
              onClick={() => chooseChapter(i)}
            >
              <span>0{i + 1}</span>
              {title}
              <ChevronRight size={13} />
            </button>
          ))}
        </div>
      </section>
      <div className="transaction-footnote">
        <p>
          <span className="status-dot" />
          {synthetic
            ? "Synthetic design data. No real transaction or ownership claim."
            : tx.source.kind === "recorded"
              ? `Captured ${tx.source.capturedAt ? new Date(tx.source.capturedAt).toLocaleDateString("en-GB") : "from mainnet"}. This is a preserved record, not a live response.`
              : "Retrieved from mainnet RPC. Provider availability and parsing coverage vary."}
        </p>
        <button
          className="text-link"
          onClick={() => {
            updateContext({
              layer: "impact",
              selection: "account:0",
              perspective: tx.feePayer,
            });
            setChapter(0);
          }}
        >
          <RotateCcw size={12} />
          Reset view
        </button>
      </div>
      <details className="parser-notes">
        <summary>
          Data coverage & parser notes <ChevronDown size={13} />
          <span>{tx.warnings.length} notes</span>
        </summary>
        <div>
          {tx.warnings.length ? (
            tx.warnings.map((warning) => (
              <p key={warning}>
                <CircleAlert size={14} />
                {warning}
              </p>
            ))
          ) : (
            <p>
              All available standard transfer instructions were parsed. Program
              intent and recipient identities are not inferred.
            </p>
          )}
          <p>
            Program labels are address-based reference labels, not proof of user
            intent. Token symbols are shown only for recognized mints. Other
            tokens use their mint address.
          </p>
          <div className="button-row">
            {tx.source.file && (
              <a className="text-link" href={tx.source.file} download>
                Download original RPC capture <ArrowUpRight size={13} />
              </a>
            )}
            <Link href="/methodology" className="text-link">
              Read the methodology <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </details>
      {selected && (
        <div className="sr-only" aria-live="polite">
          Selected: {selected.title}.{" "}
          <Classification kind={selected.kind} synthetic={synthetic} />
        </div>
      )}
    </div>
  );
}
