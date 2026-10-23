import { rpc, errorResponse } from "@/lib/rpc";
export async function GET() {
  try {
    const [epoch, supply, samples] = await Promise.all([
      rpc<{
        absoluteSlot: number;
        epoch: number;
        slotIndex: number;
        slotsInEpoch: number;
      }>("getEpochInfo", [{ commitment: "confirmed" }]),
      rpc<{ value: { circulating: number | string } }>("getSupply", [
        { excludeNonCirculatingAccountsList: true },
      ]),
      rpc<{ numTransactions: number; samplePeriodSecs: number }[]>(
        "getRecentPerformanceSamples",
        [1],
      ),
    ]);
    return Response.json({
      epoch,
      circulatingLamports: String(supply.value.circulating),
      tps: samples[0]
        ? Math.round(samples[0].numTransactions / samples[0].samplePeriodSecs)
        : null,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
