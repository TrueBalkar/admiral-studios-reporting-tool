'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import Logo from '@/components/ui/Logo'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md ring-1 ring-gray-100 mb-4">
            <Logo className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CRM Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your workspace</p>
        </div>

        {/* Card */}
        <div className="card p-6 shadow-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                className="input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Demo credentials */}
        <div className="mt-5 p-4 bg-white/70 rounded-xl border border-gray-200 text-xs text-gray-500 space-y-1">
          <p className="font-medium text-gray-600 mb-2">Demo accounts</p>
          <p><span className="font-mono bg-gray-100 px-1 rounded">admin@crm.com</span> / admin123</p>
          <p><span className="font-mono bg-gray-100 px-1 rounded">sales@crm.com</span> / sales123</p>
          <p><span className="font-mono bg-gray-100 px-1 rounded">sdr@crm.com</span> / sdr123</p>
          <p><span className="font-mono bg-gray-100 px-1 rounded">dev@crm.com</span> / dev123</p>
        </div>
      </div>
    </div>
  )
}
