import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/sss",
        destination: "/sikca-sorulan-sorular",
        permanent: true,
      },
      {
        source: "/admin/sliders",
        destination: "/admin/homepage?tab=sliders",
        permanent: false,
      },
      {
        source: "/admin/banners",
        destination: "/admin/homepage?tab=banners",
        permanent: false,
      },
    ]
  },

  async rewrites() {
    return [
      {
        source: "/categories/:parentSlug/:slug",
        destination: "/categories/:slug",
      },
    ]
  },

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.seymacollection.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.e-puantaj.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.seymacollection.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "seymacollection.com",
        pathname: "/**",
      },
    ],
  },
}

export default nextConfig
