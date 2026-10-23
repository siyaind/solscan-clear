# Solscan / CLEAR — design rationale

This is an implementation rationale and handoff reference. The entrant should review it and explain the final submission in their own words. No user research or judged outcome is implied.

## The problem and the baseline

A transaction signature answers a technical identification question. People often arrive with a different question: “Why did my SOL change?” Conventional explorers expose the facts, but users still need to connect net balances, account funding, fees, instructions, token ownership, and execution outcomes.

Solscan already provides transaction summaries, balance-change views, and an interactive **TX Map**. Its documented map highlights components and can show token-account movement. CLEAR does not claim to invent transaction visualization or raw evidence inspection. The redesign changes the investigation workflow and makes the transitions between summary, relationships, and source records explicit.

Reference: [Solscan TX Map](https://docs.solscan.io/transaction-details/transaction-details/tx-map).

## Three redesigned workflows

### 1. Transaction MRI

The central feature is one transaction viewed through three layers, with the selected account and evidence retained.

**Impact — “What changed?”**

The native balance sits before a decomposition of the difference. Fees, supported System transfers, account funding, and unknown remainders are separate selectable components. Token-account balances sit below, with exact decimals and before/after amounts. The layout separates observed facts from explanations. “Not fully explained” is a useful answer when a close-account refund or unfamiliar protocol cannot be fully interpreted.

**Connections — “How are the entities related?”**

A focused metro-style dependency diagram uses three line styles: solid asset movement, dashed program invocation, and dotted account references. It initially shows a handful of relevant addresses. Expansion, pan, zoom, fit, the complete relationship list, and the account directory offer deeper investigation without a 57-node tangle. On mobile, selectable nodes become a vertical account directory; exact relationships remain in the text view. Physical vertical order is not presented as execution sequence.

**Evidence — “How can I verify it?”**

The record browser exposes balances, instructions, inner traces, logs, and raw JSON. Each selected record has an exact field reference and classification. Direct balance evidence is “Verified on-chain,” server parser output is “Parsed interpretation,” and unsupported semantics are “Not determined.” Synthetic example records are labeled synthetic rather than on-chain verified.

The inspector stays visible on desktop. On mobile, the user explicitly opens an evidence sheet; the page keeps the essential status and fee visible without opening it.

### 2. Question-first exploration

The homepage makes the person's question the first action. Search remains a deterministic identifier lookup, not a chat prompt. Question cards open labeled examples of the relevant interaction. The input validates decoded base58 lengths, distinguishes signatures from public keys, and looks up public-key account data to disambiguate wallets, token accounts, mints, and programs.

### 3. Full-address comparison

Truncated addresses work for compact identification but are inadequate for equality checks. Address Compare displays every character, wraps on narrow screens, highlights differing positions, and validates the decoded 32-byte key. It makes no scam, ownership, or trust score. Matching a prefix and suffix is not equality.

## Why this helps beginners

- Outcome and fee appear before instruction detail.
- Native SOL, token-account balances, and wrapped SOL remain visibly separate.
- The fee payer is never labeled “You.” The perspective selector names the selected address and recorded role.
- Failure shows the rolled-back request and supported actual cost; finality is a separate status.
- “Where did these numbers come from?” follows a selected claim to its evidence rather than opening an unrelated technical page.
- Unknowns stay visible instead of being replaced with a confident story.

These are intended benefits and design hypotheses, not measured usability findings. A useful next study would ask newcomers to explain a fee, identify a recipient, and verify a token balance, then observe errors and time without inventing before/after metrics.

## Why this remains useful to advanced users

Exact full keys, account indices, outer/inner instruction references, execution errors, provider logs, and lossless integer RPC records are directly accessible. Unknown protocols do not block basic balance analysis. The original Solscan link and raw fixture download provide independent paths for review.

## Visual system

Warm paper `#F6F5F0`, white surfaces, deep ink, and a subdued teal anchor the interface. Manrope provides a clean editorial rhythm; Georgia italics introduce a warmer headline voice; DM Mono provides tabular, inspectable identifiers and amounts. The interface uses thin boundaries and space rather than glow or glass effects.

Outgoing/unclassified changes use a muted earth color. Color is reinforced with signs, labels, line styles, and classification text. Motion lasts about 150–250 ms and is disabled for reduced-motion preferences. Fonts are bundled locally.

## Technical and submission limitations

The parser classifies standard System and SPL/Token-2022 transfers conservatively. It does not decode arbitrary protocol intent, establish asset prices, or infer identity. Token owners absent from metadata are not guessed. Wrapped SOL is not merged into native SOL, and funding is not automatically called rent. The graph may omit some nodes visually; the complete records remain inspectable.

The demo contains 22 real mainnet captures and one separately labeled synthetic minimal SOL transfer. The synthetic case is an explanatory tool, not proof of a real transfer. Public RPC limits can affect live lookup and wallet history; no live lookup substitutes example data on error.

The implementation and screenshots do not replace the required Figma artifact. See the screen checklist for before/after frame assembly. No Figma file or live hosted deployment is claimed.

## Technical sources consulted

- [getTransaction: balances, fees, metadata, execution result](https://solana.com/docs/rpc/http/gettransaction)
- [Transaction introspection: account resolution and inner instructions](https://solana.com/docs/core/transactions/transaction-introspection)
- [Transaction execution: atomicity and charged failure fees](https://solana.com/docs/core/transactions)
- [RPC structures: loaded addresses and parsed account keys](https://solana.com/docs/rpc/json-structures)
