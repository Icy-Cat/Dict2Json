import { headers } from "next/headers";

export default async function sitemap() {
  const headersList = await headers();
  const host = headersList.get("host") || "dict2json.icy-cat.com";
  const protocol = headersList.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
      alternates: {
        languages: {
          en: baseUrl,
          zh: baseUrl,
        },
      },
    },
  ];
}
