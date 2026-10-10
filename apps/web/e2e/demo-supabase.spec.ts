import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { expect, test, type Page } from "@playwright/test";

// The demo script (§13) against a real Supabase backend: NGO admin generates a Student Code →
// a student redeems it → Money Mindset Check → persona → plays Chapter 2 to the Life Report →
// the admin sees them in the dashboard. Needs local Supabase (`pnpm db:start && pnpm db:env`)
// or a deployed project; skipped in mock mode.
// Owner: Samarth (full-stack integration check).
loadEnvConfig(resolve(__dirname, "../../.."), true, { info: () => {}, error: console.error });

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "facilitator@demo.tosslife.invalid";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "TossLifeDemo-2026";

test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "needs Supabase (pnpm db:start && pnpm db:env)");
test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);

let code = "";
const nickname = `Demo${Date.now().toString(36).slice(-4)}`;

// Typing before React hydrates loses the value (dev mode compiles slowly), so retry until it sticks.
async function fill(page: Page, selector: string, value: string) {
  const input = page.locator(selector).first();
  await expect(async () => {
    await input.fill(value);
    await expect(input).toHaveValue(value, { timeout: 1_000 });
  }).toPass({ timeout: 60_000 });
}

async function adminLogin(page: Page) {
  await page.goto("/en/admin");
  await page.waitForLoadState("networkidle");
  await fill(page, 'input[placeholder="admin@ngo.org"]', ADMIN_EMAIL);
  await fill(page, 'input[type="password"]', ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Log In to Dashboard" }).click();
  await expect(page.getByRole("button", { name: "Codes & Seats" })).toBeVisible({
    timeout: 60_000,
  });
}

test("1. NGO admin generates a Student Code", async ({ page }) => {
  await adminLogin(page);
  await page.getByRole("button", { name: "Codes & Seats" }).click();
  await fill(page, 'input[type="number"]', "1");
  await page.getByRole("button", { name: /Generate 1 Codes?/ }).click();
  const box = page.getByText("New Codes Generated:").locator("..");
  await expect(box).toContainText(/[A-Z2-9]{4}-[A-Z2-9]{4}/, { timeout: 30_000 });
  code = (await box.innerText()).match(/[A-Z2-9]{4}-[A-Z2-9]{4}/)![0];
});

test("2–4. student redeems the code, takes the Mindset Check and plays Chapter 2", async ({
  page,
}) => {
  expect(code, "step 1 must run first").not.toBe("");
  await page.goto("/en/join");
  await page.waitForLoadState("networkidle");
  await fill(page, 'input[placeholder="XXXX-XXXX"]', code);
  await fill(page, 'input[placeholder="e.g. Sunny or Priya"]', nickname);
  await fill(page, 'input[placeholder="At least 4 characters"]', "demo-pass-1");
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL(/\/mindset/, { timeout: 90_000 });

  // Money Mindset Check: six cards, one answer each.
  await page.getByRole("button", { name: "Let's go" }).click();
  for (let i = 0; i < 6; i++) {
    await expect(page.getByText(`Question ${i + 1} of 6`)).toBeVisible();
    await page.locator("ul[role=list] button").last().click();
  }
  await page.waitForURL(/\/persona/, { timeout: 60_000 });
  await expect(page.getByText("Your money style")).toBeVisible();

  await page
    .getByRole("link", { name: "See my Life Ladder" })
    .or(page.getByRole("button", { name: "See my Life Ladder" }))
    .click();
  await page.waitForURL(/\/ladder/, { timeout: 60_000 });
  await page
    .getByRole("link", { name: /^Play/ })
    .or(page.getByRole("button", { name: /^Play/ }))
    .first()
    .click();
  await page.getByRole("button", { name: "Start chapter" }).click({ timeout: 60_000 });

  // Turn loop: toss until the chapter ends, answering any scam and closing each toss summary.
  const gotIt = page.getByRole("button", { name: "Got it" });
  for (let turn = 0; turn < 8; turn++) {
    if (await page.getByRole("button", { name: "See my Life Report" }).isVisible()) break;
    if (await gotIt.isVisible()) await gotIt.click();
    await page.getByRole("button", { name: "Toss the coin" }).click({ timeout: 30_000 });
    for (let step = 0; step < 6; step++) {
      const cont = page.getByRole("button", { name: "Continue" });
      const scam = page.getByText("What do you do?");
      await expect(cont.or(scam)).toBeVisible({ timeout: 30_000 });
      if (await scam.isVisible()) {
        await page.getByRole("dialog").getByRole("button").last().click();
        await page.getByRole("dialog").getByRole("button").last().click();
        continue;
      }
      await cont.click();
      break;
    }
  }
  await page.getByRole("button", { name: "See my Life Report" }).click();
  await expect(page.getByText("Financial Health Score")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("What if…")).toBeVisible();
});

test("6. the admin sees the new student", async ({ page }) => {
  await adminLogin(page);
  await page.getByRole("button", { name: "Students" }).click();
  await expect(page.getByText(nickname)).toBeVisible({ timeout: 30_000 });
});
