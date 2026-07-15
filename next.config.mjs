/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Images are returned as base64 data URLs from our own API route (not fetched
  // from an external image host), so no remotePatterns/domains config is needed.
};

export default nextConfig;
