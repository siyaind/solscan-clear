# Token identity

Token labels are separate from transaction balance evidence. Native SOL has no token mint; wSOL uses its own exact mint. The curated mainnet registry matches full mint addresses only. It is a label registry, not a safety endorsement.

The server resolver validates the mint account owner and type before reading Token-2022 metadata extensions or deriving the Metaplex metadata PDA. It validates the embedded mint and metadata-program owner. Current metadata enriches live transactions and recorded examples without modifying original RPC records, decimals, amounts, account addresses, or evidence references. Historical transaction captures do not imply that a current metadata label existed at execution time.

Metadata names and symbols are user-controlled. Duplicate tickers stay separate by mint. Familiar claimed symbols, invalid text, missing metadata, unavailable RPC responses, and incorrect account types have explicit trust or fallback states. Metadata JSON URIs are not fetched by the server, so they cannot turn token resolution into arbitrary network requests. Optional on-chain logo URLs are exposed as unverified links; no external image is loaded automatically.

The bounded process-local cache stores up to 512 identities for one hour, missing/invalid results for five minutes, and unavailable results for fifteen seconds. In-flight requests are deduplicated; resolution batches have at most 32 mints and four workers. Transaction and account metadata enrichment has a four-second display budget, with address labels retained if exceeded. Cache persistence across Vercel instances is not assumed.

Regression cases are added in `tests/token-identity.test.ts`. They were **not run**, per the requested no-test workflow. Deployment still requires Vercel's normal compilation step.

Sources: [Solana Metaplex metadata](https://solana.com/docs/tokens/metaplex), [Token-2022 metadata extensions](https://solana.com/docs/tokens/extensions/metadata).
