import { expect, type Locator, type Page } from "@playwright/test";

type AppView = "Boards" | "Projects" | "Settings";

export async function openHarness(page: Page): Promise<void> {
  await page.goto("/browser-harness.html");
  await expect(page.getByRole("banner")).toContainText("Dashboard");
}

export async function openView(page: Page, name: AppView): Promise<void> {
  await page.getByText(name, { exact: true }).first().click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}

export async function openViewFromTemporaryNav(
  page: Page,
  name: AppView
): Promise<void> {
  await page.getByLabel("Open navigation").click();
  await page.getByText(name, { exact: true }).first().click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}

export async function chooseSelectOption(
  page: Page,
  label: string,
  option: string,
  scope?: Locator
): Promise<void> {
  const select = scope
    ? scope.getByLabel(label, { exact: true })
    : page.getByLabel(label, { exact: true });

  await select.click({ force: true });
  await page.getByRole("option", { name: option, exact: true }).click();
}

export async function chooseSelectOptionContaining(
  page: Page,
  select: Locator,
  optionText: string
): Promise<void> {
  await select.click({ force: true });
  await page.getByRole("option").filter({ hasText: optionText }).first().click();
}

export function tableRow(page: Page, text: string): Locator {
  return page.getByRole("row").filter({ hasText: text });
}
