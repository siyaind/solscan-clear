import { isAddress } from "@/lib/format";
import { tokenIdentityResolver } from "@/lib/token-identity-resolver";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const reader = request.body?.getReader();
    if (!reader)
      return Response.json(
        { error: "Provide token mints." },
        { status: 400, headers },
      );
    let text = "",
      size = 0;
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4096) {
          await reader.cancel();
          return Response.json(
            { error: "Too many token mints." },
            { status: 413, headers },
          );
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally {
      reader.releaseLock();
    }
    const body = JSON.parse(text);
    if (
      !body ||
      !Array.isArray(body.mints) ||
      body.mints.length > 32 ||
      !body.mints.every(
        (mint: unknown) => typeof mint === "string" && isAddress(mint),
      )
    )
      return Response.json(
        { error: "Provide up to 32 full token mint addresses." },
        { status: 400, headers },
      );
    const identities = await tokenIdentityResolver.resolveMany(body.mints);
    return Response.json({ identities }, { headers });
  } catch {
    return Response.json(
      { error: "Token metadata is unavailable." },
      { status: 503, headers },
    );
  }
}
