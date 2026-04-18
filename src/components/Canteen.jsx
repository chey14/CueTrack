import { useState } from 'react'

const INITIAL_MENU = [
  { id: 1, name: 'Coke',       price: 40, qty: 10, category: 'Drinks' },
  { id: 2, name: 'Sprite',     price: 40, qty: 10, category: 'Drinks' },
  { id: 3, name: 'Water',      price: 20, qty: 20, category: 'Drinks' },
  { id: 4, name: 'Tea',        price: 20, qty: 0,  category: 'Drinks' },
  { id: 5, name: 'Samosa (2)', price: 30, qty: 15, category: 'Snacks' },
  { id: 6, name: 'Chips',      price: 20, qty: 8,  category: 'Snacks' },
  { id: 7, name: 'Maggi',      price: 50, qty: 5,  category: 'Snacks' },
]

const CATEGORIES = ['Drinks', 'Snacks', 'Meals', 'Other']
const lbl = { fontSize: '0.82rem', color: 'var(--color-text2)', marginBottom: 5, display: 'block' }

function PinGate({ action, onUnlock, onCancel }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState(false)
  function verify() {
    const ownerPin = localStorage.getItem('ct_owner_pin') || '1234'
    if (pin === ownerPin) onUnlock()
    else { setErr(true); setPin('') }
  }
  return (
    <div style={{ padding:'1rem', background:'var(--color-bg3)', borderRadius:10, border:'1px solid var(--color-border)', marginBottom:'1rem' }}>
      <p style={{ fontSize:'0.82rem', color:'var(--color-text2)', marginBottom:'0.75rem' }}>
        🔐 Enter owner PIN to {action}
      </p>
      <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
        <input className="input-field" type="password" placeholder="Enter PIN" maxLength={8}
          value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==='Enter'&&verify()}
          style={{ maxWidth:180 }} autoFocus />
        <button onClick={verify} className="btn-primary" style={{ padding:'0.45rem 1rem', fontSize:'0.85rem' }}>Unlock</button>
        <button onClick={onCancel} className="btn-ghost" style={{ padding:'0.45rem 0.75rem', fontSize:'0.85rem' }}>Cancel</button>
      </div>
      {err && <p style={{ fontSize:'0.78rem', color:'var(--color-red)', marginTop:'0.4rem' }}>Wrong PIN. Try again.</p>}
    </div>
  )
}

