import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const signature =
  "4KxpWzijGzn5HSRNfCWGMpiEXUgKJs3J4qCCzMQoNxGAo2A1Evx9gciScLkqWHcj3Pwwjz5tTcwqgkByD3kzgAHb";
const payer = "7TW6enXwhzJF8XMAQ91GRx8MkdogTXVqy8uWkPc89o44";
const mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

test("a selected token uses token units in the inspector", async ({
  page,
}, info) => {
  await page.goto("/tx/demo-token-success-12");
  await expect(page.locator(".asset-card")).toHaveCount(1);
  await page.locator(".asset-card").click();
  if (info.project.name === "mobile")
    await page
      .getByRole("button", { name: "Inspect selected evidence" })
      .click();
  const inspector = page.locator(".inspector");
  await expect(inspector.locator("h2")).toContainText("USDC");
  await expect(inspector.locator(".inspector-stats")).toContainText(
    "USDC · 6 decimals",
  );
  await expect(inspector.locator(".inspector-stats")).not.toContainText("SOL");
  await page.screenshot({
    path: `docs/screenshots/audit-token-inspector-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
});

test("deep links restore instruction evidence and wallet perspective", async ({
  page,
  context,
}) => {
  await page.goto(
    `/tx/demo-swap-success-6?layer=evidence&account=${payer}&focus=ix%3A0`,
  );
  await expect(
    page.getByRole("tab", { name: "Instructions", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".instruction-row.selected")).toHaveCount(1);
  const selected = await page
    .locator(".sr-only[aria-live='polite']")
    .innerText();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page
    .getByRole("button", { name: "Copy link to this view", exact: true })
    .click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(link).searchParams.get("focus")).toBe("ix:0");
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "Instructions", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByLabel("Viewing impact for", { exact: true }),
  ).toHaveValue(payer);
  await expect(page.locator(".sr-only[aria-live='polite']")).toHaveText(
    selected,
  );
});

test("mobile inspector is a keyboard modal with focus restoration", async ({
  page,
}, info) => {
  await page.goto("/tx/demo-design-transfer");
  await expect(page.getByText("Amounts reconcile")).toBeVisible();
  if (info.project.name === "mobile") {
    const trigger = page.getByRole("button", {
      name: "Inspect selected evidence",
    });
    await trigger.click();
    await expect(
      page.getByRole("dialog", { name: "Transaction evidence inspector" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Close evidence inspector" }),
    ).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(page.locator(".inspector-action")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Close evidence inspector" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  } else {
    await expect(page.locator(".inspector")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
});

test("theme persists across a reload and account comparison can be prefilled", async ({
  page,
}) => {
  await page.goto(`/compare?a=${mint}`);
  await expect(
    page.getByRole("textbox", { name: "Address A", exact: true }),
  ).toHaveValue(mint);
  await page.getByRole("button", { name: "Use dark theme" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: "Use light theme" }),
  ).toBeVisible();
});

test("wrong-network links and provider failures never become a demo", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("textbox", {
      name: "Search transaction signature or wallet address",
    })
    .fill(`https://solscan.io/tx/${signature}?cluster=devnet`);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator(".search-caption")).toContainText(
    "another network",
  );
  await page.route(`**/api/transactions/${signature}`, (route) =>
    route.fulfill({
      status: 503,
      json: {
        kind: "history-unavailable",
        error:
          "The provider knows this signature but its archival details are unavailable.",
      },
    }),
  );
  await page.goto(`/tx/${signature}`);
  await expect(
    page.getByText(
      "The provider knows this signature but its archival details are unavailable.",
    ),
  ).toBeVisible();
  await expect(page.locator(".source-label")).toHaveCount(0);
});

test("account history retains available data and pages older activity", async ({
  page,
}) => {
  await page.route(`**/api/accounts/${payer}*`, (route) => {
    const older = new URL(route.request().url()).searchParams.has("before");
    return route.fulfill({
      json: {
        address: payer,
        account: null,
        accountAvailable: false,
        historyAvailable: true,
        warnings: [
          "Account details are unavailable; available history is shown independently.",
        ],
        signatures: [
          {
            signature: !older
              ? signature
              : "3JeVFqF2qrVPvhciy6hVHF7Bv4NQhuYvkGVkE6nWh2KsLVHedsFi2AFRRyFVwr5PMENgyfsJYjfVorM7zL7f8yfL",
            slot: 460332494,
            blockTime: 1792735123,
            err: null,
          },
        ],
        nextCursor: !older ? signature : null,
      },
    });
  });
  await page.goto(`/account/${payer}`);
  await expect(
    page.getByText("ACCOUNT DETAILS UNAVAILABLE", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".account-history a")).toHaveCount(1);
  await page.getByRole("button", { name: "Load older activity" }).click();
  await expect(page.locator(".account-history a")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Load older activity" }),
  ).toHaveCount(0);
});

test("key screens pass automated WCAG A/AA checks", async ({ page }) => {
  for (const path of ["/", "/tx/demo-design-transfer", "/compare"]) {
    await page.goto(path);
    await expect(page.locator(".loading-state")).toHaveCount(0);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        rule: v.id,
        impact: v.impact,
        elements: v.nodes.map((n) => n.target),
      })),
      `Accessibility issues at ${path}`,
    ).toEqual([]);
  }
});
