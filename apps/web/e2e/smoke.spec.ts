import { expect, test } from "@playwright/test";

test("welcome screen offers the student and NGO paths", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("link", { name: "I am a student" })).toBeVisible();
  await expect(page.getByRole("link", { name: "I am an NGO" })).toBeVisible();
});

test("Urdu renders right-to-left", async ({ page }) => {
  await page.goto("/ur");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});
