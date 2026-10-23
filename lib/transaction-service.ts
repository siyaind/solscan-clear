import "server-only";
import { z } from "zod";
import { normalize } from "./normalize";
import { rpc, RpcError } from "./rpc";
import type { Transaction } from "./model";

type RpcCall = (method: string, params: unknown[]) => Promise<unknown>;
const statusesSchema = z.object({
  value: z
    .array(
      z
        .object({
          confirmationStatus: z
            .enum(["processed", "confirmed", "finalized"])
            .nullable()
            .optional(),
          confirmations: z.number().nullable().optional(),
          err: z.unknown().optional(),
        })
        .nullable(),
    )
    .min(1),
});
export type TransactionResult =
  | { state: "ready"; tx: Transaction }
  | { state: "pending"; finality: string; executionError: unknown };

export async function fetchTransaction(
  signature: string,
  call: RpcCall = rpc,
): Promise<TransactionResult> {
  const setting = Number(process.env.SOLANA_MAX_TX_VERSION || "1");
  const maxVersion =
    Number.isInteger(setting) && setting >= 0 && setting <= 1 ? setting : 1;
  const [record, statusResult] = await Promise.allSettled([
    call("getTransaction", [
      signature,
      {
        encoding: "jsonParsed",
        commitment: "confirmed",
        maxSupportedTransactionVersion: maxVersion,
      },
    ]),
    call("getSignatureStatuses", [
      [signature],
      { searchTransactionHistory: true },
    ]),
  ]);
  const parsedStatus =
    statusResult.status === "fulfilled"
      ? statusesSchema.safeParse(statusResult.value)
      : null;
  const status = parsedStatus?.success ? parsedStatus.data.value[0] : undefined;
  const finality =
    status?.confirmationStatus ??
    (status?.confirmations === null ? "finalized" : "unknown");
  if (record.status === "rejected") throw record.reason;
  if (record.value == null) {
    if (status && (finality === "processed" || finality === "unknown"))
      return { state: "pending", finality, executionError: status.err ?? null };
    if (status)
      throw new RpcError(
        503,
        "This signature is confirmed, but this provider cannot return its transaction details. Try an archival provider or retry shortly; this is not evidence that the transaction is missing.",
        "history-unavailable",
      );
    if (!parsedStatus?.success)
      throw new RpcError(
        503,
        "Transaction details and a reliable status are unavailable. The provider could not establish whether this signature is missing or still processing.",
        "unavailable",
      );
    throw new RpcError(
      404,
      "This transaction was not found in the provider’s available mainnet history. Check the network and signature, or try an archival RPC provider.",
      "missing",
    );
  }
  const tx = normalize(
    record.value,
    { kind: "live", label: "Live mainnet RPC" },
    finality,
  );
  if (tx.signature !== signature)
    throw new RpcError(
      502,
      "The provider returned a transaction with a different signature.",
      "mismatch",
    );
  return { state: "ready", tx };
}
