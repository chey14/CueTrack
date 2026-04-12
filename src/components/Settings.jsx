import { useState, useEffect, useRef } from 'react'
import { useClubSettings } from '../hooks/useClubSettings'

const TABLE_SIZES = ['Regular', 'Medium', 'Large']
const lbl = { fontSize: '0.82rem', color: 'var(--color-text2)', marginBottom: 5, display: 'block' }

export default function Settings() {
  const { settings, loading, saving, saveSettings, saveQrImage, uploadingQr } = useClubSettings()

  const [clubName,  setClubName]  = useState('')
  const [whatsapp,  setWhatsapp]  = useState('')
  const [upiId,     setUpiId]     = useState('')
  const [tables,    setTables]    = useState([])
  const [saved,     setSaved]     = useState(false)
  const fileInputRef = useRef(null)

  // When Firestore data loads, populate the form fields
  useEffect(() => {
    if (!loading) {
      setClubName(settings.clubName      || '')
      setWhatsapp(settings.ownerWhatsapp || '')
      setUpiId(settings.upiId            || '')
      setTables(settings.tables          || [])
    }
  }, [loading, settings])

  // User picks a QR image → compress it → save as base64 to Firestore
  async function handleQrFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    await saveQrImage(file)
    // Clear the input so picking the same file again triggers onChange
    e.target.value = ''
  }

  function updateTable(id, field, val) {
    setTables(prev => prev.map(t => {
      if (t.id !== id) return t
      return { ...t, [field]: val }
    }))
  }

  function addTable() {
    setTables(prev => [...prev, {
      id: String(Date.now()),
      name: `Table ${prev.length + 1}`,
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

  if (loading) {
    return <div style={{ color: 'var(--color-text3)', padding: '2rem', textAlign: 'center' }}>Loading settings...</div>
  }

  // The QR image is stored as a base64 string in settings.upiQrBase64
  const qrImage = settings.upiQrBase64 || null

  return (
    <form onSubmit={handleSave} style={{ maxWidth: 660 }}>

      {/* ── Club Info ─────────────────────────────── */}
      <SectionCard title="Club info">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <div>
            <label style={lbl}>Club name</label>
            <input className="input-field" value={clubName}
              onChange={e => setClubName(e.target.value)} placeholder="Cues & Cushions" />
          </div>
          <div>
            <label style={lbl}>Owner's WhatsApp number</label>
            <input className="input-field" value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)} placeholder="91XXXXXXXXXX" />
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text3)', marginTop: 3 }}>
              Daily revenue summary sent here.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ── Payment & UPI ─────────────────────────── */}
      <SectionCard title="Payment & UPI">
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text2)', marginBottom: '1rem', lineHeight: 1.6 }}>
          When a customer pays by UPI, their WhatsApp bill will include your UPI ID
          and QR code image so they can pay directly without asking you for details.
        </p>

        {/* UPI ID */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={lbl}>Your UPI ID</label>
          <input className="input-field" value={upiId}
            onChange={e => setUpiId(e.target.value)}
            placeholder="e.g. 9876543210@paytm or cuesclub@ybl" />
          <p style={{ fontSize: '0.72rem', color: 'var(--color-text3)', marginTop: 3 }}>
            This is included in the bill message when customer selects UPI.
          </p>
        </div>

        {/* QR image upload */}
        <div>
          <label style={lbl}>UPI QR code photo</label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

            {/* QR preview box — click to pick file */}
            <div onClick={() => fileInputRef.current?.click()}
              style={{
                width: 120, height: 120, borderRadius: 10, cursor: 'pointer', flexShrink: 0,
                border: `2px dashed ${qrImage ? 'var(--color-green)' : 'var(--color-border)'}`,
                background: 'var(--color-bg3)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', overflow: 'hidden', position: 'relative',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-green)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = qrImage ? 'var(--color-green)' : 'var(--color-border)'}
            >
              {uploadingQr ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>⏳</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-green)', fontWeight: 600 }}>Saving...</div>
                </div>
              ) : qrImage ? (
                <>
                  <img src={qrImage} alt="UPI QR"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {/* Change overlay on hover */}
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity 0.2s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                    <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>Change</span>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>📷</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text3)', lineHeight: 1.4 }}>
                    Tap to upload
                  </div>
                </div>
              )}
            </div>

            {/* Instructions text */}
            <div style={{ flex: 1, minWidth: 180 }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text2)', lineHeight: 1.65, marginBottom: '0.75rem' }}>
                Take a screenshot of your UPI QR from PhonePe, Google Pay, or Paytm
                and upload it here. It's saved directly to your database — no paid
                plan needed.
              </p>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}
                disabled={uploadingQr}>
                {qrImage ? '🔄 Replace QR image' : '📷 Upload QR image'}
              </button>
              {qrImage && (
                <p style={{ fontSize: '0.72rem', color: 'var(--color-green)', marginTop: 6 }}>
                  ✓ QR saved — will be sent in WhatsApp bills
                </p>
              )}
            </div>
          </div>

          {/* Hidden file input */}
          <input ref={fileInputRef} type="file" accept="image/*"
            style={{ display: 'none' }} onChange={handleQrFileChange} />
        </div>
      </SectionCard>

      {/* ── Tables ────────────────────────────────── */}
      <SectionCard title="Tables"
        action={
          <button type="button" onClick={addTable} className="btn-ghost"
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}>
            + Add table
          </button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {tables.map(t => (
            <div key={t.id} style={{
              background: 'var(--color-bg3)', borderRadius: 10,
              padding: '0.9rem', border: '1px solid var(--color-border)',
            }}>
              {/* Name + type + size + delete */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 110px auto', gap: '0.5rem', alignItems: 'center', marginBottom: '0.65rem' }}>
                <input className="input-field" value={t.name}
                  onChange={e => updateTable(t.id, 'name', e.target.value)}
                  style={{ fontSize: '0.875rem', padding: '0.4rem 0.7rem' }} placeholder="Table name" />
                <select className="input-field" value={t.type}
                  onChange={e => updateTable(t.id, 'type', e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}>
                  <option>Pool</option>
                  <option>Snooker</option>
                </select>
                <select className="input-field" value={t.size}
                  onChange={e => updateTable(t.id, 'size', e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}>
                  {TABLE_SIZES.map(s => <option key={s}>{s}</option>)}
                </select>
                <button type="button" onClick={() => removeTable(t.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-text3)', cursor: 'pointer', fontSize: '1rem', padding: '0.25rem', borderRadius: 4, transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = 'var(--color-red)'}
                  onMouseLeave={e => e.target.style.color = 'var(--color-text3)'}
                >✕</button>
              </div>

              {/* Rate per hour (primary input) + per minute (derived, read-only display) */}
              {/* We use per-hour as the primary because owners think in ₹/hr, not ₹/min */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ ...lbl, marginBottom: 3 }}>₹ per hour</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      className="input-field"
                      type="number"
                      step="1"
                      min="0"
                      value={Math.round(t.ratePerMin * 60)}
                      onChange={e => {
                        const perHour = parseFloat(e.target.value) || 0
                        updateTable(t.id, 'ratePerMin', perHour / 60)
                      }}
                      style={{ fontSize: '0.875rem', padding: '0.4rem 0.6rem' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text3)', whiteSpace: 'nowrap' }}>/hr</span>
                  </div>
                </div>
                <div>
                  <label style={{ ...lbl, marginBottom: 3 }}>₹ per minute (auto)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      className="input-field"
                      type="text"
                      readOnly
                      value={(t.ratePerMin || 0).toFixed(4)}
                      style={{ fontSize: '0.875rem', padding: '0.4rem 0.6rem', opacity: 0.6, cursor: 'not-allowed' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text3)', whiteSpace: 'nowrap' }}>/min</span>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--color-text3)', marginTop: '0.35rem' }}>
                Set your hourly rate — per-minute is calculated automatically.
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <button type="submit" className="btn-primary"
        style={{ width: '100%', justifyContent: 'center', opacity: (saving || uploadingQr) ? 0.7 : 1 }}
        disabled={saving || uploadingQr}>
        {saving ? 'Saving...' : saved ? '✓ Saved to Firebase!' : 'Save settings'}
      </button>

      <p style={{ fontSize: '0.75rem', color: 'var(--color-text3)', textAlign: 'center', marginTop: '0.75rem' }}>
        Settings sync across all your devices via Firebase.
      </p>
    </form>
  )
}

function SectionCard({ title, children, action }) {
  return (
    <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.95rem' }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}