import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from "react-router";
import "@fontsource-variable/inter/index.css";
import "./styles/global.css";
// Importing the theme registry also bundles every theme's CSS (eager glob).
import { THEME_IDS } from "./styles/themes";
import { GradientBackground } from "./components/gradient-background";
import { STORAGE_KEY, ThemeSwitcher } from "./components/theme-switcher";

// Pre-paint theme selection (avoids a flash): explicit ?theme= wins, then a
// saved preference, otherwise a random variant re-rolled each visit. Shares the
// theme list with the switcher so the two never drift.
const themeInit = `(function(){try{var K=${JSON.stringify(STORAGE_KEY)},I=${JSON.stringify(THEME_IDS)},u=new URLSearchParams(location.search).get("theme"),s=null;try{s=localStorage.getItem(K)}catch(e){}var t=u!=null?u:(s!=null?s:I[Math.floor(Math.random()*I.length)]);if(t)document.documentElement.dataset.theme=t}catch(e){}})()`;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="icon"
          href="/favicon-light.svg"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="icon"
          href="/favicon-dark.svg"
          media="(prefers-color-scheme: dark)"
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="ArbitraryShit.com"
          href="/feed.xml"
        />
        <Meta />
        <Links />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {import.meta.env.DEV && (
          <script
            dangerouslySetInnerHTML={{
              __html: `if(new URLSearchParams(location.search).has('light'))document.documentElement.dataset.forceLight=''`,
            }}
          />
        )}
      </head>
      <body>
        <GradientBackground />
        <header className="site-header">
          <div className="site-header-inner">
            <Link to="/" className="site-name">
              ArbitraryShit<span className="site-tld">.com</span>
            </Link>
            <div className="site-header-right">
              <ThemeSwitcher />
              <a href="/feed.xml" className="rss-link" aria-label="RSS feed">
                RSS
              </a>
            </div>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="site-footer-inner">
            <span>
              The personal blog of{" "}
              <a href="https://cameron.tacklind.com">
                {"Cameron\u00A0Tacklind"}
              </a>
            </span>
            <span className="site-footer-links">
              <Link to="/archive">Archive</Link>
              <a href="https://github.com/cinderblock/arbitraryshit.com">
                Source
              </a>
            </span>
          </div>
        </footer>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : null;
  // Surface the underlying error; the boundary UI intentionally hides it.
  console.error("Route error:", error);
  return (
    <main className="container">
      <section className="hero">
        <h1>{status ?? "Oops"}</h1>
        <p className="tagline">
          {status === 404 ? "Page Not Found" : "Something went wrong"}
        </p>
        <Link to="/" className="back-link">
          Go back home
        </Link>
      </section>
    </main>
  );
}

export default function App() {
  return <Outlet />;
}
