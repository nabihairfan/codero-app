'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/learn')
      } else {
        setChecking(false)
      }
    }).catch(() => {
      // Supabase error — just show the login page
      setChecking(false)
    })
  }, [])

  async function handleGoogleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      console.error(error)
      setLoading(false)
    }
  }

  if (checking) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f13' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #2a2a38', borderTop: '3px solid #7c6fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#0f0f13', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>

      {/* Background glow blobs */}
      <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(124,111,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center', animation: 'fadeIn 0.6s ease' }}>

        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: '#1e1e28', border: '1px solid #2a2a38', borderRadius: 20, padding: '12px 24px', marginBottom: 32 }}>
            <span style={{ fontSize: 32 }}>🦎</span>
            <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' }}>
              <span style={{ color: '#7c6fff' }}>code</span>
              <span style={{ color: '#f0f0f5' }}>ro</span>
            </span>
          </div>
        </div>

        {/* Hero text */}
        <h1 style={{ fontSize: 'clamp(34px, 7vw, 50px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 16, letterSpacing: '-1px', color: '#f0f0f5' }}>
          Learn to code.<br />
          <span style={{ color: '#7c6fff' }}>Level up daily.</span>
        </h1>

        <p style={{ fontSize: 17, color: '#9090a8', marginBottom: 44, lineHeight: 1.65 }}>
          Bite-sized Python lessons with streaks, XP, and your own AI tutor. Like Duolingo — but for code.
        </p>

        {/* Feature pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 44 }}>
          {[
            { icon: '🔥', text: 'Daily streaks' },
            { icon: '⚡', text: 'XP & levels' },
            { icon: '🦎', text: 'AI tutor Cody' },
            { icon: '🐍', text: 'Python first' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1e1e28', border: '1px solid #2a2a38', borderRadius: 100, padding: '8px 16px', fontSize: 14, color: '#9090a8' }}>
              <span>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '16px 24px', fontSize: 16, fontWeight: 700,
            borderRadius: 14, marginBottom: 16, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            background: loading ? '#3a3a4a' : '#7c6fff', color: 'white', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            boxShadow: loading ? 'none' : '0 4px 20px rgba(124,111,255,0.35)',
            transition: 'all 0.2s',
          }}
        >
          {loading ? (
            <>
              <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Signing in...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <p style={{ fontSize: 13, color: '#5a5a72' }}>Free forever · No credit card needed</p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </main>
  )
}