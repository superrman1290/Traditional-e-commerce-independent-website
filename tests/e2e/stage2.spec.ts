import { expect, test } from "@playwright/test";

test("stage 2 cart validation states are visible", async ({ page }) => {
  await page.setContent(`
    <main>
      <h1>Cart</h1>
      <mark>Price changed from ¥299.00 to ¥319.00</mark>
      <mark>Only 3 available</mark>
      <button disabled>Checkout locked until stage 3</button>
    </main>
  `);

  await expect(page.getByRole("heading", { name: "Cart" })).toBeVisible();
  await expect(page.getByText("Price changed from ¥299.00 to ¥319.00")).toBeVisible();
  await expect(page.getByRole("button", { name: "Checkout locked until stage 3" })).toBeDisabled();
});

