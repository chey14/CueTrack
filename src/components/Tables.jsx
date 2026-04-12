import { useState, useEffect } from 'react'
import { useClubSettings } from '../hooks/useClubSettings'
import { useTables } from '../hooks/useTables'

// ── Helpers ──────────────────────────────────────────────────────
function formatTime(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h} hr ${String(m).padStart(2,'0')} min`
  if (m > 0) return `${m} min ${String(sec).padStart(2,'0')} sec`
  return `${sec} sec`
}
// Compact timer display for the card (HH:MM:SS)
function formatTimerDisplay(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}
function fmt(n) { return `₹${Number(n).toFixed(2)}` }

const SAVED_MENU = [
  { id: 1, name: 'Coke',       price: 40,  category: 'Drinks' },
  { id: 2, name: 'Sprite',     price: 40,  category: 'Drinks' },
  { id: 3, name: 'Water',      price: 20,  category: 'Drinks' },
  { id: 4, name: 'Tea',        price: 20,  category: 'Drinks' },
  { id: 5, name: 'Samosa (2)', price: 30,  category: 'Snacks' },
  { id: 6, name: 'Chips',      price: 20,  category: 'Snacks' },
  { id: 7, name: 'Maggi',      price: 50,  category: 'Snacks' },
]

// QR upload handled by useClubSettings hook (Cloudinary)

// ── Modal wrapper ────────────────────────────────────────────────
function Modal({ children, onClose }) {
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  )
}

// ── Start session modal ──────────────────────────────────────────
function StartModal({ table, onConfirm, onClose }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  return (
    <Modal onClose={onClose}>
      <div className="card" style={{ width:'100%',maxWidth:360,padding:'1.5rem' }}>
        <h3 style={{ fontFamily:'var(--font-display)',fontWeight:700,marginBottom:'0.35rem' }}>
          Start — {table.name}
        </h3>
        <p style={{ fontSize:'0.82rem',color:'var(--color-text3)',marginBottom:'1.25rem' }}>
          Customer details are optional. Skip to start directly.
        </p>
        <div style={{ display:'flex',flexDirection:'column',gap:'0.75rem',marginBottom:'1.25rem' }}>
          <div>
            <label style={lbl}>Customer name (optional)</label>
            <input className="input-field" placeholder="e.g. Arjun" value={name} onChange={e=>setName(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>WhatsApp number (optional)</label>
            <input className="input-field" placeholder="9876543210" value={phone} onChange={e=>setPhone(e.target.value)} />
            <p style={{ fontSize:'0.72rem',color:'var(--color-text3)',marginTop:3 }}>
              10-digit number — country code added automatically.
            </p>
          </div>
        </div>
        <div style={{ display:'flex',gap:'0.6rem' }}>
          <button onClick={onClose} className="btn-ghost" style={{ flex:1,justifyContent:'center' }}>Cancel</button>
          <button onClick={() => onConfirm({ name:name.trim(), phone:phone.trim() })}
            className="btn-primary" style={{ flex:1,justifyContent:'center' }}>
            ▶ Start Timer
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Canteen modal ────────────────────────────────────────────────
function CanteenModal({ table, onAdd, onClose }) {
  const [tab, setTab] = useState('menu')
  const [qty, setQty] = useState({})
  const [custom, setCustom] = useState({ name:'', price:'', qty:1 })
  const categories = [...new Set(SAVED_MENU.map(i => i.category))]
  const totalSelected = SAVED_MENU.reduce((s,i) => s + (qty[i.id]||0)*i.price, 0)

  function handleAddFromMenu() {
    const items = SAVED_MENU.flatMap(item => {
      const count = qty[item.id] || 0
      if (!count) return []
      return [{ name: count>1 ? `${item.name} ×${count}` : item.name, price: item.price*count }]
    })
    if (!items.length) return
    onAdd(items); onClose()
  }

  function handleAddCustom(e) {
    e.preventDefault()
    const count = parseInt(custom.qty) || 1
    onAdd([{ name: count>1 ? `${custom.name} ×${count}` : custom.name, price: parseFloat(custom.price)*count }])
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <div className="card" style={{ width:'100%',maxWidth:420,padding:'1.5rem',maxHeight:'85vh',overflowY:'auto' }}>
        <h3 style={{ fontFamily:'var(--font-display)',fontWeight:700,marginBottom:'1rem' }}>
          Add to {table.name}
        </h3>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',background:'var(--color-bg3)',borderRadius:8,padding:3,marginBottom:'1rem' }}>
          {[['menu','📋 Saved menu'],['custom','✏️ Custom']].map(([id,label]) => (
            <button key={id} onClick={()=>setTab(id)} style={{ padding:'0.45rem',borderRadius:6,border:'none',cursor:'pointer',fontFamily:'var(--font-display)',fontWeight:600,fontSize:'0.8rem',background:tab===id?'var(--color-surface)':'transparent',color:tab===id?'var(--color-text)':'var(--color-text3)',transition:'all 0.15s' }}>{label}</button>
          ))}
        </div>

        {tab === 'menu' && (
          <div>
            {categories.map(cat => (
              <div key={cat} style={{ marginBottom:'0.85rem' }}>
                <div style={{ fontSize:'0.7rem',fontWeight:600,color:'var(--color-text3)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'0.4rem' }}>{cat}</div>
                {SAVED_MENU.filter(i=>i.category===cat).map(item => (
                  <div key={item.id} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--color-bg3)',borderRadius:8,padding:'0.55rem 0.85rem',marginBottom:'0.35rem' }}>
                    <div>
                      <span style={{ fontSize:'0.88rem',fontWeight:500 }}>{item.name}</span>
                      <span style={{ fontSize:'0.78rem',color:'var(--color-text3)',marginLeft:8 }}>₹{item.price}</span>
                    </div>
                    <div style={{ display:'flex',alignItems:'center',gap:'0.45rem' }}>
                      <button onClick={()=>setQty(p=>({...p,[item.id]:Math.max(0,(p[item.id]||0)-1)}))} style={{ width:26,height:26,borderRadius:6,border:'1px solid var(--color-border)',background:'transparent',color:'var(--color-text)',cursor:'pointer',fontWeight:700 }}>−</button>
                      <span style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:'0.9rem',minWidth:16,textAlign:'center' }}>{qty[item.id]||0}</span>
                      <button onClick={()=>setQty(p=>({...p,[item.id]:(p[item.id]||0)+1}))} style={{ width:26,height:26,borderRadius:6,border:'1px solid var(--color-green)',background:'var(--color-green-glow)',color:'var(--color-green)',cursor:'pointer',fontWeight:700 }}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {totalSelected > 0 && (
              <div style={{ display:'flex',justifyContent:'space-between',borderTop:'1px solid var(--color-border)',paddingTop:'0.6rem',marginBottom:'0.75rem' }}>
                <span style={{ fontSize:'0.85rem',color:'var(--color-text2)' }}>Total</span>
                <span style={{ fontFamily:'var(--font-display)',fontWeight:700,color:'var(--color-amber)' }}>{fmt(totalSelected)}</span>
              </div>
            )}
            <div style={{ display:'flex',gap:'0.5rem' }}>
              <button onClick={onClose} className="btn-ghost" style={{ flex:1,justifyContent:'center' }}>Cancel</button>
              <button onClick={handleAddFromMenu} className="btn-primary" style={{ flex:1,justifyContent:'center' }} disabled={!totalSelected}>Add to bill</button>
            </div>
          </div>
        )}

        {tab === 'custom' && (
          <form onSubmit={handleAddCustom} style={{ display:'flex',flexDirection:'column',gap:'0.75rem' }}>
            <div><label style={lbl}>Item name *</label><input className="input-field" required placeholder="Red Bull" value={custom.name} onChange={e=>setCustom({...custom,name:e.target.value})} /></div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.6rem' }}>
              <div><label style={lbl}>Price per item (₹) *</label><input className="input-field" required type="number" min="0" step="0.5" placeholder="60" value={custom.price} onChange={e=>setCustom({...custom,price:e.target.value})} /></div>
              <div><label style={lbl}>Quantity</label><input className="input-field" type="number" min="1" placeholder="1" value={custom.qty} onChange={e=>setCustom({...custom,qty:e.target.value})} /></div>
            </div>
            {custom.name && custom.price && <div style={{ fontSize:'0.82rem',color:'var(--color-amber)',fontWeight:600 }}>Total: ₹{(parseFloat(custom.price||0)*parseInt(custom.qty||1)).toFixed(2)}</div>}
            <div style={{ display:'flex',gap:'0.5rem' }}>
              <button type="button" onClick={onClose} className="btn-ghost" style={{ flex:1,justifyContent:'center' }}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ flex:1,justifyContent:'center' }}>Add</button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}

// ── Bill modal ───────────────────────────────────────────────────
function BillModal({ table, upiId, upiQrBase64, upiQrUrl, clubName, onClose, onConfirm }) {
  const [paymentMode, setPaymentMode] = useState('cash')
  const [sending, setSending] = useState('')

  const tableCharge  = table.elapsed * table.ratePerMin / 60
  const canteenTotal = table.canteen.reduce((s,i) => s+i.price, 0)
  const total        = tableCharge + canteenTotal
  const ratePerHour  = (table.ratePerMin * 60).toFixed(0)

  // ── WhatsApp message builder ─────────────────────────────────────
  // QR strategy (no paid service needed):
  //   1. If owner set up Cloudinary → use their uploaded UPI QR photo URL
  //   2. Otherwise → generate a UPI deep-link QR on-the-fly using
  //      api.qrserver.com (free, no account, no limits).
  //      The generated QR encodes "upi://pay?pa=UPI_ID&am=AMOUNT&tn=CueTrack"
  //      — when customer scans it, any UPI app (PhonePe/GPay/Paytm) opens
  //      directly with the amount pre-filled. No manual entry needed.
  function buildMessage() {
    const displayClub = clubName || 'CueTrack'
    const customerGreet = table.customer?.name ? `Hi *${table.customer.name}*! ` : ''

    const h = Math.floor(table.elapsed / 3600)
    const m = Math.floor((table.elapsed % 3600) / 60)
    const s = table.elapsed % 60
    const timeStr = h > 0
      ? `${h} hr ${String(m).padStart(2,'0')} min`
      : `${m} min ${String(s).padStart(2,'0')} sec`

    const lines = [
      `${customerGreet}Here's your bill! 🎱`,
      ``,
      `🏪 *${displayClub}*`,
      `━━━━━━━━━━━━━━━━`,
      `🎱 *${table.name}*`,
      `   Type: ${table.type} · ${table.size} table`,
      `   Time played: *${timeStr}*`,
      `   Rate: ₹${ratePerHour}/hr (₹${table.ratePerMin.toFixed(2)}/min)`,
      `   Table charge: *${fmt(tableCharge)}*`,
    ]

    if (table.canteen.length > 0) {
      lines.push(``, `🍟 *Canteen items:*`)
      table.canteen.forEach(i => lines.push(`   • ${i.name}  →  ${fmt(i.price)}`))
    }

    lines.push(
      ``,
      `━━━━━━━━━━━━━━━━`,
      `💰 *Total: ${fmt(total)}*`,
      `💳 Payment: *${paymentMode === 'upi' ? 'UPI' : paymentMode === 'cash' ? 'Cash' : 'Pending'}*`,
    )

    if (paymentMode === 'upi' && upiId) {
      // UPI deep-link QR: encodes upi://pay?pa=ID&am=AMOUNT&tn=NOTE
      // Customer scans → UPI app opens with everything pre-filled
      const upiDeepLink = `upi://pay?pa=${upiId}&am=${total.toFixed(2)}&tn=CueTrack-${displayClub}&cu=INR`
      // api.qrserver.com generates a clean scannable QR as a PNG link — completely free
      const generatedQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiDeepLink)}`
      // Use owner's uploaded QR photo if available, else use the generated one
      const finalQrUrl = upiQrUrl || generatedQrUrl
      lines.push(
        ``,
        `📲 *Pay via UPI:*`,
        `UPI ID: ${upiId}`,
        ``,
        `📷 *Scan QR to pay ₹${total.toFixed(2)}:*`,
        finalQrUrl,
        `_(Tap the link → scan QR in PhonePe / GPay / Paytm)_`,
      )
    }

    lines.push(``, `Thank you for playing! See you soon 🎱`)
    return encodeURIComponent(lines.join('\n'))
  }

  async function sendWhatsApp() {
    let phone = (table.customer?.phone || '').replace(/\D/g, '')
    if (!phone) return
    if (phone.length === 10) phone = '91' + phone
    setSending('opening')
    const msg = buildMessage()
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${msg}`
    window.open(url, '_blank', 'noopener,noreferrer')
    setSending('')
  }

  const sendBtnLabel = sending === 'opening' ? '📲 Opening WhatsApp...' : '📲 Send Receipt'

  return (
    <Modal onClose={onClose}>
      <div className="card" style={{ width:'100%',maxWidth:480,padding:'1.75rem',maxHeight:'92vh',overflowY:'auto' }}>
        <h3 style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:'1.1rem',marginBottom:'0.25rem' }}>
          Checkout — {table.name}
        </h3>
        {table.customer?.name && (
          <p style={{ fontSize:'0.82rem',color:'var(--color-text3)',marginBottom:'1rem' }}>
            👤 {table.customer.name}{table.customer.phone ? ` · ${table.customer.phone}` : ''}
          </p>
        )}

        {/* Bill preview card */}
        <div style={{ background:'var(--color-bg3)',borderRadius:10,padding:'1rem',marginBottom:'1.25rem',border:'1px solid var(--color-border)' }}>
          {/* Table info */}
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.6rem' }}>
            <div>
              <div style={{ fontWeight:600,fontSize:'0.9rem' }}>{table.name}</div>
              <div style={{ fontSize:'0.75rem',color:'var(--color-text3)',marginTop:1 }}>
                {table.type} · {table.size} · ₹{ratePerHour}/hr
              </div>
            </div>
            <div style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:'1.1rem',color:'var(--color-amber)' }}>
              {formatTimerDisplay(table.elapsed)}
            </div>
          </div>
          <div style={{ borderTop:'1px solid var(--color-border)',paddingTop:'0.6rem' }}>
            <BillRow label={`Table (${formatTime(table.elapsed)} @ ₹${table.ratePerMin.toFixed(2)}/min)`} value={fmt(tableCharge)} />
            {table.canteen.map((item,i) => <BillRow key={i} label={item.name} value={fmt(item.price)} muted />)}
            <div style={{ display:'flex',justifyContent:'space-between',paddingTop:'0.5rem',marginTop:'0.35rem',borderTop:'1px solid var(--color-border)' }}>
              <span style={{ fontFamily:'var(--font-display)',fontWeight:700 }}>Total</span>
              <span style={{ fontFamily:'var(--font-display)',fontWeight:700,color:'var(--color-green)',fontSize:'1.2rem' }}>{fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Payment mode */}
        <div style={{ marginBottom:'1rem' }}>
          <label style={lbl}>Payment method</label>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8 }}>
            {['cash','upi','pending'].map(m => (
              <button key={m} onClick={()=>setPaymentMode(m)}
                style={{ padding:'0.5rem',borderRadius:7,border:`1px solid ${paymentMode===m?'var(--color-green)':'var(--color-border)'}`,background:paymentMode===m?'var(--color-green-glow)':'transparent',color:paymentMode===m?'var(--color-green)':'var(--color-text2)',fontFamily:'var(--font-display)',fontWeight:600,fontSize:'0.82rem',cursor:'pointer',transition:'all 0.15s',textTransform:'capitalize' }}>
                {m}
              </button>
            ))}
          </div>

          {/* UPI info box */}
          {paymentMode === 'upi' && (
            <div style={{ marginTop:'0.75rem',padding:'0.85rem',background:'rgba(59,130,246,0.06)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:8 }}>
              {upiId ? (
                <div>
                  <p style={{ fontSize:'0.82rem',color:'var(--color-blue)',marginBottom:'0.6rem' }}>
                    📲 UPI ID: <strong>{upiId}</strong>
                  </p>
                  <div style={{ display:'flex',alignItems:'center',gap:'0.75rem' }}>
                    {/* Show owner's uploaded QR if available, else show generated QR */}
                    <img
                      src={upiQrBase64 || `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent('upi://pay?pa=' + upiId + '&am=' + total.toFixed(2) + '&tn=CueTrack&cu=INR')}`}
                      alt="UPI QR"
                      style={{ width:80,height:80,borderRadius:8,border:'1px solid var(--color-border)',objectFit:'cover',flexShrink:0,background:'#fff' }}
                    />
                    <div>
                      <p style={{ fontSize:'0.78rem',color:'var(--color-text2)',lineHeight:1.5,marginBottom:3 }}>
                        {upiQrBase64 ? 'Your uploaded QR — ' : 'Auto-generated UPI QR — '}
                        customer can scan directly from this screen or get the link in WhatsApp.
                      </p>
                      <p style={{ fontSize:'0.7rem',color:'var(--color-green)',fontWeight:600 }}>
                        ✓ QR link included in WhatsApp receipt automatically
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize:'0.78rem',color:'var(--color-amber)' }}>
                  ⚠ No UPI ID set. Add it in Settings → Payment & UPI.
                </p>
              )}
            </div>
          )}
        </div>

        {/* WhatsApp note */}
        {table.customer?.phone && (
          <div style={{ marginBottom:'1rem',padding:'0.6rem 0.85rem',background:'rgba(37,211,102,0.06)',border:'1px solid rgba(37,211,102,0.15)',borderRadius:8 }}>
            <p style={{ fontSize:'0.78rem',color:'#25d366',lineHeight:1.5 }}>
              📱 WhatsApp opens with bill pre-filled. Just press <strong>Enter / Send</strong> once it opens.
            </p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex',gap:'0.6rem' }}>
          <button onClick={onClose} className="btn-ghost" style={{ flex:1,justifyContent:'center' }}>Cancel</button>
          {table.customer?.phone && (
            <button onClick={sendWhatsApp} disabled={!!sending}
              style={{ flex:1,padding:'0.65rem',borderRadius:8,border:'1px solid rgba(37,211,102,0.4)',background:'rgba(37,211,102,0.08)',color:'#25d366',fontFamily:'var(--font-display)',fontWeight:600,fontSize:'0.85rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.3rem',opacity:sending?0.7:1 }}>
              {sendBtnLabel}
            </button>
          )}
          <button onClick={() => onConfirm(paymentMode, total)} className="btn-primary" style={{ flex:1,justifyContent:'center' }}>
            Confirm ✓
          </button>
        </div>
        {!table.customer?.phone && (
          <p style={{ fontSize:'0.72rem',color:'var(--color-text3)',textAlign:'center',marginTop:'0.5rem' }}>
            No phone number saved — WhatsApp receipt not available for this session.
          </p>
        )}
      </div>
    </Modal>
  )
}

