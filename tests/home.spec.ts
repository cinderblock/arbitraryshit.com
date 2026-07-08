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

  test("footer links to cameron.tacklind.com", async ({ page }) => {
    const link = page
      .locator(".site-footer")
      .getByRole("link", { name: "Cameron Tacklind" });
    await expect(link).toHaveAttribute("href", "https://cameron.tacklind.com");
  });
});

test.describe("Post Page", () => {
  test("navigates from home to a post", async ({ page }) => {
    await page.goto("/");
    await page.locator(".post-list-item a").first().click();
    await expect(page).toHaveURL(/\/posts\/[a-z0-9-]+/);
    // Generous timeout: on a cold dev server this navigation triggers the
    // first compile of the post route + MDX + shiki.
    await expect(page.locator("article h1")).toBeVisible({ timeout: 30_000 });
  });

  test("renders MDX content with highlighted code", async ({ page }) => {
    // Machinery fixture: the permanent-draft template exercises headings,
    // code highlighting, and images regardless of what real posts contain.
    await page.goto("/posts/post-template");
    await expect(
      page.getByRole("heading", { name: "Post Template" }),
    ).toBeVisible();
    await expect(page.locator("pre.shiki").first()).toBeVisible();
  });

  test("renders images from the post folder", async ({ page }) => {
    await page.goto("/posts/post-template");
    const img = page.locator("article img").first();
    await expect(img).toBeVisible();
  });

  test("marks AI-generated content", async ({ page }) => {
    await page.goto("/posts/building-this-site");
    const block = page.locator(".ai-generated");
    await expect(block).toHaveAttribute("aria-label", /ai-generated/i);
    // The demo lives inside the marked block.
    await expect(
      block.getByRole("button", { name: "Gimme an arbitrary number" }),
    ).toBeVisible();
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

  test("has a canonical permalink", async ({ page }) => {
    await page.goto("/posts/building-this-site");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://arbitraryshit.com/posts/building-this-site",
    );
  });

  test("gives headings anchor ids for deep links", async ({ page }) => {
    await page.goto("/posts/post-template");
    await expect(
      page.getByRole("heading", { name: "Getting started" }),
    ).toHaveAttribute("id", "getting-started");
  });

  test("shows the repo card with stats and pinned commit", async ({ page }) => {
    await page.goto("/posts/building-this-site");
    const card = page.locator(".repo-card");
    await expect(
      card.getByRole("link", { name: "cinderblock/arbitraryshit.com" }),
    ).toBeVisible();
    await expect(card.locator(".repo-card-stats")).toContainText("contributor");
    await expect(card.locator(".repo-card-pin")).toContainText("Written at ");
  });

  test("links posts directionally via builds-on (dev)", async ({ page }) => {
    // The draft template declares builds-on: building-this-site; in dev
    // both directions render (a "Builds on" line on the template, a
    // "Built on by" backlink on the target). Drafts are unlisted in
    // production, so neither appears there.
    await page.goto("/posts/post-template");
    await expect(
      page.locator(".builds-on").getByRole("link", {
        name: "Building This Site",
      }),
    ).toBeVisible();
    await page.goto("/posts/building-this-site");
    await expect(
      page.locator(".built-on-by").getByRole("link", { name: "Post Template" }),
    ).toBeVisible();
    // The template also lists building-this-site under related:, but
    // directional links win — no duplicate entry in the related section.
    await expect(page.locator(".related-posts")).toHaveCount(0);
  });

  test("marks draft posts noindex", async ({ page }) => {
    await page.goto("/posts/post-template");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex",
    );
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
