import { mkdir, writeFile } from "node:fs/promises";

// Only public mainnet reads. Raw response text is preserved, including integer precision.
const endpoints = process.env.SOLANA_RPC_URL
  ? [process.env.SOLANA_RPC_URL]
  : [
      "https://api.mainnet-beta.solana.com",
      "https://solana-rpc.publicnode.com",
    ];
const sources = [
  ["token", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],
  ["swap", "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"],
  ["transfer", "11111111111111111111111111111111"],
];
await mkdir("public/fixtures", { recursive: true });
const captures = [];
for (const endpoint of endpoints) {
  try {
    const rpc = async (method, params) => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const data = JSON.parse(text);
      if (data.error) throw new Error(`RPC code ${data.error.code}`);
      return { data: data.result, text };
    };
    for (const [category, address] of sources) {
      const { data: signatures } = await rpc("getSignaturesForAddress", [
        address,
        { limit: 8, commitment: "finalized" },
      ]);
      for (const item of signatures.slice(0, 4)) {
        const { data, text } = await rpc("getTransaction", [
          item.signature,
          {
            encoding: "jsonParsed",
            commitment: "finalized",
            maxSupportedTransactionVersion: 1,
          },
        ]);
        if (!data?.meta) continue;
        const name = `${category}-${item.err ? "failed" : "success"}-${captures.length}`;
        await writeFile(`public/fixtures/${name}.json`, text);
        captures.push({
          id: name,
          signature: item.signature,
          network: "mainnet-beta",
          capturedAt: new Date().toISOString(),
          category,
          failed: !!item.err,
          source: "Public Solana mainnet RPC",
          file: `/fixtures/${name}.json`,
          limitations:
            "Only System and standard SPL transfer/account funding instructions receive semantic classification; unfamiliar programs remain dependencies.",
        });
        console.log(`Captured ${name}: ${item.signature}`);
      }
    }
    break;
  } catch (error) {
    console.log(
      `Public RPC unavailable: ${error.message}. Trying next source.`,
    );
  }
}
await writeFile(
  "public/fixtures/manifest.json",
  JSON.stringify(captures, null, 2),
);
console.log(
  `Saved ${captures.length} real mainnet records. Synthetic design fixtures remain separately labeled.`,
);
