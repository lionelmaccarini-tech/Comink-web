import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'media.base44.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '*.cloudflare.com' },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000', 'comink.be'] },
  },
}

export default nextConfig
