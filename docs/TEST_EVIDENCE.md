# Verification evidence

Verified locally on **23 October 2026**, on Windows with Node.js 24.18, Next.js 16.4.2, React 19.3.1, strict TypeScript, Vitest, and Playwright with installed Microsoft Edge.

## Completed checks

The deep audit and its fixes are documented in [AUDIT_AND_IMPROVEMENTS.md](AUDIT_AND_IMPROVEMENTS.md). The expanded suite covers 82 unit/regression cases and 26 browser cases, including the preserved transaction corpus and automated accessibility checks. GitHub CI is an additional verification step; local success does not imply a hosted run has finished.

| Check                         | Observed result                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript                    | Passed, including Next.js production type generation                                                                           |
| ESLint                        | Passed                                                                                                                         |
| Unit/regression suite         | 82 tests passed, including all 22 preserved mainnet captures                                                                   |
| End-to-end suite              | 26 tests passed, thirteen cases each at 1440 × 1000 and 390 × 844                                                              |
| Production build              | Passed; all ten routes generated as appropriate static/dynamic routes                                                          |
| Actual live transaction fetch | Passed through the server-side proxy, independently of fixture loading                                                         |
| Source integrity              | Raw mainnet JSON retained with signature/network/capture-time manifest; baseline normalized fields in `fixtures-expected.json` |

Final formatting, lint, and regression checks are rerun after any subsequent implementation changes; use the commands below to reproduce the current checkout.

## Accounting coverage

The final audit run passed all **82 unit/regression tests** and **26 desktop/mobile browser tests**. Axe reported no WCAG A/AA violations on the tested home, transaction, and comparison screens at the two viewport sizes. `npm audit --omit=dev` reported **zero known production dependency vulnerabilities**. These scoped automated results do not constitute a security or exhaustive accessibility certification. Type checks now generate Next route types explicitly, so a fresh checkout does not depend on this machine’s ignored generated files.

Audit additions include text/memo instructions; omitted metadata and null lookup data; ambiguous and changing token owners; Token-2022 instruction fees; nested CPI callers; failure-log ambiguity; exact JSON-RPC envelope/response IDs and response-size limits; independent transaction/finality failures; partial account-history availability; and URL context round-tripping. Browser additions cover share/reload continuity, token versus SOL inspector units, full mobile keyboard focus handling, history pagination, appearance persistence, prefilled comparison, wrong-network rejection, and axe checks of home, transaction, and comparison screens on both viewport sizes.

Tests cover exact lamport and token formatting, unsafe JSON integer preservation, native balance reconciliation, fee-payer attribution, recipient perspective, account funding, unclassified residuals, self-transfers, failed execution with retained fees, unexpected failed balance effects, missing metadata, unsafe numeric rejection, multiple token accounts of one mint, absent metadata sides, new/closed token accounts, unknown owners, inconsistent decimals, wrapped SOL separation, compiled address lookup tables, jsonParsed lookup-key deduplication, and inner-instruction evidence paths.

For every preserved mainnet record, tests check the signature, execution result, fee, account count, and fee-payer delta against a saved baseline. They also verify that each visualized asset/instruction/relationship points to an existing evidence ID, and that reconciliation components sum exactly to the account’s delta. Failed records must have no committed movement edges.

## End-to-end coverage

The browser suite checks homepage intent/search validation; recorded-example loading; Impact → Connections → Evidence navigation; keyboard layer navigation; account selection retained between layers; wallet perspective retained when returning to Impact; graph expand/zoom/fit; failed-execution fee and missing transfer arrows; complete-address equality and differing characters; exact clipboard contents; raw RPC JSON; light/dark theme switching; mobile evidence sheet open/close; invalid live signature validation; and horizontal page overflow for home, Impact, Connections, Evidence, Compare, and failure screens.

The browser suite uses preserved or explicitly synthetic fixtures for deterministic behavior. It does not depend on a live RPC provider for its passing result.

## Live verification

Queried CLEAR’s own `GET /api/transactions/[signature]` endpoint for:

`4KxpWzijGzn5HSRNfCWGMpiEXUgKJs3J4qCCzMQoNxGAo2A1Evx9gciScLkqWHcj3Pwwjz5tTcwqgkByD3kzgAHb`

Observed response: `source.kind = live`, execution `success`, finality `finalized`, fee **11,521 lamports**, **21 accounts**, and **42 evidence references**. This confirms that live lookup invokes the server RPC path rather than returning a labeled demo. The same transaction was opened on the original Solscan site for baseline overview, balance-change, and TX Map screenshots.

## Visual verification

Desktop and mobile Impact/Evidence/Connections captures were visually reviewed for hierarchy, graph legibility, long-identifier wrapping, amount readability, and overflow. The graph’s initial node selection was refined to prioritize application programs and token counterparties. Screenshots are under `docs/screenshots/`, with original Solscan before screens clearly distinguished by their `original-` prefix. Mobile uses a vertical account view and a separate evidence sheet, rather than shrinking the desktop graph.

## Hosted CI status

The [initial GitHub Actions run](https://github.com/rishu4436/solscan-clear/actions/runs/39938825952) stopped before any workflow step executed. GitHub reported an account billing/spending-limit restriction. This is not a hosted test pass or a code-test failure; the local results above are the completed verification. Billing settings were not changed. The account owner can address the restriction in GitHub settings and rerun the workflow.

## Reproduce locally

```powershell
npm run format:check
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

Playwright uses Edge. If unavailable on another machine, select and install a compatible Playwright browser. Test traces/reports are generated in ignored `test-results/` and `playwright-report/` directories. Screenshots are retained in `docs/screenshots/` for manual Figma assembly.

## Limits of the evidence

No usability research, performance improvement, security audit, universal protocol decoder, hosted deployment, or actual Figma file is claimed. Live account/network/history availability depends on RPC provider policies. No exhaustive accessibility audit or cross-browser matrix has been run. Mobile scroll behavior and controls were exercised in Edge’s mobile emulation, not on a physical phone. Unknown parsing stays visible as unknown. The simple SOL transfer demonstration is explicitly synthetic; the five other demonstration journeys use real mainnet captures.
