import type { ReactNode } from "react";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#FFDE00" />
        <meta name="msapplication-TileColor" content="#FFDE00" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="canonical" href="https://pyson.app/" />
      </head>
      <body>{children}</body>
    </html>
  );
}
