"use client";
import { Search, ArrowRight, CornerDownLeft, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { classifyExplorerInput } from "@/lib/explorer-input";

export function UniversalSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const clean = value.trim();
  const classification = classifyExplorerInput(clean);
  const detected =
    classification.kind === "transaction"
      ? "Transaction signature"
      : classification.kind === "account"
        ? "Account / wallet / token address"
        : "";
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (classification.kind !== "invalid") router.push(classification.href);
    else setError(classification.message);
  }
  return (
    <form
      id="search"
      className={`search-form ${compact ? "compact" : ""}`}
      onSubmit={submit}
    >
      <div className="search-box">
        <Search size={21} />
        <input
          aria-label="Search transaction signature or wallet address"
          placeholder="Search transaction signature or wallet address…"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
          }}
          autoComplete="off"
          maxLength={600}
          spellCheck={false}
        />
        {value && (
          <button
            type="button"
            className="icon-button"
            onClick={() => setValue("")}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
        <button className="search-submit" aria-label="Search">
          <ArrowRight size={20} />
        </button>
      </div>
      <div className="search-caption">
        <span className={error ? "text-error" : ""} role="status">
          {error ||
            (detected
              ? `Detected: ${detected}`
              : "A signature tells a story. Start with yours.")}
        </span>
        <span className="search-key">
          <CornerDownLeft size={12} /> Enter to explore
        </span>
      </div>
    </form>
  );
}
