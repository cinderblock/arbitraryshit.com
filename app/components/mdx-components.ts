import { AiGenerated } from "./ai-generated";

// Components available in every post's MDX without an explicit import.
// Passed to the compiled MDX body as its `components` prop (see
// app/routes/post.tsx). Add shared post primitives here.
export const mdxComponents = { AiGenerated };
