export const SITE_URL = "https://arbitraryshit.com";

export function postUrl(slug: string): string {
  return `${SITE_URL}/posts/${slug}`;
}
