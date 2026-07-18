import { test, expect } from "@playwright/test";

test("stage 0 e2e placeholder is wired", async ({ page }) => {
  await page.setContent("<main><h1>Stage 0</h1></main>");
  await expect(page.getByRole("heading", { name: "Stage 0" })).toBeVisible();
});

