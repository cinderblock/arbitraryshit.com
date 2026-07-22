import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("posts/:slug", "routes/post.tsx"),
  route("tags/:tag", "routes/tag.tsx"),
  route("*", "routes/404.tsx"),
] satisfies RouteConfig;
