import { useState, useEffect, useRef } from 'react'
import { useClubSettings } from '../hooks/useClubSettings'

const TABLE_SIZES = ['Regular', 'Medium', 'Large']
const lbl = { fontSize: '0.82rem', color: 'var(--color-text2)', marginBottom: 5, display: 'block' }

export default function Settings() {
  const { settings, loading, saving, saveSettings, saveQrImage, uploadingQr, getClubViewUrl } = useClubSettings()

  const [clubName,    setClubName]    = useState('')
  const [whatsapp,    setWhatsapp]    = useState('')
  const [upiId,       setUpiId]       = useState('')
  const [tables,      setTables]      = useState([])
  const [saved,       setSaved]       = useState(false)
  const [clubViewUrl, setClubViewUrl] = useState('')

  // Owner PIN stored in localStorage (stays on device, not synced to Firestore)
  const [currentPin,  setCurrentPin]  = useState('')
  const [newPin,      setNewPin]      = useState('')
  const [confirmPin,  setConfirmPin]  = useState('')
  const [pinMsg,      setPinMsg]      = useState('')
  const [showPinForm, setShowPinForm] = useState(false)

  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!loading) {
      setClubName(settings.clubName      || '')
      setWhatsapp(settings.ownerWhatsapp || '')
      setUpiId(settings.upiId            || '')
      setTables(settings.tables          || [])
      const url = getClubViewUrl()
      if (url) setClubViewUrl(url)
    }
  }, [loading, settings])

  async function handleQrFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    await saveQrImage(file)
    e.target.value = ''
  }

  function updateTable(id, field, val) {
    setTables(prev => prev.map(t => t.id !== id ? t : { ...t, [field]: val }))
  }

  function addTable() {
    setTables(prev => [...prev, {
      id: String(Date.now()), name: `Table ${prev.length + 1}`,
      type: 'Pool', size: 'Regular', ratePerMin: 3.33,
    }])
  }

  function removeTable(id) {
    setTables(prev => prev.filter(t => t.id !== id))
  }

  async function handleSave(e) {
    e.preventDefault()
    await saveSettings({ clubName, ownerWhatsapp: whatsapp, upiId, tables })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleChangePin(e) {
    e.preventDefault()
    const existing = localStorage.getItem('ct_owner_pin') || '1234'
    if (currentPin !== existing) { setPinMsg('error:Current PIN is incorrect'); return }
    if (newPin.length < 4)       { setPinMsg('error:New PIN must be at least 4 characters'); return }
    if (newPin !== confirmPin)    { setPinMsg('error:PINs do not match'); return }
    localStorage.setItem('ct_owner_pin', newPin)
    setPinMsg('success:PIN updated successfully')
    setCurrentPin(''); setNewPin(''); setConfirmPin('')
    setTimeout(() => { setPinMsg(''); setShowPinForm(false) }, 2000)
  }

  const qrImage = settings.upiQrBase64 || null

  if (loading) return (
    <div style={{ color:'var(--color-text3)', padding:'2rem', textAlign:'center' }}>Loading settings...</div>
  )

  return (
    <form onSubmit={handleSave} style={{ maxWidth: 660 }}>

      {/* ── Club Info ─────────────────────────────── */}
      <SectionCard title="Club info">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.85rem' }}>
          <div>
            <label style={lbl}>Club name</label>
            <input className="input-field" value={clubName}
              onChange={e=>setClubName(e.target.value)} placeholder="Cues & Cushions" />
          </div>
          <div>
            <label style={lbl}>Owner's WhatsApp number</label>
            <input className="input-field" value={whatsapp}
              onChange={e=>setWhatsapp(e.target.value)} placeholder="91XXXXXXXXXX" />
            <p style={{ fontSize:'0.72rem', color:'var(--color-text3)', marginTop:3 }}>
              Daily revenue summary sent here.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ── Owner PIN ─────────────────────────────── */}
      <SectionCard title="Owner PIN">
        <p style={{ fontSize:'0.82rem', color:'var(--color-text2)', marginBottom:'0.75rem', lineHeight:1.65 }}>
          This PIN is required for sensitive actions — applying discounts on bills and
          editing inventory stock. Default is <strong>1234</strong>. Set a PIN only you know.
        </p>
        <p style={{ fontSize:'0.75rem', color:'var(--color-text3)', marginBottom:'1rem' }}>
          Note: PIN is stored on this device only. If you switch devices, you'll need to set it again.
        </p>

        {!showPinForm ? (
          <button type="button" onClick={()=>setShowPinForm(true)} className="btn-ghost"
            style={{ fontSize:'0.85rem', padding:'0.45rem 1rem' }}>
            🔑 Change PIN
          </button>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem', maxWidth:320 }}>
            <div>
              <label style={lbl}>Current PIN</label>
              <input className="input-field" type="password" placeholder="Enter current PIN" maxLength={8}
                value={currentPin} onChange={e=>setCurrentPin(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>New PIN (min 4 characters)</label>
              <input className="input-field" type="password" placeholder="New PIN" maxLength={8}
                value={newPin} onChange={e=>setNewPin(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Confirm new PIN</label>
              <input className="input-field" type="password" placeholder="Confirm PIN" maxLength={8}
                value={confirmPin} onChange={e=>setConfirmPin(e.target.value)} />
            </div>
            {pinMsg && (
              <p style={{ fontSize:'0.82rem', color: pinMsg.startsWith('success') ? 'var(--color-green)' : 'var(--color-red)' }}>
                {pinMsg.split(':')[1]}
              </p>
            )}
            <div style={{ display:'flex', gap:'0.5rem' }}>
              <button type="button" onClick={()=>{setShowPinForm(false);setPinMsg('')}}
                className="btn-ghost" style={{ flex:1, justifyContent:'center' }}>Cancel</button>
              <button type="button" onClick={handleChangePin}
                className="btn-primary" style={{ flex:1, justifyContent:'center' }}>Update PIN</button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Payment & UPI ─────────────────────────── */}
      <SectionCard title="Payment & UPI">
        <p style={{ fontSize:'0.82rem', color:'var(--color-text2)', marginBottom:'1rem', lineHeight:1.6 }}>
          When a customer pays by UPI, the WhatsApp bill includes your UPI ID and a scannable QR link.
        </p>

        <div style={{ marginBottom:'1.25rem' }}>
          <label style={lbl}>Your UPI ID</label>
          <input className="input-field" value={upiId} onChange={e=>setUpiId(e.target.value)}
            placeholder="9876543210@paytm or cuesclub@ybl" />
        </div>

        <div>
          <label style={lbl}>UPI QR code photo</label>
          <div style={{ display:'flex', gap:'1rem', alignItems:'flex-start', flexWrap:'wrap' }}>
            <div onClick={()=>fileInputRef.current?.click()}
              style={{
                width:120, height:120, borderRadius:10, cursor:'pointer', flexShrink:0,
                border:`2px dashed ${qrImage?'var(--color-green)':'var(--color-border)'}`,
                background:'var(--color-bg3)', display:'flex', alignItems:'center',
                justifyContent:'center', overflow:'hidden', position:'relative',
                transition:'border-color 0.2s',
              }}
              onMouseEnter={e=>e.currentTarget.style.borderColor='var(--color-green)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor=qrImage?'var(--color-green)':'var(--color-border)'}>
              {uploadingQr ? (
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'1.4rem', marginBottom:4 }}>⏳</div>
                  <div style={{ fontSize:'0.7rem', color:'var(--color-green)', fontWeight:600 }}>Saving...</div>
                </div>
              ) : qrImage ? (
                <img src={qrImage} alt="UPI QR" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              ) : (
                <div style={{ textAlign:'center', padding:'0.5rem' }}>
                  <div style={{ fontSize:'1.8rem', marginBottom:4 }}>📷</div>
                  <div style={{ fontSize:'0.7rem', color:'var(--color-text3)', lineHeight:1.4 }}>Tap to upload</div>
                </div>
              )}
            </div>
            <div style={{ flex:1, minWidth:180 }}>
              <p style={{ fontSize:'0.82rem', color:'var(--color-text2)', lineHeight:1.65, marginBottom:'0.75rem' }}>
                Upload your UPI QR from PhonePe, Google Pay, or Paytm.
                Saved directly to your database.
              </p>
              <button type="button" onClick={()=>fileInputRef.current?.click()} className="btn-ghost"
                style={{ fontSize:'0.8rem', padding:'0.4rem 0.9rem' }} disabled={uploadingQr}>
                {qrImage ? '🔄 Replace QR image' : '📷 Upload QR image'}
              </button>
              {qrImage && <p style={{ fontSize:'0.72rem', color:'var(--color-green)', marginTop:6 }}>✓ QR saved</p>}
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*"
            style={{ display:'none' }} onChange={handleQrFileChange} />
        </div>
      </SectionCard>

      {/* ── Tables ────────────────────────────────── */}
      <SectionCard title="Tables"
        action={
          <button type="button" onClick={addTable} className="btn-ghost"
            style={{ padding:'0.35rem 0.85rem', fontSize:'0.8rem' }}>
            + Add table
          </button>
        }>
        <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
          {tables.map(t => (
            <div key={t.id} style={{ background:'var(--color-bg3)', borderRadius:10, padding:'0.9rem', border:'1px solid var(--color-border)' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 100px 110px auto', gap:'0.5rem', alignItems:'center', marginBottom:'0.65rem' }}>
                <input className="input-field" value={t.name}
                  onChange={e=>updateTable(t.id,'name',e.target.value)}
                  style={{ fontSize:'0.875rem', padding:'0.4rem 0.7rem' }} placeholder="Table name" />
                <select className="input-field" value={t.type}
                  onChange={e=>updateTable(t.id,'type',e.target.value)}
                  style={{ fontSize:'0.8rem', padding:'0.4rem 0.5rem' }}>
                  <option>Pool</option>
                  <option>Snooker</option>
                </select>
                <select className="input-field" value={t.size}
                  onChange={e=>updateTable(t.id,'size',e.target.value)}
                  style={{ fontSize:'0.8rem', padding:'0.4rem 0.5rem' }}>
                  {TABLE_SIZES.map(s=><option key={s}>{s}</option>)}
                </select>
                <button type="button" onClick={()=>removeTable(t.id)}
                  style={{ background:'none', border:'none', color:'var(--color-text3)', cursor:'pointer', fontSize:'1rem', padding:'0.25rem', borderRadius:4, transition:'color 0.15s' }}
                  onMouseEnter={e=>e.target.style.color='var(--color-red)'}
                  onMouseLeave={e=>e.target.style.color='var(--color-text3)'}>✕</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
                <div>
                  <label style={{ ...lbl, marginBottom:3 }}>₹ per hour</label>
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <input className="input-field" type="number" step="1" min="0"
                      value={Math.round(t.ratePerMin*60)}
                      onChange={e=>updateTable(t.id,'ratePerMin',(parseFloat(e.target.value)||0)/60)}
                      style={{ fontSize:'0.875rem', padding:'0.4rem 0.6rem' }} />
                    <span style={{ fontSize:'0.75rem', color:'var(--color-text3)', whiteSpace:'nowrap' }}>/hr</span>
                  </div>
                </div>
                <div>
                  <label style={{ ...lbl, marginBottom:3 }}>₹ per minute (auto)</label>
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <input className="input-field" type="text" readOnly
                      value={(t.ratePerMin||0).toFixed(4)}
                      style={{ fontSize:'0.875rem', padding:'0.4rem 0.6rem', opacity:0.6, cursor:'not-allowed' }} />
                    <span style={{ fontSize:'0.75rem', color:'var(--color-text3)', whiteSpace:'nowrap' }}>/min</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Club QR for customers ─────────────────── */}
      {clubViewUrl && (
        <SectionCard title="Club QR code for customers">
          <p style={{ fontSize:'0.82rem', color:'var(--color-text2)', marginBottom:'1rem', lineHeight:1.6 }}>
            Print this QR and place it at the entrance. Customers scan it to see all tables with
            live timers and running costs — read-only, no login needed.
          </p>
          <div style={{ display:'flex', gap:'1rem', alignItems:'flex-start', flexWrap:'wrap' }}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(clubViewUrl)}`}
              alt="Club QR" style={{ width:150, height:150, borderRadius:10, border:'1px solid var(--color-border)', flexShrink:0 }} />
            <div style={{ flex:1, minWidth:180 }}>
              <div style={{ fontSize:'0.78rem', color:'var(--color-text3)', marginBottom:'0.6rem', wordBreak:'break-all', lineHeight:1.5 }}>
                {clubViewUrl}
              </div>
              <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                <button type="button" className="btn-ghost" style={{ fontSize:'0.8rem', padding:'0.4rem 0.9rem' }}
                  onClick={()=>{navigator.clipboard.writeText(clubViewUrl); alert('Link copied!')}}>
                  📋 Copy link
                </button>
                <a href={clubViewUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost"
                  style={{ fontSize:'0.8rem', padding:'0.4rem 0.9rem', textDecoration:'none', display:'inline-flex', alignItems:'center' }}>
                  👁 Preview
                </a>
                <a href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(clubViewUrl)}`}
                  target="_blank" rel="noopener noreferrer" download="club-qr.png" className="btn-ghost"
                  style={{ fontSize:'0.8rem', padding:'0.4rem 0.9rem', textDecoration:'none', display:'inline-flex', alignItems:'center' }}>
                  ⬇ Download QR
                </a>
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      <button type="submit" className="btn-primary"
        style={{ width:'100%', justifyContent:'center', opacity:(saving||uploadingQr)?0.7:1 }}
        disabled={saving||uploadingQr}>
        {saving ? 'Saving...' : saved ? '✓ Saved to Firebase!' : 'Save settings'}
      </button>
      <p style={{ fontSize:'0.75rem', color:'var(--color-text3)', textAlign:'center', marginTop:'0.75rem' }}>
        Settings sync across all your devices via Firebase.
      </p>
    </form>
  )
}

function SectionCard({ title, children, action }) {
  return (
    <div className="card" style={{ padding:'1.25rem', marginBottom:'1rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
        <h3 style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.95rem' }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}