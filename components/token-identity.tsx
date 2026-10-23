"use client";
import type { TokenIdentity } from "@/lib/token-identity";
import { short } from "@/lib/format";
import { CopyButton } from "./ui";

export function TokenIdentityCaption({
  identity,
}: {
  identity?: TokenIdentity;
}) {
  if (!identity) return null;
  return (
    <span
      className="token-identity-caption"
      title={identity.mint ?? "Native SOL has no token mint"}
    >
      {identity.name} ·{" "}
      {identity.trust === "unverified"
        ? "Unverified metadata"
        : identity.trust === "curated-exact-mint"
          ? "Curated mint"
          : identity.trust === "native"
            ? "Native asset"
            : "Metadata unavailable"}
      {identity.mint && <span>Mint {short(identity.mint, 5)}</span>}
    </span>
  );
}
export function TokenIdentityDetails({
  identity,
  account,
}: {
  identity?: TokenIdentity;
  account?: string;
}) {
  if (!identity) return null;
  return (
    <details className="token-identity-details">
      <summary>Token identity · {identity.symbol}</summary>
      <div>
        <strong>
          {identity.symbol} · {identity.name}
        </strong>
        <p>
          Label source: {identity.source}.{" "}
          {identity.trust === "curated-exact-mint"
            ? "Matched by exact mint in CLEAR’s curated registry. This is not a safety endorsement."
            : identity.trust === "native"
              ? "Native SOL is the network asset. It has no token mint and is separate from wrapped SOL."
              : identity.trust === "unverified"
                ? "User-controlled metadata; not independently verified."
                : `Metadata ${identity.status}; the mint address remains the identifier.`}
        </p>
        {identity.warning && <p>{identity.warning}</p>}
        {identity.mint && (
          <p>
            Metadata labels may change over time. They are separate from the
            recorded transaction balances and their evidence classification.
          </p>
        )}
        {identity.mint && (
          <>
            <span className="small-label">
              TOKEN MINT · identifies the asset
            </span>
            <div className="token-mint-address">
              <code>{identity.mint}</code>
              <CopyButton value={identity.mint} label="Copy token mint" />
            </div>
            <a
              className="text-link"
              href={`https://solscan.io/token/${identity.mint}`}
              target="_blank"
              rel="noreferrer"
            >
              View token mint on Solscan ↗
            </a>
          </>
        )}
        {account && identity.mint && (
          <p>
            Balance belongs to token account <code>{account}</code>. This
            account address is separate from the mint.
          </p>
        )}
        {identity.logo && (
          <a
            className="text-link"
            href={identity.logo}
            target="_blank"
            rel="noreferrer"
          >
            Open metadata-provided logo (unverified) ↗
          </a>
        )}
      </div>
    </details>
  );
}
