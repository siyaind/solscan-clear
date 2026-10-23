"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, RefreshCw } from "lucide-react";
import { units } from "@/lib/format";
import { ErrorState, Loading } from "@/components/ui";
type Network = {
  epoch: {
    absoluteSlot: number;
    epoch: number;
    slotIndex: number;
    slotsInEpoch: number;
  };
  circulatingLamports: string;
  tps: number | null;
  fetchedAt: string;
};
export default function NetworkPage() {
  const [data, setData] = useState<Network | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/network", { signal: controller.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setError("");
        setData(d);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [attempt]);
  if (error)
    return (
      <div className="page-container">
        <ErrorState message={error} retry={() => setAttempt((n) => n + 1)} />
      </div>
    );
  if (!data)
    return (
      <div className="page-container">
        <Loading text="Reading network metadata…" />
      </div>
    );
  return (
    <div className="network-page page-container">
      <Link href="/" className="back-link">
        <ArrowLeft size={14} />
        Explorer
      </Link>
      <span className="eyebrow">THE WIDER PICTURE / LIVE MAINNET</span>
      <h1>Solana, at a glance.</h1>
      <p className="page-lede">
        A snapshot from the RPC provider. Performance samples include voting
        transactions.
      </p>
      <div className="network-grid">
        {[
          {
            label: "Confirmed slot",
            value: data.epoch.absoluteSlot.toLocaleString("en-US"),
          },
          {
            label: "Transactions / second",
            value: data.tps?.toLocaleString("en-US") ?? "Not available",
          },
          {
            label: "Current epoch",
            value: data.epoch.epoch.toLocaleString("en-US"),
          },
          {
            label: "Circulating supply",
            value: `${units(data.circulatingLamports)} SOL`,
          },
        ].map((m) => (
          <div className="network-stat panel" key={m.label}>
            <Activity size={20} />
            <span className="small-label">{m.label}</span>
            <strong>{m.value}</strong>
          </div>
        ))}
      </div>
      <div className="epoch-progress panel">
        <div>
          <strong>Epoch progress</strong>
          <span>
            {Math.round((data.epoch.slotIndex / data.epoch.slotsInEpoch) * 100)}
            %
          </span>
        </div>
        <progress max={data.epoch.slotsInEpoch} value={data.epoch.slotIndex} />
      </div>
      <div className="network-refreshed">
        <span>Fetched {new Date(data.fetchedAt).toLocaleString("en-GB")}</span>
        <button
          className="button secondary"
          onClick={() => setAttempt((n) => n + 1)}
        >
          <RefreshCw size={15} />
          Refresh snapshot
        </button>
      </div>
    </div>
  );
}
