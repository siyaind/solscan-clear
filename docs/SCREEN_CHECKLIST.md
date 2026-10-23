# Figma handoff and screen checklist

The contest requires a real Figma file with before/after screens, mobile and desktop variants, and a short explanation. This repository contains the implementation, screenshots, and assembly specification. **No actual Figma file has been created.**

## Required frames

| Screen                                    | Desktop                                   | Mobile                           | Reference                                             |
| ----------------------------------------- | ----------------------------------------- | -------------------------------- | ----------------------------------------------------- |
| Original Solscan transaction overview     | Captured; files below                     | Captured; files below            | Same recorded signature as the redesigned example     |
| Original Solscan balance changes / TX Map | Captured; files below                     | Captured; files below            | Show the existing interactions fairly                 |
| CLEAR question-first homepage             | `home-desktop.png`                        | `home-mobile.png`                | `docs/screenshots/`                                   |
| CLEAR Anatomy / Outcome                   | `impact-desktop.png`                      | `impact-mobile.png`              | Native delta, fees, unknown remainder, token balances |
| CLEAR Anatomy / Structure                 | `connections-desktop.png`                 | `connections-mobile.png`         | Distinct edge types and vertical mobile directory     |
| CLEAR Anatomy / Proof                     | `evidence-desktop.png`                    | `evidence-mobile.png`            | Matching selection and field references               |
| CLEAR / Address Compare                   | `compare-desktop.png`                     | `compare-mobile.png`             | Add a filled difference example as an extra state     |
| CLEAR / Failure                           | Capture from `/tx/demo-transfer-failed-9` | Same route at mobile width       | Charged fee and no committed transfers                |
| CLEAR / Mobile inspector open             | Not applicable                            | Open “Inspect selected evidence” | Bottom evidence sheet                                 |

Screenshots are produced by the end-to-end suite at 1440 × 1000 and 390 × 844. Full-page captures may be taller than the initial viewport. Use the captured content at native width; do not scale desktop screens down to manufacture mobile variants.

## Original comparison transaction

[Open the original Solscan transaction](https://solscan.io/tx/4KxpWzijGzn5HSRNfCWGMpiEXUgKJs3J4qCCzMQoNxGAo2A1Evx9gciScLkqWHcj3Pwwjz5tTcwqgkByD3kzgAHb).

This is the same transaction used in `/tx/demo-swap-success-6`. The fixture manifest records provenance. Preserve the recorded date. Do not represent an old fixture as current real-time activity.

Six before screenshots were captured from the actual Solscan product on 23 October 2026, using the same signature as CLEAR’s default example. They are saved in `docs/screenshots/` as `original-overview-desktop.jpg`, `original-overview-mobile.jpg`, `original-balances-desktop.jpg`, `original-balances-mobile.jpg`, `original-tx-map-desktop.jpg`, and `original-tx-map-mobile.jpg`. The TX Map captures preserve the product’s initial viewport. Third-party advertisements, labels, and prices belong to the original product and are not used as RPC evidence in CLEAR.

The end-to-end suite also saves `failure-desktop.png`, `failure-mobile.png`, and `inspector-mobile.png`. The compare captures include the filled single-character-difference example.

The additional `anatomy-outcome-desktop.png`, `anatomy-outcome-mobile.png`, `anatomy-proof-desktop.png`, and `anatomy-proof-mobile.png` captures show the explicitly synthetic transfer and its exact fee breakdown. Use these as interaction demonstrations, not as before/after comparisons with a real transaction.

## Assembly specification

1. Create Figma pages: `01 — Baseline`, `02 — Desktop`, `03 — Mobile`, `04 — Components`, `05 — Interaction notes`.
2. Place current original screenshots alongside the equivalent redesign state using the same transaction and account perspective.
3. Use 1440 px desktop frames and 390 px mobile frames; inspect 375, 430, and 768 px behavior where practical.
4. Recreate component groups if editability is needed: navigation, identity/status, perspective selector, Anatomy depth control, balance decomposition, token account card, graph node/legend, evidence record, inspector, address character tile.
5. Link Outcome → Structure → Proof states and preserve the selected financial outcome and account. Add evidence-sheet open/closed states for mobile.
6. Annotate the concrete user problem, the intended improvement, and the exact supporting record. Use your own submission explanation.

## Design tokens

- Canvas `#F6F5F0`; surface white; primary action `#007E72`; outgoing `#AD6239`; failure `#B64642`.
- Body: Manrope; headline emphasis: Georgia italic; financial/identifier text: DM Mono.
- Desktop content max width: 1440 px with 64 px padding; tablet 36 px; mobile 22 px.
- Anatomy desktop layout: flexible canvas + 230–320 px inspector inside one continuous workbench.
- Borders: 1 px; panel radii: 8–10 px; mobile sheet: 18 px top corners.
- Motion: 150–250 ms; no motion for reduced-motion preferences.

## Submission integrity

Do not claim an original protocol decoder, a novel invention of transaction maps, measured usability improvements, a security audit, or a real Figma file until the corresponding evidence exists. Solscan already has balance changes and TX Map; the contribution here is the connected outcome → relationship → evidence workflow.