function BillRow({ label, value, muted }) {
  return (
    <div style={{ display:'flex',justifyContent:'space-between',fontSize:'0.85rem',marginBottom:'0.4rem' }}>
      <span style={{ color:muted?'var(--color-text3)':'var(--color-text2)' }}>{label}</span>
      <span style={{ color:muted?'var(--color-text2)':'var(--color-text)' }}>{value}</span>
    </div>
  )
}

// ── Table card ───────────────────────────────────────────────────
function TableCard({ table, onStart, onPause, onResume, onEnd, onAddCanteen }) {
  const cost = table.elapsed * table.ratePerMin / 60
  const canteenTotal = table.canteen.reduce((s,i)=>s+i.price,0)
  const sc = { available:'var(--color-green)', running:'var(--color-amber)', paused:'var(--color-blue)' }
  const cls = { available:'table-available', running:'table-running running-border', paused:'table-paused' }

  return (
    <div className={`card ${cls[table.status]}`}
      style={{ padding:'1.25rem',border:'1px solid',borderColor:sc[table.status],transition:'border-color 0.3s' }}>

      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.85rem' }}>
        <div>
          <h3 style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:'0.97rem' }}>{table.name}</h3>
          <div style={{ display:'flex',gap:4,marginTop:4 }}>
            <span className={table.type==='Pool'?'tag tag-blue':'tag tag-green'} style={{ fontSize:'0.68rem' }}>{table.type}</span>
            <span className="tag tag-blue" style={{ fontSize:'0.68rem' }}>{table.size}</span>
          </div>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:'0.3rem',fontSize:'0.72rem',color:sc[table.status],fontFamily:'var(--font-display)',fontWeight:600,textTransform:'capitalize' }}>
          <span style={{ width:6,height:6,borderRadius:'50%',background:sc[table.status],animation:table.status==='running'?'pulse-dot 1.5s infinite':'none' }}/>
          {table.status}
        </div>
      </div>

      {table.customer?.name && (
        <div style={{ fontSize:'0.78rem',color:'var(--color-text3)',marginBottom:'0.5rem' }}>
          👤 {table.customer.name}{table.customer.phone?` · ${table.customer.phone}`:''}
        </div>
      )}

      <div style={{ fontFamily:'var(--font-display)',fontWeight:800,fontSize:'2.4rem',letterSpacing:'-0.02em',color:table.status==='available'?'var(--color-text3)':'var(--color-text)',marginBottom:'0.2rem',animation:table.status==='running'?'tick 1s infinite':'none' }}>
        {formatTimerDisplay(table.elapsed)}
      </div>

      <div style={{ fontSize:'0.95rem',fontFamily:'var(--font-display)',fontWeight:600,color:table.status==='available'?'var(--color-text3)':'var(--color-amber)',marginBottom:'0.25rem' }}>
        {table.status === 'available'
          ? `₹${Math.round(table.ratePerMin*60)}/hr`
          : `${fmt(cost+canteenTotal)}${canteenTotal>0?` (incl. ₹${canteenTotal.toFixed(0)} canteen)`:''}`}
      </div>

      {table.canteen.length > 0 && (
        <div style={{ display:'flex',flexWrap:'wrap',gap:4,marginBottom:'0.6rem' }}>
          {table.canteen.map((item,i) => <span key={i} className="tag tag-amber" style={{ fontSize:'0.68rem' }}>{item.name}</span>)}
        </div>
      )}

      <div style={{ display:'flex',gap:'0.4rem',marginTop:'0.75rem' }}>
        {table.status === 'available' && (
          <button onClick={()=>onStart(table.id)} className="btn-primary" style={{ flex:1,justifyContent:'center',padding:'0.5rem',fontSize:'0.85rem' }}>▶ Start</button>
        )}
        {table.status === 'running' && (
          <>
            <button onClick={()=>onPause(table.id)} className="btn-ghost" style={{ flex:1,justifyContent:'center',padding:'0.5rem',fontSize:'0.85rem' }}>⏸ Pause</button>
            <button onClick={()=>onAddCanteen(table.id)} className="btn-ghost" style={{ flex:'none',padding:'0.5rem 0.7rem',fontSize:'0.85rem' }}>🍟</button>
            <button onClick={()=>onEnd(table.id)} style={{ flex:1,padding:'0.5rem',borderRadius:8,border:'1px solid rgba(239,68,68,0.4)',background:'rgba(239,68,68,0.08)',color:'var(--color-red)',fontFamily:'var(--font-display)',fontWeight:600,fontSize:'0.85rem',cursor:'pointer' }}>■ End</button>
          </>
        )}
        {table.status === 'paused' && (
          <>
            <button onClick={()=>onResume(table.id)} className="btn-primary" style={{ flex:1,justifyContent:'center',padding:'0.5rem',fontSize:'0.85rem' }}>▶ Resume</button>
            <button onClick={()=>onAddCanteen(table.id)} className="btn-ghost" style={{ flex:'none',padding:'0.5rem 0.7rem',fontSize:'0.85rem' }}>🍟</button>
            <button onClick={()=>onEnd(table.id)} style={{ flex:'none',padding:'0.5rem 0.85rem',borderRadius:8,border:'1px solid rgba(239,68,68,0.4)',background:'rgba(239,68,68,0.08)',color:'var(--color-red)',fontFamily:'var(--font-display)',fontWeight:600,fontSize:'0.85rem',cursor:'pointer' }}>■ End</button>
          </>
        )}
      </div>
    </div>
  )
}

