'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else { router.push('/dashboard'); router.refresh() }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  return (
    <div className="auth-page">
      <div style={{ width: '100%', maxWidth: '360px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--pine)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <path d="M16 4L19 11L22 8L20 14L24 12L21 17L25 16L22 20L26 19L22 23L10 23L6 19L10 20L7 16L11 17L8 12L12 14L10 8L13 11Z" fill="#4ade80"/>
              <path d="M8 24Q16 20 24 24" stroke="#93c5fd" strokeWidth="1.5" fill="none"/>
            </svg>
          </div>
          <h1 style={{ color: 'var(--pine)', fontSize: '28px', marginBottom: '4px' }}>Bermar</h1>
          <p style={{ color: 'var(--txl)', fontSize: '13px' }}>Gavà Mar community</p>
        </div>

        <div className="auth-card">
          <h2 style={{ fontSize: '20px', marginBottom: '20px', color: 'var(--tx)' }}>Sign in</h2>

          <button onClick={handleGoogle}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '10px 16px', border: '1px solid var(--br)', borderRadius: '10px', background: '#fff', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', marginBottom: '16px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--br)' }} />
            <span style={{ fontSize: '12px', color: 'var(--txl)' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--br)' }} />
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '12px' }}>
              <label className="form-label">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" className="form-input" />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" className="form-input" />
            </div>
            {error && (
              <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', marginBottom: '12px' }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--txl)', marginTop: '16px' }}>
            New resident?{' '}
            <Link href="/auth/register" style={{ color: 'var(--pine)', fontWeight: 500 }}>Create account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
