/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @napi-rs/canvas ships a native binary (.node file) — this tells Next.js
  // to load it directly at runtime instead of trying to bundle it through
  // webpack, which fails since webpack doesn't know how to parse native code.
  experimental: {
    serverComponentsExternalPackages: ["@napi-rs/canvas"],
  },
};

module.exports = nextConfig;
