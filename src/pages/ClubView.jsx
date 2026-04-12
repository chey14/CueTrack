// src/pages/ClubView.jsx
//
// This is the PUBLIC page customers see when they scan the club's QR code.
// URL: /club/:uid  (uid = owner's Firebase user ID)
//
// What it does:
//  - Shows the club name
//  - Shows all tables with their live status (available / running / paused)
//  - For running tables, shows the live timer and running cost
//  - Auto-refreshes every second
//  - READ-ONLY — customers cannot start, stop, or change anything
//  - No login required

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { doc, onSnapshot, collection } from 'firebase/firestore'
import { db } from '../firebase'

// ── Helpers ──────────────────────────────────────────────────────
function formatTime(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}
function fmt(n) { return `₹${Number(n).toFixed(2)}` }

export default function ClubView() {
  const { uid } = useParams()  // the owner's Firebase UID from the URL

  const [clubName,    setClubName]    = useState('')
  const [tables,      setTables]      = useState([])
  const [tableStates, setTableStates] = useState({})
  const [loading,     setLoading]     = useState(true)
  const [notFound,    setNotFound]    = useState(false)
  const [tick,        setTick]        = useState(0)

  // Tick every second to update live timers
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  // Listen to club settings (club name + table config)
  useEffect(() => {
    if (!uid) return
    const ref = doc(db, 'clubs', uid, 'settings', 'main')
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) { setNotFound(true); setLoading(false); return }
      const data = snap.data()
      setClubName(data.clubName || 'Club')
      setTables(data.tables || [])
      setLoading(false)
    }, () => { setNotFound(true); setLoading(false) })
    return unsub
  }, [uid])

  // Listen to live table states
  useEffect(() => {
    if (!uid) return
    const col = collection(db, 'clubs', uid, 'tables')
    const unsub = onSnapshot(col, (snap) => {
      const states = {}
      snap.forEach(d => { states[d.id] = d.data() })
      setTableStates(states)
    })
    return unsub
  }, [uid])

  // Merge config + live state, compute live elapsed for running tables
  const liveTables = tables.map(t => {
    const state = tableStates[t.id] || {}
    let elapsed = state.elapsed || 0
    if (state.status === 'running' && state.startTime) {
      elapsed = elapsed + Math.floor((Date.now() - state.startTime) / 1000)
    }
    return {
      ...t,
      status:   state.status   || 'available',
      elapsed,
      canteen:  state.canteen  || [],
      customer: state.customer || null,
    }
  })

  const running   = liveTables.filter(t => t.status === 'running').length
  const available = liveTables.filter(t => t.status === 'available').length

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--color-bg)' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'2rem', marginBottom:'1rem' }}>🎱</div>
          <p style={{ color:'var(--color-text3)', fontFamily:'var(--font-body)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  // ── Not found ─────────────────────────────────────────────────
  if (notFound) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--color-bg)', padding:'2rem' }}>
        <div style={{ textAlign:'center', maxWidth:320 }}>
          <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>😕</div>
          <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, marginBottom:'0.5rem' }}>Club not found</h2>
          <p style={{ color:'var(--color-text2)', fontSize:'0.9rem' }}>
            This QR code may be outdated. Ask the staff for the updated QR.
          </p>
        </div>
      </div>
    )
  }

  // ── Main view ─────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'var(--color-bg)', fontFamily:'var(--font-body)' }}>

      {/* Header */}
      <div style={{
        background:'var(--color-bg2)', borderBottom:'1px solid var(--color-border)',
        padding:'1rem 1.25rem', position:'sticky', top:0, zIndex:10,
      }}>
        <div style={{ maxWidth:600, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
            <div style={{ width:30, height:30, borderRadius:7, background:'var(--color-green)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#0a1a0f" strokeWidth="2.5"/>
                <circle cx="12" cy="12" r="3" fill="#0a1a0f"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1rem' }}>{clubName}</div>
              <div style={{ fontSize:'0.72rem', color:'var(--color-text3)' }}>Live table status</div>
            </div>
          </div>

          {/* Live indicator */}
          <div style={{ display:'flex', alignItems:'center', gap:'0.35rem', fontSize:'0.75rem', color:'var(--color-green)', fontFamily:'var(--font-display)', fontWeight:600 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--color-green)', display:'inline-block', animation:'pulse-dot 2s infinite' }}/>
            Live
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ background:'var(--color-bg3)', borderBottom:'1px solid var(--color-border)', padding:'0.6rem 1.25rem' }}>
        <div style={{ maxWidth:600, margin:'0 auto', display:'flex', gap:'1.5rem' }}>
          <div style={{ fontSize:'0.78rem', color:'var(--color-text3)' }}>
            <span style={{ color:'var(--color-green)', fontWeight:600, marginRight:4 }}>{available}</span>available
          </div>
          <div style={{ fontSize:'0.78rem', color:'var(--color-text3)' }}>
            <span style={{ color:'var(--color-amber)', fontWeight:600, marginRight:4 }}>{running}</span>running
          </div>
          <div style={{ fontSize:'0.78rem', color:'var(--color-text3)' }}>
            <span style={{ fontWeight:600, marginRight:4 }}>{liveTables.length}</span>total tables
          </div>
        </div>
      </div>

      {/* Table cards */}
      <div style={{ maxWidth:600, margin:'0 auto', padding:'1.25rem' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          {liveTables.map(table => (
            <TableViewCard key={table.id} table={table} />
          ))}
        </div>

        {/* Footer note */}
        <div style={{ marginTop:'2rem', padding:'1rem', background:'var(--color-bg2)', borderRadius:10, border:'1px solid var(--color-border)', textAlign:'center' }}>
          <p style={{ fontSize:'0.78rem', color:'var(--color-text3)', lineHeight:1.6 }}>
            This is a read-only view. Only staff can start or stop tables.
          </p>
          <p style={{ fontSize:'0.72rem', color:'var(--color-text3)', marginTop:4 }}>
            Powered by CueTrack 🎱
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Single table card (read-only) ────────────────────────────────
function TableViewCard({ table }) {
  const cost = table.elapsed * table.ratePerMin / 60
  const canteenTotal = table.canteen.reduce((s,i) => s + i.price, 0)
  const total = cost + canteenTotal

  const statusConfig = {
    available: { color:'var(--color-green)',  bg:'rgba(34,197,94,0.06)',   border:'rgba(34,197,94,0.3)',   label:'Available' },
    running:   { color:'var(--color-amber)',  bg:'rgba(245,158,11,0.06)',  border:'rgba(245,158,11,0.3)',  label:'Running'   },
    paused:    { color:'var(--color-blue)',   bg:'rgba(59,130,246,0.06)',  border:'rgba(59,130,246,0.3)',  label:'Paused'    },
  }
  const sc = statusConfig[table.status] || statusConfig.available

  return (
    <div style={{
      background: sc.bg, border:`1px solid ${sc.border}`,
      borderRadius:12, padding:'1.1rem 1.25rem',
      transition:'border-color 0.3s',
    }}>
      {/* Top row: name + status */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.75rem' }}>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1rem' }}>{table.name}</div>
          <div style={{ display:'flex', gap:6, marginTop:4 }}>
            <span style={{ fontSize:'0.68rem', fontWeight:600, padding:'2px 7px', borderRadius:20, background:'rgba(255,255,255,0.06)', color:'var(--color-text3)' }}>
              {table.type}
            </span>
            <span style={{ fontSize:'0.68rem', fontWeight:600, padding:'2px 7px', borderRadius:20, background:'rgba(255,255,255,0.06)', color:'var(--color-text3)' }}>
              {table.size}
            </span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'0.3rem', fontSize:'0.75rem', color:sc.color, fontFamily:'var(--font-display)', fontWeight:600 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:sc.color, animation:table.status==='running'?'pulse-dot 1.5s infinite':'none' }}/>
          {sc.label}
        </div>
      </div>

      {/* Available state */}
      {table.status === 'available' && (
        <div style={{ color:'var(--color-text3)', fontSize:'0.88rem' }}>
          ₹{Math.round(table.ratePerMin * 60)}/hr · Ready to play
        </div>
      )}

      {/* Running or paused state */}
      {(table.status === 'running' || table.status === 'paused') && (
        <div>
          {/* Big timer */}
          <div style={{
            fontFamily:'var(--font-display)', fontWeight:800,
            fontSize:'2.6rem', letterSpacing:'-0.02em',
            color:'var(--color-text)', marginBottom:'0.1rem',
            animation: table.status==='running' ? 'tick 1s infinite' : 'none',
          }}>
            {formatTime(table.elapsed)}
          </div>

          {/* Cost breakdown */}
          <div style={{ fontSize:'0.88rem', color:'var(--color-text2)', marginBottom:'0.5rem' }}>
            Table: <span style={{ color:'var(--color-amber)', fontWeight:600 }}>{fmt(cost)}</span>
            <span style={{ color:'var(--color-text3)', marginLeft:6 }}>
              @ ₹{Math.round(table.ratePerMin * 60)}/hr
            </span>
          </div>

          {/* Canteen if any */}
          {canteenTotal > 0 && (
            <div style={{ fontSize:'0.82rem', color:'var(--color-text2)', marginBottom:'0.4rem' }}>
              Canteen: <span style={{ color:'var(--color-amber)', fontWeight:600 }}>{fmt(canteenTotal)}</span>
            </div>
          )}

          {/* Total so far */}
          <div style={{
            display:'inline-flex', alignItems:'center', gap:'0.4rem',
            marginTop:'0.35rem', padding:'0.35rem 0.8rem',
            background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)',
            borderRadius:8,
          }}>
            <span style={{ fontSize:'0.78rem', color:'var(--color-text3)' }}>Total so far:</span>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1rem', color:'var(--color-amber)' }}>
              {fmt(total)}
            </span>
          </div>

          {table.status === 'paused' && (
            <div style={{ marginTop:'0.5rem', fontSize:'0.75rem', color:'var(--color-blue)' }}>
              ⏸ Timer paused by staff
            </div>
          )}
        </div>
      )}
    </div>
  )
}