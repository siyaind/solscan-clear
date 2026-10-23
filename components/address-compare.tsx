"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Fingerprint,
  RotateCcw,
  ShieldCheck,
  X,
  ArrowRight,
} from "lucide-react";
import { compareAddresses, isAddress } from "@/lib/format";
import { CopyButton } from "./ui";

const FIRST = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SECOND = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt2v";
export function AddressCompare({
  initialA = "",
  initialB = "",
}: {
  initialA?: string;
  initialB?: string;
}) {
  const [a, setA] = useState(initialA.slice(0, 100));
  const [b, setB] = useState(initialB.slice(0, 100));
  const [submitted, setSubmitted] = useState(false);
  const result = compareAddresses(a.trim(), b.trim());
  const changed = (key: "a" | "b", value: string) => {
    (key === "a" ? setA : setB)(value);
    setSubmitted(false);
  };
  return (
    <div className="compare-page page-container">
      <Link href="/" className="back-link">
        <ArrowLeft size={14} />
        Back to explorer
      </Link>
      <div className="compare-heading">
        <span className="eyebrow">SMALL DIFFERENCES. COMPLETE CLARITY.</span>
        <span className="compare-emblem">
          <Fingerprint size={34} strokeWidth={1.3} />
        </span>
        <h1>
          A familiar beginning.
          <br />
          The <em>same</em> address?
        </h1>
        <p>
          A few matching characters can be misleading.
          <br />
          Compare every character before drawing a conclusion.
        </p>
      </div>
      <form
        className="compare-form panel"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
        <div className="compare-inputs">
          {(["a", "b"] as const).map((key, i) => (
            <div className="compare-input-block" key={key}>
              <label htmlFor={`address-${key}`}>
                <span>0{i + 1}</span>Address {key.toUpperCase()}
              </label>
              <textarea
                id={`address-${key}`}
                aria-label={`Address ${key.toUpperCase()}`}
                spellCheck={false}
                maxLength={100}
                placeholder="Paste a complete Solana address…"
                value={key === "a" ? a : b}
                onChange={(e) => changed(key, e.target.value)}
              />
              <div className="input-footnote">
                <span
                  className={
                    (key === "a" ? a : b).trim() &&
                    !isAddress((key === "a" ? a : b).trim())
                      ? "text-error"
                      : ""
                  }
                >
                  {(key === "a" ? a : b).trim()
                    ? isAddress((key === "a" ? a : b).trim())
                      ? "Valid 32-byte public key"
                      : "This is not a valid 32-byte public key"
                    : "Full public keys only. No shortened addresses."}
                </span>
                <CopyButton
                  value={(key === "a" ? a : b).trim()}
                  label={`Copy address ${key.toUpperCase()}`}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="compare-actions">
          <button
            type="button"
            className="text-link"
            onClick={() => {
              setA(FIRST);
              setB(SECOND);
              setSubmitted(true);
            }}
          >
            Try a similar-address example <ArrowUpRight size={14} />
          </button>
          <button className="button primary" type="submit">
            <Fingerprint size={16} />
            Compare addresses <ArrowRight size={15} />
          </button>
        </div>
      </form>
      {submitted && (
        <section
          className={`compare-result panel ${result.valid ? (result.equal ? "same" : "different") : "invalid"}`}
          aria-live="polite"
        >
          <div className="compare-result-heading">
            <span className="result-icon">
              {result.valid && result.equal ? (
                <Check size={24} />
              ) : (
                <X size={24} />
              )}
            </span>
            <div>
              <span className="eyebrow">THE FULL-ADDRESS CHECK</span>
              <h2>
                {!result.valid
                  ? "We need two valid public keys."
                  : result.equal
                    ? "Exactly the same address."
                    : "Different addresses."}
              </h2>
              <p>
                {!result.valid
                  ? "Both entries must decode to exactly 32 bytes. Check for missing characters, spaces, or signatures."
                  : result.equal
                    ? "All characters match. Both entries identify the same public key."
                    : `${result.characters.filter((c) => !c.same).length} character position${result.characters.filter((c) => !c.same).length === 1 ? " differs" : "s differ"}. Similarity does not make two public keys identical.`}
              </p>
            </div>
          </div>
          {result.valid && (
            <>
              <div className="character-comparison">
                {(["a", "b"] as const).map((key) => (
                  <div key={key}>
                    <span className="small-label">
                      ADDRESS {key.toUpperCase()}
                      <CopyButton
                        value={key === "a" ? a.trim() : b.trim()}
                        label={`Copy compared address ${key.toUpperCase()}`}
                      />
                    </span>
                    <div
                      className="character-row"
                      aria-label={`Full address ${key.toUpperCase()}: ${key === "a" ? a.trim() : b.trim()}`}
                    >
                      {result.characters.map((c, index) => (
                        <span
                          key={index}
                          className={c.same ? "matching" : "differing"}
                          title={`Position ${index + 1}: ${c.same ? "matches" : "differs"}`}
                        >
                          {c[key] || "·"}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="character-legend">
                <span>
                  <i className="matched-dot" />
                  Matching characters
                </span>
                <span>
                  <i className="different-dot" />
                  Different characters
                </span>
              </div>
              <div className="compare-links">
                <a
                  className="text-link"
                  href={`https://solscan.io/account/${a.trim()}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Address A on Solscan <ArrowUpRight size={14} />
                </a>
                <a
                  className="text-link"
                  href={`https://solscan.io/account/${b.trim()}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Address B on Solscan <ArrowUpRight size={14} />
                </a>
              </div>
            </>
          )}
        </section>
      )}
      <div className="compare-note">
        <ShieldCheck size={20} />
        <p>
          <strong>Equality, without assumptions.</strong>This tool compares
          public keys. It does not establish ownership, trustworthiness, or
          malicious intent. A valid key may have no account on mainnet.
        </p>
      </div>
      <button
        className="text-link reset-compare"
        onClick={() => {
          setA("");
          setB("");
          setSubmitted(false);
        }}
      >
        <RotateCcw size={13} />
        Start a fresh comparison
      </button>
    </div>
  );
}
