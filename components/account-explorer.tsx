"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ArrowRight, Wallet } from "lucide-react";
import { units, short } from "@/lib/format";
import { Address, ErrorState, Loading } from "./ui";
import { UniversalSearch } from "./search";
import type { TokenIdentity } from "@/lib/token-identity";
import { TokenIdentityCaption, TokenIdentityDetails } from "./token-identity";
type AccountResult = {
  tokenIdentity?: TokenIdentity;
  address: string;
  account: null | {
    lamports: string;
    owner: string;
    executable: boolean;
    data: { parsed?: { type?: string; info?: Record<string, unknown> } };
  };
  signatures: {
    signature: string;
    slot: number;
    blockTime: number | null;
    err: unknown;
  }[];
  accountAvailable: boolean;
  historyAvailable: boolean;
  warnings: string[];
  nextCursor: string | null;
};
export function AccountExplorer({ address }: { address: string }) {
  const [data, setData] = useState<AccountResult | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [moreLoading, setMoreLoading] = useState(false);
  const [moreError, setMoreError] = useState("");
  const moreController = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setError("");
      setData(null);
      moreController.current?.abort();
      setMoreLoading(false);
      try {
        const response = await fetch(`/api/accounts/${address}`, {
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (!controller.signal.aborted) {
          setData(result);
          setMoreError("");
        }
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Account data unavailable.",
          );
      }
    }
    void load();
    return () => {
      controller.abort();
      moreController.current?.abort();
    };
  }, [address, attempt]);
  async function loadMore() {
    if (!data?.nextCursor || moreLoading) return;
    setMoreLoading(true);
    setMoreError("");
    const controller = new AbortController();
    moreController.current = controller;
    try {
      const response = await fetch(
        `/api/accounts/${address}?before=${data.nextCursor}`,
        { signal: controller.signal },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (!result.historyAvailable)
        throw new Error(
          "Older history is unavailable from this provider. The records already loaded remain visible.",
        );
      setData((current) =>
        current && current.address === address
          ? {
              ...current,
              signatures: [
                ...current.signatures,
                ...result.signatures.filter(
                  (item: { signature: string }) =>
                    !current.signatures.some(
                      (existing) => existing.signature === item.signature,
                    ),
                ),
              ],
              nextCursor: result.nextCursor,
            }
          : current,
      );
    } catch (error) {
      if (!controller.signal.aborted)
        setMoreError(
          error instanceof Error
            ? error.message
            : "Older history could not be loaded.",
        );
    } finally {
      if (moreController.current === controller) setMoreLoading(false);
    }
  }
  if (error)
    return (
      <div className="page-container">
        <ErrorState message={error} retry={() => setAttempt((n) => n + 1)} />
      </div>
    );
  if (!data)
    return (
      <div className="page-container">
        <Loading text="Looking up this account on mainnet…" />
      </div>
    );
  const type =
    data.account?.data?.parsed?.type ??
    (data.account?.executable
      ? "Executable program"
      : data.account?.owner === "11111111111111111111111111111111"
        ? "System-owned account"
        : "Account");
  return (
    <div className="page-container account-page">
      <Link className="back-link" href="/">
        <ArrowLeft size={14} />
        Explorer
      </Link>
      <span className="eyebrow">ACCOUNT LOOKUP / LIVE MAINNET</span>
      <h1>Start with an address.</h1>
      <p className="page-lede">
        An address may be a wallet, token account, mint, or program. Its account
        data tells us more.
      </p>
      <UniversalSearch compact />
      <div className="account-overview panel">
        <span className="account-icon">
          <Wallet size={26} />
        </span>
        <div>
          <span className="small-label">
            {data.account
              ? type
              : data.accountAvailable
                ? "NO CURRENT ACCOUNT"
                : "ACCOUNT DETAILS UNAVAILABLE"}
          </span>
          <Address value={address} full />
          {data.tokenIdentity && (
            <>
              <strong>
                {data.tokenIdentity.symbol} · {data.tokenIdentity.name}
              </strong>
              <TokenIdentityCaption identity={data.tokenIdentity} />
            </>
          )}
        </div>
        <strong>
          {data.account
            ? `${units(String(data.account.lamports))} SOL`
            : data.accountAvailable
              ? "No current account"
              : "Unavailable"}
        </strong>
      </div>
      <TokenIdentityDetails
        identity={data.tokenIdentity}
        account={type === "account" ? address : undefined}
      />
      {data.account && (
        <details className="account-details panel">
          <summary>Account owner & parsed data</summary>
          <div>
            <p>
              Program owner: <Address value={data.account.owner} full />
            </p>
            <pre>
              {JSON.stringify(
                data.account.data?.parsed ?? {
                  note: "No parsed account data returned.",
                },
                null,
                2,
              )}
            </pre>
          </div>
        </details>
      )}
      <section className="account-history panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">RECENT ACTIVITY</span>
            <h2>Transactions, ready to unpack.</h2>
          </div>
          <span>{data.signatures.length} records</span>
        </div>
        {data.warnings?.map((warning) => (
          <p className="history-warning" key={warning}>
            {warning}
          </p>
        ))}
        {data.signatures.length ? (
          data.signatures.map((tx) => (
            <Link href={`/tx/${tx.signature}`} key={tx.signature}>
              <span
                className={`history-status ${tx.err === null ? "success" : tx.err === undefined ? "unknown" : "failed"}`}
              >
                {tx.err === null
                  ? "Success"
                  : tx.err === undefined
                    ? "Unknown"
                    : "Failed"}
              </span>
              <code>{short(tx.signature, 10)}</code>
              <span>
                {tx.blockTime !== null && tx.blockTime !== undefined
                  ? new Date(tx.blockTime * 1000).toLocaleString("en-GB", {
                      timeZone: "UTC",
                    }) + " UTC"
                  : `Slot ${tx.slot}`}
              </span>
              <ArrowRight size={17} />
            </Link>
          ))
        ) : (
          <div className="empty-state">
            {data.historyAvailable
              ? "No transactions were returned from the provider’s available history."
              : "History is unavailable. This does not mean there are no transactions."}
          </div>
        )}
        {moreError && (
          <p className="history-warning" role="status">
            {moreError}
          </p>
        )}
        {data.nextCursor && (
          <button
            className="button secondary"
            onClick={loadMore}
            disabled={moreLoading}
          >
            {moreLoading ? "Loading older activity…" : "Load older activity"}
          </button>
        )}
      </section>
      <Link className="text-link" href={`/compare?a=${address}`}>
        Open Address Compare <ArrowUpRight size={15} />
      </Link>
    </div>
  );
}
