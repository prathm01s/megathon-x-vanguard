import { expect, test } from "@playwright/test";

test("welcome screen offers log in / create account (or Continue when signed in)", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("link", { name: /Log in|Continue/ }).first()).toBeVisible();
});

test("Urdu renders right-to-left", async ({ page }) => {
  await page.goto("/ur");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});
