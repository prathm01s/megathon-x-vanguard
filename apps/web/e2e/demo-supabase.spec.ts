import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { expect, test, type Page } from "@playwright/test";

// The demo script (§13) against a real Supabase backend: the NGO admin generates a Student
// Code → a student redeems it → Money Mindset Check → persona → plays Chapter 2 to the Life
// Report → the admin sees them in the dashboard. Needs local Supabase (`pnpm db:start`,
// `pnpm db:env`) or a deployed project; skipped in mock mode.
// Owner: Samarth (full-stack integration check).
loadEnvConfig(resolve(__dirname, "../../.."), true, { info: () => {}, error: console.error });

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "facilitator@demo.tosslife.invalid";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "TossLifeDemo-2026";

test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "needs Supabase (pnpm db:start && pnpm db:env)");
test.describe.configure({ mode: "serial" });
test.setTimeout(600_000); // the dev server compiles each screen on first visit

let code = "";
const nickname = `Demo${Date.now().toString(36).slice(-4)}`;

// The dev server can reload a page once while it compiles, clearing anything typed before the
// reload. Fill every field of a form, then re-check them all, retrying until they stick.
async function fillAll(page: Page, fields: [selector: string, value: string][]) {
  await expect(async () => {
    for (const [sel, value] of fields) await page.locator(sel).first().fill(value);
    await page.waitForTimeout(500);
    for (const [sel, value] of fields) await expect(page.locator(sel).first()).toHaveValue(value);
  }).toPass({ timeout: 60_000 });
}

async function adminLogin(page: Page) {
  await page.goto("/en/login");
  await page.waitForLoadState("networkidle");
  await fillAll(page, [
    ['input[type="email"]', ADMIN_EMAIL],
    ['input[type="password"]', ADMIN_PASSWORD],
  ]);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("button", { name: "Codes & Seats" })).toBeVisible({
    timeout: 60_000,
  });
}

test("1. NGO admin generates a Student Code", async ({ page }) => {
  await adminLogin(page);
  await page.getByRole("button", { name: "Codes & Seats" }).click();
  await fillAll(page, [['input[type="number"]', "1"]]);
  await page.getByRole("button", { name: /Generate 1 Codes?/ }).click();
  const box = page.getByText("New Codes Generated:").locator("../..");
  await expect(box).toContainText(/[A-Z2-9]{4}-[A-Z2-9]{4}/, { timeout: 30_000 });
  code = (await box.innerText()).match(/[A-Z2-9]{4}-[A-Z2-9]{4}/)![0];
});

test("2–4. student signs up, joins with the code, takes the Mindset Check and plays Chapter 2", async ({
  page,
}) => {
  expect(code, "step 1 must run first").not.toBe("");
  // Sign up with email + password, then set up the profile with the NGO's code.
  await page.goto("/en/signup");
  await page.waitForLoadState("networkidle");
  await fillAll(page, [
    ['input[type="email"]', `${nickname.toLowerCase()}@example.com`],
    ['input[type="password"]', "demo-pass-1"],
  ]);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("heading", { name: "Set up your profile" }).waitFor({ timeout: 90_000 });
  await fillAll(page, [
    ['input[placeholder="e.g. Sunny"]', nickname],
    ['input[placeholder="XXXX-XXXX"]', code],
  ]);
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.waitForURL(/\/mindset/, { timeout: 90_000 });

  // Money Mindset Check. These answers (plan 4, risk 0, know 6) give the Smart Planner,
  // who starts in Chapter 2 — the chapter of the demo script.
  await page.getByRole("button", { name: "Let's go" }).click();
  for (const pick of ["last", "last", "first", "last", "last", "last"] as const) {
    const options = page.locator("ul[role=list] button");
    await options.first().waitFor();
    await (pick === "first" ? options.first() : options.last()).click();
  }
  await page.waitForURL(/\/persona/, { timeout: 60_000 });
  await expect(page.getByText("Smart Planner").first()).toBeVisible();

  await page.getByText("See my Life Ladder").click();
  await page.waitForURL(/\/ladder/, { timeout: 60_000 });
  await page.goto("/en/chapter/ch2-first-job");
  await page.getByRole("button", { name: "Start chapter" }).click({ timeout: 60_000 });
  await page.waitForURL(/\/play/, { timeout: 60_000 });

  // Toss through all five years, closing each toss summary and answering any scam safely
  // (the last choice on a scam card is the safe one: ignore / report / don't install).
  const gotIt = page.getByRole("button", { name: "Got it" });
  const seeReport = page.getByRole("button", { name: "See my Life Report" });
  const toss = page.getByRole("button", { name: "Toss the coin" });
  const cont = page.getByRole("button", { name: "Continue" });
  const scamCard = page
    .locator("div")
    .filter({ has: page.getByText("What do you do?") })
    .last();
  // Done when the report button shows and no pop-up is open. The button appears while the last
  // coin is still in the air, before that summary's Continue button exists.
  const overlay = page.locator("div.fixed.inset-0");
  const done = async () => (await seeReport.isVisible()) && (await overlay.count()) === 0;
  for (let step = 0; step < 80 && !(await done()); step++) {
    await expect(cont.or(gotIt).or(seeReport).or(toss).or(scamCard).first()).toBeVisible({
      timeout: 30_000,
    });
    // Short click timeouts: while the coin animates, the summary covers the page and its
    // Continue button isn't there yet, so just try again on the next pass.
    const quick = { timeout: 2_000 };
    const click = (l: typeof toss) => l.click(quick).catch(() => {});
    if (await cont.first().isVisible()) await click(cont.first());
    else if (await gotIt.isVisible()) await click(gotIt);
    else if (await scamCard.isVisible()) await click(scamCard.getByRole("button").last());
    else if (await toss.isVisible()) await click(toss);
    await page.waitForTimeout(500);
  }
  await seeReport.click();
  await expect(page.getByText("Chapter complete").first()).toBeVisible({ timeout: 60_000 });
  // §13 step 4: the Life Report with a "What if" replay and the Gyaan Check.
  await expect(page.getByRole("heading", { name: "What if…" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gyaan Check" })).toBeVisible();

  // §13 step 5: a Friends' Room with 1 human + bots on the real room server.
  await page.goto("/en/room");
  await page.getByRole("button", { name: "Create a Chapter 2 room" }).click({ timeout: 60_000 });
  await page.waitForURL(/\/room\/[A-Z0-9]{6}$/, { timeout: 60_000 });
  await page.getByRole("button", { name: /Start Chapter/ }).click({ timeout: 60_000 });
  await expect(page.getByText("Year 1 of 5")).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Submit Turn Decisions" }).click();
  await expect(page.getByText("Year 2 of 5")).toBeVisible({ timeout: 60_000 });
});

test("6. the admin sees the new student", async ({ page }) => {
  await adminLogin(page);
  await page.getByRole("button", { name: "Students" }).click();
  await expect(page.getByText(nickname)).toBeVisible({ timeout: 30_000 });
});
