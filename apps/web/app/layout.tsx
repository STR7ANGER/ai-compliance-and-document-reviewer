import type { Metadata } from "next";
import "./styles.css";
export const metadata: Metadata = {
  title: "Citewise Review",
  description: "Grounded compliance document review",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <header>
          <a href="/">Citewise</a>
          <nav>
            <a href="/review">Review workspace</a>
            <a href="/findings">Findings</a>
          </nav>
        </header>
        <div id="main-content">{children}</div>
      </body>
    </html>
  );
}
