"use client";
import { useState } from "react";
import {
  Check,
  Copy,
  ArrowUpRight,
  AlertCircle,
  RefreshCw,
  LoaderCircle,
} from "lucide-react";
import Link from "next/link";
import { short } from "@/lib/format";
import type { EvidenceKind } from "@/lib/model";

export function CopyButton({
  value,
  label = "Copy",
}: {
  value: string | (() => string);
  label?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        typeof value === "function" ? value() : value,
      );
      setState("copied");
      setTimeout(() => setState("idle"), 1800);
    } catch {
      setState("error");
    }
  }
  return (
    <button
      className="copy-button"
      onClick={copy}
      aria-label={`${label}${state === "copied" ? ": copied" : ""}`}
      title={
        state === "error"
          ? "Copy unavailable. Select the revealed text instead."
          : label
      }
    >
      {state === "copied" ? <Check size={14} /> : <Copy size={14} />}
      <span className="sr-only" role="status">
        {state === "copied"
          ? "Copied"
          : state === "error"
            ? "Copy failed; reveal and select the identifier."
            : ""}
      </span>
    </button>
  );
}
export function Address({
  value,
  full = false,
  label,
}: {
  value: string;
  full?: boolean;
  label?: string;
}) {
  return (
    <span className={`address ${full ? "full-address" : ""}`}>
      <span title={value}>{label ?? (full ? value : short(value))}</span>
      <CopyButton value={value} label="Copy address" />
    </span>
  );
}
export function Classification({
  kind,
  synthetic = false,
}: {
  kind: EvidenceKind;
  synthetic?: boolean;
}) {
  const text =
    kind === "record"
      ? synthetic
        ? "Synthetic record"
        : "Verified on-chain"
      : kind === "parsed"
        ? "Parsed interpretation"
        : "Not determined";
  return (
    <span className={`classification ${kind}`}>
      <span />
      {text}
    </span>
  );
}
export function ErrorState({
  message,
  kind,
  retry,
}: {
  message: string;
  kind?: string;
  retry?: () => void;
}) {
  return (
    <section className="error-state">
      <span className="error-icon">
        <AlertCircle size={28} />
      </span>
      <p className="eyebrow">
        {kind === "pending"
          ? "WAITING FOR DETAILS"
          : kind === "missing"
            ? "NO RECORD FOUND"
            : "LET’S TAKE ANOTHER LOOK"}
      </p>
      <h1>
        {kind === "pending"
          ? "Known signature. Details pending."
          : kind === "invalid"
            ? "That signature doesn’t look right."
            : "The evidence isn’t available yet."}
      </h1>
      <p>{message}</p>
      <div className="button-row">
        {retry && (
          <button className="button primary" onClick={retry}>
            <RefreshCw size={16} />
            Try again
          </button>
        )}
        <Link className="button secondary" href="/">
          Back to search <ArrowUpRight size={16} />
        </Link>
      </div>
      <small>
        Live lookups never substitute recorded or synthetic results.
      </small>
    </section>
  );
}
export function Loading({
  text = "Reading the on-chain record…",
}: {
  text?: string;
}) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={24} />
      <p>{text}</p>
      <div className="skeleton wide" />
      <div className="skeleton" />
      <div className="skeleton wide" />
    </div>
  );
}
