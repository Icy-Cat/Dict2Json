/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 支持多个域名
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dict2json.icy-cat.com",
      },
      {
        protocol: "https",
        hostname: "pyson.icy-cat.com",
      },
    ],
  },
  // 如果部署到Vercel，可以在这里配置域名
  // 但实际域名配置需要在Vercel控制台或DNS提供商处完成
};

export default nextConfig;
