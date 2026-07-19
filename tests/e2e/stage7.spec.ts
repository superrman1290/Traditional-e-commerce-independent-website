import { expect, test } from "@playwright/test";

test("stage 7 analytics and launch readiness states are visible", async ({ page }) => {
  await page.setContent(`
    <main>
      <h1>Operations, Analytics And Launch</h1>
      <h2>Analytics</h2>
      <p>Revenue and conversion</p>
      <p>Product sales ranking</p>
      <p>Traffic source analysis</p>
      <h2>Launch readiness</h2>
      <p>Security checklist</p>
      <p>Database backup</p>
      <a href="/privacy">Privacy policy</a>
      <a href="/terms">User agreement</a>
    </main>
  `);

  await expect(page.getByRole("heading", { name: "Operations, Analytics And Launch" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Analytics", exact: true })).toBeVisible();
  await expect(page.getByText("Revenue and conversion")).toBeVisible();
  await expect(page.getByText("Product sales ranking")).toBeVisible();
  await expect(page.getByText("Traffic source analysis")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Launch readiness" })).toBeVisible();
  await expect(page.getByText("Security checklist")).toBeVisible();
  await expect(page.getByText("Database backup")).toBeVisible();
  await expect(page.getByRole("link", { name: "Privacy policy" })).toBeVisible();
  await expect(page.getByRole("link", { name: "User agreement" })).toBeVisible();
});
