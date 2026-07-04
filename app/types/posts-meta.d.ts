declare module "virtual:posts-meta" {
  export interface PostMeta {
    slug: string;
    title: string;
    date: string;
    description: string;
    draft: boolean;
  }

  /** All posts (drafts included), newest first. */
  export const posts: PostMeta[];
}
