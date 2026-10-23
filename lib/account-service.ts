import "server-only";
import { z } from "zod";
import { isAddress, isSignature } from "./format";
import { rpc, RpcError } from "./rpc";

const numeric = z.union([
  z.string().regex(/^\d+$/),
  z.number().int().nonnegative().safe(),
]);
const accountSchema = z.object({
  value: z
    .object({
      lamports: numeric,
      owner: z.string().refine(isAddress),
      executable: z.boolean(),
      data: z.unknown(),
      space: z.number().optional(),
    })
    .nullable(),
});
const historySchema = z
  .array(
    z
      .object({
        signature: z.string().refine(isSignature),
        slot: numeric,
        blockTime: z.number().nullable().optional(),
        err: z.unknown().optional(),
      })
      .passthrough(),
  )
  .max(12);
type Call = (method: string, params: unknown[]) => Promise<unknown>;

export async function fetchAccount(
  address: string,
  before?: string,
  call: Call = rpc,
) {
  const requests = await Promise.allSettled([
    before
      ? Promise.resolve(null)
      : call("getAccountInfo", [
          address,
          { encoding: "jsonParsed", commitment: "confirmed" },
        ]),
    call("getSignaturesForAddress", [
      address,
      { limit: 12, commitment: "confirmed", ...(before ? { before } : {}) },
    ]),
  ]);
  const accountData =
    requests[0].status === "fulfilled" && !before
      ? accountSchema.safeParse(requests[0].value)
      : null;
  const historyData =
    requests[1].status === "fulfilled"
      ? historySchema.safeParse(requests[1].value)
      : null;
  if (!accountData?.success && !historyData?.success) {
    const rejected = requests.find((r) => r.status === "rejected");
    throw rejected?.status === "rejected"
      ? rejected.reason
      : new RpcError(
          502,
          "The provider returned incomplete account and history data.",
          "invalid-response",
        );
  }
  const rawAccount = accountData?.success ? accountData.data.value : null;
  const parsed =
    rawAccount?.data &&
    typeof rawAccount.data === "object" &&
    "parsed" in rawAccount.data
      ? rawAccount.data.parsed
      : undefined;
  const account = rawAccount
    ? {
        lamports: String(rawAccount.lamports),
        owner: rawAccount.owner,
        executable: rawAccount.executable,
        data: {
          ...(parsed && typeof parsed === "object"
            ? { parsed }
            : {
                note: "Encoded account data is omitted; no parsed account fields were returned.",
              }),
        },
      }
    : null;
  const signatures = historyData?.success ? historyData.data : [];
  return {
    address,
    account,
    accountAvailable: accountData?.success ?? false,
    historyAvailable: historyData?.success ?? false,
    signatures,
    nextCursor: signatures.length === 12 ? signatures.at(-1)!.signature : null,
    warnings: [
      ...(!accountData?.success && !before
        ? [
            "Account details are unavailable; available history is shown independently.",
          ]
        : []),
      ...(!historyData?.success
        ? [
            "Recent history is unavailable; account details are still available.",
          ]
        : []),
    ],
    source: "Live mainnet RPC",
  };
}
