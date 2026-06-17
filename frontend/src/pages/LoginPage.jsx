// src/pages/LoginPage.jsx
import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { Button, Input } from '../components/ui'
import { BRAND } from '../lib/constants'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: BRAND.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '40px',
        width: '100%', maxWidth: '380px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        border: `1px solid ${BRAND.border}`,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '12px', background: BRAND.primary,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: '20px', marginBottom: '12px',
          }}>P</div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: BRAND.textMain, margin: '0 0 4px' }}>
            ProTutor CRM
          </h1>
          <p style={{ fontSize: '13px', color: BRAND.textMuted, margin: 0 }}>
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@protutor.in"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '8px', padding: '10px 12px',
                fontSize: '13px', color: BRAND.danger,
              }}>
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="dark"
              size="lg"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
