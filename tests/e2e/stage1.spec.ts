import { expect, test } from "@playwright/test";

test("stage 1 e2e wiring is available", async ({ page }) => {
  await page.setContent("<main><h1>Product catalog</h1></main>");
  await expect(page.getByRole("heading", { name: "Product catalog" })).toBeVisible();
});
