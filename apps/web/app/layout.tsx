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
        <header>
          <a href="/">Citewise</a>
          <nav>
            <a href="/review">Review workspace</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
