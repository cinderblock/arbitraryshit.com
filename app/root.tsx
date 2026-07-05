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

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
        {import.meta.env.DEV && (
          <script
            dangerouslySetInnerHTML={{
              __html: `if(new URLSearchParams(location.search).has('light'))document.documentElement.dataset.forceLight=''`,
            }}
          />
        )}
      </head>
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <Link to="/" className="site-name">
              ArbitraryShit<span className="site-tld">.com</span>
            </Link>
            <a href="/feed.xml" className="rss-link" title="RSS feed">
              RSS
            </a>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="site-footer-inner">
            <span>
              The personal blog of{" "}
              <a href="https://cameron.tacklind.com">Cameron Tacklind</a>
            </span>
            <a href="https://github.com/cinderblock/arbitraryshit.com">
              Source
            </a>
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
