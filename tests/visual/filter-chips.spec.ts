import { expect, test } from "@playwright/test";
import { chooseSelectOption, openHarness, openView, tableRow } from "./helpers";

test.describe("filter chips", () => {
  test("shows and clears board status and chip model filters", async ({ page }) => {
    await openHarness(page);
    await openView(page, "Boards");

    await chooseSelectOption(page, "Status", "Unassigned to project");
    await expect(page.getByLabel("Active board filters")).toContainText(
      "Project:Unassigned"
    );
    await expect(tableRow(page, "Sensor Node S3")).toBeHidden();
    await expect(tableRow(page, "Workbench ESP32 DevKit")).toBeVisible();

    await page.getByLabel("Clear Project filter").click();
    await expect(page.getByLabel("Active board filters")).toBeHidden();
    await expect(tableRow(page, "Sensor Node S3")).toBeVisible();

    await chooseSelectOption(page, "Chip model", "ESP32-S3");
    await expect(page.getByLabel("Active board filters")).toContainText(
      "Chip model:ESP32-S3"
    );
    await expect(tableRow(page, "Sensor Node S3")).toBeVisible();
    await expect(tableRow(page, "Workbench ESP32 DevKit")).toBeHidden();

    await page.getByLabel("Clear Chip model filter").click();
    await expect(page.getByLabel("Active board filters")).toBeHidden();
  });

  test("keeps combined board filters clear and individually removable", async ({
    page
  }) => {
    await openHarness(page);
    await openView(page, "Boards");

    await page
      .locator(".board-toolbar")
      .getByRole("textbox", { name: "Search" })
      .fill("Workbench");
    await chooseSelectOption(page, "Status", "In use");
    await chooseSelectOption(page, "Chip model", "ESP32");

    const activeFilters = page.getByLabel("Active board filters");
    await expect(activeFilters).toContainText("Status:In use");
    await expect(activeFilters).toContainText("Chip model:ESP32");
    await expect(tableRow(page, "Workbench ESP32 DevKit")).toBeVisible();
    await expect(tableRow(page, "Sensor Node S3")).toBeHidden();

    await page.getByLabel("Clear Status filter").click();
    await expect(activeFilters).not.toContainText("Status:In use");
    await expect(activeFilters).toContainText("Chip model:ESP32");
    await expect(tableRow(page, "Workbench ESP32 DevKit")).toBeVisible();

    await page.getByLabel("Clear Chip model filter").click();
    await expect(activeFilters).toBeHidden();
    await expect(tableRow(page, "Workbench ESP32 DevKit")).toBeVisible();
    await expect(tableRow(page, "Sensor Node S3")).toBeHidden();
  });

  test("shows and clears project status filters", async ({ page }) => {
    await openHarness(page);
    await openView(page, "Projects");

    await chooseSelectOption(page, "Status", "Needs repair");
    await expect(page.getByLabel("Active project filters")).toContainText(
      "Status:Needs repair"
    );
    await expect(tableRow(page, "Greenhouse Controller")).toBeVisible();
    await expect(tableRow(page, "Garage Monitor")).toBeHidden();

    await page.getByLabel("Clear Status filter").click();
    await expect(page.getByLabel("Active project filters")).toBeHidden();
    await expect(tableRow(page, "Garage Monitor")).toBeVisible();
  });
});
