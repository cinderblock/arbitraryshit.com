import { expect, test } from "@playwright/test";

// Covers the discovery/reading features layered on top of the core machinery:
// reading time, tags + tag pages, the archive, prev/next nav, and the TOC.
// Uses the permanent-draft template (listed in dev) as a stable fixture where
// real-post content would otherwise drift.

test.describe("Reading time", () => {
  test("shows a reading-time byline on the home list", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".post-meta").first()).toContainText("min read");
  });

  test("shows a reading-time byline on a post", async ({ page }) => {
    await page.goto("/posts/building-this-site");
    await expect(page.locator(".post-header .post-meta")).toContainText(
      "min read",
    );
  });
});

test.describe("Tags", () => {
  test("shows tag chips on the home list", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".tag-chip").first()).toBeVisible();
  });

  test("a chip links to its tag page, which lists the post", async ({
    page,
  }) => {
    await page.goto("/posts/jarlid");
    // Jarlid is tagged; follow its first chip to the tag index.
    await page.locator(".post-header-tags .tag-chip").first().click();
    await expect(page).toHaveURL(/\/tags\/[a-z0-9-]+$/);
    await expect(page.locator(".eyebrow")).toHaveText("Tag");
    await expect(
      page.locator(".post-list-item").getByRole("link", { name: "Jarlid" }),
    ).toBeVisible();
  });

  test("a shared tag lists all its posts", async ({ page }) => {
    // Both Jarlid and PlugSight are tagged "ai".
    await page.goto("/tags/ai");
    await expect(page.getByRole("link", { name: "Jarlid" })).toBeVisible();
    await expect(page.getByRole("link", { name: "PlugSight" })).toBeVisible();
  });
});

test.describe("Archive", () => {
  test("groups posts by year", async ({ page }) => {
    await page.goto("/archive");
    await expect(page.getByRole("heading", { name: "Archive" })).toBeVisible();
    await expect(
      page.locator(".archive-year").getByRole("heading", { name: "2026" }),
    ).toBeVisible();
    await expect(page.locator(".archive-item").first()).toBeVisible();
  });

  test("is linked from the footer", async ({ page }) => {
    await page.goto("/");
    await page
      .locator(".site-footer")
      .getByRole("link", { name: "Archive" })
      .click();
    await expect(page).toHaveURL(/\/archive$/);
  });
});

test.describe("Prev/next navigation", () => {
  test("shows older and newer neighbors on a middle post", async ({ page }) => {
    // building-this-site sits between plugsight (newer) and jarlid (older).
    await page.goto("/posts/building-this-site");
    await expect(page.locator(".post-nav-older")).toBeVisible();
    await expect(page.locator(".post-nav-newer")).toBeVisible();
  });
});

test.describe("Table of contents", () => {
  test("renders on a multi-heading post with working anchors", async ({
    page,
  }) => {
    await page.goto("/posts/post-template");
    const toc = page.locator(".post-toc");
    await expect(toc).toBeVisible();
    await expect(
      toc.getByRole("link", { name: "Getting started" }),
    ).toHaveAttribute("href", "#getting-started");
  });

  test("is absent on a post with no headings", async ({ page }) => {
    await page.goto("/posts/jarlid");
    await expect(page.locator("article h1")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".post-toc")).toHaveCount(0);
  });
});
