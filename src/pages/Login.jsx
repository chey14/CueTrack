import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'

// ─────────────────────────────────────────────────────────────────
// IMPORTANT: Replace this with your actual WhatsApp number
// Format: country code + number, no spaces or +
// Example: '919876543210' for India (+91 98765 43210)
// ─────────────────────────────────────────────────────────────────
const YOUR_WHATSAPP = '9560728395'

const labelStyle = {
  fontSize: '0.82rem', color: 'var(--color-text2)', marginBottom: 5, display: 'block'
}

// ── Request Access Form ──────────────────────────────────────────
// New owners fill this. It opens WhatsApp with their details
// pre-filled and sends to YOUR number. You verify them manually
// and create their Firebase account, then share credentials.
function RequestAccessForm() {
  const [form, setForm] = useState({
    ownerName: '', clubName: '', city: '',
    location: '', email: '', phone: '', tables: '', message: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  function handleSubmit(e) {
    e.preventDefault()
    const lines = [
      `🎱 *New CueTrack Access Request*`,
      ``,
      `👤 *Owner name:* ${form.ownerName}`,
      `🏪 *Club name:* ${form.clubName}`,
      `📍 *City:* ${form.city}`,
      `📌 *Location / area:* ${form.location}`,
      `📧 *Email:* ${form.email}`,
      `📱 *Phone:* ${form.phone}`,
      `🎱 *No. of tables:* ${form.tables}`,
      ``,
      `💬 *Message:* ${form.message || '—'}`,
    ]
    const msg = encodeURIComponent(lines.join('\n'))
    window.open(`https://wa.me/${YOUR_WHATSAPP}?text=${msg}`, '_blank')
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.75rem' }}>
          Request sent!
        </h3>
        <p style={{ color: 'var(--color-text2)', lineHeight: 1.7, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          We received your details and will contact you on WhatsApp
          within 24 hours. Once verified, we'll create your account
          and send you the login credentials.
        </p>
        <button onClick={() => setSubmitted(false)} className="btn-ghost" style={{ fontSize: '0.85rem' }}>
          ← Submit another request
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card"
      style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

      <p style={{ fontSize: '0.85rem', color: 'var(--color-text2)', lineHeight: 1.65 }}>
        Fill in your details. We'll verify you're a genuine club owner and
        send login credentials on WhatsApp within 24 hours — completely free.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Your name *</label>
          <input className="input-field" required placeholder="Rahul Kumar"
            value={form.ownerName} onChange={set('ownerName')} />
        </div>
        <div>
          <label style={labelStyle}>Club name *</label>
          <input className="input-field" required placeholder="Cues & Cushions"
            value={form.clubName} onChange={set('clubName')} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label style={labelStyle}>City *</label>
          <input className="input-field" required placeholder="Vellore"
            value={form.city} onChange={set('city')} />
        </div>
        <div>
          <label style={labelStyle}>Area / locality *</label>
          <input className="input-field" required placeholder="Near VIT main gate"
            value={form.location} onChange={set('location')} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Email address *</label>
        <input className="input-field" required type="email" placeholder="owner@club.com"
          value={form.email} onChange={set('email')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label style={labelStyle}>WhatsApp number *</label>
          <input className="input-field" required placeholder="98765 43210"
            value={form.phone} onChange={set('phone')} />
        </div>
        <div>
          <label style={labelStyle}>Number of tables *</label>
          <input className="input-field" required type="number" min="1" placeholder="6"
            value={form.tables} onChange={set('tables')} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Anything else? (optional)</label>
        <textarea className="input-field" rows={2}
          placeholder="Mix of pool and snooker, open 10am–11pm..."
          value={form.message} onChange={set('message')} style={{ resize: 'vertical' }} />
      </div>

      <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
        Send Request via WhatsApp →
      </button>
      <p style={{ fontSize: '0.75rem', color: 'var(--color-text3)', textAlign: 'center' }}>
        Opens WhatsApp with your info pre-filled. We reply within 24 hours.
      </p>
    </form>
  )
}

// ── Main Login Page ──────────────────────────────────────────────
export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/dashboard')
    } catch (err) {
      const messages = {
        'auth/invalid-credential': 'Wrong email or password.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/too-many-requests': 'Too many attempts. Please wait a few minutes.',
        'auth/user-not-found': 'No account found with this email.',
      }
      setError(messages[err.code] || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '2rem', position: 'relative',
    }} className="grid-bg">

      <Link to="/" style={{
        position: 'absolute', top: '1.5rem', left: '1.5rem',
        color: 'var(--color-text3)', fontSize: '0.85rem', textDecoration: 'none',
        display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'color 0.2s',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text3)'}
      >← Back to home</Link>

      <div style={{ width: '100%', maxWidth: mode === 'request' ? 540 : 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, background: 'var(--color-green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#0a1a0f" strokeWidth="2"/>
              <circle cx="12" cy="12" r="3" fill="#0a1a0f"/>
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="#0a1a0f" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.4rem', marginBottom: '0.2rem' }}>
            CueTrack
          </h1>
          <p style={{ color: 'var(--color-text3)', fontSize: '0.875rem' }}>
            {mode === 'login' ? 'Owner dashboard login' : 'Request access to CueTrack'}
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          background: 'var(--color-bg2)', border: '1px solid var(--color-border)',
          borderRadius: 10, padding: 4, marginBottom: '1.25rem',
        }}>
          {[
            { id: 'login',   label: 'I have credentials' },
            { id: 'request', label: 'Request access' },
          ].map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); setError('') }}
              style={{
                padding: '0.55rem', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.82rem',
                background: mode === m.id ? 'var(--color-surface)' : 'transparent',
                color: mode === m.id ? 'var(--color-text)' : 'var(--color-text3)',
                transition: 'all 0.2s',
              }}
            >{m.label}</button>
          ))}
        </div>

        {/* Login form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="card"
            style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Email address</label>
              <input className="input-field" type="email" required placeholder="owner@yourclub.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input className="input-field" type="password" required placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            {error && (
              <div style={{
                background: 'var(--color-red-glow)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8, padding: '0.7rem 1rem', fontSize: '0.85rem', color: 'var(--color-red)',
              }}>{error}</div>
            )}

            <button type="submit" className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
              disabled={loading}>
              {loading ? 'Logging in...' : 'Log In →'}
            </button>

            <p style={{ fontSize: '0.78rem', color: 'var(--color-text3)', textAlign: 'center' }}>
              No credentials yet?{' '}
              <button type="button" onClick={() => setMode('request')}
                style={{
                  background: 'none', border: 'none', color: 'var(--color-green)',
                  cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                }}>
                Request access →
              </button>
            </p>
          </form>
        )}

        {/* Request form */}
        {mode === 'request' && <RequestAccessForm />}
      </div>
    </div>
  )
}