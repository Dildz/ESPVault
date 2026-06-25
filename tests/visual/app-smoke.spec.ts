import { expect, test } from "@playwright/test";
import { openHarness, openView, openViewFromTemporaryNav } from "./helpers";

test.describe("app smoke", () => {
  test("navigates primary renderer views and switches theme", async ({ page }) => {
    await openHarness(page);

    await openView(page, "Boards");
    await openView(page, "Projects");
    await openView(page, "Settings");

    const html = page.locator("html");
    const initialTheme = await html.getAttribute("data-vault-theme");
    const nextTheme = initialTheme === "dark" ? "light" : "dark";
    const targetLabel = initialTheme === "dark" ? "Vault Light" : "Slate Dark";

    await page.locator(".theme-select").click();
    await page.getByRole("option", { name: targetLabel }).click();
    await expect(html).toHaveAttribute("data-vault-theme", nextTheme);
  });

  test("keeps navigation usable at a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 820 });
    await openHarness(page);

    await openViewFromTemporaryNav(page, "Boards");
    await expect(page.locator(".page-header")).toContainText("Add board");

    await openViewFromTemporaryNav(page, "Projects");
    await expect(page.locator(".page-header")).toContainText("Add project");
  });

  test("places vault activity legend below the heatmap squares", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await openHarness(page);

    const summaryCards = page.locator(".vault-activity-summary-card");
    const legend = page.locator(".activity-heatmap-legend");
    const heatmap = page.locator(".activity-heatmap-scroll");
    const grid = page.locator(".activity-heatmap-grid");
    const weeks = page.locator(".activity-heatmap-weeks");

    await expect(summaryCards).toHaveCount(3);
    await expect(legend).toBeVisible();
    await expect(heatmap).toBeVisible();
    await expect(grid).toBeVisible();
    await expect(weeks).toBeVisible();

    const legendBox = await legend.boundingBox();
    const gridBox = await grid.boundingBox();
    const weeksBox = await weeks.boundingBox();

    expect(legendBox).not.toBeNull();
    expect(gridBox).not.toBeNull();
    expect(weeksBox).not.toBeNull();
    expect(legendBox!.y).toBeGreaterThan(gridBox!.y + gridBox!.height - 1);
    expect(legendBox!.x).toBeGreaterThanOrEqual(weeksBox!.x - 1);
    expect(legendBox!.x).toBeLessThan(weeksBox!.x + 12);
  });

  test("applies the configured stale scan threshold on the dashboard", async ({
    page
  }) => {
    await openHarness(page);
    await openView(page, "Settings");

    const thresholdInput = page.getByRole("spinbutton", {
      name: "Stale scan threshold"
    });

    await expect(thresholdInput).toHaveValue("180");
    await thresholdInput.fill("90");
    await page.getByRole("button", { name: "Save threshold" }).click();
    await expect(page.getByText("Stale scan threshold saved.")).toBeVisible();

    await openView(page, "Dashboard");
    await expect(page.getByText("Last 90 days")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("banner")).toContainText("Dashboard");
    await expect(page.getByText("Last 90 days")).toBeVisible();
  });
});