export default function Canteen() {
  const [menu, setMenu] = useState(INITIAL_MENU)
  const [form,    setForm]    = useState({ name:'', price:'', qty:'', category:'Drinks' })
  const [showAdd, setShowAdd] = useState(false)
  const [editId,  setEditId]  = useState(null)
  // inventoryState: 'idle' | 'pending-bulk' | 'unlocked-bulk' | 'pending-item:{id}' | 'unlocked-item:{id}'
  const [inventoryState, setInventoryState] = useState('idle')

  function handleSaveItem(e) {
    e.preventDefault()
    if (editId) {
      setMenu(prev => prev.map(i => i.id===editId
        ? { ...i, name:form.name, price:parseFloat(form.price), qty:parseInt(form.qty)||0, category:form.category }
        : i))
      setEditId(null)
    } else {
      setMenu(prev => [...prev, { id:Date.now(), name:form.name, price:parseFloat(form.price), qty:parseInt(form.qty)||0, category:form.category }])
    }
    setForm({ name:'', price:'', qty:'', category:'Drinks' })
    setShowAdd(false)
  }

  function startEdit(item) {
    setForm({ name:item.name, price:String(item.price), qty:String(item.qty), category:item.category })
    setEditId(item.id); setShowAdd(true)
  }

  function handleDelete(id) {
    if (window.confirm('Remove this item from the menu?')) setMenu(prev => prev.filter(i=>i.id!==id))
  }

  function setItemQty(id, qty) { setMenu(prev => prev.map(i => i.id===id ? {...i, qty:Math.max(0,qty)} : i)) }
  function adjustQty(id, delta){ setMenu(prev => prev.map(i => i.id===id ? {...i, qty:Math.max(0,i.qty+delta)} : i)) }

  const grouped = CATEGORIES.reduce((acc,cat) => {
    const items = menu.filter(i=>i.category===cat)
    if (items.length>0) acc[cat]=items
    return acc
  }, {})

  const totalItems     = menu.length
  const lowStock       = menu.filter(i=>i.qty>0&&i.qty<=3).length
  const outOfStock     = menu.filter(i=>i.qty===0).length
  const inventoryValue = menu.reduce((s,i)=>s+i.price*i.qty, 0)

  const unlockedItemId = inventoryState.startsWith('unlocked-item:')
    ? parseInt(inventoryState.replace('unlocked-item:','')) : null

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem', flexWrap:'wrap', gap:'0.75rem' }}>
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700 }}>Canteen</h2>
          <p style={{ color:'var(--color-text2)', fontSize:'0.83rem', marginTop:2 }}>
            Menu items &amp; PIN-protected inventory management
          </p>
        </div>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          <button onClick={()=>setInventoryState('pending-bulk')} className="btn-ghost" style={{ fontSize:'0.85rem' }}>
            🔐 Restock inventory
          </button>
          <button onClick={()=>{ setShowAdd(true); setEditId(null); setForm({name:'',price:'',qty:'',category:'Drinks'}) }}
            className="btn-primary" style={{ fontSize:'0.875rem' }}>
            + Add item
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
        {[
          { label:'Total items',     value:totalItems,                                    color:'var(--color-text)' },
          { label:'Low stock (≤3)',  value:lowStock,                                      color:'var(--color-amber)' },
          { label:'Out of stock',    value:outOfStock,                                    color:'var(--color-red)' },
          { label:'Inventory value', value:`₹${inventoryValue.toLocaleString('en-IN')}`, color:'var(--color-green)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:'0.75rem 1.1rem' }}>
            <div style={{ fontSize:'0.72rem', color:'var(--color-text3)' }}>{s.label}</div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.15rem', color:s.color, marginTop:2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* PIN gates */}
      {inventoryState==='pending-bulk' && (
        <PinGate action="update all stock quantities"
          onUnlock={()=>setInventoryState('unlocked-bulk')}
          onCancel={()=>setInventoryState('idle')} />
      )}
      {inventoryState.startsWith('pending-item:') && (
        <PinGate action="edit this item's stock"
          onUnlock={()=>setInventoryState(inventoryState.replace('pending-','unlocked-'))}
          onCancel={()=>setInventoryState('idle')} />
      )}

      {/* Bulk restock panel */}
      {inventoryState==='unlocked-bulk' && (
        <div className="card" style={{ padding:'1.25rem', marginBottom:'1.25rem', border:'1px solid rgba(34,197,94,0.3)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.85rem' }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.95rem' }}>
              🔐 Restock — all items (unlocked)
            </h3>
            <button onClick={()=>setInventoryState('idle')} className="btn-ghost" style={{ padding:'0.35rem 0.75rem', fontSize:'0.8rem' }}>
              Lock ✓
            </button>
          </div>
          <p style={{ fontSize:'0.78rem', color:'var(--color-text3)', marginBottom:'1rem' }}>
            Set the current stock count for each item. Changes save immediately.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
            {menu.map(item => (
              <div key={item.id} style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'0.6rem 0.85rem', background:'var(--color-bg3)', borderRadius:8 }}>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:'0.88rem', fontWeight:500 }}>{item.name}</span>
                  <span style={{ fontSize:'0.78rem', color:'var(--color-text3)', marginLeft:8 }}>₹{item.price}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                  <button onClick={()=>adjustQty(item.id,-1)}
                    style={{ width:28,height:28,borderRadius:6,border:'1px solid var(--color-border)',background:'transparent',color:'var(--color-text)',cursor:'pointer',fontWeight:700 }}>−</button>
                  <input type="number" min="0" value={item.qty}
                    onChange={e=>setItemQty(item.id,parseInt(e.target.value)||0)}
                    style={{ width:56,textAlign:'center',background:'var(--color-bg2)',border:'1px solid var(--color-border)',borderRadius:6,padding:'0.3rem',color:'var(--color-text)',fontSize:'0.9rem',fontWeight:700 }} />
                  <button onClick={()=>adjustQty(item.id,1)}
                    style={{ width:28,height:28,borderRadius:6,border:'1px solid var(--color-green)',background:'var(--color-green-glow)',color:'var(--color-green)',cursor:'pointer',fontWeight:700 }}>+</button>
                </div>
                <div style={{ width:88,fontSize:'0.73rem',textAlign:'right',fontWeight:600,
                  color:item.qty===0?'var(--color-red)':item.qty<=3?'var(--color-amber)':'var(--color-green)' }}>
                  {item.qty===0?'Out of stock':item.qty<=3?`Low: ${item.qty}`:`${item.qty} in stock`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu by category */}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom:'1.5rem' }}>
          <h3 style={{ fontSize:'0.75rem',fontWeight:600,color:'var(--color-text3)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'0.6rem' }}>
            {cat} <span style={{ fontWeight:400 }}>({items.length})</span>
          </h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'0.6rem' }}>
            {items.map(item => {
              const stockColor = item.qty===0?'var(--color-red)':item.qty<=3?'var(--color-amber)':'var(--color-green)'
              const stockLabel = item.qty===0?'Out of stock':item.qty<=3?`Low: ${item.qty} left`:`${item.qty} in stock`
              const isUnlocked = unlockedItemId===item.id

              return (
                <div key={item.id} className="card" style={{ padding:'1rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.6rem' }}>
                    <div>
                      <div style={{ fontWeight:500, fontSize:'0.92rem' }}>{item.name}</div>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--color-green)', fontSize:'1rem', marginTop:1 }}>₹{item.price}</div>
                    </div>
                    <div style={{ display:'flex', gap:4 }}>
                      <button onClick={()=>startEdit(item)}
                        style={{ background:'none',border:'none',color:'var(--color-text3)',cursor:'pointer',fontSize:'0.85rem',padding:'0.2rem 0.3rem',borderRadius:4,transition:'color 0.15s' }}
                        onMouseEnter={e=>e.target.style.color='var(--color-blue)'}
                        onMouseLeave={e=>e.target.style.color='var(--color-text3)'}>✏️</button>
                      <button onClick={()=>handleDelete(item.id)}
                        style={{ background:'none',border:'none',color:'var(--color-text3)',cursor:'pointer',fontSize:'0.85rem',padding:'0.2rem 0.3rem',borderRadius:4,transition:'color 0.15s' }}
                        onMouseEnter={e=>e.target.style.color='var(--color-red)'}
                        onMouseLeave={e=>e.target.style.color='var(--color-text3)'}>✕</button>
                    </div>
                  </div>

                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:6 }}>
                    <span style={{ fontSize:'0.75rem', color:stockColor, fontWeight:500 }}>{stockLabel}</span>
                    {isUnlocked ? (
                      <div style={{ display:'flex', alignItems:'center', gap:'0.35rem' }}>
                        <button onClick={()=>adjustQty(item.id,-1)}
                          style={{ width:24,height:24,borderRadius:5,border:'1px solid var(--color-border)',background:'transparent',color:'var(--color-text)',cursor:'pointer',fontWeight:700,fontSize:'0.9rem',display:'flex',alignItems:'center',justifyContent:'center' }}>−</button>
                        <input type="number" min="0" value={item.qty}
                          onChange={e=>setItemQty(item.id,parseInt(e.target.value)||0)}
                          style={{ width:44,textAlign:'center',background:'var(--color-bg2)',border:'1px solid var(--color-border)',borderRadius:5,padding:'0.2rem',color:'var(--color-text)',fontSize:'0.85rem',fontWeight:700 }} />
                        <button onClick={()=>adjustQty(item.id,1)}
                          style={{ width:24,height:24,borderRadius:5,border:'1px solid var(--color-green)',background:'var(--color-green-glow)',color:'var(--color-green)',cursor:'pointer',fontWeight:700,fontSize:'0.9rem',display:'flex',alignItems:'center',justifyContent:'center' }}>+</button>
                        <button onClick={()=>setInventoryState('idle')}
                          style={{ fontSize:'0.7rem',color:'var(--color-green)',background:'none',border:'none',cursor:'pointer',fontWeight:600 }}>✓ Done</button>
                      </div>
                    ) : (
                      <button onClick={()=>setInventoryState(`pending-item:${item.id}`)}
                        style={{ fontSize:'0.7rem',color:'var(--color-text3)',background:'none',border:'1px solid var(--color-border)',borderRadius:5,padding:'2px 7px',cursor:'pointer',display:'flex',alignItems:'center',gap:3 }}>
                        🔐 Edit stock
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Add / Edit modal */}
      {showAdd && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem' }}>
          <div className="card" style={{ width:'100%',maxWidth:380,padding:'1.5rem' }}>
            <h3 style={{ fontFamily:'var(--font-display)',fontWeight:700,marginBottom:'1.25rem' }}>
              {editId ? 'Edit item' : 'Add canteen item'}
            </h3>
            <form onSubmit={handleSaveItem} style={{ display:'flex',flexDirection:'column',gap:'0.85rem' }}>
              <div>
                <label style={lbl}>Item name *</label>
                <input className="input-field" required placeholder="Coke" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.6rem' }}>
                <div>
                  <label style={lbl}>Price (₹) *</label>
                  <input className="input-field" required type="number" min="1" step="0.5" placeholder="40" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} />
                </div>
                <div>
                  <label style={lbl}>Initial stock qty</label>
                  <input className="input-field" type="number" min="0" placeholder="10" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})} />
                </div>
              </div>
              <div>
                <label style={lbl}>Category *</label>
                <select className="input-field" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                  {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display:'flex',gap:'0.5rem',marginTop:4 }}>
                <button type="button" onClick={()=>{setShowAdd(false);setEditId(null)}} className="btn-ghost" style={{ flex:1,justifyContent:'center' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex:1,justifyContent:'center' }}>
                  {editId?'Save changes':'Add item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}