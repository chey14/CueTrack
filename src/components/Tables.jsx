import { useState, useEffect, useRef } from 'react'
import { useClubSettings } from '../hooks/useClubSettings'
import { useTables } from '../hooks/useTables'

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
          {!isEditing && (
            <div>
              <label style={lbl}>Late check-in (minutes)</label>
              <input className="input-field" type="number" min="0" placeholder="0"
                value={lateMinutes} onChange={e => setLateMinutes(parseInt(e.target.value) || 0)} />
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text3)', marginTop: 3 }}>
                If customer arrived earlier — not shown on bill.
              </p>
            </div>
          )}
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
function DiscountSection({ subtotal, discountAmt, setDiscountAmt }) {
  const [show,      setShow]      = useState(false)
  const [pin,       setPin]       = useState('')
  const [pinErr,    setPinErr]    = useState(false)
  const [unlocked,  setUnlocked]  = useState(false)

  function verify() {
    const ownerPin = localStorage.getItem('ct_owner_pin') || '1234'
    if (pin === ownerPin) { setUnlocked(true); setPinErr(false) }
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
function CanteenCheckoutModal({ items, upiId, upiQrBase64, upiQrUrl, clubName, onClose, onConfirm }) {
  const [paymentMode,    setPaymentMode]    = useState('cash')
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
      let phone = customerPhone.replace(/\D/g, '')
      if (phone.length === 10) phone = '91' + phone
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

        {/* Hidden discount — revealed by triple-clicking the title */}
        {showHiddenDiscount && (
          <div style={{ marginBottom: '1rem', padding: '0.6rem 0.85rem', background: 'var(--color-bg3)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
            <DiscountSection subtotal={subtotal} discountAmt={discountAmt} setDiscountAmt={setDiscountAmt} />
          </div>
        )}

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
function BillModal({ table, upiId, upiQrBase64, upiQrUrl, clubName, onClose, onConfirm }) {
  const [paymentMode, setPaymentMode] = useState('cash')
  const [cashAmt,     setCashAmt]     = useState('')
  const [upiAmt,      setUpiAmt]      = useState('')
  const [discountAmt,       setDiscountAmt]       = useState(0)
  const [sending,           setSending]           = useState(false)
  const [showHiddenDiscount,setShowHiddenDiscount] = useState(false)
  const titleClickRef = useRef(0)

  // lateMinutes: extra time charged but NOT shown as "late check-in" on the bill.
  // The bill just shows a slightly longer billed duration with no mention of late arrival.
  const lateSeconds   = (table.lateMinutes || 0) * 60
  const billedSeconds = table.elapsed + lateSeconds
  const tableCharge   = billedSeconds * table.ratePerMin / 60
  const canteenTotal  = table.canteen.reduce((s, i) => s + i.price, 0)
  const subtotal      = Math.round(tableCharge + canteenTotal)
  const total         = Math.max(0, subtotal - Math.round(discountAmt))
  const ratePerHour   = Math.round(table.ratePerMin * 60)

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
      `   Table: *${fmtRound(tableCharge)}*`,
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

  async function handleConfirm() {
    if (!splitOk) return
    const billData = {
      tableCharge:   Math.round(tableCharge),
      canteenTotal:  Math.round(canteenTotal),
      discount:      Math.round(discountAmt),
      total,
      paymentMode,
      cashAmount:    paymentMode === 'cash'         ? total      : paymentMode === 'split'        ? splitCash : paymentMode === 'paid_pending' ? paidAmt : 0,
      upiAmount:     paymentMode === 'upi'          ? total      : paymentMode === 'split'        ? splitUpi  : 0,
      pendingAmount: paymentMode === 'paid_pending' ? pendingAmt : 0,
    }
    const billNo = await onConfirm(billData)
    if (table.customer?.phone) {
      let phone = table.customer.phone.replace(/\D/g, '')
      if (phone.length === 10) phone = '91' + phone
      setSending(true)
      window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${buildMessage(billNo)}`, '_blank', 'noopener,noreferrer')
      setSending(false)
    }
  }

  async function sendWhatsAppOnly() {
    if (!table.customer?.phone) return
    let phone = table.customer.phone.replace(/\D/g, '')
    if (phone.length === 10) phone = '91' + phone
    setSending(true)
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${buildMessage('')}`, '_blank', 'noopener,noreferrer')
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

          <BillRow label={`Table (${formatTime(billedSeconds)} @ ₹${table.ratePerMin.toFixed(2)}/min)`} value={fmtRound(tableCharge)} />
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
            <DiscountSection subtotal={subtotal} discountAmt={discountAmt} setDiscountAmt={setDiscountAmt} />
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

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button onClick={onClose} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          {table.customer?.phone && (
            <button onClick={sendWhatsAppOnly} disabled={sending}
              style={{ flex: 1, padding: '0.65rem', borderRadius: 8, border: '1px solid rgba(37,211,102,0.4)', background: 'rgba(37,211,102,0.08)', color: '#25d366', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
              {sending ? 'Opening...' : '📲 Preview receipt'}
            </button>
          )}
          <button onClick={handleConfirm} disabled={!splitOk} className="btn-primary"
            style={{ flex: 1, justifyContent: 'center', opacity: splitOk ? 1 : 0.5 }}>
            Confirm ✓
          </button>
        </div>
        {!table.customer?.phone && (
          <p style={{ fontSize: '0.72rem', color: 'var(--color-text3)', textAlign: 'center', marginTop: '0.5rem' }}>
            No phone — WhatsApp receipt unavailable.
          </p>
        )}
      </div>
    </Modal>
  )
}

// ── Table card ────────────────────────────────────────────────────
function TableCard({ table, onStart, onEditCustomer, onPause, onResume, onEnd, onAddCanteen, onRemoveCanteen }) {
  const cost         = table.elapsed * table.ratePerMin / 60
  const canteenTotal = table.canteen.reduce((s, i) => s + i.price, 0)

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: sc, fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'capitalize' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc, animation: table.status === 'running' ? 'pulse-dot 1.5s infinite' : 'none' }} />
          {table.status}
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

      {/* Timer */}
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2.4rem', letterSpacing: '-0.02em', color: table.status === 'available' ? 'var(--color-text3)' : 'var(--color-text)', marginBottom: '0.2rem', animation: table.status === 'running' ? 'tick 1s infinite' : 'none' }}>
        {formatTimerDisplay(table.elapsed)}
      </div>

      {/* Cost */}
      <div style={{ fontSize: '0.95rem', fontFamily: 'var(--font-display)', fontWeight: 600, color: table.status === 'available' ? 'var(--color-text3)' : 'var(--color-amber)', marginBottom: '0.25rem' }}>
        {table.status === 'available'
          ? `₹${Math.round(table.ratePerMin * 60)}/hr`
          : `${fmtRound(cost + canteenTotal)}${canteenTotal > 0 ? ` (incl. ₹${Math.round(canteenTotal)} canteen)` : ''}`}
      </div>

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
          </>
        )}
        {table.status === 'paused' && (
          <>
            <button onClick={() => onResume(table.id)} className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '0.5rem', fontSize: '0.85rem' }}>▶ Resume</button>
            <button onClick={() => onAddCanteen(table.id)} className="btn-ghost" style={{ flex: 'none', padding: '0.5rem 0.7rem', fontSize: '0.85rem' }}>🍟</button>
            <button onClick={() => onEnd(table.id)} style={{ flex: 'none', padding: '0.5rem 0.85rem', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: 'var(--color-red)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>■ End</button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Tables page ──────────────────────────────────────────────
export default function Tables() {
  const { settings } = useClubSettings()
  const {
    tables, loading,
    startTable, pauseTable, resumeTable,
    addCanteenItems, removeCanteenItem, updateCustomer,
    checkoutTable, saveCanteenBill,
  } = useTables(settings.tables)

  const [startTarget,       setStartTarget]       = useState(null)
  const [editCustomerId,    setEditCustomerId]    = useState(null)
  const [checkoutTarget,    setCheckoutTarget]    = useState(null)
  const [canteenTarget,     setCanteenTarget]     = useState(null)
  const [standaloneCanteen, setStandaloneCanteen] = useState(false)
  const [standaloneItems,   setStandaloneItems]   = useState([])
  const [canteenCheckout,   setCanteenCheckout]   = useState(false)

  // Tick every second for live timers
  const [, setTick] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(iv)
  }, [])

  const liveTables = tables.map(t => {
    if (t.status === 'running' && t.startTime) {
      return { ...t, elapsed: t.elapsed + Math.floor((Date.now() - t.startTime) / 1000) }
    }
    return t
  })

  async function handleConfirmStart(tableId, customer, lateMinutes) {
    await startTable(tableId, customer, lateMinutes)
    setStartTarget(null)
  }

  async function handleEditCustomer(tableId, customer) {
    await updateCustomer(tableId, customer)
    setEditCustomerId(null)
  }

  async function handlePause(tableId) {
    const t = liveTables.find(t => t.id === tableId)
    await pauseTable(tableId, t.elapsed)
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
    const billNo = await checkoutTable(checkoutTarget, billData)
    setCheckoutTarget(null)
    return billNo
  }

  const stats = [
    { label: 'Available',   value: liveTables.filter(t => t.status === 'available').length,  color: 'var(--color-green)' },
    { label: 'Running',     value: liveTables.filter(t => t.status === 'running').length,    color: 'var(--color-amber)' },
    { label: 'Paused',      value: liveTables.filter(t => t.status === 'paused').length,     color: 'var(--color-blue)'  },
    { label: 'Earning now', value: '₹' + Math.round(liveTables.reduce((s, t) => s + (t.elapsed * t.ratePerMin / 60) + t.canteen.reduce((c, i) => c + i.price, 0), 0)), color: 'var(--color-text)' },
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
            onStart={setStartTarget}
            onEditCustomer={setEditCustomerId}
            onPause={handlePause}
            onResume={resumeTable}
            onEnd={(id) => setCheckoutTarget(liveTables.find(t => t.id === id))}
            onAddCanteen={setCanteenTarget}
            onRemoveCanteen={handleRemoveCanteen}
          />
        ))}
      </div>

      {/* ── Modals ── */}
      {startTarget && (
        <CustomerModal
          table={liveTables.find(t => t.id === startTarget)}
          isEditing={false}
          onConfirm={(customer, lateMinutes) => handleConfirmStart(startTarget, customer, lateMinutes)}
          onClose={() => setStartTarget(null)}
        />
      )}

      {editCustomerId && (
        <CustomerModal
          table={liveTables.find(t => t.id === editCustomerId)}
          isEditing={true}
          onConfirm={(customer) => handleEditCustomer(editCustomerId, customer)}
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
          onClose={() => setCheckoutTarget(null)}
          onConfirm={handleConfirmCheckout}
        />
      )}
    </div>
  )
}