const lbl = { fontSize:'0.82rem',color:'var(--color-text2)',marginBottom:5,display:'block' }

// ── Main Tables page ─────────────────────────────────────────────
export default function Tables() {
  const { settings } = useClubSettings()
  const { tables, loading, startTable, pauseTable, resumeTable, addCanteenItems, checkoutTable } = useTables(settings.tables)

  const [startTarget,    setStartTarget]    = useState(null)
  const [checkoutTarget, setCheckoutTarget] = useState(null)
  const [canteenTarget,  setCanteenTarget]  = useState(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t+1), 1000)
    return () => clearInterval(interval)
  }, [])

  const liveTables = tables.map(t => {
    if (t.status === 'running' && t.startTime) {
      return { ...t, elapsed: t.elapsed + Math.floor((Date.now() - t.startTime) / 1000) }
    }
    return t
  })

  async function handleConfirmStart(tableId, customer) {
    await startTable(tableId, customer)
    setStartTarget(null)
  }

  async function handleConfirmCheckout(paymentMode, total) {
    await checkoutTable(checkoutTarget, paymentMode, total)
    setCheckoutTarget(null)
  }

  async function handleAddCanteen(tableId, items) {
    const t = liveTables.find(t => t.id === tableId)
    await addCanteenItems(tableId, t.canteen, items)
    setCanteenTarget(null)
  }

  async function handlePause(tableId) {
    const t = liveTables.find(t => t.id === tableId)
    await pauseTable(tableId, t.elapsed)
  }

  const stats = [
    { label:'Available', value:liveTables.filter(t=>t.status==='available').length, color:'var(--color-green)' },
    { label:'Running',   value:liveTables.filter(t=>t.status==='running').length,   color:'var(--color-amber)' },
    { label:'Paused',    value:liveTables.filter(t=>t.status==='paused').length,     color:'var(--color-blue)'  },
    { label:'Earning now', value:'₹'+liveTables.reduce((s,t)=>s+(t.elapsed*t.ratePerMin/60)+t.canteen.reduce((c,i)=>c+i.price,0),0).toFixed(0), color:'var(--color-text)' },
  ]

  if (loading) return <div style={{ color:'var(--color-text3)',padding:'2rem',textAlign:'center' }}>Loading tables...</div>

  return (
    <div>
      <div style={{ display:'flex',gap:'0.75rem',marginBottom:'1.5rem',flexWrap:'wrap' }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding:'0.85rem 1.25rem' }}>
            <div style={{ fontSize:'0.72rem',color:'var(--color-text3)' }}>{s.label}</div>
            <div style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:'1.3rem',color:s.color,marginTop:2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(268px,1fr))',gap:'1rem' }}>
        {liveTables.map(table => (
          <TableCard key={table.id} table={table}
            onStart={setStartTarget}
            onPause={handlePause}
            onResume={resumeTable}
            onEnd={(id) => setCheckoutTarget(liveTables.find(t=>t.id===id))}
            onAddCanteen={setCanteenTarget}
          />
        ))}
      </div>

      {startTarget && (
        <StartModal
          table={liveTables.find(t=>t.id===startTarget)}
          onConfirm={(customer) => handleConfirmStart(startTarget, customer)}
          onClose={() => setStartTarget(null)}
        />
      )}
      {canteenTarget && (
        <CanteenModal
          table={liveTables.find(t=>t.id===canteenTarget)}
          onAdd={(items) => handleAddCanteen(canteenTarget, items)}
          onClose={() => setCanteenTarget(null)}
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