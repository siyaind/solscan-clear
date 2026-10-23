import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { normalize } from "../../lib/normalize";
import { syntheticTransfer, DESIGN_RECIPIENT } from "../../lib/synthetic";
import { SYSTEM } from "../../lib/model";

test("one outcome stays mounted while its structure and proof unfold", async ({
  page,
}) => {
  await page.goto("/tx/demo-design-transfer");
  const anchor = page.locator(".anatomy-anchor");
  await expect(anchor).toContainText("−0.250005");
  await anchor.evaluate((element) =>
    element.setAttribute("data-persistence-check", "same-object"),
  );
  await page
    .locator(".money-ledger-row")
    .filter({ hasText: "Network fee" })
    .click();
  const selected = await page
    .locator(".sr-only[aria-live='polite']")
    .innerText();
  const depth = page.getByRole("slider", { name: "Exploration depth" });
  await depth.focus();
  await depth.press("ArrowRight");
  await expect(depth).toHaveAttribute("aria-valuetext", "Structure");
  await expect(page.locator(".relationship-panel")).toBeVisible();
  await expect(anchor).toHaveAttribute("data-persistence-check", "same-object");
  await depth.press("ArrowRight");
  await expect(page.locator(".evidence-peel.open")).toBeVisible();
  await expect(page.locator(".peel-reference")).toContainText("meta.fee");
  await expect(page.locator(".proof-card")).toContainText("network fee");
  await page.getByText("View original RPC fields").click();
  await expect(page.locator(".peel-json pre")).toContainText("5000");
  await expect(page.locator(".sr-only[aria-live='polite']")).toHaveText(
    selected,
  );
  await expect(anchor).toHaveAttribute("data-persistence-check", "same-object");
  await page.getByRole("button", { name: "Return to outcome" }).click();
  await expect(anchor).toHaveAttribute("data-persistence-check", "same-object");
  await expect(page.locator(".money-ledger-row.selected")).toContainText(
    "Network fee",
  );
});

test("proof replaces the long graph and keeps the selected balance in view", async ({
  page,
}) => {
  await page.goto("/tx/demo-design-transfer");
  await page.getByRole("button", { name: /^Proof/ }).click();
  await expect(page.locator(".relationship-panel")).toHaveCount(0);
  await expect(page.locator(".anatomy-path-summary")).toContainText(
    "SOL balance",
  );
  await expect(page.locator(".proof-card")).toContainText(
    "What this record shows",
  );
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const anchor = document
          .querySelector(".anatomy-anchor")!
          .getBoundingClientRect();
        const proof = document
          .querySelector(".evidence-peel")!
          .getBoundingClientRect();
        return (
          anchor.top >= 0 &&
          anchor.top < innerHeight &&
          proof.top >= 0 &&
          proof.top < innerHeight
        );
      }),
    )
    .toBe(true);
});

test("a token outcome and different instruction proof survive sharing and reload", async ({
  page,
}) => {
  await page.goto("/tx/demo-token-success-12");
  await page.locator(".anatomy-outcome.asset-card").click();
  const subject = await page
    .locator(".anatomy-anchor")
    .getAttribute("data-evidence-id");
  const amount = await page.locator(".anchor-outcome > strong").innerText();
  await page.getByRole("button", { name: /^Proof/ }).click();
  await page
    .getByText("Browse the complete transaction record", { exact: true })
    .click();
  await page.getByRole("tab", { name: "Instructions", exact: true }).click();
  await page.locator(".instruction-row").first().click();
  await expect(page.locator(".anatomy-anchor")).toHaveAttribute(
    "data-evidence-id",
    subject!,
  );
  await expect(page).toHaveURL(/asset=token/);
  await page.reload();
  await expect(page.locator(".anchor-outcome > strong")).toHaveText(amount);
  await expect(page.locator(".peel-reference")).toContainText("instructions");
  await expect(page.locator(".anatomy-anchor")).toHaveAttribute(
    "data-evidence-id",
    subject!,
  );
});

