import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("question-first home and genuine live search validation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "What happened on Solana?",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("textbox", {
      name: "Search transaction signature or wallet address",
    })
    .fill("not-a-public-key");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator(".search-caption [role='status']")).toContainText(
    "Paste a complete Solana signature",
  );
  await expect(page).toHaveURL(/\/$/);
});

test("anatomy depths retain selected evidence and perspective", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Explore a real example" }).click();
  await expect(
    page.getByRole("heading", { name: "Follow the change." }),
  ).toBeVisible();
  await expect(
    page.getByText("Recorded mainnet example", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".anatomy-anchor")).toBeVisible();
  await page
    .getByRole("slider", { name: "Exploration depth" })
    .press("ArrowRight");
  await expect(
    page.getByRole("button", { name: /^Structure/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { name: "Follow the connections." }),
  ).toBeVisible();
  if (testInfo.project.name === "desktop") {
    await page.getByRole("button", { name: "Expand graph details" }).click();
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await expect(page.getByText("120%", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Fit graph to view" }).click();
    await expect(page.getByText("100%", { exact: true })).toBeVisible();
    await page
      .locator(".graph-transform")
      .getByRole("button", { name: /account/ })
      .first()
      .click();
  } else await page.locator(".mobile-map-list button").nth(1).click();
  const selectedTitle = await page
    .locator(".sr-only[aria-live='polite']")
    .innerText();
  await page.getByRole("button", { name: /^Proof/ }).click();
  await expect(page.locator(".sr-only[aria-live='polite']")).toHaveText(
    selectedTitle,
  );
  const select = page.getByLabel("Viewing impact for", { exact: true });
  const next = await select.locator("option").nth(1).getAttribute("value");
  await select.selectOption(next!);
  await page.getByRole("button", { name: /^Outcome/ }).click();
  await expect(select).toHaveValue(next!);
  await expect(page.locator(".anatomy-anchor")).toBeVisible();
});

test("failed finalized transaction has fees and no movement arrows", async ({
  page,
}) => {
  await page.goto("/tx/demo-transfer-failed-9");
  await expect(
    page.getByText("Execution failed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Requested asset changes were not committed.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("0.000007388 SOL", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Structure/ }).click();
  await expect(page.locator(".graph-edge.movement")).toHaveCount(0);
  await expect(
    page.getByText(
      "Attempted dependencies, without successful transfer arrows.",
    ),
  ).toBeVisible();
});

test("address comparison checks full public keys and reveals single-character differences", async ({
  page,
}) => {
  await page.goto("/compare");
  await page
    .getByRole("button", { name: "Try a similar-address example" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Different addresses." }),
  ).toBeVisible();
  await expect(page.locator(".character-row .differing")).toHaveCount(2);
  const a = await page
    .getByRole("textbox", { name: "Address A", exact: true })
    .inputValue();
  await page.getByRole("textbox", { name: "Address B", exact: true }).fill(a);
  await page
    .getByRole("button", { name: "Compare addresses", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Exactly the same address." }),
  ).toBeVisible();
  await expect(page.locator(".character-row .differing")).toHaveCount(0);
});

test("evidence raw JSON, copy feedback, theme and responsive screenshots", async ({
  page,
  context,
}, testInfo) => {
  await page.goto("/tx/demo-design-transfer");
  await expect(page.locator(".source-label")).toHaveText(
    "Synthetic design fixture",
  );
  await expect(page.getByText("Amounts reconcile")).toBeVisible();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page
    .getByRole("button", { name: "Copy transaction signature", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Copy transaction signature: copied",
      exact: true,
    }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "synthetic-design-transfer",
  );
  await page.getByRole("button", { name: /^Proof/ }).click();
  await page
    .getByText("Browse the complete transaction record", { exact: true })
    .click();
  await page.getByRole("tab", { name: "Raw JSON", exact: true }).click();
  await expect(page.locator(".raw-view pre")).toContainText("250000000");
  if (testInfo.project.name === "mobile") {
    await page
      .getByRole("button", { name: "Inspect selected evidence" })
      .click();
    await expect(
      page.getByRole("button", { name: "Close evidence inspector" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Close evidence inspector" })
      .click();
  }
  await page.getByRole("button", { name: "Use dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Use light theme" }).click();
  const pages = [
    ["/", "home"],
    ["/tx/demo-swap-success-6", "impact"],
    ["/tx/demo-swap-success-6?layer=connections", "connections"],
    ["/tx/demo-swap-success-6?layer=evidence", "evidence"],
    ["/compare", "compare"],
    ["/tx/demo-transfer-failed-9", "failure"],
  ];
  await mkdir("docs/screenshots", { recursive: true });
  for (const [url, name] of pages) {
    await page.goto(url);
    await expect(page.locator(".loading-state")).toHaveCount(0);
    if (name === "compare")
      await page
        .getByRole("button", { name: "Try a similar-address example" })
        .click();
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow, `${name} should not overflow horizontally`).toBe(false);
    await page.screenshot({
      path: `docs/screenshots/${name}-${testInfo.project.name}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
  if (testInfo.project.name === "mobile") {
    await page.goto("/tx/demo-swap-success-6?layer=evidence");
    await expect(page.locator(".evidence-peel.open")).toBeVisible();
    await page
      .getByRole("button", { name: "Inspect selected evidence" })
      .click();
    await expect(
      page.getByRole("button", { name: "Close evidence inspector" }),
    ).toBeVisible();
    await page.screenshot({
      path: "docs/screenshots/inspector-mobile.png",
      animations: "disabled",
    });
  }
});

test("invalid live transaction returns validation error without example substitution", async ({
  page,
  request,
}) => {
  const response = await request.get("/api/transactions/invalid");
  expect(response.status()).toBe(400);
  await page.goto("/tx/invalid");
  await expect(
    page.getByRole("heading", { name: "That signature doesn’t look right." }),
  ).toBeVisible();
  await expect(
    page.getByText("Recorded mainnet example", { exact: true }),
  ).toHaveCount(0);
});
