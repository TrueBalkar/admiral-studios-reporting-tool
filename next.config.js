/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Transparently proxy /api/* to the FastAPI backend so the browser only
    // ever talks to this Next.js app's own origin — no CORS, no cross-domain
    // cookie issues, no changes needed to any fetch()/iframe/href call site.
    // Set BACKEND_URL in the environment (server-side only, not exposed to
    // the browser). Example: http://localhost:8000 for local dev.
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
}
module.exports = nextConfig
