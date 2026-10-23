import type { Evidence, Transaction } from "@/lib/model";
import { units } from "@/lib/format";

export function ProofCard({
  tx,
  evidence,
}: {
  tx: Transaction;
  evidence: Evidence;
}) {
  const asset = tx.assets.find((item) => item.evidenceId === evidence.id);
  const instruction = tx.instructions.find(
    (item) => item.evidenceId === evidence.id,
  );
  let proves = evidence.description;
  let limit =
    "This record alone does not establish intent, recipient identity, or ownership beyond the recorded fields.";
  if (asset) {
    proves =
      asset.before !== null && asset.after !== null
        ? `The recorded ${asset.symbol} balance changed from ${units(asset.before, asset.decimals)} to ${units(asset.after, asset.decimals)} ${asset.symbol}. The difference is ${units(asset.delta!, asset.decimals, true)} ${asset.symbol}.`
        : "One or both balance records are unavailable, so the net change cannot be determined.";
    limit = asset.native
      ? "A balance difference alone does not identify the counterparty or explain every cause. Open Money anatomy for the supported breakdown."
      : "A token balance difference alone does not prove a swap, identify a recipient, or establish ownership when owner metadata is incomplete.";
  } else if (evidence.id === "fee") {
    proves =
      tx.fee === null
        ? "The provider did not return a fee amount."
        : `Transaction metadata records a ${units(tx.fee)} SOL network fee charged to the fee payer.`;
    limit =
      "The fee does not prove that requested transfers succeeded. A failed transaction can still incur a fee.";
  } else if (evidence.id === "status") {
    proves =
      tx.execution === "failed"
        ? "Transaction metadata reports an execution error. Requested state changes did not commit."
        : tx.execution === "success"
          ? "Transaction metadata reports successful execution."
          : "The metadata needed to determine execution is unavailable.";
    limit =
      "Execution status does not explain the purpose of the transaction or attribute a balance change to a particular instruction.";
  } else if (instruction) {
    proves = `Instruction ${instruction.id} invokes ${instruction.label}. ${instruction.parsed ? "Its displayed fields come from the RPC parser." : "Its data is encoded and has not been interpreted here."}`;
    limit =
      "An instruction record does not independently prove a transfer committed; check execution status and recorded balances.";
  }
  return (
    <div className="proof-card">
      {asset && (
        <div className="proof-values">
          <span>
            Before{" "}
            <strong>
              {asset.before === null
                ? "Unknown"
                : units(asset.before, asset.decimals)}{" "}
              {asset.symbol}
            </strong>
          </span>
          <span>
            After{" "}
            <strong>
              {asset.after === null
                ? "Unknown"
                : units(asset.after, asset.decimals)}{" "}
              {asset.symbol}
            </strong>
          </span>
          <span>
            Recorded change{" "}
            <strong>
              {asset.delta === null
                ? "Unknown"
                : units(asset.delta, asset.decimals, true)}{" "}
              {asset.symbol}
            </strong>
          </span>
        </div>
      )}
      <div>
        <strong>What this record shows</strong>
        <p>{proves}</p>
      </div>
      <div>
        <strong>What remains unknown</strong>
        <p>{limit}</p>
      </div>
      {tx.source.kind === "synthetic" && (
        <small>Educational fixture; these are not on-chain records.</small>
      )}
    </div>
  );
}
