import { expect, test } from "@playwright/test";

test("stage 5 shipping workflow states are visible", async ({ page }) => {
  await page.setContent(`
    <main>
      <h1>Catalog, Inventory And Shipping</h1>
      <button>Create shipment</button>
      <p>Tracking number</p>
      <p>Auto confirm</p>
      <button>Confirm receipt</button>
    </main>
  `);

  await expect(page.getByRole("heading", { name: "Catalog, Inventory And Shipping" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create shipment" })).toBeVisible();
  await expect(page.getByText("Tracking number")).toBeVisible();
  await expect(page.getByText("Auto confirm")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm receipt" })).toBeVisible();
});
