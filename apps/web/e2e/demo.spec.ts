import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { expect, test } from "@playwright/test";

// Same env as the app (root .env.local), to know which room backend is running.
loadEnvConfig(resolve(__dirname, "../../.."), true, { info: () => {}, error: console.error });
const mockRooms = process.env.NEXT_PUBLIC_ROOM_BACKEND !== "supabase";

test.describe("Full Hackathon Demo Path (§13)", () => {
  test("Complete student journey: Mindset Check -> Persona -> Ladder -> Chapter 2 Gameplay", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    // 1. Welcome Screen
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.getByRole("link", { name: /student/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /ngo/i })).toBeVisible();

    // 2. Student Onboarding / Join Page
    await page.goto("/en/join");
    await expect(page.getByText("Start Your Journey")).toBeVisible();
    await expect(page.getByText("STUDENT CODE", { exact: true })).toBeVisible();

    // 3. Money Mindset Pre-Check
    await page.goto("/en/mindset");
    const startMindsetBtn = page.getByRole("button", { name: /Let's go|start/i });
    await expect(startMindsetBtn).toBeVisible();
    await startMindsetBtn.click();

    // Answer all 6 questions sequentially
    for (let q = 1; q <= 6; q++) {
      await expect(page.getByText(new RegExp(`Question ${q} of 6`, "i"))).toBeVisible();
      const option = page.locator("section ul li button").first();
      await option.click();
    }

    // 4. Persona Reveal Screen
    await expect(page).toHaveURL(/\/en\/persona$/, { timeout: 10_000 });
    await expect(
      page.getByText(/Your money style|Your strength|Watch out for/i).first(),
    ).toBeVisible();

    // 5. Navigate to Life Ladder
    const ladderLink = page.getByRole("link", { name: /See my Life Ladder|Life Ladder/i });
    await expect(ladderLink).toBeVisible();
    await ladderLink.click();
    await expect(page).toHaveURL(/\/en\/ladder$/);
    await expect(page.getByRole("heading", { name: "Friends' Room" })).toBeVisible();

    // 6. Chapter 2 (ch2-first-job) Intro
    await page.goto("/en/chapter/ch2-first-job");
    await expect(page.getByText(/Fixed costs every month|You start with/i).first()).toBeVisible();

    // 7. Start Chapter 2 & Play Turn
    const startChapterBtn = page.getByRole("button", { name: /Start chapter/i });
    await expect(startChapterBtn).toBeVisible();
    await startChapterBtn.click();

    await expect(page).toHaveURL(/\/en\/play$/);
    await expect(page.getByText(/Cash|Wallet/i).first()).toBeVisible();

    // Toss the coin to advance turn (force click to bypass dev tools floating button overlay)
    const tossBtn = page.getByRole("button", { name: /Toss the coin/i });
    await expect(tossBtn).toBeVisible();
    await tossBtn.click({ force: true });

    // 8. Multiplayer Classroom. The ready-made room TOSS42 exists only in the mock room backend;
    // the real server is covered by demo-supabase.spec.ts.
    await page.goto("/en/room");
    await expect(page.getByText("Multiplayer Classroom")).toBeVisible();
    await expect(page.getByText("Peer Lending & Trust Score")).toBeVisible();
    if (mockRooms) {
      const joinRoomBtn = page.getByRole("button", { name: /join/i });
      await joinRoomBtn.click();
      await expect(page).toHaveURL(/\/en\/room\/TOSS42$/);
      await expect(page.getByText(/TOSS42/i).first()).toBeVisible();
    }

    // 9. Student Profile
    await page.goto("/en/profile");
    await expect(page.getByText(/Player ID/i)).toBeVisible();
    await expect(page.getByText(/TL-/i).first()).toBeVisible();
  });

  test("NGO Admin Portal: cohort management, code generator, and printable slips", async ({
    page,
  }) => {
    await page.goto("/en/admin");
    await expect(page.getByText("NGO Facilitator Portal")).toBeVisible();

    // Verify Admin Log In vs Register toggling
    const registerBtn = page.getByRole("button", { name: /Register New NGO/i });
    await registerBtn.click();
    await expect(page.getByText("ORGANISATION NAME")).toBeVisible();

    const loginBtn = page.getByRole("button", { name: /Admin Log In/i });
    await loginBtn.click();
    await expect(page.getByText("ADMIN EMAIL")).toBeVisible();
  });
});
