import { expect, test } from "@playwright/test";
import { openHarness, openView, openViewFromTemporaryNav } from "./helpers";

test.describe("app smoke", () => {
  test("navigates primary renderer views and toggles theme", async ({ page }) => {
    await openHarness(page);

    await openView(page, "Boards");
    await openView(page, "Projects");
    await openView(page, "Settings");

    const html = page.locator("html");
    const initialTheme = await html.getAttribute("data-vault-theme");
    const nextTheme = initialTheme === "dark" ? "light" : "dark";
    const toggleLabel =
      initialTheme === "dark" ? "Switch to light mode" : "Switch to dark mode";

    await page.getByLabel(toggleLabel).click();
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
});