test("clicking a counterparty can change perspective and independently recompute the outcome", async ({
  page,
}, info) => {
  await page.goto("/tx/demo-design-transfer?layer=connections");
  const nodes =
    info.project.name === "mobile" ? ".mobile-map-list" : ".graph-transform";
  await page
    .locator(`${nodes} button[data-address='${DESIGN_RECIPIENT}']`)
    .click();
  await page.getByRole("button", { name: "View from this account" }).click();
  await expect(
    page.getByLabel("Viewing impact for", { exact: true }),
  ).toHaveValue(DESIGN_RECIPIENT);
  await expect(page.locator(".anchor-outcome")).toContainText("+0.25");
  await page.getByRole("button", { name: /^Outcome/ }).click();
  await expect(
    page.locator(".money-ledger-row").filter({ hasText: "Network fee" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".anchor-outcome")).toContainText("+0.25");
});

test("selecting a program opens its instruction cluster while retaining the balance object", async ({
  page,
}, info) => {
  await page.goto("/tx/demo-design-transfer?layer=connections");
  const nodes =
    info.project.name === "mobile" ? ".mobile-map-list" : ".graph-transform";
  const subject = await page
    .locator(".anatomy-anchor")
    .getAttribute("data-evidence-id");
  await page.getByRole("button", { name: "Program interactions" }).click();
  await page.locator(`${nodes} button[data-address='${SYSTEM}']`).click();
  await expect(
    page.getByRole("region", { name: "Selected program instructions" }),
  ).toBeVisible();
  await expect(page.locator(".program-instructions button")).toHaveCount(1);
  await page.locator(".program-instructions button").click();
  await page.getByRole("button", { name: "Reveal this proof" }).click();
  await page.getByText("View original RPC fields").click();
  await expect(page.locator(".peel-json pre")).toContainText("transfer");
  await expect(page.locator(".anatomy-anchor")).toHaveAttribute(
    "data-evidence-id",
    subject!,
  );
});

test("unknown balances remain explicit and tiny fees stay readable at narrow widths", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/tx/demo-design-transfer");
  await expect(
    page.getByRole("button", { name: "Explain the change" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".change-part.fee")).toContainText("−0.000005");
  await page.getByRole("button", { name: "Full balance scale" }).click();
  const fee = page.locator(".waterfall-step.fee");
  await fee.scrollIntoViewIfNeeded();
  await expect(fee).toContainText("−0.000005");
  expect(
    (await fee.locator(".waterfall-bar").boundingBox())!.height,
  ).toBeGreaterThanOrEqual(3);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const raw = syntheticTransfer();
  raw.meta = null;
  const signature =
    "4KxpWzijGzn5HSRNfCWGMpiEXUgKJs3J4qCCzMQoNxGAo2A1Evx9gciScLkqWHcj3Pwwjz5tTcwqgkByD3kzgAHb";
  raw.transaction.signatures = [signature];
  const tx = normalize(raw, {
    kind: "synthetic",
    label: "Synthetic missing-metadata test",
  });
  await page.route(`**/api/transactions/${signature}`, (route) =>
    route.fulfill({ json: tx }),
  );
  await page.goto(`/tx/${signature}`);
  await expect(page.locator(".anchor-outcome")).toContainText("Not determined");
  await expect(page.locator(".anatomy-unknown")).toContainText(
    "isn’t enough balance data",
  );
  await expect(page.locator(".money-waterfall")).toHaveCount(0);
});

test("all three depths remain accessible in light, dark and reduced-motion modes", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/tx/demo-design-transfer");
  for (const theme of ["light", "dark"]) {
    if (theme === "dark")
      await page.getByRole("button", { name: "Use dark theme" }).click();
    for (const label of ["Outcome", "Structure", "Proof"]) {
      await page
        .locator(".depth-stops")
        .getByRole("button", { name: new RegExp(`^${label}`) })
        .click();
      if (label === "Proof")
        await page
          .getByText("Browse the complete transaction record", { exact: true })
          .click();
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        result.violations.map((v) => ({
          rule: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
        `${theme} ${label}`,
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  await page.getByRole("button", { name: "Use light theme" }).click();
  await page
    .getByText("Browse the complete transaction record", { exact: true })
    .click();
  await page.getByRole("heading", { name: "Follow the change." }).click();
  await page.screenshot({
    path: `docs/screenshots/anatomy-proof-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: /^Outcome/ }).click();
  await page.screenshot({
    path: `docs/screenshots/anatomy-outcome-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
});
