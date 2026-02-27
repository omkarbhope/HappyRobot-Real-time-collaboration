import { test, expect } from "@playwright/test";

test.describe("Smoke", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Next.js|Create Next App|happyrobot/i);
  });

  test("API health: auth route exists", async ({ request }) => {
    const res = await request.get("/api/auth/providers");
    expect(res.ok()).toBe(true);
  });
});
