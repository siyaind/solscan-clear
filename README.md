# Solscan / CLEAR

**See what happened. Understand why. Verify everything.**

A working, read-only Solscan redesign for the Superteam India design bounty. **Transaction Anatomy** keeps one selected financial outcome visible as you unfold **Outcome → Structure → Proof**. An exact balance waterfall, adaptive relationship map, and inline source records share the same account perspective. Warm paper, precise typography, and restrained teal give the financial reconciliation room to breathe.

## Run locally

Requires Node.js 22.13 or later and npm. Development was verified with Node 24.18, Next.js 16.4.2, and React 19.3.1.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [localhost:3000](http://127.0.0.1:3000). If your shell consumes npm's forwarded CLI arguments, run `node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3000` directly.

### Environment

| Variable                | Purpose                                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SOLANA_RPC_URL`        | Server-only mainnet RPC endpoint. Defaults to `https://api.mainnet-beta.solana.com`. A private/archival provider improves availability. Never prefix this with `NEXT_PUBLIC_`. |
| `SOLANA_MAX_TX_VERSION` | Maximum supported transaction version sent to RPC. Defaults to `1`, as documented in the current Solana introspection guide. Set `0` for providers limited to legacy/v0.       |

No wallet, seed phrase, signing key, authentication, or paid parsing service is required. Provider keys stay on the server. RPC error text is not forwarded to the browser because it may contain provider URLs.

## Explore

- `/` — question-first search, deterministic example journeys, and recorded examples.
- `/tx/[signature]` — live mainnet Transaction Anatomy. Invalid/missing/pending/unavailable states remain distinct; no mock fallback.
- `/tx/demo-swap-success-6` — recorded mainnet example, with provenance and download.
- `/tx/demo-token-success-12` — recorded token transaction with separate SOL fee.
- `/tx/demo-transfer-failed-9` — recorded failed execution, charged fee, and rolled-back requests.
- `/tx/demo-swap-success-14` — recorded associated token account lifecycle.
- `/tx/demo-token-success-3` — recorded transaction with 57 accounts.
- `/tx/demo-design-transfer` — explicitly synthetic minimal SOL transfer for learning, not a real transaction.
- `/account/[address]` — account type, program owner, native balance, independently available history, and older-activity pagination (12 records per page).
- `/compare` — full base58 public-key validation and exact character comparison.
- `/network` — live RPC snapshot of slots, epoch, sampled TPS, and circulating supply.
- `/methodology` — visible explanation of evidence classifications and parser limitations.

The example selector switches among the six demonstration journeys. `/fixtures/manifest.json` identifies **22 original mainnet captures**, including two failed executions. Capture date: 23 October 2026. These are not live streams. The minimal SOL transfer fixture is synthetic and labeled on every related screen.

## Architecture

Shareable investigation links retain depth (`layer`), perspective (`account`), selected evidence (`focus`), and the financial outcome (`asset`) independently. Legacy links still work. The audit also added token-unit inspection, explorer URL pasting with network checks, persistent theme preference, and a keyboard-safe mobile dialog. Read the [technical audit and improvements](docs/AUDIT_AND_IMPROVEMENTS.md) for the earlier corrections.

Next.js App Router, React, strict TypeScript, Zod runtime validation, Lucide icons, local Manrope/DM Mono fonts, and CSS/SVG visualizations. The application uses a typed JSON-RPC adapter instead of a wallet SDK; it never signs or broadcasts. CSS transitions honor reduced-motion preferences.

```text
app/api/transactions/[signature]   validation → server RPC → normalize → bounded cache
lib/format.ts                     base58 validation, exact JSON integers, decimal formatting
lib/model.ts                      RPC schemas and shared domain/evidence types
lib/normalize.ts                  balances, traces, relationships, reconciliation
lib/anatomy.ts                    exact accounting bridge and contextual relationship ranking
components/transaction-workspace  shared perspective, outcome, evidence, and depth
components/anatomy-stage          persistent outcome and progressive structure/proof disclosure
components/impact-canvas          cumulative balance waterfall and exact component ledger
components/relationship-canvas    typed edges, focused nodes, pan/zoom, text alternative
components/evidence-inspector     balances, instructions, logs, raw JSON, source references
```

All visualization selections reference evidence IDs in the shared transaction. Changing perspective recomputes its outcomes independently; moving between depths retains the selected outcome and evidence. Native balances, token balances, and wrapped SOL remain separate. Multiple token accounts of one mint are not silently merged. Token waterfalls show recorded net changes, never an inferred receipt from gross instruction amounts. Native components keep fees, transfers, account funding, and unexplained residuals distinct; the chart is an accounting breakdown, not execution order.

Integer RPC lexemes beyond JavaScript's safe range are preserved as strings using Node's JSON reviver source context. Arithmetic uses `BigInt`; API responses use decimal integer strings. No floating-point monetary reconciliation or token pricing is used. No network requests are made directly from the browser to the RPC provider.

The transaction cache holds at most 128 records: five minutes for finalized records, ten seconds for other states. Status lookup is best-effort and independently labeled `unknown` if unavailable. Public RPC calls have a 15-second timeout. Native transfers/account funding and standard SPL/Token-2022 transfers receive conservative semantic classification. Unknown instructions stay encoded and inspectable. Inner CPI callers are resolved with stack heights when available; otherwise only their outer grouping is asserted.

## Validation

```powershell
npm run format:check
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
npm run start
```

End-to-end tests use the locally installed Microsoft Edge browser at 1440 × 1000 and 390 × 844. Set `PLAYWRIGHT_CHANNEL=chrome` for another installed Chromium browser, or use the bundled Chromium engine in CI. Tests exercise the persistent Anatomy journey, graph controls, saved context, token-unit inspection, failure regressions, raw JSON, clipboard, theme persistence, history pagination, mobile focus handling, address comparison, invalid live lookups, page overflow, and automated WCAG A/AA checks. Screenshots are written to `docs/screenshots/`. The GitHub Actions workflow uses Node 24 and installs Playwright Chromium before running the same checks and production build.

To refresh public recorded fixtures, run `npm run capture`. The script only performs public mainnet reads; it tries the official endpoint and PublicNode. Review the new manifest and update the example IDs if they change. Keep the original raw response text to preserve integer evidence. Expected baseline values are in `docs/fixtures-expected.json`.

## Deployment

This is a standard server-rendered Next.js application. Run `npm run build` then `npm run start`, or deploy the repository to a Node-compatible Next.js host and configure `SOLANA_RPC_URL` as a server secret. Static export is unsuitable because the RPC proxy must run on the server. No hosted deployment has been created by this local build.

## Delivery boundaries

- Provider rate limits, unavailable archive history, and network timeouts are explicit errors. Recorded examples remain available independently.
- Reconciliation does not infer rent refunds, token prices, recipient identities, or unknown protocol intent. Residual lamports are **unclassified account changes**.
- Finalization does not imply execution success. Failed transactions do not show committed transfer edges. Fees and recorded balance effects remain visible, including durable nonce caveats.
- Missing balance metadata does not become a zero balance. New/closed token-account sides become zero only when both token balance lists are present.
- Unknown ownership is not guessed. Accounts created and closed within one transaction with no balance metadata may have instruction evidence only.
- Program labels are a small, static address registry. This is not a universal protocol or swap decoder. The graph ranks accounts around the selected outcome and evidence, showing up to seven nodes initially and twelve when expanded; every account and relationship remains available in the text/evidence views.
- The Figma competition requirement still requires a real Figma file with before/after desktop and mobile screens. Implementation screenshots and handoff specs are included; an actual Figma file has not been created.
- No usability-study results, performance improvements, or security audit are claimed.

Read [the design case study](docs/DESIGN_CASE_STUDY.md), [screen checklist](docs/SCREEN_CHECKLIST.md), and [test evidence](docs/TEST_EVIDENCE.md).

## Primary sources

- [Solana getTransaction](https://solana.com/docs/rpc/http/gettransaction)
- [Solana transaction introspection](https://solana.com/docs/core/transactions/transaction-introspection)
- [Solana transaction execution](https://solana.com/docs/core/transactions)
- [Solana RPC JSON structures](https://solana.com/docs/rpc/json-structures)
- [Solscan TX Map](https://docs.solscan.io/transaction-details/transaction-details/tx-map)
- [Superteam redesign bounty](https://superteam.fun/earn/listing/redesign-your-favourite-app-on-solana)
