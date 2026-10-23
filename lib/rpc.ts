import "server-only";
import { parseExactJson } from "./format";

export class RpcError extends Error {
  constructor(
    public status: number,
    message: string,
    public kind: string,
  ) {
    super(message);
  }
}

const MAX_BYTES = 4 * 1024 * 1024;
async function readBody(response: Response): Promise<string> {
  if (Number(response.headers.get("content-length")) > MAX_BYTES)
    throw new RpcError(
      502,
      "The RPC response exceeds the supported size. Use a provider that returns a bounded transaction record.",
      "oversized",
    );
  const reader = response.body?.getReader();
  if (!reader)
    throw new RpcError(
      502,
      "The provider returned an empty response.",
      "invalid-response",
    );
  const decoder = new TextDecoder();
  let text = "",
    size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw new RpcError(
          502,
          "The RPC response exceeds the supported size.",
          "oversized",
        );
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export async function rpc<T = unknown>(
  method: string,
  params: unknown[],
): Promise<T> {
  const endpoint =
    process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (response.status === 429)
      throw new RpcError(
        429,
        "The RPC provider is busy. Try again shortly, or configure a private RPC endpoint.",
        "throttled",
      );
    if (!response.ok)
      throw new RpcError(
        503,
        "The RPC provider is unavailable. Please try again or explore a clearly labeled recorded example.",
        "unavailable",
      );
    let data: Record<string, unknown>;
    try {
      const parsed = parseExactJson(await readBody(response));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error();
      data = parsed as Record<string, unknown>;
      if (
        data.jsonrpc !== "2.0" ||
        data.id !== 1 ||
        "result" in data === "error" in data
      )
        throw new Error();
    } catch (error) {
      if (error instanceof RpcError) throw error;
      throw new RpcError(
        502,
        "The provider returned an invalid JSON-RPC response. No example data has been substituted.",
        "invalid-response",
      );
    }
    if ("error" in data) {
      const code =
        data.error && typeof data.error === "object" && "code" in data.error
          ? data.error.code
          : null;
      if (code === 429 || code === -32005)
        throw new RpcError(
          429,
          "The RPC provider is rate-limited or behind. Try again shortly.",
          "throttled",
        );
      throw new RpcError(
        503,
        code === -32015
          ? "This transaction version is not supported by the configured RPC provider."
          : "The RPC provider could not return this data. History or this request may be unsupported.",
        code === -32015 ? "unsupported" : "rpc-error",
      );
    }
    return data.result as T;
  } catch (error) {
    if (error instanceof RpcError) throw error;
    throw new RpcError(
      503,
      "Could not reach the Solana RPC provider within 15 seconds. No example data has been substituted.",
      "unavailable",
    );
  }
}

export function errorResponse(error: unknown) {
  const status = error instanceof RpcError ? error.status : 502;
  return Response.json(
    {
      error:
        error instanceof RpcError
          ? error.message
          : "The provider returned data CLEAR could not safely interpret.",
      kind: error instanceof RpcError ? error.kind : "unsupported",
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(status === 429 ? { "Retry-After": "5" } : {}),
      },
    },
  );
}
