import type { ComponentProps } from "react";
import { Link as RouterLink } from "react-router";

// App-wide Link: identical to react-router's, with view transitions on by
// default so every internal navigation gets the subtle cross-fade (no-op in
// browsers without the View Transitions API, and disabled for users with
// prefers-reduced-motion via the global CSS guard). Import this instead of
// react-router's Link in app code.
export function Link(props: ComponentProps<typeof RouterLink>) {
  return <RouterLink viewTransition {...props} />;
}
