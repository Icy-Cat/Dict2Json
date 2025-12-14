export default function Head() {
  return (
    <>
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      <title>PySon Converter | Python to JSON Tool</title>
      <meta
        name="title"
        content="PySon Converter | Secure Client-Side Python to JSON Tool"
      />
      <meta
        name="description"
        content="Free, fast, and secure online Python to JSON converter. Runs entirely in your browser using a local parser. Converts dicts, lists, tuples, and sets instantly."
      />
      <meta
        name="keywords"
        content="python to json, python dict to json, python list to json, online converter, developer tool, json formatter, local processing, secure converter"
      />
      <meta name="robots" content="index, follow" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="language" content="English" />
      <meta name="author" content="PySon" />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://pyson.app/" />
      <meta
        property="og:title"
        content="PySon Converter | Secure Client-Side Python to JSON Tool"
      />
      <meta
        property="og:description"
        content="Convert Python dictionaries and lists to formatted JSON instantly in your browser. No server uploads, 100% privacy."
      />
      <meta property="og:site_name" content="PySon Converter" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta
        name="twitter:title"
        content="PySon Converter | Secure Client-Side Python to JSON Tool"
      />
      <meta
        name="twitter:description"
        content="Convert Python dictionaries and lists to formatted JSON instantly in your browser. No server uploads, 100% privacy."
      />

      {/* Favicon */}
      <link
        rel="icon"
        type="image/svg+xml"
        href="data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0.5' y='0.5' width='31' height='31' rx='6' fill='white' stroke='%23383838' stroke-width='1' /%3E%3Ccircle cx='16' cy='16' r='9' fill='%23FFDE00' /%3E%3Cpath d='M13 11C11.5 11 11.5 12.5 11.5 12.5V14.5C11.5 14.5 11.5 16 9.5 16C11.5 16 11.5 17.5 11.5 17.5V19.5C11.5 19.5 11.5 21 13 21' stroke='%23383838' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M19 11C20.5 11 20.5 12.5 20.5 12.5V14.5C20.5 14.5 20.5 16 22.5 16C20.5 16 20.5 17.5 20.5 17.5V19.5C20.5 19.5 20.5 21 19 21' stroke='%23383838' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"
      />

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "PySon Converter",
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Any",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD"
            },
            description:
              "A browser-based tool to convert Python data structures (dictionaries, lists) into valid JSON.",
            featureList:
              "Local processing, Syntax highlighting, Tree view, Raw JSON view, Search and filter"
          })
        }}
      />

      {/* Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&family=Inter:wght@400;500;600&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap"
        rel="stylesheet"
      />
    </>
  );
}
