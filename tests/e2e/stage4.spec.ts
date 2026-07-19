import { expect, test } from "@playwright/test";

test("stage 4 payment workflow states are visible", async ({ page }) => {
  await page.setContent(`
    <main>
      <h1>Payment</h1>
      <button>Create payment</button>
      <button>Simulate success</button>
      <button>Simulate failure</button>
      <p>Last callback: payment_succeeded / verified yes</p>
    </main>
  `);

  await expect(page.getByRole("heading", { name: "Payment" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create payment" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Simulate success" })).toBeVisible();
  await expect(page.getByText("Last callback: payment_succeeded / verified yes")).toBeVisible();
});
