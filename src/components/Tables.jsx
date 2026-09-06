import { useState, useEffect, useRef } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { useClubSettings } from '../hooks/useClubSettings'
import { useTables } from '../hooks/useTables'
import { useBills } from '../hooks/useBills'

// ── Helpers ───────────────────────────────────────────────────────
function formatTime(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  if (h > 0) return `${h} hr ${String(m).padStart(2,'0')} min`
  if (m > 0) return `${m} min ${String(sec).padStart(2,'0')} sec`
  return `${sec} sec`
}
function formatTimerDisplay(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}
function fmtRound(n) { return `₹${Math.round(n)}` }

// Sanitise and validate a phone number for WhatsApp
// Returns null if the number is clearly invalid
function sanitisePhone(raw) {
  const digits = (raw || '').replace(/\D/g, '')
  if (digits.length === 10) return '91' + digits        // Indian number, add country code
  if (digits.length === 12 && digits.startsWith('91')) return digits  // already has +91
  if (digits.length === 11 && digits.startsWith('0')) return '91' + digits.slice(1)
  if (digits.length >= 10 && digits.length <= 15) return digits  // international
  return null  // invalid
}
function fmtTime12(d) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
}

// ── Canteen menu (shared across modals) ───────────────────────────
const SAVED_MENU = [
  { id: 1, name: 'Coke',       price: 40,  category: 'Drinks' },
  { id: 2, name: 'Sprite',     price: 40,  category: 'Drinks' },
  { id: 3, name: 'Water',      price: 20,  category: 'Drinks' },
  { id: 4, name: 'Tea',        price: 20,  category: 'Drinks' },
  { id: 5, name: 'Samosa (2)', price: 30,  category: 'Snacks' },
  { id: 6, name: 'Chips',      price: 20,  category: 'Snacks' },
  { id: 7, name: 'Maggi',      price: 50,  category: 'Snacks' },
]

const PAYMENT_MODES = [
  { id: 'cash',         label: 'Cash'          },
  { id: 'upi',          label: 'UPI'           },
  { id: 'split',        label: 'UPI + Cash'    },
  { id: 'paid_pending', label: 'Paid + Pending' },
]

const lbl = { fontSize: '0.82rem', color: 'var(--color-text2)', marginBottom: 5, display: 'block' }

// ── Modal backdrop ────────────────────────────────────────────────
function Modal({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)',
        zIndex: 1000, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '1rem',
      }}
    >
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  )
}

// ── BillRow helper ────────────────────────────────────────────────
function BillRow({ label, value, muted }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
      <span style={{ color: muted ? 'var(--color-text3)' : 'var(--color-text2)' }}>{label}</span>
      <span style={{ color: muted ? 'var(--color-text2)' : 'var(--color-text)' }}>{value}</span>
    </div>
  )
}

