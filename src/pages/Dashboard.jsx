import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../context/AuthContext'
import Tables from '../components/Tables'
import Analytics from '../components/Analytics'
import Canteen from '../components/Canteen'
import Settings from '../components/Settings'

const NAV = [
  { id: 'tables',    label: 'Tables',    icon: '🎱' },
  { id: 'canteen',   label: 'Canteen',   icon: '🍟' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
  { id: 'settings',  label: 'Settings',  icon: '⚙️' },
]

export default function Dashboard() {
  const [active, setActive] = useState('tables')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut(auth)
    navigate('/')
  }

  const pages = { tables: <Tables />, canteen: <Canteen />, analytics: <Analytics />, settings: <Settings /> }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>

      {/* ---- Sidebar ---- */}
      <aside style={{
        width: 220, flexShrink: 0, background: 'var(--color-bg2)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--color-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#0a1a0f" strokeWidth="2.5"/>
                <circle cx="12" cy="12" r="3" fill="#0a1a0f"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>CueTrack</span>
          </div>

          {/* Offline indicator */}
          <div style={{
            marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
            fontSize: '0.72rem', color: 'var(--color-text3)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-green)', animation: 'pulse-dot 2s infinite', display: 'inline-block' }} />
            Works offline
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ padding: '0.75rem 0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setActive(n.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.65rem',
                padding: '0.6rem 0.75rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontWeight: active === n.id ? 500 : 400,
                fontSize: '0.9rem', textAlign: 'left', width: '100%',
                background: active === n.id ? 'var(--color-green-glow)' : 'transparent',
                color: active === n.id ? 'var(--color-green)' : 'var(--color-text2)',
                borderLeft: active === n.id ? '2px solid var(--color-green)' : '2px solid transparent',
                transition: 'all 0.15s',
              }}>
              <span style={{ fontSize: '1rem', width: 20 }}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        {/* User area */}
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text3)', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </div>
          <button onClick={handleLogout}
            style={{
              width: '100%', padding: '0.45rem 0.75rem', borderRadius: 7,
              background: 'transparent', border: '1px solid var(--color-border)',
              color: 'var(--color-text3)', fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s',
              fontFamily: 'var(--font-body)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-red)'; e.currentTarget.style.color = 'var(--color-red)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text3)' }}
          >
            Log out
          </button>
        </div>
      </aside>

      {/* ---- Main content ---- */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <header style={{
          padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)',
          background: 'rgba(15,17,23,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.1rem', textTransform: 'capitalize' }}>
            {active}
          </h2>
          <span className="tag tag-green" style={{ fontSize: '0.72rem' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-green)', display: 'inline-block' }} />
            Live
          </span>
        </header>

        {/* Page content */}
        <div style={{ padding: '1.5rem', flex: 1 }}>
          {pages[active]}
        </div>
      </main>
    </div>
  )
}