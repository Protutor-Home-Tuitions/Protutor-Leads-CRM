// src/pages/LoginPage.jsx
// Pixel-matched to old CRM login (Image 2) — gradient bg, green glow card.
import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { Mail, Lock, Eye, EyeOff, Users } from 'lucide-react'
import { BRAND } from '../lib/constants'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
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
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #16a34a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '40px',
        width: '100%', maxWidth: '400px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        borderTop: '4px solid #16a34a',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '14px', background: '#f0fdf4',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '14px',
          }}>
            <Users size={24} color={BRAND.accent} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px' }}>
            <span style={{ color: BRAND.primary }}>Pro</span>
            <span style={{ color: BRAND.accent }}>Tutor</span>
          </h1>
          <p style={{ fontSize: '13px', color: BRAND.textMuted, margin: 0 }}>
            CRM — leads.protutor.in
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Email */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: BRAND.textSub, display: 'block', marginBottom: '6px', letterSpacing: '0.04em' }}>
                EMAIL
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color={BRAND.textMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@protutor.in"
                  required
                  style={{
                    width: '100%', border: `1px solid ${BRAND.border}`, borderRadius: '8px',
                    padding: '10px 12px 10px 38px', fontSize: '14px', outline: 'none',
                    boxSizing: 'border-box', color: BRAND.textMain,
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: BRAND.textSub, display: 'block', marginBottom: '6px', letterSpacing: '0.04em' }}>
                PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color={BRAND.textMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%', border: `1px solid ${BRAND.border}`, borderRadius: '8px',
                    padding: '10px 40px 10px 38px', fontSize: '14px', outline: 'none',
                    boxSizing: 'border-box', color: BRAND.textMain,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                    color: BRAND.textMuted,
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '8px', padding: '10px 12px',
                fontSize: '13px', color: BRAND.danger,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px',
                border: 'none', background: BRAND.accent, color: '#fff',
                fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, marginTop: '4px',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In to CRM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
