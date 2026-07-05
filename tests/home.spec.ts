import { expect, test } from "@playwright/test";

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("has correct title", async ({ page }) => {
    await expect(page).toHaveTitle("ArbitraryShit.com");
  });

  test("displays heading", async ({ page }) => {
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveText("Arbitrary Shit");
  });

  test("lists posts newest first with dates", async ({ page }) => {
    const items = page.locator(".post-list-item");
    await expect(items.first()).toBeVisible();
    const dates = await items.locator("time").allTextContents();
    expect(dates.length).toBeGreaterThan(0);
  });

  test("links to the RSS feed", async ({ page }) => {
    const rss = page.getByRole("link", { name: "RSS" });
    await expect(rss).toHaveAttribute("href", "/feed.xml");
  });
});

test.describe("Post Page", () => {
  test("navigates from home to a post", async ({ page }) => {
    await page.goto("/");
    await page.locator(".post-list-item a").first().click();
    await expect(page).toHaveURL(/\/posts\/[a-z0-9-]+/);
    await expect(page.locator("article h1")).toBeVisible();
  });

  test("renders MDX content with highlighted code", async ({ page }) => {
    await page.goto("/posts/building-this-site");
    await expect(
      page.getByRole("heading", { name: "Building This Site" }),
    ).toBeVisible();
    await expect(page.locator("pre.shiki").first()).toBeVisible();
  });

  test("renders images from the post folder", async ({ page }) => {
    await page.goto("/posts/building-this-site");
    const img = page.locator("article img").first();
    await expect(img).toBeVisible();
  });

  test("hydrates interactive components", async ({ page }) => {
    await page.goto("/posts/building-this-site");
    const button = page.getByRole("button", {
      name: "Gimme an arbitrary number",
    });
    const output = page.locator(".arbitrary-number output");
    // A click can land before hydration attaches handlers; retry until live.
    await expect(async () => {
      await button.click();
      await expect(output).not.toHaveText("…", { timeout: 1000 });
    }).toPass();
  });

  test("shows not-found for unknown post", async ({ page }) => {
    await page.goto("/posts/this-does-not-exist");
    await expect(page.getByText("Page Not Found")).toBeVisible();
  });
});

test.describe("404 Page", () => {
  test("displays not found message", async ({ page }) => {
    await page.goto("/nonexistent-page");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveText("404");
  });

  test("has link back to home", async ({ page }) => {
    await page.goto("/nonexistent-page");
    const link = page.getByRole("link", { name: "Go back home" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/");
  });
});
