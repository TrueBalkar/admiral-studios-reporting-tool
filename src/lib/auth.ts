import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'crm-poc-secret-key-change-in-production'
)

export type Role = 'ADMIN' | 'SALES' | 'SDR' | 'DEV'

export interface TokenPayload {
  userId: string
  email: string
  role: Role
  name: string
}

export async function signJWT(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyJWT(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
}

export async function getAuthUser(req?: NextRequest): Promise<TokenPayload | null> {
  let token: string | undefined
  if (req) {
    token = req.cookies.get('auth-token')?.value
  } else {
    const cookieStore = cookies()
    token = cookieStore.get('auth-token')?.value
  }
  if (!token) return null
  return verifyJWT(token)
}

export function canDeleteFolder(
  user: TokenPayload,
  folderCreatedById: string
): boolean {
  return user.role === 'ADMIN' || user.userId === folderCreatedById
}
