import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from './lib/auth'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/shared/', '/api/shared/']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // /api/* is proxied straight through to the FastAPI backend (see next.config.js
  // rewrites) — the backend enforces its own auth per-route, so middleware
  // doesn't need to gate it here.
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const token = req.cookies.get('auth-token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  const user = await verifyJWT(token)
  if (!user) {
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.delete('auth-token')
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
