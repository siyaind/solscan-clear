"use client";
import { useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Expand,
  GitBranch,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  Wallet,
  Box,
  CircleDot,
} from "lucide-react";
import {
  PROGRAMS,
  SYSTEM,
  TOKEN,
  TOKEN_2022,
  type Transaction,
} from "@/lib/model";
import { short, units } from "@/lib/format";
import { Address } from "./ui";

export function RelationshipCanvas({
  tx,
  perspective,
  selection,
  onSelect,
  onEvidence,
  chapter,
}: {
  tx: Transaction;
  perspective: string;
  selection: string;
  onSelect: (id: string) => void;
  onEvidence: (id: string) => void;
  chapter: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  const selected = tx.evidence.find((e) => e.id === selection);
  const nodes = useMemo(() => {
    const allPrograms = [
      ...new Set(tx.instructions.map((i) => i.program)),
    ].filter((p) => p && !p.startsWith("ComputeBudget"));
    const infrastructure = new Set([
      SYSTEM,
      TOKEN,
      TOKEN_2022,
      "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
    ]);
    const programs = [
      ...allPrograms.filter((p) => !infrastructure.has(p)),
      ...allPrograms.filter((p) => infrastructure.has(p)),
    ];
    const owned = tx.assets
      .filter((a) => !a.native && a.owner === perspective)
      .map((a) => a.account);
    const relevantMovements = tx.relationships.filter(
      (r) =>
        r.kind === "movement" &&
        ([perspective, ...owned].includes(r.from) ||
          [perspective, ...owned].includes(r.to)),
    );
    // Keep token counterparties in focus before fee-related transient funding accounts.
    relevantMovements.sort(
      (a, b) =>
        Number(owned.includes(b.from) || owned.includes(b.to)) -
        Number(owned.includes(a.from) || owned.includes(a.to)),
    );
    const related = relevantMovements.flatMap((r) => [r.from, r.to]);
    const addresses = [
      ...new Set([
        perspective,
        ...owned.slice(0, expanded ? 3 : 1),
        ...programs.slice(0, expanded ? 4 : 2),
        ...related,
        ...tx.accounts.filter((a) => a.delta !== "0").map((a) => a.address),
      ]),
    ]
      .filter(Boolean)
      .slice(0, expanded ? 9 : 5);
    if (selected?.account && !addresses.includes(selected.account))
      addresses[addresses.length - 1] = selected.account;
    const collapsedPositions = [
      { x: 115, y: 205 },
      { x: 370, y: 305 },
      { x: 370, y: 85 },
      { x: 630, y: 85 },
      { x: 630, y: 305 },
    ];
    return addresses.map((address, i) => {
      const account = tx.accounts.find((a) => a.address === address);
      const program = programs.includes(address);
      const token = tx.assets.find((a) => !a.native && a.account === address);
      const position = expanded
        ? { x: 115 + (i % 3) * 255, y: 75 + Math.floor(i / 3) * 135 }
        : collapsedPositions[i];
      return {
        address,
        label:
          address === perspective
            ? "Selected perspective"
            : program
              ? (PROGRAMS[address] ?? "Program")
              : token
                ? `${token.symbol} account`
                : account?.signer
                  ? "Signer"
                  : "Related account",
        type:
          address === perspective ? "wallet" : program ? "program" : "account",
        evidenceId: program
          ? tx.instructions.find((ix) => ix.program === address)!.evidenceId
          : (token?.evidenceId ?? account?.evidenceId ?? "status"),
        ...position,
      };
    });
  }, [tx, perspective, expanded, selected]);
  const addresses = nodes.map((n) => n.address);
  const edges = tx.relationships.filter(
    (r) => addresses.includes(r.from) && addresses.includes(r.to),
  );
  const visibleEdges = edges.filter(
    (edge, index) =>
      edges.findIndex(
        (other) =>
          other.from === edge.from &&
          other.to === edge.to &&
          other.kind === edge.kind,
      ) === index,
  );
  function reset() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }
  return (
    <>
      <section className="relationship-panel panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">02 / THE TRANSACTION METRO</span>
            <h2>Follow the connections.</h2>
          </div>
          <GitBranch size={22} />
        </div>
        <p className="panel-description">
          {tx.execution === "failed"
            ? "Attempted dependencies, without successful transfer arrows."
            : "Different lines tell different stories. A program call isn’t a transfer."}
        </p>
        <div className="map-toolbar">
          <span>
            <span className="status-dot" />
            {nodes.length} of {tx.accounts.length} accounts in focus
          </span>
          <div>
            <button
              onClick={() => {
                setExpanded(!expanded);
                reset();
              }}
              aria-label={
                expanded ? "Collapse graph details" : "Expand graph details"
              }
            >
              <Expand size={13} />
              {expanded ? "Collapse" : "Expand details"}
            </button>
            <button onClick={reset} aria-label="Fit graph to view">
              <Maximize2 size={14} />
              Fit view
            </button>
          </div>
        </div>
        <div
          className="graph-stage"
          onPointerDown={(e) => {
            if ((e.target as Element).closest("button")) return;
            drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (drag.current)
              setPan({
                x: drag.current.px + e.clientX - drag.current.x,
                y: drag.current.py + e.clientY - drag.current.y,
              });
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          <div
            className="graph-transform"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            <svg
              className="relationship-svg"
              viewBox="0 0 760 420"
              aria-label="Account and program dependency diagram"
              role="img"
            >
              <defs>
                <marker
                  id="movement-arrow"
                  markerWidth="8"
                  markerHeight="8"
                  refX="6"
                  refY="4"
                  orient="auto"
                >
                  <path
                    d="M0,0 L7,4 L0,8"
                    fill="none"
                    stroke="var(--teal)"
                    strokeWidth="1.4"
                  />
                </marker>
                <marker
                  id="invocation-arrow"
                  markerWidth="8"
                  markerHeight="8"
                  refX="6"
                  refY="4"
                  orient="auto"
                >
                  <path
                    d="M0,0 L7,4 L0,8"
                    fill="none"
                    stroke="var(--graph-blue)"
                    strokeWidth="1.4"
                  />
                </marker>
              </defs>
              {visibleEdges.map((edge) => {
                const from = nodes.find((n) => n.address === edge.from)!;
                const to = nodes.find((n) => n.address === edge.to)!;
                const sameRow = Math.abs(from.y - to.y) < 30;
                const middle = (from.x + to.x) / 2;
                const path = sameRow
                  ? `M${from.x} ${from.y} Q${middle} ${from.y - 65} ${to.x} ${to.y}`
                  : `M${from.x} ${from.y} C${middle} ${from.y},${middle} ${to.y},${to.x} ${to.y}`;
                const highlighted =
                  edge.evidenceId === selection ||
                  selected?.account === edge.from ||
                  selected?.account === edge.to ||
                  (chapter === 1 && edge.kind === "invocation") ||
                  (chapter === 2 && edge.kind === "movement");
                return (
                  <g
                    key={edge.id}
                    className={`graph-edge ${edge.kind} ${highlighted ? "highlighted" : ""}`}
                  >
                    <path
                      d={path}
                      markerEnd={
                        edge.kind === "movement"
                          ? "url(#movement-arrow)"
                          : edge.kind === "invocation"
                            ? "url(#invocation-arrow)"
                            : undefined
                      }
                    />
                    {edge.kind === "movement" && (
                      <text
                        x={middle}
                        y={(from.y + to.y) / 2 - 12}
                        textAnchor="middle"
                      >
                        {edges.filter(
                          (other) =>
                            other.from === edge.from &&
                            other.to === edge.to &&
                            other.kind === "movement",
                        ).length > 1
                          ? `${edges.filter((other) => other.from === edge.from && other.to === edge.to && other.kind === "movement").length} instructions · text view`
                          : edge.decimals !== undefined
                            ? `${units(edge.amount!, edge.decimals)}${edge.amountBasis === "instruction" ? " requested" : " SOL"}`
                            : `${edge.amount} base units`}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            {nodes.map((node) => (
              <button
                className={`graph-node ${node.type} ${selected?.account === node.address || selection === node.evidenceId ? "selected" : ""}`}
                style={{
                  left: `${(node.x / 760) * 100}%`,
                  top: `${(node.y / 420) * 100}%`,
                }}
                key={node.address}
                onClick={() => onSelect(node.evidenceId)}
                aria-label={`Inspect ${node.label} ${short(node.address)}`}
              >
                <span className="graph-node-icon">
                  {node.type === "wallet" ? (
                    <Wallet size={20} />
                  ) : node.type === "program" ? (
                    <Box size={20} />
                  ) : (
                    <CircleDot size={20} />
                  )}
                </span>
                <strong>{node.label}</strong>
                <code>{short(node.address, 4)}</code>
              </button>
            ))}
          </div>
          <div className="map-zoom">
            <button
              className="icon-button"
              onClick={() => setZoom((z) => Math.min(1.8, z + 0.2))}
              aria-label="Zoom in"
            >
              <Plus size={15} />
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button
              className="icon-button"
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
              aria-label="Zoom out"
            >
              <Minus size={15} />
            </button>
            <button
              className="icon-button"
              onClick={reset}
              aria-label="Reset graph pan and zoom"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
        <div className="mobile-map-list">
          {nodes.map((node, i) => (
            <button
              key={node.address}
              className={selected?.account === node.address ? "selected" : ""}
              onClick={() => onSelect(node.evidenceId)}
            >
              <span className={`mobile-node-icon ${node.type}`}>
                {node.type === "wallet" ? (
                  <Wallet size={18} />
                ) : node.type === "program" ? (
                  <Box size={18} />
                ) : (
                  <CircleDot size={18} />
                )}
              </span>
              <span>
                <small>
                  0{i + 1} / {node.type.toUpperCase()}
                </small>
                <strong>{node.label}</strong>
                <code>{short(node.address, 6)}</code>
              </span>
              <ArrowUpRight size={15} />
            </button>
          ))}
        </div>
        <div className="map-legend">
          <span>
            <i className="legend-line movement" />
            Asset movement
          </span>
          <span>
            <i className="legend-line invocation" />
            Program invocation
          </span>
          <span>
            <i className="legend-line reference" />
            Account reference
          </span>
        </div>
        <p className="map-caption">
          A focused dependency view. Only supported transfers get asset movement
          lines. Repeated endpoints share a line; every movement remains
          separate in the text view below.
        </p>
        <p className="movement-instruction-note">
          Token labels show instruction amounts, which can include a Token-2022
          fee. The recipient’s net result is recorded in token balances;
          multiple instructions can affect it.
        </p>
        <button
          className="evidence-bridge"
          onClick={() => onEvidence(selection)}
        >
          <BracesIcon />
          <span>Inspect the selected connection</span>
          <ArrowUpRight size={15} />
        </button>
      </section>
      <details className="connection-text panel">
        <summary>
          All relationships · accessible text view <ChevronDown size={15} />
          <span>{tx.relationships.length} records</span>
        </summary>
        <div>
          {tx.relationships.map((edge) => (
            <button
              key={edge.id}
              className={selection === edge.evidenceId ? "selected" : ""}
              onClick={() => onSelect(edge.evidenceId)}
            >
              <span className={`relationship-kind ${edge.kind}`}>
                {edge.kind}
              </span>
              <span>
                <code>{short(edge.from, 5)}</code> →{" "}
                <code>{short(edge.to, 5)}</code>
                <small>
                  {edge.label}
                  {edge.amount
                    ? ` · ${edge.decimals === undefined ? `${edge.amount} base units` : units(edge.amount, edge.decimals)}`
                    : ""}
                  {edge.symbol ? ` ${edge.symbol}` : ""}
                  {edge.transferFee !== undefined
                    ? ` · recorded instruction fee ${units(edge.transferFee, edge.decimals ?? 0)} ${edge.symbol ?? "base units"}`
                    : ""}
                  {edge.attempted ? " · attempted, not committed" : ""}
                </small>
              </span>
              <ArrowUpRight size={13} />
            </button>
          ))}
        </div>
      </details>
      <details className="connection-text panel account-directory">
        <summary>
          All account addresses <ChevronDown size={15} />
          <span>{tx.accounts.length} accounts</span>
        </summary>
        <div>
          {tx.accounts.map((a) => (
            <div key={a.id}>
              <button
                className="text-link"
                onClick={() => onEvidence(a.evidenceId)}
              >
                {a.role}
                <ArrowUpRight size={13} />
              </button>
              <Address value={a.address} full />
            </div>
          ))}
        </div>
      </details>
    </>
  );
}
function BracesIcon() {
  return <span className="mono">{"{ }"}</span>;
}
