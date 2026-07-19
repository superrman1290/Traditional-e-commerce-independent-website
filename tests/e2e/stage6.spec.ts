import { expect, test } from "@playwright/test";

test("stage 6 after-sales and marketing states are visible", async ({ page }) => {
  await page.setContent(`
    <main>
      <h1>Support And Offers</h1>
      <button>Favorite</button>
      <button>Submit after-sales</button>
      <button>Subscribe</button>
      <button>Send</button>
      <p>Coupons and campaigns</p>
      <p>Common questions</p>
      <p>Cart reminder scheduled.</p>
    </main>
  `);

  await expect(page.getByRole("heading", { name: "Support And Offers" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Favorite" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit after-sales" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Subscribe" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
  await expect(page.getByText("Coupons and campaigns")).toBeVisible();
  await expect(page.getByText("Common questions")).toBeVisible();
});
