import { isSignature } from "@/lib/format";
import type { Transaction } from "@/lib/model";
import {
  fetchTransaction,
  type TransactionResult,
} from "@/lib/transaction-service";
import { errorResponse } from "@/lib/rpc";

const cache = new Map<string, { expires: number; tx: Transaction }>();
const inFlight = new Map<string, Promise<TransactionResult>>();
const headers = { "Cache-Control": "no-store" };

export async function GET(
  _request: Request,
  context: { params: Promise<{ signature: string }> },
) {
  const { signature } = await context.params;
  if (!isSignature(signature))
    return Response.json(
      {
        error: "Enter a valid base58 transaction signature (64 decoded bytes).",
        kind: "invalid",
      },
      { status: 400, headers },
    );
  const cached = cache.get(signature);
  if (cached && cached.expires > Date.now())
    return Response.json(cached.tx, { headers });
  try {
    if (!inFlight.has(signature))
      inFlight.set(signature, fetchTransaction(signature));
    const result = await inFlight.get(signature)!;
    if (result.state === "pending")
      return Response.json(
        {
          error:
            "The signature is known, but confirmed transaction details are not yet available. Refresh to check again.",
          kind: "pending",
          finality: result.finality,
          executionError: result.executionError,
        },
        { status: 202, headers: { ...headers, "Retry-After": "3" } },
      );
    if (cache.size >= 128) cache.delete(cache.keys().next().value!);
    cache.set(signature, {
      expires:
        Date.now() + (result.tx.finality === "finalized" ? 300000 : 10000),
      tx: result.tx,
    });
    return Response.json(result.tx, { headers });
  } catch (error) {
    return errorResponse(error);
  } finally {
    inFlight.delete(signature);
  }
}
