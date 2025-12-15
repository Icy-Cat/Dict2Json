import type { ReactNode } from "react";
import { headers } from "next/headers";
import "./globals.css";

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const headersList = await headers();
  const host = headersList.get("host") || "dict2json.icy-cat.com";
  const protocol = headersList.get("x-forwarded-proto") || "https";
  const currentUrl = `${protocol}://${host}/`;

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#FFDE00" />
        <meta name="msapplication-TileColor" content="#FFDE00" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="canonical" href={currentUrl} />
      </head>
      <body>{children}</body>
    </html>
  );
}
