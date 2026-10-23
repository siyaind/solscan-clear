import { isAddress, isSignature } from "@/lib/format";
import { errorResponse } from "@/lib/rpc";
import { fetchAccount } from "@/lib/account-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ address: string }> },
) {
  const { address } = await context.params;
  const before = new URL(request.url).searchParams.get("before") || undefined;
  if (before && !isSignature(before))
    return Response.json(
      { error: "The history cursor must be a complete transaction signature." },
      { status: 400 },
    );
  if (!isAddress(address))
    return Response.json(
      { error: "Enter a valid Solana public key (32 decoded bytes)." },
      { status: 400 },
    );
  try {
    return Response.json(await fetchAccount(address, before), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
