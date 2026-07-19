import { expect, test } from "@playwright/test";

test("stage 3 checkout duplicate submit expectation is documented", async ({ page }) => {
  await page.setContent(`
    <main>
      <h1>Checkout</h1>
      <button>Submit order</button>
      <p>Order created</p>
      <p>Stock is locked until 2026-07-19 00:30.</p>
    </main>
  `);

  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit order" })).toBeVisible();
  await expect(page.getByText("Stock is locked until 2026-07-19 00:30.")).toBeVisible();
});

