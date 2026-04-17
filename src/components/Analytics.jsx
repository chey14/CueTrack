import { useState, useMemo } from 'react'
import { useBills } from '../hooks/useBills'
import { useClubSettings } from '../hooks/useClubSettings'

// ── Helpers ──────────────────────────────────────────────────────
function inr(n) { return `₹${Number(n).toLocaleString('en-IN')}` }
function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }
function dateKey(d)  { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function monthLabel(key) {
  const [y,m] = key.split('-')
  return new Date(y, m-1, 1).toLocaleString('en-IN',{month:'short',year:'2-digit'})
}
function friendlyDate(key) {
  const today = dateKey(new Date())
  const yesterday = dateKey(new Date(Date.now() - 86400000))
  if (key === today) return 'Today'
  if (key === yesterday) return 'Yesterday'
  const [y,m,d] = key.split('-')
  return new Date(y,m-1,d).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})
}

export default function Analytics() {
  const { bills, loading } = useBills()
  const { settings } = useClubSettings()
  const [historyFilter, setHistoryFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('overview')

  const analytics = useMemo(() => {
    if (!bills.length) return null

    const now = new Date()
    const todayKey     = dateKey(now)
    const thisMonthKey = monthKey(now)

    // Group by date
    const byDate = {}
    bills.forEach(b => {
      const k = dateKey(b.createdAt)
      if (!byDate[k]) byDate[k] = []
      byDate[k].push(b)
    })

    // Group by month
    const byMonth = {}
    bills.forEach(b => {
      const k = monthKey(b.createdAt)
      if (!byMonth[k]) byMonth[k] = []
      byMonth[k].push(b)
    })

    // Today stats
    const todayBills   = byDate[todayKey] || []
    const todayRevenue = todayBills.reduce((s,b)=>s+b.total, 0)
    const todaySessions = todayBills.length

    // Yesterday
    const yKey = dateKey(new Date(Date.now()-86400000))
    const yesterdayRevenue = (byDate[yKey]||[]).reduce((s,b)=>s+b.total,0)

    const todayChange = yesterdayRevenue > 0
      ? (((todayRevenue-yesterdayRevenue)/yesterdayRevenue)*100).toFixed(0)
      : null

    // Last 6 months chart
    const last6 = []
    for (let i=5; i>=0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1)
      const k = monthKey(d)
      const mb = byMonth[k] || []
      last6.push({ key:k, label:monthLabel(k), revenue:mb.reduce((s,b)=>s+b.total,0), count:mb.length })
    }

    const thisMonthRevenue = last6[5].revenue
    const lastMonthRevenue = last6[4].revenue
    const nonZero = last6.filter(m=>m.revenue>0)
    const avgRevenue = nonZero.length ? nonZero.reduce((s,m)=>s+m.revenue,0)/nonZero.length : 0
    const pctChange = lastMonthRevenue > 0
      ? (((thisMonthRevenue-lastMonthRevenue)/lastMonthRevenue)*100).toFixed(1)
      : null

    // Peak hours
    const hourBuckets = Array(24).fill(0)
    bills.forEach(b => { hourBuckets[b.createdAt.getHours()] += b.total })

    // Table performance this month
    const tableMap = {}
    ;(byMonth[thisMonthKey]||[]).forEach(b => {
      if (!tableMap[b.tableName]) tableMap[b.tableName] = { revenue:0, sessions:0 }
      tableMap[b.tableName].revenue  += b.total
      tableMap[b.tableName].sessions += 1
    })
    const tablePerf = Object.entries(tableMap)
      .map(([name,d])=>({name,...d}))
      .sort((a,b)=>b.revenue-a.revenue)

    // Payment breakdown this month
    const payments = { cash:0, upi:0, pending:0 }
    ;(byMonth[thisMonthKey]||[]).forEach(b => {
      payments[b.paymentMode] = (payments[b.paymentMode]||0)+b.total
    })

    // Table vs canteen revenue split — today and this month
    const todayTableRev   = todayBills.reduce((s,b)=>s+(b.tableCharge||0),0)
    const todayCanteenRev = todayBills.reduce((s,b)=>s+(b.canteenTotal||0),0)
    const monthBillsAll   = byMonth[thisMonthKey]||[]
    const monthTableRev   = monthBillsAll.reduce((s,b)=>s+(b.tableCharge||0),0)
    const monthCanteenRev = monthBillsAll.reduce((s,b)=>s+(b.canteenTotal||0),0)

    // Sorted date keys for history (newest first)
    const sortedDateKeys = Object.keys(byDate).sort((a,b)=>b.localeCompare(a))

    return {
      todayRevenue, todaySessions, todayChange, yesterdayRevenue,
      todayTableRev, todayCanteenRev, monthTableRev, monthCanteenRev,
      last6, thisMonthRevenue, lastMonthRevenue, avgRevenue,
      projected: avgRevenue*12, pctChange,
      hourBuckets, tablePerf, payments, byDate, sortedDateKeys,
    }
  }, [bills])

  // ── WhatsApp daily summary ────────────────────────────────────
  function sendDailySummary() {
    if (!analytics || !settings.ownerWhatsapp) return
    const phone = settings.ownerWhatsapp.replace(/\D/g,'')
    const { todayRevenue, todaySessions, tablePerf } = analytics
    const topTable = tablePerf[0]
    const lines = [
      `📊 *Daily Summary — ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short'})}*`,
      `🏪 ${settings.clubName || 'Your Club'}`,
      ``,
      `💰 Today's revenue: *${inr(todayRevenue)}*`,
      `🎱 Sessions completed: *${todaySessions}*`,
      topTable ? `🏆 Best table: *${topTable.name}* (${inr(topTable.revenue)})` : '',
      ``,
      `Have a great day! — CueTrack`,
    ].filter(Boolean)
    const msg = encodeURIComponent(lines.join('\n'))
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${msg}`, '_blank', 'noopener,noreferrer')
  }

  // ── CSV Export ───────────────────────────────────────────────
  function exportCSV() {
    if (!bills.length) return
    const headers = [
      'Bill No', 'Date', 'Check-in', 'Check-out', 'Duration (min)',
      'Table', 'Type', 'Size', 'Rate/hr (₹)',
      'Table Charge (₹)', 'Canteen (₹)', 'Total (₹)',
      'Payment', 'Customer', 'Phone'
    ]
    const rows = bills.map(b => {
      const checkIn  = b.checkInTime  ? new Date(b.checkInTime)  : null
      const checkOut = b.checkOutTime ? new Date(b.checkOutTime) : b.createdAt
      const fmtT = (d) => d ? d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}) : ''
      const fmtD = (d) => d ? d.toLocaleDateString('en-IN') : ''
      return [
        b.billNumber || '',
        fmtD(b.createdAt),
        fmtT(checkIn),
        fmtT(checkOut),
        (b.elapsed / 60).toFixed(1),
        b.tableName,
        b.tableType || '',
        b.tableSize || '',
        (b.ratePerMin * 60).toFixed(0),
        b.tableCharge?.toFixed(2) || '',
        b.canteenTotal?.toFixed(2) || '0',
        b.total.toFixed(2),
        b.paymentMode,
        b.customer?.name || '',
        b.customer?.phone || '',
      ]
    })
    // Build CSV string
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `cuetrack-bills-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Loading / empty states ────────────────────────────────────
  if (loading) return <div style={{ color:'var(--color-text3)',padding:'2rem',textAlign:'center' }}>Loading analytics...</div>

  if (!bills.length || !analytics) {
    return (
      <div style={{ textAlign:'center',padding:'4rem 2rem' }}>
        <div style={{ fontSize:'3rem',marginBottom:'1rem' }}>📊</div>
        <h3 style={{ fontFamily:'var(--font-display)',fontWeight:700,marginBottom:'0.5rem' }}>No data yet</h3>
        <p style={{ color:'var(--color-text2)',fontSize:'0.9rem' }}>
          Complete your first table session to see analytics here.
        </p>
      </div>
    )
  }

  const { todayRevenue, todaySessions, todayChange, yesterdayRevenue, todayTableRev, todayCanteenRev, monthTableRev, monthCanteenRev, last6, thisMonthRevenue, lastMonthRevenue, avgRevenue, projected, pctChange, hourBuckets, tablePerf, payments, byDate, sortedDateKeys } = analytics

  const tabStyle = (t) => ({
    padding:'0.45rem 0.9rem',borderRadius:6,border:'none',cursor:'pointer',
    fontFamily:'var(--font-display)',fontWeight:600,fontSize:'0.82rem',
    background:activeTab===t?'var(--color-surface)':'transparent',
    color:activeTab===t?'var(--color-text)':'var(--color-text3)',
    transition:'all 0.15s',
  })

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem',flexWrap:'wrap',gap:'0.75rem' }}>
        <div style={{ display:'flex',gap:4,background:'var(--color-bg2)',border:'1px solid var(--color-border)',borderRadius:10,padding:4 }}>
          {[['overview','Overview'],['history','Bill history']].map(([id,label]) => (
            <button key={id} onClick={()=>setActiveTab(id)} style={tabStyle(id)}>{label}</button>
          ))}
        </div>

        {/* Daily summary button */}
        {settings.ownerWhatsapp && (
          <button onClick={sendDailySummary} className="btn-ghost"
            style={{ fontSize:'0.82rem',padding:'0.45rem 1rem',display:'flex',alignItems:'center',gap:'0.4rem' }}>
            📲 Send daily summary
          </button>
        )}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display:'flex',flexDirection:'column',gap:'1.25rem' }}>

          {/* TODAY highlight card */}
          <div className="card" style={{ padding:'1.25rem',border:'1px solid rgba(34,197,94,0.3)',background:'linear-gradient(135deg,rgba(34,197,94,0.06) 0%,transparent 60%)' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'0.75rem' }}>
              <div>
                <div style={{ fontSize:'0.78rem',color:'var(--color-text3)',marginBottom:4 }}>Today's revenue</div>
                <div style={{ fontFamily:'var(--font-display)',fontWeight:800,fontSize:'2rem',color:'var(--color-green)' }}>
                  {inr(todayRevenue)}
                </div>
                <div style={{ fontSize:'0.78rem',color:'var(--color-text3)',marginTop:4 }}>
                  {todaySessions} session{todaySessions!==1?'s':''} completed
                  {todayChange !== null && (
                    <span style={{ marginLeft:8,color:parseFloat(todayChange)>=0?'var(--color-green)':'var(--color-red)',fontWeight:600 }}>
                      {parseFloat(todayChange)>=0?'↑':'↓'} {Math.abs(todayChange)}% vs yesterday
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:'0.78rem',color:'var(--color-text3)',marginBottom:4 }}>Yesterday</div>
                <div style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:'1.2rem',color:'var(--color-text2)' }}>
                  {inr(yesterdayRevenue)}
                </div>
              </div>
            </div>
          </div>

          {/* Today: table vs canteen split */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem' }}>
            {[
              { label:'Today — tables',  value:inr(Math.round(todayTableRev)),   color:'var(--color-green)', sub:'Table play revenue' },
              { label:'Today — canteen', value:inr(Math.round(todayCanteenRev)), color:'var(--color-amber)', sub:'Food & drinks revenue' },
            ].map(k => (
              <div key={k.label} className="card" style={{ padding:'0.95rem 1.1rem' }}>
                <div style={{ fontSize:'0.75rem',color:'var(--color-text3)',marginBottom:3 }}>{k.label}</div>
                <div style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:'1.15rem',color:k.color,marginBottom:2 }}>{k.value}</div>
                <div style={{ fontSize:'0.72rem',color:'var(--color-text3)' }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* This month: table vs canteen split */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem' }}>
            {[
              { label:'This month — tables',  value:inr(Math.round(monthTableRev)),   color:'var(--color-green)', sub:'Table play revenue' },
              { label:'This month — canteen', value:inr(Math.round(monthCanteenRev)), color:'var(--color-amber)', sub:'Food & drinks revenue' },
            ].map(k => (
              <div key={k.label} className="card" style={{ padding:'0.95rem 1.1rem' }}>
                <div style={{ fontSize:'0.75rem',color:'var(--color-text3)',marginBottom:3 }}>{k.label}</div>
                <div style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:'1.15rem',color:k.color,marginBottom:2 }}>{k.value}</div>
                <div style={{ fontSize:'0.72rem',color:'var(--color-text3)' }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Monthly KPIs */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'0.75rem' }}>
            {[
              { label:'This month',      value:inr(thisMonthRevenue), sub:pctChange?`${pctChange>0?'+':''}${pctChange}% vs last month`:'First month', color:'var(--color-text)' },
              { label:'Last month',      value:inr(lastMonthRevenue), sub:'Previous period', color:'var(--color-text2)' },
              { label:'Monthly avg',     value:inr(Math.round(avgRevenue)), sub:'Last 6 months', color:'var(--color-amber)' },
              { label:'Projected year',  value:inr(Math.round(projected)), sub:'Based on avg',   color:'var(--color-blue)' },
            ].map(k => (
              <div key={k.label} className="card" style={{ padding:'0.95rem 1.1rem' }}>
                <div style={{ fontSize:'0.75rem',color:'var(--color-text3)',marginBottom:3 }}>{k.label}</div>
                <div style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:'1.2rem',color:k.color,marginBottom:2 }}>{k.value}</div>
                <div style={{ fontSize:'0.72rem',color:'var(--color-text3)' }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* 6-month chart */}
          <div className="card" style={{ padding:'1.25rem' }}>
            <h3 style={{ fontFamily:'var(--font-display)',fontWeight:600,fontSize:'0.95rem',marginBottom:'1rem' }}>Monthly revenue</h3>
            <div style={{ display:'flex',alignItems:'flex-end',gap:8,height:110 }}>
              {last6.map((m,i) => {
                const maxRev = Math.max(...last6.map(x=>x.revenue), 1)
                const isCurrent = i === 5
                return (
                  <div key={m.key} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4,height:'100%',justifyContent:'flex-end' }}>
                    {isCurrent && m.revenue>0 && (
                      <span style={{ fontSize:'0.65rem',color:'var(--color-green)',fontFamily:'var(--font-display)',fontWeight:700,whiteSpace:'nowrap' }}>
                        {inr(m.revenue)}
                      </span>
                    )}
                    <div style={{ width:'100%',background:isCurrent?'var(--color-green)':'var(--color-surface)',borderRadius:'3px 3px 0 0',height:`${Math.max((m.revenue/maxRev)*100,2)}%`,transition:'height 0.5s ease',opacity:isCurrent?1:0.55 }}/>
                    <span style={{ fontSize:'0.65rem',color:'var(--color-text3)',whiteSpace:'nowrap' }}>{m.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Peak hours */}
          <div className="card" style={{ padding:'1.25rem' }}>
            <h3 style={{ fontFamily:'var(--font-display)',fontWeight:600,fontSize:'0.95rem',marginBottom:'1rem' }}>Peak hours</h3>
            <div style={{ display:'flex',alignItems:'flex-end',gap:3,height:72 }}>
              {hourBuckets.map((val,i) => {
                const maxVal = Math.max(...hourBuckets, 1)
                const pct = val/maxVal
                const color = pct>0.7?'var(--color-amber)':pct>0.3?'var(--color-green)':'var(--color-surface)'
                const label = i===0?'12am':i===12?'12pm':i<12?`${i}am`:`${i-12}pm`
                return (
                  <div key={i} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,height:'100%',justifyContent:'flex-end' }} title={`${label}: ${inr(val)}`}>
                    <div style={{ width:'100%',borderRadius:'2px 2px 0 0',height:`${Math.max(pct*100,2)}%`,background:color,minHeight:2 }}/>
                    {i%3===0 && <span style={{ fontSize:'0.56rem',color:'var(--color-text3)',whiteSpace:'nowrap' }}>{label}</span>}
                  </div>
                )
              })}
            </div>
            {(() => {
              const peak = hourBuckets.indexOf(Math.max(...hourBuckets))
              const pl = peak<12?`${peak}am`:peak===12?'12pm':`${peak-12}pm`
              return <p style={{ fontSize:'0.75rem',color:'var(--color-text3)',marginTop:'0.4rem' }}>🔥 Peak hour: {pl}</p>
            })()}
          </div>

          {/* Table performance */}
          {tablePerf.length > 0 && (
            <div className="card" style={{ padding:'1.25rem' }}>
              <h3 style={{ fontFamily:'var(--font-display)',fontWeight:600,fontSize:'0.95rem',marginBottom:'1rem' }}>Table performance this month</h3>
              {tablePerf.map((t,i) => (
                <div key={t.name} style={{ marginBottom:'0.85rem' }}>
                  <div style={{ display:'flex',justifyContent:'space-between',fontSize:'0.85rem',marginBottom:4 }}>
                    <span style={{ fontWeight:500 }}>{t.name}</span>
                    <span style={{ color:'var(--color-green)',fontFamily:'var(--font-display)',fontWeight:600 }}>{inr(t.revenue)}</span>
                  </div>
                  <div style={{ height:5,background:'var(--color-bg3)',borderRadius:3,overflow:'hidden' }}>
                    <div style={{ height:'100%',width:`${(t.revenue/(tablePerf[0].revenue||1))*100}%`,background:i===0?'var(--color-green)':'var(--color-surface)',borderRadius:3,transition:'width 0.5s ease' }}/>
                  </div>
                  <div style={{ fontSize:'0.7rem',color:'var(--color-text3)',marginTop:2 }}>{t.sessions} sessions</div>
                </div>
              ))}
            </div>
          )}

          {/* Payment breakdown */}
          <div className="card" style={{ padding:'1.25rem' }}>
            <h3 style={{ fontFamily:'var(--font-display)',fontWeight:600,fontSize:'0.95rem',marginBottom:'0.85rem' }}>Payments this month</h3>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.6rem' }}>
              {[['cash','Cash','var(--color-green)'],['upi','UPI','var(--color-blue)'],['pending','Pending','var(--color-red)']].map(([key,label,color]) => (
                <div key={key} style={{ background:'var(--color-bg3)',borderRadius:8,padding:'0.85rem',textAlign:'center' }}>
                  <div style={{ fontSize:'0.72rem',color:'var(--color-text3)',marginBottom:4 }}>{label}</div>
                  <div style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:'1.05rem',color }}>{inr(payments[key]||0)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ──────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div>
          {/* Filter pills + export */}
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem',flexWrap:'wrap',gap:'0.75rem' }}>
            <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
              {[['all','All'],['cash','Cash'],['upi','UPI'],['pending','Pending']].map(([val,label]) => (
                <button key={val} onClick={()=>setHistoryFilter(val)}
                  style={{ padding:'0.35rem 0.85rem',borderRadius:20,border:`1px solid ${historyFilter===val?'var(--color-green)':'var(--color-border)'}`,background:historyFilter===val?'var(--color-green-glow)':'transparent',color:historyFilter===val?'var(--color-green)':'var(--color-text3)',fontFamily:'var(--font-display)',fontWeight:600,fontSize:'0.78rem',cursor:'pointer',transition:'all 0.15s' }}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={exportCSV} className="btn-ghost"
              style={{ fontSize:'0.8rem',padding:'0.4rem 0.9rem',display:'flex',alignItems:'center',gap:'0.4rem' }}>
              ⬇ Export CSV
            </button>
          </div>

          {/* Bills grouped by date */}
          {sortedDateKeys.map(dk => {
            const dayBills = (byDate[dk] || []).filter(b => historyFilter==='all' || b.paymentMode===historyFilter)
            if (!dayBills.length) return null
            const dayTotal = dayBills.reduce((s,b)=>s+b.total, 0)
            return (
              <div key={dk} style={{ marginBottom:'1.5rem' }}>
                {/* Date header */}
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.6rem',paddingBottom:'0.4rem',borderBottom:'1px solid var(--color-border)' }}>
                  <h4 style={{ fontFamily:'var(--font-display)',fontWeight:600,fontSize:'0.9rem',color: dk===dateKey(new Date())?'var(--color-green)':'var(--color-text)' }}>
                    {friendlyDate(dk)}
                  </h4>
                  <span style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:'0.9rem',color:'var(--color-green)' }}>
                    {inr(dayTotal)} · {dayBills.length} bill{dayBills.length!==1?'s':''}
                  </span>
                </div>

                {/* Bills for this date */}
                <div style={{ display:'flex',flexDirection:'column',gap:'0.4rem' }}>
                  {dayBills.map(b => {
                    const checkIn  = b.checkInTime  ? new Date(b.checkInTime)  : null
                    const checkOut = b.checkOutTime ? new Date(b.checkOutTime) : b.createdAt
                    const fmtT = (d) => d?.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}) || '—'
                    return (
                      <div key={b.id} className="card"
                        style={{ padding:'0.85rem 1.1rem',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'0.75rem',flexWrap:'wrap' }}>
                        <div style={{ flex:1,minWidth:180 }}>
                          <div style={{ display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:2 }}>
                            <span style={{ fontWeight:600,fontSize:'0.88rem' }}>{b.tableName}</span>
                            {b.customer?.name && <span style={{ color:'var(--color-text3)',fontSize:'0.8rem' }}>· {b.customer.name}</span>}
                          </div>
                          {b.billNumber && (
                            <div style={{ fontSize:'0.7rem',color:'var(--color-green)',fontFamily:'var(--font-display)',fontWeight:600,marginBottom:2 }}>
                              #{b.billNumber}
                            </div>
                          )}
                          <div style={{ fontSize:'0.72rem',color:'var(--color-text3)',display:'flex',gap:'0.75rem',flexWrap:'wrap' }}>
                            <span>In: {fmtT(checkIn)}</span>
                            <span>Out: {fmtT(checkOut)}</span>
                            <span>{Math.floor(b.elapsed/60)}m {b.elapsed%60}s</span>
                            {b.canteenTotal>0 && <span>Canteen ₹{b.canteenTotal.toFixed(0)}</span>}
                          </div>
                        </div>
                        <div style={{ display:'flex',alignItems:'center',gap:'0.6rem' }}>
                          <span className={b.paymentMode==='cash'?'tag tag-green':b.paymentMode==='upi'?'tag tag-blue':'tag tag-red'}
                            style={{ fontSize:'0.68rem',textTransform:'capitalize' }}>
                            {b.paymentMode}
                          </span>
                          <span style={{ fontFamily:'var(--font-display)',fontWeight:700,color:'var(--color-green)',fontSize:'0.95rem' }}>
                            {inr(b.total)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {sortedDateKeys.every(dk => !(byDate[dk]||[]).filter(b=>historyFilter==='all'||b.paymentMode===historyFilter).length) && (
            <p style={{ color:'var(--color-text3)',textAlign:'center',padding:'2rem',fontSize:'0.9rem' }}>
              No bills found for this filter.
            </p>
          )}
        </div>
      )}
    </div>
  )
}