// ── Start / Edit customer modal ───────────────────────────────────
function CustomerModal({ table, isEditing, onConfirm, onClose }) {
  const existing = table.customer || {}
  const [name,        setName]        = useState(existing.name  || '')
  const [phone,       setPhone]       = useState(existing.phone || '')
  const [lateMinutes, setLateMinutes] = useState(table.lateMinutes || 0)

  return (
    <Modal onClose={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: 380, padding: '1.5rem' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '0.35rem' }}>
          {isEditing ? `Edit customer — ${table.name}` : `Start — ${table.name}`}
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text3)', marginBottom: '1.25rem' }}>
          All fields optional. Can be updated any time during the session.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={lbl}>Customer name</label>
            <input className="input-field" placeholder="e.g. Arjun"
              value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>WhatsApp number</label>
            <input className="input-field" placeholder="9876543210"
              value={phone} onChange={e => setPhone(e.target.value)} />
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text3)', marginTop: 3 }}>
              10-digit, country code added automatically.
            </p>
          </div>
          <div>
            <label style={lbl}>Late check-in (minutes)</label>
            {isEditing && table.lateMinutes > 0 ? (
              // Already set — locked, cannot be changed again
              <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                <div className="input-field" style={{ opacity:0.6, cursor:'not-allowed', color:'var(--color-text2)' }}>
                  {table.lateMinutes} min
                </div>
                <span style={{ fontSize:'0.72rem', color:'var(--color-amber)', whiteSpace:'nowrap' }}>🔒 Cannot change once set</span>
              </div>
            ) : (
              <input className="input-field" type="number" min="0" placeholder="0"
                value={lateMinutes} onChange={e => setLateMinutes(parseInt(e.target.value) || 0)} />
            )}
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text3)', marginTop: 3 }}>
              Extra time to charge — not shown on bill. Can only be set once.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button onClick={onClose} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ name: name.trim(), phone: phone.trim() }, lateMinutes)}
            className="btn-primary"
            style={{ flex: 1, justifyContent: 'center' }}
          >
            {isEditing ? 'Update' : '▶ Start Timer'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Canteen picker modal ──────────────────────────────────────────
function CanteenModal({ table, onAdd, onClose }) {
  const [tab,    setTab]    = useState('menu')
  const [qty,    setQty]    = useState({})
  const [custom, setCustom] = useState({ name: '', price: '', qty: 1 })

  const categories     = [...new Set(SAVED_MENU.map(i => i.category))]
  const totalSelected  = SAVED_MENU.reduce((s, i) => s + (qty[i.id] || 0) * i.price, 0)

  function handleAddFromMenu() {
    const items = SAVED_MENU.flatMap(item => {
      const count = qty[item.id] || 0
      if (!count) return []
      return [{ name: count > 1 ? `${item.name} ×${count}` : item.name, price: item.price * count }]
    })
    if (!items.length) return
    onAdd(items)
    onClose()
  }

  function handleAddCustom(e) {
    e.preventDefault()
    const count = parseInt(custom.qty) || 1
    onAdd([{
      name:  count > 1 ? `${custom.name} ×${count}` : custom.name,
      price: parseFloat(custom.price) * count,
    }])
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: '1.5rem', maxHeight: '85vh', overflowY: 'auto' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '1rem' }}>
          {table ? `Add to ${table.name}` : 'Canteen sale (no table)'}
        </h3>

        {/* Tab switch */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--color-bg3)', borderRadius: 8, padding: 3, marginBottom: '1rem' }}>
          {[['menu', '📋 Menu'], ['custom', '✏️ Custom']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '0.45rem', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.8rem',
              background: tab === id ? 'var(--color-surface)' : 'transparent',
              color:      tab === id ? 'var(--color-text)'    : 'var(--color-text3)',
              transition: 'all 0.15s',
            }}>{label}</button>
          ))}
        </div>

        {/* Saved menu tab */}
        {tab === 'menu' && (
          <div>
            {categories.map(cat => (
              <div key={cat} style={{ marginBottom: '0.85rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                  {cat}
                </div>
                {SAVED_MENU.filter(i => i.category === cat).map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-bg3)', borderRadius: 8, padding: '0.55rem 0.85rem', marginBottom: '0.35rem' }}>
                    <div>
                      <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{item.name}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text3)', marginLeft: 8 }}>₹{item.price}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <button
                        onClick={() => setQty(p => ({ ...p, [item.id]: Math.max(0, (p[item.id] || 0) - 1) }))}
                        style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer', fontWeight: 700 }}>
                        −
                      </button>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', minWidth: 16, textAlign: 'center' }}>
                        {qty[item.id] || 0}
                      </span>
                      <button
                        onClick={() => setQty(p => ({ ...p, [item.id]: (p[item.id] || 0) + 1 }))}
                        style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--color-green)', background: 'var(--color-green-glow)', color: 'var(--color-green)', cursor: 'pointer', fontWeight: 700 }}>
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {totalSelected > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '0.6rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text2)' }}>Total</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-amber)' }}>{fmtRound(totalSelected)}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={onClose} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              <button onClick={handleAddFromMenu} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={!totalSelected}>
                Add
              </button>
            </div>
          </div>
        )}

        {/* Custom item tab */}
        {tab === 'custom' && (
          <form onSubmit={handleAddCustom} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={lbl}>Item name *</label>
              <input className="input-field" required placeholder="Red Bull"
                value={custom.name} onChange={e => setCustom({ ...custom, name: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <div>
                <label style={lbl}>Price per item (₹) *</label>
                <input className="input-field" required type="number" min="0" step="0.5" placeholder="60"
                  value={custom.price} onChange={e => setCustom({ ...custom, price: e.target.value })} />
              </div>
              <div>
                <label style={lbl}>Quantity</label>
                <input className="input-field" type="number" min="1" placeholder="1"
                  value={custom.qty} onChange={e => setCustom({ ...custom, qty: e.target.value })} />
              </div>
            </div>
            {custom.name && custom.price && (
              <div style={{ fontSize: '0.82rem', color: 'var(--color-amber)', fontWeight: 600 }}>
                Total: {fmtRound(parseFloat(custom.price || 0) * parseInt(custom.qty || 1))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Add</button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}

// ── Shared payment section (used in both checkout modals) ─────────
function PaymentSection({ paymentMode, setPaymentMode, cashAmt, setCashAmt, upiAmt, setUpiAmt, total, upiId, upiQrBase64, splitOk, pendingAmt }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={lbl}>Payment method</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '0.6rem' }}>
        {PAYMENT_MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setPaymentMode(m.id)}
            style={{
              padding: '0.5rem', borderRadius: 7, cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.8rem',
              border:      paymentMode === m.id ? '1px solid var(--color-green)' : '1px solid var(--color-border)',
              background:  paymentMode === m.id ? 'var(--color-green-glow)'      : 'transparent',
              color:       paymentMode === m.id ? 'var(--color-green)'           : 'var(--color-text2)',
              transition: 'all 0.15s',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Split inputs */}
      {paymentMode === 'split' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0.75rem', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8 }}>
          <div>
            <label style={{ ...lbl, marginBottom: 4 }}>Cash (₹)</label>
            <input className="input-field" type="number" min="0" placeholder="0"
              value={cashAmt}
              onChange={e => {
                setCashAmt(e.target.value)
                setUpiAmt(String(Math.max(0, total - parseFloat(e.target.value || 0))))
              }}
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.9rem' }} />
          </div>
          <div>
            <label style={{ ...lbl, marginBottom: 4 }}>UPI (₹)</label>
            <input className="input-field" type="number" min="0" placeholder="0"
              value={upiAmt} onChange={e => setUpiAmt(e.target.value)}
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.9rem' }} />
          </div>
          <div style={{ gridColumn: 'span 2', fontSize: '0.75rem', color: splitOk ? 'var(--color-green)' : 'var(--color-red)' }}>
            {splitOk
              ? `✓ ₹${Math.round(parseFloat(cashAmt)||0)} + ₹${Math.round(parseFloat(upiAmt)||0)} = ₹${total}`
              : `Sum ₹${Math.round((parseFloat(cashAmt)||0)+(parseFloat(upiAmt)||0))} ≠ Total ₹${total}`}
          </div>
        </div>
      )}

      {/* Paid + pending */}
      {paymentMode === 'paid_pending' && (
        <div style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8 }}>
          <label style={{ ...lbl, marginBottom: 4 }}>Amount paid now (₹)</label>
          <input className="input-field" type="number" min="0" max={total} placeholder="0"
            value={cashAmt} onChange={e => setCashAmt(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', fontSize: '0.9rem' }} />
          <p style={{ fontSize: '0.75rem', color: 'var(--color-amber)', marginTop: 4 }}>
            Pending: ₹{pendingAmt}
          </p>
        </div>
      )}

      {/* UPI QR preview */}
      {(paymentMode === 'upi' || paymentMode === 'split') && upiId && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img
            src={upiQrBase64 || `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent('upi://pay?pa=' + upiId + '&am=' + total + '&tn=CueTrack&cu=INR')}`}
            alt="UPI QR"
            style={{ width: 70, height: 70, borderRadius: 8, border: '1px solid var(--color-border)', flexShrink: 0, background: '#fff' }}
          />
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-blue)', fontWeight: 600 }}>UPI ID: {upiId}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--color-green)', marginTop: 2 }}>✓ QR link included in WhatsApp receipt</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Discount section (PIN protected) ─────────────────────────────
function DiscountSection({ subtotal, discountAmt, setDiscountAmt, ownerPin }) {
  const [show,      setShow]      = useState(false)
  const [pin,       setPin]       = useState('')
  const [pinErr,    setPinErr]    = useState(false)
  const [unlocked,  setUnlocked]  = useState(false)

  function verify() {
    // Read PIN from Firestore settings (passed as prop) — falls back to localStorage
    // for backward compat, then to default '1234'
    const correctPin = ownerPin || localStorage.getItem('ct_owner_pin') || '1234'
    if (pin === correctPin) { setUnlocked(true); setPinErr(false) }
    else { setPinErr(true); setPin('') }
  }

  function remove() {
    setShow(false); setUnlocked(false); setDiscountAmt(0); setPin('')
  }

  if (!show) {
    return (
      <button type="button" onClick={() => setShow(true)}
        style={{ fontSize: '0.78rem', color: 'var(--color-text3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
        + Apply discount
      </button>
    )
  }

  if (!unlocked) {
    return (
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input className="input-field" type="password" placeholder="Enter owner PIN"
          value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && verify()}
          style={{ padding: '0.4rem 0.7rem', fontSize: '0.875rem' }} />
        <button onClick={verify} className="btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem', flexShrink: 0 }}>Unlock</button>
        <button onClick={remove} style={{ background: 'none', border: 'none', color: 'var(--color-text3)', cursor: 'pointer', fontSize: '0.82rem' }}>✕</button>
        {pinErr && <span style={{ fontSize: '0.75rem', color: 'var(--color-red)' }}>Wrong PIN</span>}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <span style={{ fontSize: '0.82rem', color: 'var(--color-text2)' }}>Discount (₹):</span>
      <input className="input-field" type="number" min="0" max={subtotal} placeholder="0"
        value={discountAmt || ''} onChange={e => setDiscountAmt(parseFloat(e.target.value) || 0)}
        style={{ width: 90, padding: '0.4rem 0.6rem' }} />
      <button onClick={remove} style={{ fontSize: '0.78rem', color: 'var(--color-text3)', background: 'none', border: 'none', cursor: 'pointer' }}>✕ Remove</button>
    </div>
  )
}

// ── Canteen Checkout Modal (standalone — no table) ────────────────
function CanteenCheckoutModal({ items, upiId, upiQrBase64, upiQrUrl, clubName, ownerPin, onClose, onConfirm }) {
  const [paymentMode,    setPaymentMode]    = useState('upi')
  const [cashAmt,        setCashAmt]        = useState('')
  const [upiAmt,         setUpiAmt]         = useState('')
  const [customerName,   setCustomerName]   = useState('')
  const [customerPhone,  setCustomerPhone]  = useState('')
  const [discountAmt,    setDiscountAmt]    = useState(0)
  const [sending,        setSending]        = useState(false)

  const subtotal   = Math.round(items.reduce((s, i) => s + i.price, 0))
  const total      = Math.max(0, subtotal - Math.round(discountAmt))
  const splitCash  = parseFloat(cashAmt) || 0
  const splitUpi   = parseFloat(upiAmt)  || 0
  const splitOk    = paymentMode !== 'split' || Math.abs(splitCash + splitUpi - total) < 1
  const paidAmt    = parseFloat(cashAmt) || 0
  const pendingAmt = Math.max(0, total - paidAmt)

  function buildMessage(billNo) {
    const greet   = customerName ? `Hi *${customerName}*! ` : ''
    const club    = clubName || 'CueTrack'
    const lines   = [
      `${greet}Here's your canteen receipt! 🍟`,
      '', `🏪 *${club}*`, `━━━━━━━━━━━━`,
      `Bill No: *${billNo || '—'}*`,
      '', '🍟 *Items:*',
      ...items.map(i => `   • ${i.name}  →  ₹${Math.round(i.price)}`),
    ]
    if (discountAmt > 0) lines.push(`   Discount: -₹${Math.round(discountAmt)}`)
    const pmLabel = { cash: 'Cash', upi: 'UPI', split: 'UPI+Cash', paid_pending: 'Part paid' }[paymentMode] || paymentMode
    lines.push('', `━━━━━━━━━━━━`, `💰 *Total: ₹${total}*`, `💳 *Payment: ${pmLabel}*`)
    if (paymentMode === 'split')        lines.push(`   Cash: ₹${Math.round(splitCash)}  ·  UPI: ₹${Math.round(splitUpi)}`)
    if (paymentMode === 'paid_pending') lines.push(`   Paid: ₹${Math.round(paidAmt)}  ·  Pending: ₹${Math.round(pendingAmt)}`)
    if ((paymentMode === 'upi' || paymentMode === 'split') && upiId) {
      const upiLink = `upi://pay?pa=${upiId}&am=${paymentMode === 'split' ? splitUpi : total}&tn=CueTrack&cu=INR`
      const qrFinal = upiQrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiLink)}`
      lines.push('', `📲 *UPI ID:* ${upiId}`, `📷 *Scan QR:* ${qrFinal}`)
    }
    lines.push('', 'Thank you! See you again 🎱')
    return encodeURIComponent(lines.join('\n'))
  }

  async function handleConfirm() {
    if (!splitOk) return
    const billData = {
      canteenTotal:  subtotal,
      discount:      Math.round(discountAmt),
      total,
      paymentMode,
      cashAmount:    paymentMode === 'cash'         ? total      : paymentMode === 'split'        ? splitCash : paymentMode === 'paid_pending' ? paidAmt : 0,
      upiAmount:     paymentMode === 'upi'          ? total      : paymentMode === 'split'        ? splitUpi  : 0,
      pendingAmount: paymentMode === 'paid_pending' ? pendingAmt : 0,
      customer:      customerName || customerPhone  ? { name: customerName, phone: customerPhone } : null,
    }
    const billNo = await onConfirm(billData)
    if (customerPhone) {
      const phone = sanitisePhone(customerPhone)
      if (!phone) { alert('Invalid phone number — cannot send WhatsApp'); return }
      setSending(true)
      window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${buildMessage(billNo)}`, '_blank', 'noopener,noreferrer')
      setSending(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: 460, padding: '1.75rem', maxHeight: '93vh', overflowY: 'auto' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', marginBottom: '1.25rem' }}>
          🍟 Canteen sale
        </h3>

        {/* Items */}
        <div style={{ background: 'var(--color-bg3)', borderRadius: 10, padding: '0.85rem', marginBottom: '1.25rem', border: '1px solid var(--color-border)' }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '0.35rem' }}>
              <span style={{ color: 'var(--color-text2)' }}>{item.name}</span>
              <span>₹{Math.round(item.price)}</span>
            </div>
          ))}
          {discountAmt > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--color-text3)' }}>
              <span>Discount</span>
              <span>-₹{Math.round(discountAmt)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', marginTop: '0.35rem', borderTop: '1px solid var(--color-border)' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Total</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-green)', fontSize: '1.15rem' }}>₹{total}</span>
          </div>
        </div>

        {/* Customer details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1rem' }}>
          <div>
            <label style={lbl}>Customer name (optional)</label>
            <input className="input-field" placeholder="Name"
              value={customerName} onChange={e => setCustomerName(e.target.value)}
              style={{ padding: '0.4rem 0.6rem' }} />
          </div>
          <div>
            <label style={lbl}>WhatsApp (optional)</label>
            <input className="input-field" placeholder="9876543210"
              value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
              style={{ padding: '0.4rem 0.6rem' }} />
          </div>
        </div>

        {/* Payment */}
        <PaymentSection
          paymentMode={paymentMode} setPaymentMode={setPaymentMode}
          cashAmt={cashAmt} setCashAmt={setCashAmt}
          upiAmt={upiAmt}   setUpiAmt={setUpiAmt}
          total={total} upiId={upiId} upiQrBase64={upiQrBase64}
          splitOk={splitOk} pendingAmt={pendingAmt}
        />

        {/* Discount — same hidden triple-click mechanism */}
        <div style={{ marginBottom: '1rem' }}>
          <DiscountSection subtotal={subtotal} discountAmt={discountAmt} setDiscountAmt={setDiscountAmt} ownerPin={ownerPin} />
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button onClick={onClose} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          <button onClick={handleConfirm} disabled={!splitOk} className="btn-primary"
            style={{ flex: 1, justifyContent: 'center', opacity: splitOk ? 1 : 0.5 }}>
            {customerPhone ? 'Confirm + Send Receipt' : 'Confirm ✓'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Table Checkout Modal ──────────────────────────────────────────
function BillModal({ table, upiId, upiQrBase64, upiQrUrl, clubName, ownerPin, onClose, onConfirm, onSave }) {
  const [paymentMode, setPaymentMode] = useState('upi')
  const [cashAmt,     setCashAmt]     = useState('')
  const [upiAmt,      setUpiAmt]      = useState('')
  const [discountAmt,       setDiscountAmt]       = useState(0)
  const [sending,           setSending]           = useState(false)
  const [showHiddenDiscount,setShowHiddenDiscount] = useState(false)
  const titleClickRef = useRef(0)

  // lateMinutes: extra time charged but NOT shown as "late check-in" on the bill.
  // The bill just shows a slightly longer billed duration with no mention of late arrival.
  const lateSeconds    = (table.lateMinutes || 0) * 60
  const billedSeconds  = table.elapsed + lateSeconds
  const newTableCharge = billedSeconds * table.ratePerMin / 60
  const tableCharge    = newTableCharge + (table.carriedAmount || 0)  // add carried from previous table
  const canteenTotal   = table.canteen.reduce((s, i) => s + i.price, 0)
  const subtotal       = Math.round(tableCharge + canteenTotal)
  const total          = Math.max(0, subtotal - Math.round(discountAmt))
  const ratePerHour    = Math.round(table.ratePerMin * 60)

  const now          = new Date()
  const checkOutTime = now
  const checkInTime  = table.startTime
    ? new Date(table.startTime)
    : new Date(now.getTime() - table.elapsed * 1000)

  const splitCash  = parseFloat(cashAmt) || 0
  const splitUpi   = parseFloat(upiAmt)  || 0
  const splitOk    = paymentMode !== 'split' || Math.abs(splitCash + splitUpi - total) < 1
  const paidAmt    = parseFloat(cashAmt) || 0
  const pendingAmt = Math.max(0, total - paidAmt)

  function buildMessage(billNo) {
    const club  = clubName || 'CueTrack'
    const greet = table.customer?.name ? `Hi *${table.customer.name}*! ` : ''
    const h = Math.floor(table.elapsed / 3600)
    const m = Math.floor((table.elapsed % 3600) / 60)
    const s = table.elapsed % 60
    const timeStr = h > 0
      ? `${h} hr ${String(m).padStart(2,'0')} min`
      : `${m} min ${String(s).padStart(2,'0')} sec`

    const lines = [
      `${greet}Here's your bill! 🎱`,
      '', `🏪 *${club}*`, `━━━━━━━━━━━━━━━━`,
      `🎱 *${table.name}* (${table.type} · ${table.size})`,
      `   Bill No: *${billNo || '—'}*`,
      `   Check-in:  *${fmtTime12(checkInTime)}*`,
      `   Check-out: *${fmtTime12(checkOutTime)}*`,
      `   Time: *${timeStr}*`,
      `   Rate: ₹${ratePerHour}/hr`,
      ...(table.carriedAmount > 0 ? [`   ${table.carriedNote}: *${fmtRound(table.carriedAmount)}*`] : []),
      `   ${table.carriedAmount > 0 ? '+ ' : ''}Table (${table.name}): *${fmtRound(newTableCharge)}*`,
    ]
    if (table.canteen.length > 0) {
      lines.push('', '🍟 *Canteen:*')
      table.canteen.forEach(i => lines.push(`   • ${i.name}  →  ${fmtRound(i.price)}`))
    }
    if (discountAmt > 0) lines.push(`   Discount: -${fmtRound(discountAmt)}`)
    const pmLabel = { cash: 'Cash', upi: 'UPI', split: 'UPI + Cash', paid_pending: 'Part paid' }[paymentMode] || paymentMode
    lines.push('', `━━━━━━━━━━━━━━━━`, `💰 *Total: ${fmtRound(total)}*`, `💳 *Payment: ${pmLabel}*`)
    if (paymentMode === 'split')        lines.push(`   Cash: ${fmtRound(splitCash)}  ·  UPI: ${fmtRound(splitUpi)}`)
    if (paymentMode === 'paid_pending') lines.push(`   Paid: ${fmtRound(paidAmt)}  ·  Pending: ${fmtRound(pendingAmt)}`)
    if ((paymentMode === 'upi' || paymentMode === 'split') && upiId) {
      const upiLink = `upi://pay?pa=${upiId}&am=${paymentMode === 'split' ? splitUpi : total}&tn=CueTrack&cu=INR`
      const qrFinal = upiQrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiLink)}`
      lines.push('', `📲 *UPI ID:* ${upiId}`, `📷 *Scan QR:* ${qrFinal}`)
    }
    lines.push('', 'Thank you for playing! See you soon 🎱')
    return encodeURIComponent(lines.join('\n'))
  }

  function buildBillData() {
    return {
      tableCharge:   Math.round(tableCharge),
      canteenTotal:  Math.round(canteenTotal),
      discount:      Math.round(discountAmt),
      total,
      paymentMode,
      cashAmount:    paymentMode === 'cash'         ? total      : paymentMode === 'split'        ? splitCash : paymentMode === 'paid_pending' ? paidAmt : 0,
      upiAmount:     paymentMode === 'upi'          ? total      : paymentMode === 'split'        ? splitUpi  : 0,
      pendingAmount: paymentMode === 'paid_pending' ? pendingAmt : 0,
    }
  }

  async function sendReceipt(billNo) {
    if (!table.customer?.phone) return
    const phone = sanitisePhone(table.customer.phone)
    if (!phone) return
    setSending(true)
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${buildMessage(billNo)}`, '_blank', 'noopener,noreferrer')
    setSending(false)
  }

  // Confirm = paid now, bill settled immediately
  async function handleConfirm() {
    if (!splitOk) return
    const billNo = await onConfirm(buildBillData())
    await sendReceipt(billNo)
  }

  // Save = save bill as unsettled (collect later), table resets, badge count goes up
  async function handleSave() {
    if (!splitOk) return
    const billNo = await onSave(buildBillData())
    await sendReceipt(billNo)
  }

  async function sendWhatsAppOnly() {
    if (!table.customer?.phone) return
    const phone = sanitisePhone(table.customer.phone)
    if (!phone) { alert('Invalid phone number — cannot send WhatsApp'); return }
    setSending(true)
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${buildMessage('preview')}`, '_blank', 'noopener,noreferrer')
    setSending(false)
  }

  return (
    <Modal onClose={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: 500, padding: '1.75rem', maxHeight: '93vh', overflowY: 'auto' }}>
        {/* Triple-click the title to reveal hidden discount field */}
        <h3
          onClick={() => { if (++titleClickRef.current >= 3) { setShowHiddenDiscount(true); titleClickRef.current = 0 } }}
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem', cursor: 'default', userSelect: 'none' }}>
          Checkout — {table.name}
        </h3>
        {table.customer?.name && (
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text3)', marginBottom: '0.75rem' }}>
            👤 {table.customer.name}{table.customer.phone ? ` · ${table.customer.phone}` : ''}
          </p>
        )}

        {/* Bill preview */}
        <div style={{ background: 'var(--color-bg3)', borderRadius: 10, padding: '1rem', marginBottom: '1.25rem', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem' }}>{table.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text3)', marginTop: 2 }}>
                {table.type} · {table.size} · ₹{ratePerHour}/hr
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--color-amber)' }}>
              {formatTimerDisplay(table.elapsed)}
            </div>
          </div>

          {/* Check-in / out */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem', padding: '0.55rem 0.7rem', background: 'rgba(255,255,255,0.03)', borderRadius: 7 }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-text3)', marginBottom: 2 }}>Check-in</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-green)' }}>{fmtTime12(checkInTime)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-text3)', marginBottom: 2 }}>Check-out</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-red)' }}>{fmtTime12(checkOutTime)}</div>
            </div>
          </div>

          {(table.carriedAmount||0) > 0 && (
            <BillRow label={table.carriedNote || 'Previous table'} value={fmtRound(table.carriedAmount)} muted />
          )}
          <BillRow label={`${(table.carriedAmount||0)>0?'+ ':''}Table (${formatTime(billedSeconds)} @ ₹${table.ratePerMin.toFixed(2)}/min)`} value={fmtRound(newTableCharge)} />
          {table.canteen.map((item, i) => <BillRow key={i} label={item.name} value={fmtRound(item.price)} muted />)}
          {discountAmt > 0 && <BillRow label="Discount" value={`-${fmtRound(discountAmt)}`} muted />}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', marginTop: '0.35rem', borderTop: '1px solid var(--color-border)' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Total</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-green)', fontSize: '1.2rem' }}>{fmtRound(total)}</span>
          </div>
        </div>

        {/* Payment */}
        <PaymentSection
          paymentMode={paymentMode} setPaymentMode={setPaymentMode}
          cashAmt={cashAmt} setCashAmt={setCashAmt}
          upiAmt={upiAmt}   setUpiAmt={setUpiAmt}
          total={total} upiId={upiId} upiQrBase64={upiQrBase64}
          splitOk={splitOk} pendingAmt={pendingAmt}
        />

        {/* Hidden discount — revealed by triple-clicking the title */}
        {showHiddenDiscount && (
          <div style={{ marginBottom: '1rem', padding: '0.6rem 0.85rem', background: 'var(--color-bg3)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
            <DiscountSection subtotal={subtotal} discountAmt={discountAmt} setDiscountAmt={setDiscountAmt} ownerPin={ownerPin} />
          </div>
        )}

        {/* WhatsApp note */}
        {table.customer?.phone && (
          <div style={{ marginBottom: '1rem', padding: '0.6rem 0.85rem', background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.15)', borderRadius: 8 }}>
            <p style={{ fontSize: '0.78rem', color: '#25d366' }}>
              📱 Receipt goes to {table.customer.phone} — press <strong>Send</strong> once WhatsApp opens.
            </p>
          </div>
        )}

        {/* Actions — 3 buttons */}
        {/* Cancel: discard, keep session open */}
        {/* Save:   bill saved as unsettled (collect later), table resets, badge count++ */}
        {/* Confirm: bill saved as settled (paid now), table resets */}
        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
          <button onClick={onClose} className="btn-ghost"
            style={{ flex:'1 1 80px', justifyContent:'center', minWidth:70 }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={!splitOk}
            style={{ flex:'1 1 100px', minWidth:90, padding:'0.65rem', borderRadius:8, border:'1px solid rgba(245,158,11,0.5)', background:'rgba(245,158,11,0.08)', color:'var(--color-amber)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.88rem', cursor:splitOk?'pointer':'not-allowed', opacity:splitOk?1:0.5, display:'flex', alignItems:'center', justifyContent:'center', gap:'0.3rem' }}>
            💾 Save
          </button>
          <button onClick={handleConfirm} disabled={!splitOk} className="btn-primary"
            style={{ flex:'1 1 100px', minWidth:90, justifyContent:'center', opacity:splitOk?1:0.5 }}>
            Confirm ✓
          </button>
        </div>
        <p style={{ fontSize:'0.72rem', color:'var(--color-text3)', textAlign:'center', marginTop:'0.5rem', lineHeight:1.5 }}>
          <strong style={{color:'var(--color-amber)'}}>Save</strong> — store bill, collect later &nbsp;·&nbsp;
          <strong style={{color:'var(--color-green)'}}>Confirm</strong> — paid now
          {!table.customer?.phone && <span> · No phone — WhatsApp unavailable</span>}
        </p>
      </div>
    </Modal>
  )
}


// ── Table Bills Modal ─────────────────────────────────────────────
// Shows all bills for a specific table today.
// Owner can settle individual pending bills or settle all at once.
function TableBillsModal({ table, bills, ownerPin, onClose }) {
  const [settling,       setSettling]       = useState(null)
  const [settlePayMode,  setSettlePayMode]  = useState({})
  const [confirmingId,   setConfirmingId]   = useState(null)
  // Split amounts per bill: { [billId]: { cash: '', upi: '' } }
  const [settleSplit,    setSettleSplit]    = useState({})
  // Discount per bill — hidden, revealed by triple-clicking the bill total
  const [discountState,  setDiscountState]  = useState({})
  // { [billId]: { clicks:0, pinShown:false, pinVal:'', pinErr:false, unlocked:false, amt:0 } }
  const clickTimers = {}  // reset click counter after 8000000ms

  // Filter: all bills for this table, today
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  const tableBills = bills
    .filter(b => b.tableId === String(table.id)
      && b.createdAt instanceof Date
      && b.settled === false   // only show unsettled (Save) bills
      && `${b.createdAt.getFullYear()}-${String(b.createdAt.getMonth()+1).padStart(2,'0')}-${String(b.createdAt.getDate()).padStart(2,'0')}` === todayKey)
    .sort((a,b) => b.createdAt - a.createdAt)  // newest first

  const totalAmount  = tableBills.reduce((s,b) => s + b.total, 0)
  const totalPending = tableBills.reduce((s,b) => s + (b.pendingAmount||0), 0)

  async function settleBill(billId, paymentMode, splitAmts) {
    const uid = auth.currentUser?.uid
    if (!uid) return
    // Validate split amounts if UPI+Cash selected
    if (paymentMode === 'split') {
      const cash = parseFloat(splitAmts?.cash) || 0
      const upi  = parseFloat(splitAmts?.upi)  || 0
      const bill = tableBills.find(b => b.id === billId)
      if (cash + upi !== Math.round(bill?.total || 0)) {
        alert(`Cash (₹${cash}) + UPI (₹${upi}) must equal total ₹${Math.round(bill?.total || 0)}`)
        return
      }
    }
    setSettling(billId)
    try {
      const updates = {
        settled:     true,
        paymentMode: paymentMode || 'cash',
        settledAt:   new Date().toISOString(),
      }
      if (paymentMode === 'split' && splitAmts) {
        updates.cashAmount = parseFloat(splitAmts.cash) || 0
        updates.upiAmount  = parseFloat(splitAmts.upi)  || 0
      }
      await updateDoc(doc(db, 'clubs', uid, 'bills', billId), updates)
    } catch(e) {
      alert('Failed to settle. Try again.')
    }
    setSettling(null)
    setConfirmingId(null)
  }

  // Opens the payment picker for a specific bill
  function startSettle(billId) {
    setConfirmingId(billId)
    // Default to the bill's original payment mode
    const bill = tableBills.find(b => b.id === billId)
    setSettlePayMode(prev => ({ ...prev, [billId]: bill?.paymentMode || 'cash' }))
  }

  function cancelSettle(billId) {
    setConfirmingId(null)
  }

  async function settleAll() {
    if (!tableBills.length) return
    const totalAmt = Math.round(tableBills.reduce((s,b)=>s+b.total,0))
    if (!window.confirm(`Settle all ${tableBills.length} bill(s) totalling ₹${totalAmt}?\nPayment mode for each will be what was selected, or Cash by default.`)) return
    for (const b of tableBills) {
      await settleBill(b.id, settlePayMode[b.id] || 'cash', settleSplit[b.id])
    }
  }

  // ── Discount helpers ─────────────────────────────────────
  function ds(billId) {
    return discountState[billId] || { clicks:0, pinShown:false, pinVal:'', pinErr:false, unlocked:false, amt:0 }
  }
  function setDs(billId, patch) {
    setDiscountState(p => ({ ...p, [billId]: { ...ds(billId), ...patch } }))
  }

  // Triple-click on bill total to reveal discount PIN
  function handleTotalClick(billId) {
    const current = ds(billId)
    const newClicks = (current.clicks || 0) + 1
    setDs(billId, { clicks: newClicks })
    // Reset counter after 8000000ms of inactivity
    clearTimeout(clickTimers[billId])
    clickTimers[billId] = setTimeout(() => setDs(billId, { clicks: 0 }), 8000000)
    if (newClicks >= 3) {
      setDs(billId, { clicks: 0, pinShown: true })
    }
  }

  function verifyDiscountPin(billId, pinVal) {
    const correct = ownerPin || localStorage.getItem('ct_owner_pin') || '1234'
    if (pinVal === correct) {
      setDs(billId, { pinShown: true, unlocked: true, pinErr: false, pinVal: '' })
    } else {
      setDs(billId, { pinErr: true, pinVal: '' })
    }
  }

  async function applyDiscount(billId, originalTotal, discountAmt) {
    const uid = auth.currentUser?.uid
    if (!uid || !discountAmt || discountAmt <= 0) return
    const newTotal = Math.max(0, Math.round(originalTotal) - Math.round(discountAmt))
    try {
      await updateDoc(doc(db, 'clubs', uid, 'bills', billId), {
        discount: Math.round(discountAmt),
        total:    newTotal,
      })
      setDs(billId, { unlocked: false, pinShown: false, amt: 0, clicks: 0 })
    } catch(e) {
      alert('Failed to apply discount. Try again.')
    }
  }

  function fmtT(d) {
    if (!d) return '—'
    return d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true })
  }

  const payTag = {
    cash:        { label:'Cash',           cls:'tag tag-green'  },
    upi:         { label:'UPI',            cls:'tag tag-blue'   },
    split:       { label:'UPI+Cash',       cls:'tag tag-blue'   },
    paid_pending:{ label:'Partially Paid', cls:'tag tag-amber'  },
  }

  return (
    <Modal onClose={onClose}>
      <div className="card" style={{ width:'100%', maxWidth:560, padding:'1.5rem', maxHeight:'88vh', overflowY:'auto' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem' }}>
          <div>
            <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.05rem' }}>
              {table.name} — Unsettled Bills
            </h3>
            <p style={{ fontSize:'0.78rem', color:'var(--color-text3)', marginTop:3 }}>
              {tableBills.length} session{tableBills.length !== 1 ? 's' : ''} · Total ₹{Math.round(totalAmount)}
              {totalPending > 0 && <span style={{ color:'var(--color-red)', marginLeft:8 }}>· ₹{Math.round(totalPending)} pending</span>}
            </p>
          </div>
          {tableBills.length > 0 && (
            <button onClick={settleAll} className="btn-primary"
              style={{ fontSize:'0.78rem', padding:'0.4rem 0.85rem', whiteSpace:'nowrap' }}>
              ✓ Settle all (₹{Math.round(totalAmount)})
            </button>
          )}
        </div>

        {/* Bill list */}
        {tableBills.length === 0 ? (
          <p style={{ color:'var(--color-text3)', textAlign:'center', padding:'2rem 0', fontSize:'0.9rem' }}>
            No bills for this table today yet.
          </p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
            {tableBills.map((b, idx) => {
              const checkIn  = b.checkInTime  ? new Date(b.checkInTime)  : null
              const checkOut = b.checkOutTime ? new Date(b.checkOutTime) : b.createdAt
              const isPending = b.paymentMode === 'paid_pending' && (b.pendingAmount||0) > 0
              // Show selected settle mode in tag when picker is open, else show original
              const displayMode = confirmingId === b.id && settlePayMode[b.id]
                ? settlePayMode[b.id]
                : b.paymentMode
              const tag = payTag[displayMode] || { label: displayMode, cls:'tag tag-green' }

              return (
                <div key={b.id} style={{
                  background: isPending ? 'rgba(245,158,11,0.05)' : 'var(--color-bg3)',
                  border: `1px solid ${isPending ? 'rgba(245,158,11,0.25)' : 'var(--color-border)'}`,
                  borderRadius: 10, padding:'0.9rem 1rem',
                  display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.75rem',
                }}>
                  {/* Left: bill info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:4 }}>
                      <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.82rem', color:'var(--color-green)' }}>
                        #{b.billNumber}
                      </span>
                      <span className={tag.cls} style={{ fontSize:'0.66rem' }}>{tag.label}</span>
                    </div>
                    <div style={{ fontSize:'0.82rem', color:'var(--color-text)', fontWeight:500, marginBottom:3 }}>
                      {fmtT(checkIn)} → {fmtT(checkOut)}
                      <span style={{ color:'var(--color-text3)', marginLeft:8, fontWeight:400 }}>
                        {Math.floor((b.elapsed||0)/60)}m {(b.elapsed||0)%60}s
                      </span>
                    </div>
                    <div style={{ fontSize:'0.75rem', color:'var(--color-text3)', display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
                      {(b.tableCharge||0) > 0 && <span>Table ₹{Math.round(b.tableCharge)}</span>}
                      {(b.canteenTotal||0) > 0 && <span>Canteen ₹{Math.round(b.canteenTotal)}</span>}
                      {(b.discount||0) > 0 && <span style={{ color:'var(--color-green)' }}>Discount -₹{Math.round(b.discount)}</span>}
                      {isPending && <span style={{ color:'var(--color-amber)', fontWeight:600 }}>Pending ₹{Math.round(b.pendingAmount)}</span>}
                    </div>
                  </div>

                  {/* Right: total + settle */}
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0.5rem', flexShrink:0 }}>
                    <span
                      onClick={() => handleTotalClick(b.id)}
                      title="Triple-click to apply discount"
                      style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1rem', color:'var(--color-green)', cursor:'default', userSelect:'none' }}>
                      ₹{Math.round(b.total)}
                      {(b.discount||0) > 0 && <span style={{ fontSize:'0.7rem', color:'var(--color-text3)', marginLeft:4 }}>(-₹{Math.round(b.discount)})</span>}
                    </span>

                    {confirmingId === b.id ? (
                      /* Payment mode picker — shown when Settle is tapped */
                      <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem', alignItems:'flex-end' }}>
                        {/* Payment mode buttons */}
                        <div style={{ display:'flex', gap:4 }}>
                          {[['cash','Cash'],['upi','UPI'],['split','UPI+Cash'],['paid_pending','Paid+Pending']].map(([mode, label]) => (
                            <button key={mode}
                              onClick={() => setSettlePayMode(p => ({...p, [b.id]: mode}))}
                              style={{
                                padding:'3px 8px', borderRadius:5, fontSize:'0.7rem',
                                fontFamily:'var(--font-display)', fontWeight:600, cursor:'pointer',
                                border: (settlePayMode[b.id]||'cash') === mode
                                  ? '1px solid var(--color-green)'
                                  : '1px solid var(--color-border)',
                                background: (settlePayMode[b.id]||'cash') === mode
                                  ? 'var(--color-green-glow)'
                                  : 'transparent',
                                color: (settlePayMode[b.id]||'cash') === mode
                                  ? 'var(--color-green)'
                                  : 'var(--color-text3)',
                              }}>
                              {label}
                            </button>
                          ))}
                        </div>
                        {/* Split amount inputs — shown only when UPI+Cash selected */}
                        {(settlePayMode[b.id]||'cash') === 'split' && (() => {
                          const spl   = settleSplit[b.id] || { cash:'', upi:'' }
                          const cash  = parseFloat(spl.cash) || 0
                          const upi   = parseFloat(spl.upi)  || 0
                          const total = Math.round(b.total)
                          const ok    = Math.round(cash + upi) === total
                          return (
                            <div style={{ display:'flex', flexDirection:'column', gap:4, width:'100%' }}>
                              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                                <span style={{ fontSize:'0.68rem', color:'var(--color-text3)', minWidth:32 }}>Cash</span>
                                <input type="number" min="0" max={total} placeholder="0"
                                  value={spl.cash}
                                  onChange={e => {
                                    const c = e.target.value
                                    const remaining = Math.max(0, total - (parseFloat(c)||0))
                                    setSettleSplit(p => ({...p, [b.id]: { cash: c, upi: String(remaining) }}))
                                  }}
                                  style={{ width:60, padding:'2px 5px', borderRadius:4, border:'1px solid var(--color-border)', background:'var(--color-bg2)', color:'var(--color-text)', fontSize:'0.78rem' }} />
                              </div>
                              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                                <span style={{ fontSize:'0.68rem', color:'var(--color-text3)', minWidth:32 }}>UPI</span>
                                <input type="number" min="0" max={total} placeholder="0"
                                  value={spl.upi}
                                  onChange={e => setSettleSplit(p => ({...p, [b.id]: { ...spl, upi: e.target.value }}))}
                                  style={{ width:60, padding:'2px 5px', borderRadius:4, border:'1px solid var(--color-border)', background:'var(--color-bg2)', color:'var(--color-text)', fontSize:'0.78rem' }} />
                              </div>
                              <div style={{ fontSize:'0.68rem', color: ok ? 'var(--color-green)' : 'var(--color-red)' }}>
                                {ok ? `✓ ₹${cash} + ₹${upi} = ₹${total}` : `Sum ₹${Math.round(cash+upi)} ≠ ₹${total}`}
                              </div>
                            </div>
                          )
                        })()}

                                                {/* Paid+Pending input */}
                        {(settlePayMode[b.id]||'cash') === 'paid_pending' && (() => {
                          const spl     = settleSplit[b.id] || { cash:'' }
                          const paidNow = parseFloat(spl.cash) || 0
                          const pending = Math.max(0, Math.round(b.total) - paidNow)
                          return (
                            <div style={{ display:'flex', flexDirection:'column', gap:4, width:'100%' }}>
                              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                                <span style={{ fontSize:'0.68rem', color:'var(--color-text3)', minWidth:48 }}>Paid now</span>
                                <input type="number" min="0" max={Math.round(b.total)} placeholder="0"
                                  value={spl.cash}
                                  onChange={e => setSettleSplit(p => ({...p, [b.id]: { cash: e.target.value }}))}
                                  style={{ width:60, padding:'2px 5px', borderRadius:4, border:'1px solid var(--color-border)', background:'var(--color-bg2)', color:'var(--color-text)', fontSize:'0.78rem' }} />
                              </div>
                              <div style={{ fontSize:'0.68rem', color:'var(--color-amber)' }}>
                                Pending: ₹{pending}
                              </div>
                            </div>
                          )
                        })()}

                        {/* Confirm / Cancel */}

                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={() => cancelSettle(b.id)}
                            style={{ padding:'3px 8px', borderRadius:5, fontSize:'0.7rem', border:'1px solid var(--color-border)', background:'transparent', color:'var(--color-text3)', cursor:'pointer' }}>
                            Cancel
                          </button>
                          <button
                            onClick={() => settleBill(b.id, settlePayMode[b.id] || 'cash', settleSplit[b.id])}
                            disabled={settling === b.id}
                            style={{ padding:'3px 10px', borderRadius:5, fontSize:'0.72rem', border:'1px solid var(--color-green)', background:'var(--color-green-glow)', color:'var(--color-green)', cursor:'pointer', fontWeight:700, opacity: settling===b.id ? 0.6 : 1 }}>
                            {settling === b.id ? '...' : '✓ Confirm'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Normal settle button */
                      <button
                        onClick={() => startSettle(b.id)}
                        disabled={settling === b.id}
                        style={{ fontSize:'0.72rem', padding:'3px 10px', borderRadius:6, border:'1px solid var(--color-green)', background:'var(--color-green-glow)', color:'var(--color-green)', cursor:'pointer', fontWeight:600 }}>
                        Settle ₹{Math.round(b.total)}
                      </button>
                    )}
                  {/* Hidden discount — triple-click bill total to reveal */}
                  {ds(b.id).pinShown && !ds(b.id).unlocked && (
                    <div style={{ marginTop:'0.4rem', display:'flex', gap:'0.4rem', alignItems:'center' }}>
                      <input
                        type="password" placeholder="PIN" maxLength={8}
                        value={ds(b.id).pinVal || ''}
                        onChange={e => setDs(b.id, { pinVal: e.target.value, pinErr: false })}
                        onKeyDown={e => e.key==='Enter' && verifyDiscountPin(b.id, ds(b.id).pinVal)}
                        style={{ width:80, padding:'3px 7px', borderRadius:5, border:`1px solid ${ds(b.id).pinErr?'var(--color-red)':'var(--color-border)'}`, background:'var(--color-bg2)', color:'var(--color-text)', fontSize:'0.78rem' }}
                        autoFocus
                      />
                      <button onClick={() => verifyDiscountPin(b.id, ds(b.id).pinVal)}
                        style={{ padding:'3px 8px', borderRadius:5, fontSize:'0.72rem', border:'1px solid var(--color-border)', background:'var(--color-bg3)', color:'var(--color-text2)', cursor:'pointer' }}>
                        Unlock
                      </button>
                      <button onClick={() => setDs(b.id, { pinShown:false, clicks:0 })}
                        style={{ background:'none', border:'none', color:'var(--color-text3)', cursor:'pointer', fontSize:'0.78rem' }}>✕</button>
                      {ds(b.id).pinErr && <span style={{ fontSize:'0.7rem', color:'var(--color-red)' }}>Wrong PIN</span>}
                    </div>
                  )}
                  {ds(b.id).unlocked && (
                    <div style={{ marginTop:'0.4rem', display:'flex', gap:'0.4rem', alignItems:'center', flexWrap:'wrap' }}>
                      <span style={{ fontSize:'0.75rem', color:'var(--color-text3)' }}>Discount ₹:</span>
                      <input
                        type="number" min="0" max={b.total} placeholder="0"
                        value={ds(b.id).amt || ''}
                        onChange={e => setDs(b.id, { amt: parseFloat(e.target.value)||0 })}
                        style={{ width:70, padding:'3px 6px', borderRadius:5, border:'1px solid var(--color-amber)', background:'var(--color-bg2)', color:'var(--color-text)', fontSize:'0.82rem', fontWeight:600 }}
                      />
                      <button
                        onClick={() => applyDiscount(b.id, b.total, ds(b.id).amt)}
                        style={{ padding:'3px 8px', borderRadius:5, fontSize:'0.72rem', border:'1px solid var(--color-green)', background:'var(--color-green-glow)', color:'var(--color-green)', cursor:'pointer', fontWeight:600 }}>
                        Apply
                      </button>
                      <button onClick={() => setDs(b.id, { unlocked:false, pinShown:false, amt:0 })}
                        style={{ background:'none', border:'none', color:'var(--color-text3)', cursor:'pointer', fontSize:'0.78rem' }}>✕</button>
                      {ds(b.id).amt > 0 && (
                        <span style={{ fontSize:'0.7rem', color:'var(--color-amber)' }}>
                          New total: ₹{Math.max(0, Math.round(b.total) - Math.round(ds(b.id).amt))}
                        </span>
                      )}
                    </div>
                  )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer total */}
        {tableBills.length > 1 && (
          <div style={{ marginTop:'1rem', paddingTop:'0.75rem', borderTop:'1px solid var(--color-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.9rem', color:'var(--color-text2)' }}>
              Unsettled total ({tableBills.length} session{tableBills.length !== 1 ? 's' : ''})
            </span>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.1rem', color:'var(--color-green)' }}>
              ₹{Math.round(totalAmount)}
            </span>
          </div>
        )}

        <button onClick={onClose} className="btn-ghost"
          style={{ width:'100%', justifyContent:'center', marginTop:'1rem' }}>
          Close
        </button>
      </div>
    </Modal>
  )
}


// ── Transfer Session Modal ────────────────────────────────────────
// Moves a running/paused session from one table to another.
// Only available tables are shown as transfer targets.
function TransferModal({ fromTable, availableTables, onConfirm, onClose }) {
  const [targetId, setTargetId] = useState(null)

  return (
    <Modal onClose={onClose}>
      <div className="card" style={{ width:'100%', maxWidth:380, padding:'1.5rem' }}>
        <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, marginBottom:'0.35rem' }}>
          Transfer session
        </h3>
        <p style={{ fontSize:'0.82rem', color:'var(--color-text3)', marginBottom:'1.25rem' }}>
          Moving <strong>{fromTable.name}</strong> ({formatTimerDisplay(fromTable.elapsed)} elapsed)
          to a new table. Timer continues from where it left off.
        </p>

        {availableTables.length === 0 ? (
          <p style={{ fontSize:'0.88rem', color:'var(--color-amber)', marginBottom:'1.25rem' }}>
            No available tables to transfer to.
          </p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', marginBottom:'1.25rem' }}>
            {availableTables.map(t => (
              <button key={t.id} onClick={() => setTargetId(t.id)}
                style={{
                  padding:'0.7rem 1rem', borderRadius:8, textAlign:'left', cursor:'pointer',
                  fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.88rem',
                  border: targetId === t.id ? '1px solid var(--color-green)' : '1px solid var(--color-border)',
                  background: targetId === t.id ? 'var(--color-green-glow)' : 'var(--color-bg3)',
                  color: targetId === t.id ? 'var(--color-green)' : 'var(--color-text)',
                  transition:'all 0.15s',
                }}>
                <div>{t.name}</div>
                <div style={{ fontSize:'0.72rem', fontWeight:400, color: targetId===t.id ? 'var(--color-green)' : 'var(--color-text3)', marginTop:2 }}>
                  {t.type} · {t.size} · ₹{Math.round(t.ratePerMin*60)}/hr
                </div>
              </button>
            ))}
          </div>
        )}

        <div style={{ display:'flex', gap:'0.6rem' }}>
          <button onClick={onClose} className="btn-ghost" style={{ flex:1, justifyContent:'center' }}>
            Cancel
          </button>
          <button
            onClick={() => targetId && onConfirm(targetId)}
            disabled={!targetId}
            className="btn-primary"
            style={{ flex:1, justifyContent:'center', opacity: targetId ? 1 : 0.45 }}>
            ↗ Transfer
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Table card ────────────────────────────────────────────────────
function TableCard({ table, onStart, onEditCustomer, onPause, onResume, onEnd, onAddCanteen, onRemoveCanteen, onDelete, todayBillCount, onShowBills, onTransfer }) {
  const lateSeconds   = (table.lateMinutes || 0) * 60
  const billedCost    = (table.elapsed + lateSeconds) * table.ratePerMin / 60
  const carried       = table.carriedAmount || 0
  const totalCost     = billedCost + carried   // carried from previous table(s) + current
  const cost          = table.elapsed * table.ratePerMin / 60
  const canteenTotal  = table.canteen.reduce((s, i) => s + i.price, 0)

  const statusColor = { available: 'var(--color-green)', running: 'var(--color-amber)', paused: 'var(--color-blue)' }
  const statusClass = { available: 'table-available', running: 'table-running running-border', paused: 'table-paused' }

  const sc  = statusColor[table.status]
  const cls = statusClass[table.status]

  return (
    <div className={`card ${cls}`} style={{ padding: '1.25rem', border: '1px solid', borderColor: sc, transition: 'border-color 0.3s' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.97rem' }}>{table.name}</h3>
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            <span className={table.type === 'Pool' ? 'tag tag-blue' : 'tag tag-green'} style={{ fontSize: '0.68rem' }}>{table.type}</span>
            <span className="tag tag-blue" style={{ fontSize: '0.68rem' }}>{table.size}</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          {/* Bill count badge — click to see today's bills for this table */}
          {todayBillCount > 0 && (
            <button
              onClick={onShowBills}
              title={`${todayBillCount} bill${todayBillCount>1?'s':''} today — click to view`}
              style={{ width:22, height:22, borderRadius:'50%', background:'var(--color-red)', border:'none', color:'#fff', fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.72rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {todayBillCount}
            </button>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:'0.3rem', fontSize:'0.72rem', color: sc, fontFamily:'var(--font-display)', fontWeight:600, textTransform:'capitalize' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:sc, animation:table.status==='running'?'pulse-dot 1.5s infinite':'none' }} />
            {table.status}
          </div>
        </div>
      </div>

      {/* Customer info + edit */}
      {table.status !== 'available' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text3)' }}>
            {table.customer?.name
              ? `👤 ${table.customer.name}${table.customer.phone ? ` · ${table.customer.phone}` : ''}`
              : '👤 No customer details'}
          </div>
          <button
            onClick={() => onEditCustomer(table.id)}
            style={{ fontSize: '0.7rem', color: 'var(--color-text3)', background: 'none', border: '1px solid var(--color-border)', borderRadius: 5, padding: '2px 6px', cursor: 'pointer' }}
            onMouseEnter={e => e.target.style.color = 'var(--color-text)'}
            onMouseLeave={e => e.target.style.color = 'var(--color-text3)'}
          >
            Edit
          </button>
        </div>
      )}

      {/* Timer — shows billedTime (elapsed + late) if late check-in is set,
           otherwise shows elapsed. This is also what drives the delete guard. */}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2.4rem', letterSpacing: '-0.02em', color: table.status === 'available' ? 'var(--color-text3)' : 'var(--color-text)', marginBottom: '0.2rem', animation: table.status === 'running' ? 'tick 1s infinite' : 'none' }}>
        {formatTimerDisplay(table.elapsed + (table.lateMinutes||0)*60)}
      </div>

      {/* Show late indicator so owner knows why timer is higher */}
      {table.status !== 'available' && table.lateMinutes > 0 && (
        <div style={{ fontSize: '0.72rem', color: 'var(--color-amber)', marginBottom: '0.2rem', fontWeight: 500 }}>
          ⏱ 
        </div>
      )}

      {/* Cost — uses billedSeconds (elapsed + late) for accurate amount */}
      <div style={{ fontSize: '0.95rem', fontFamily: 'var(--font-display)', fontWeight: 600, color: table.status === 'available' ? 'var(--color-text3)' : 'var(--color-amber)', marginBottom: '0.25rem' }}>
        {table.status === 'available'
          ? `₹${Math.round(table.ratePerMin * 60)}/hr`
          : `${fmtRound(totalCost + canteenTotal)}${canteenTotal > 0 ? ` (incl. ₹${Math.round(canteenTotal)} canteen)` : ''}`}
      </div>
      {/* Show carried amount indicator when session transferred from another table */}
      {table.status !== 'available' && carried > 0 && (
        <div style={{ fontSize:'0.72rem', color:'var(--color-text3)', marginBottom:'0.15rem' }}>
          {table.carriedNote} + ₹{Math.round(billedCost)} here
        </div>
      )}

      {/* Canteen items with delete */}
      {table.canteen.length > 0 && (
        <div style={{ marginBottom: '0.6rem' }}>
          {table.canteen.map((item, i) => (
            <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginRight: 4, marginBottom: 4 }}>
              <span className="tag tag-amber" style={{ fontSize: '0.68rem' }}>{item.name}</span>
              <button
                onClick={() => onRemoveCanteen(table.id, i)}
                style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(239,68,68,0.2)', border: 'none', color: 'var(--color-red)', cursor: 'pointer', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem' }}>
        {table.status === 'available' && (
          <button onClick={() => onStart(table.id)} className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '0.5rem', fontSize: '0.85rem' }}>
            ▶ Start
          </button>
        )}
        {table.status === 'running' && (
          <>
            <button onClick={() => onPause(table.id)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '0.5rem', fontSize: '0.85rem' }}>⏸ Pause</button>
            <button onClick={() => onAddCanteen(table.id)} className="btn-ghost" style={{ flex: 'none', padding: '0.5rem 0.7rem', fontSize: '0.85rem' }}>🍟</button>
            <button onClick={() => onEnd(table.id)} style={{ flex: 1, padding: '0.5rem', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: 'var(--color-red)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>■ End</button>
            <button onClick={() => onTransfer(table.id)} title="Transfer session to another table" style={{ flex: 'none', padding: '0.5rem 0.6rem', borderRadius: 8, border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.08)', color: 'rgba(99,102,241,0.85)', cursor: 'pointer', fontSize: '0.8rem' }}>↗</button>
            <button onClick={() => onDelete(table.id, table.elapsed + (table.lateMinutes||0)*60)} title="Delete session (only if < 3 min)" style={{ flex: 'none', padding: '0.5rem 0.6rem', borderRadius: 8, border: '1px solid rgba(239,68,68,0.25)', background: 'transparent', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', fontSize: '0.8rem' }}>🗑</button>
          </>
        )}
        {table.status === 'paused' && (
          <>
            <button onClick={() => onResume(table.id)} className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '0.5rem', fontSize: '0.85rem' }}>▶ Resume</button>
            <button onClick={() => onAddCanteen(table.id)} className="btn-ghost" style={{ flex: 'none', padding: '0.5rem 0.7rem', fontSize: '0.85rem' }}>🍟</button>
            <button onClick={() => onEnd(table.id)} style={{ flex: 'none', padding: '0.5rem 0.85rem', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: 'var(--color-red)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>■ End</button>
            <button onClick={() => onTransfer(table.id)} title="Transfer session to another table" style={{ flex: 'none', padding: '0.5rem 0.6rem', borderRadius: 8, border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.08)', color: 'rgba(99,102,241,0.85)', cursor: 'pointer', fontSize: '0.8rem' }}>↗</button>
            <button onClick={() => onDelete(table.id, table.elapsed + (table.lateMinutes||0)*60)} title="Delete session (only if < 3 min)" style={{ flex: 'none', padding: '0.5rem 0.6rem', borderRadius: 8, border: '1px solid rgba(239,68,68,0.25)', background: 'transparent', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', fontSize: '0.8rem' }}>🗑</button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Tables page ──────────────────────────────────────────────
export default function Tables() {
  const { settings } = useClubSettings()
  const { bills } = useBills()
  const {
    tables, loading,
    startTable, pauseTable, resumeTable,
    addCanteenItems, removeCanteenItem, updateCustomer,
    checkoutTable, saveCanteenBill, resetTable, transferTable,
  } = useTables(settings.tables)

  const [editCustomerId,    setEditCustomerId]    = useState(null)
  const [checkoutTarget,    setCheckoutTarget]    = useState(null)
  const [canteenTarget,     setCanteenTarget]     = useState(null)
  const [billsTarget,       setBillsTarget]       = useState(null)
  const [transferTarget,    setTransferTarget]    = useState(null)
  const [standaloneCanteen, setStandaloneCanteen] = useState(false)
  const [standaloneItems,   setStandaloneItems]   = useState([])
  const [canteenCheckout,   setCanteenCheckout]   = useState(false)

  // Tick every second for live timers
  const [, setTick] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(iv)
  }, [])

  // Badge count = UNSETTLED bills per table today
  // settled=false (Save) → counted in badge
  // settled=true  (Confirm) → not counted (already paid)
  const todayStr = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  })()
  const todayBillsByTable = bills.reduce((acc, b) => {
    if (!(b.createdAt instanceof Date)) return acc
    if (b.settled !== false) return acc  // only count unsettled (Save) bills
    const dk = `${b.createdAt.getFullYear()}-${String(b.createdAt.getMonth()+1).padStart(2,'0')}-${String(b.createdAt.getDate()).padStart(2,'0')}`
    if (dk !== todayStr) return acc
    acc[b.tableId] = (acc[b.tableId] || 0) + 1
    return acc
  }, {})

  const liveTables = tables.map(t => {
    if (t.status === 'running' && t.startTime) {
      return { ...t, elapsed: t.elapsed + Math.floor((Date.now() - t.startTime) / 1000) }
    }
    return t
  })

  async function handleEditCustomer(tableId, customer, lateMinutes) {
    await updateCustomer(tableId, customer, lateMinutes)
    setEditCustomerId(null)
  }

  async function handlePause(tableId) {
    const t = liveTables.find(t => t.id === tableId)
    await pauseTable(tableId, t.elapsed)
  }

  // Delete session — only allowed if timer < 3 minutes (180 seconds)
  // Resets table to available WITHOUT saving any bill record
  async function handleDelete(tableId, currentElapsed) {
    if (currentElapsed > 180) {
      alert(`Cannot delete — timer is over 3 minutes (${Math.floor(currentElapsed/60)}m ${currentElapsed%60}s). Use End to checkout normally.`)
      return
    }
    if (!window.confirm('Delete this session? No bill will be saved and this cannot be undone.')) return
    // Reset table to available — same as checkout but no addDoc call
    await resetTable(String(tableId))
  }

  async function handleAddCanteen(tableId, items) {
    const t = liveTables.find(t => t.id === tableId)
    await addCanteenItems(tableId, t.canteen, items)
    setCanteenTarget(null)
  }

  async function handleRemoveCanteen(tableId, index) {
    const t = liveTables.find(t => t.id === tableId)
    await removeCanteenItem(tableId, t.canteen, index)
  }

  async function handleConfirmCheckout(billData) {
    // Confirm = settled immediately
    const billNo = await checkoutTable(checkoutTarget, billData, true)
    setCheckoutTarget(null)
    return billNo
  }

  async function handleSaveCheckout(billData) {
    // Save = unsettled (collect later), badge count goes up
    const billNo = await checkoutTable(checkoutTarget, billData, false)
    setCheckoutTarget(null)
    return billNo
  }

  const stats = [
    { label: 'Available',   value: liveTables.filter(t => t.status === 'available').length,  color: 'var(--color-green)' },
    { label: 'Running',     value: liveTables.filter(t => t.status === 'running').length,    color: 'var(--color-amber)' },
    { label: 'Paused',      value: liveTables.filter(t => t.status === 'paused').length,     color: 'var(--color-blue)'  },
    { label: 'Earning now', value: '₹' + Math.round(liveTables.reduce((s, t) => s + ((t.elapsed + (t.lateMinutes||0)*60) * t.ratePerMin / 60) + (t.carriedAmount||0) + t.canteen.reduce((c, i) => c + i.price, 0), 0)), color: 'var(--color-text)' },
  ]

  if (loading) {
    return <div style={{ color: 'var(--color-text3)', padding: '2rem', textAlign: 'center' }}>Loading tables...</div>
  }

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding: '0.85rem 1.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text3)' }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.3rem', color: s.color, marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
        <button
          onClick={() => setStandaloneCanteen(true)}
          className="btn-ghost"
          style={{ marginLeft: 'auto', fontSize: '0.85rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          🍟 Canteen sale
        </button>
      </div>

      {/* Table grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))', gap: '1rem' }}>
        {liveTables.map(table => (
          <TableCard
            key={table.id} table={table}
            onStart={(id) => startTable(id, null, 0)}
            onEditCustomer={setEditCustomerId}
            onPause={handlePause}
            onResume={resumeTable}
            onEnd={(id) => setCheckoutTarget(liveTables.find(t => t.id === id))}
            onAddCanteen={setCanteenTarget}
            onRemoveCanteen={handleRemoveCanteen}
            onDelete={handleDelete}
            todayBillCount={todayBillsByTable[table.id] || 0}
            onShowBills={() => setBillsTarget(table)}
            onTransfer={(id) => setTransferTarget(liveTables.find(t => t.id === id))}
          />
        ))}
      </div>

      {/* ── Modals ── */}
      {/* Start is now instant — no modal. Use Edit button to add customer details. */}

      {editCustomerId && (
        <CustomerModal
          table={liveTables.find(t => t.id === editCustomerId)}
          isEditing={true}
          onConfirm={(customer, lateMinutes) => handleEditCustomer(editCustomerId, customer, lateMinutes)}
          onClose={() => setEditCustomerId(null)}
        />
      )}

      {canteenTarget && (
        <CanteenModal
          table={liveTables.find(t => t.id === canteenTarget)}
          onAdd={(items) => handleAddCanteen(canteenTarget, items)}
          onClose={() => setCanteenTarget(null)}
        />
      )}

      {standaloneCanteen && (
        <CanteenModal
          table={null}
          onAdd={(items) => {
            setStandaloneItems(items)
            setStandaloneCanteen(false)
            setCanteenCheckout(true)
          }}
          onClose={() => setStandaloneCanteen(false)}
        />
      )}

      {canteenCheckout && (
        <CanteenCheckoutModal
          items={standaloneItems}
          upiId={settings.upiId}
          upiQrBase64={settings.upiQrBase64}
          upiQrUrl={settings.upiQrUrl}
          clubName={settings.clubName}
          ownerPin={settings.ownerPin}
          onClose={() => { setCanteenCheckout(false); setStandaloneItems([]) }}
          onConfirm={async (billData) => {
            const billNo = await saveCanteenBill(standaloneItems, billData)
            setCanteenCheckout(false)
            setStandaloneItems([])
            return billNo
          }}
        />
      )}

      {checkoutTarget && (
        <BillModal
          table={checkoutTarget}
          upiId={settings.upiId}
          upiQrBase64={settings.upiQrBase64}
          upiQrUrl={settings.upiQrUrl}
          clubName={settings.clubName}
          ownerPin={settings.ownerPin}
          onClose={() => setCheckoutTarget(null)}
          onConfirm={handleConfirmCheckout}
          onSave={handleSaveCheckout}
        />
      )}

      {billsTarget && (
        <TableBillsModal
          table={billsTarget}
          bills={bills}
          ownerPin={settings.ownerPin}
          onClose={() => setBillsTarget(null)}
        />
      )}

      {transferTarget && (
        <TransferModal
          fromTable={transferTarget}
          availableTables={liveTables.filter(t => t.status === 'available')}
          onClose={() => setTransferTarget(null)}
          onConfirm={async (toTableId) => {
            await transferTable(transferTarget, toTableId)
            setTransferTarget(null)
          }}
        />
      )}
    </div>
  )
}