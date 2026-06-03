import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { signJWT } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await signJWT({
      userId: user.id,
      email: user.email,
      role: user.role as 'ADMIN' | 'SALES' | 'SDR' | 'DEV',
      name: user.name,
    })

    const res = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
    res.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return res
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('Login error:', message)
    // Surface a hint for known setup issues without leaking internals
    const isSetup = /relation .* does not exist|table .* does not exist|Environment variable not found|Can't reach database server|P10\d\d|P20\d\d/i.test(message)
    return NextResponse.json(
      { error: isSetup ? `Database not ready: ${message}` : 'Server error' },
      { status: 500 }
    )
  }
}
