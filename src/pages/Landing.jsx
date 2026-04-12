import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

// ---------- tiny helpers ----------
const NAV_LINKS = ['Problem', 'Solution', 'Features', 'Why CueTrack', 'Stories', 'Contact']

function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

// ---------- Navbar ----------
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? 'rgba(15,17,23,0.92)' : 'transparent',
      backdropFilter: scrolled ? 'blur(16px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(46,51,71,0.6)' : 'none',
      transition: 'all 0.3s',
      padding: '0 2rem',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', height: 64 }}>
        {/* Logo */}
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'var(--color-green)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#0a1a0f" strokeWidth="2"/>
              <circle cx="12" cy="12" r="3" fill="#0a1a0f"/>
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="#0a1a0f" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)' }}>
            CueTrack
          </span>
        </a>

        {/* Desktop links */}
        <div style={{ display: 'flex', gap: '0.25rem', marginLeft: 'auto', marginRight: '1.5rem', alignItems: 'center' }}
          className="hidden md:flex">
          {NAV_LINKS.map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(' ', '-')}`}
              style={{
                color: 'var(--color-text2)', fontSize: '0.875rem', fontWeight: 500,
                padding: '0.4rem 0.75rem', borderRadius: 6, textDecoration: 'none', transition: 'color 0.2s',
              }}
              onMouseEnter={e => e.target.style.color = 'var(--color-text)'}
              onMouseLeave={e => e.target.style.color = 'var(--color-text2)'}
            >{l}</a>
          ))}
        </div>

        <Link to="/login" className="btn-primary" style={{ fontSize: '0.875rem', padding: '0.5rem 1.2rem' }}>
          Get Started →
        </Link>

        {/* Mobile menu toggle */}
        <button onClick={() => setMenuOpen(!menuOpen)}
          style={{ background: 'none', border: 'none', color: 'var(--color-text)', cursor: 'pointer', marginLeft: 16, display: 'none' }}
          className="block md:hidden">
          ☰
        </button>
      </div>
    </nav>
  )
}

// ---------- Hero ----------
function Hero() {
  return (
    <section style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', padding: '8rem 2rem 4rem',
    }} className="grid-bg noise">

      {/* Glow orbs */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 400, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(34,197,94,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 800, textAlign: 'center', position: 'relative', zIndex: 1 }}>

        <div className="animate-fade-up" style={{ marginBottom: '1.5rem' }}>
          <span className="tag tag-green" style={{ fontSize: '0.8rem' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-green)', display: 'inline-block', animation: 'pulse-dot 2s infinite' }} />
            Built for Indian snooker & pool clubs
          </span>
        </div>

        <h1 className="animate-fade-up delay-1" style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(2.8rem, 7vw, 5rem)',
          fontWeight: 800, lineHeight: 1.05, marginBottom: '1.5rem', letterSpacing: '-0.02em',
        }}>
          Stop Writing Bills<br />
          <span style={{ color: 'var(--color-green)' }}>in a Notebook.</span>
        </h1>

        <p className="animate-fade-up delay-2" style={{
          fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: 'var(--color-text2)',
          lineHeight: 1.7, maxWidth: 560, margin: '0 auto 2.5rem', fontWeight: 300,
        }}>
          CueTrack automates table timing, billing, canteen orders, and revenue analytics
          for snooker & pool clubs. Works offline. Sends WhatsApp receipts. Free to start.
        </p>

        <div className="animate-fade-up delay-3" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/login" className="btn-primary" style={{ fontSize: '1rem', padding: '0.8rem 2rem' }}>
            Start Free — No Credit Card
          </Link>
          <a href="#solution" className="btn-ghost" style={{ fontSize: '1rem', padding: '0.8rem 2rem' }}>
            See How It Works
          </a>
        </div>

        <div className="animate-fade-up delay-4" style={{
          display: 'flex', gap: '2.5rem', justifyContent: 'center', marginTop: '3.5rem',
          paddingTop: '2rem', borderTop: '1px solid var(--color-border)',
        }}>
          {[['100%', 'Billing accuracy'], ['0 disputes', 'With customers'], ['Works offline', 'No internet needed']].map(([val, lab]) => (
            <div key={lab} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.3rem', color: 'var(--color-green)' }}>{val}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text3)', marginTop: 2 }}>{lab}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------- Problem ----------
function Problem() {
  const [ref, visible] = useInView()
  const problems = [
    { icon: '📓', title: 'Manual notebooks', desc: 'Start time, end time, table number — all written by hand. One mistake and you lose money or have an angry customer.' },
    { icon: '🕐', title: 'Timing disputes', desc: '"I only played 40 mins!" — without digital proof, you have no way to settle the argument. Customer leaves unhappy.' },
    { icon: '🥤', title: 'Forgotten canteen', desc: 'Player orders a Coke midway through a session. By checkout time, it\'s been forgotten and you eat the cost.' },
    { icon: '📊', title: 'Zero visibility', desc: 'You have no idea which table earns the most, which hour is busiest, or how this month compares to last month.' },
    { icon: '💡', title: 'Power cuts & net drops', desc: 'In Indian clubs, power cuts are real. If your system needs internet, billing stops. That\'s unacceptable.' },
    { icon: '🔐', title: 'No access control', desc: 'Any staff member can change prices, delete bills, or see revenue. You need separate owner vs staff logins.' },
  ]

  return (
    <section id="problem" ref={ref} style={{ padding: '6rem 2rem', background: 'var(--color-bg2)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <span className="tag tag-red" style={{ marginBottom: '1rem', display: 'inline-flex' }}>The Problem</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, marginBottom: '1rem' }}>
            Manual management is costing you money <span style={{ color: 'var(--color-red)' }}>every single day</span>
          </h2>
          <p style={{ color: 'var(--color-text2)', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
            Every club owner we talked to faces these same six problems. Most don't even realise how much revenue they're losing.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {problems.map((p, i) => (
            <div key={p.title} className="card"
              style={{
                padding: '1.5rem', opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(20px)',
                transition: `all 0.5s ease ${i * 0.08}s`,
                borderLeft: '3px solid var(--color-red)',
              }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '0.75rem' }}>{p.icon}</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '0.5rem', fontSize: '1.05rem' }}>{p.title}</h3>
              <p style={{ color: 'var(--color-text2)', fontSize: '0.9rem', lineHeight: 1.6 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------- Solution ----------
function Solution() {
  const [ref, visible] = useInView()
  const steps = [
    { n: '01', title: 'Owner sets up tables', desc: 'Add your tables, set rate per minute (e.g. ₹3.33/min), add canteen menu items. Takes 10 minutes.' },
    { n: '02', title: 'Tap to start a session', desc: 'When players sit down, tap the table card. Timer starts automatically. Cost updates every second.' },
    { n: '03', title: 'Add canteen items anytime', desc: 'Player orders something? Add it to the table tab in one tap. It\'s tracked and added to the final bill.' },
    { n: '04', title: 'Checkout with one tap', desc: 'Tap End. Bill is calculated. Accept cash, UPI, or mark as pending. Send receipt via WhatsApp instantly.' },
  ]

  return (
    <section id="solution" ref={ref} style={{ padding: '6rem 2rem', position: 'relative', overflow: 'hidden' }} className="grid-bg">
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <span className="tag tag-green" style={{ marginBottom: '1rem', display: 'inline-flex' }}>The Solution</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, marginBottom: '1rem' }}>
            How CueTrack works in <span style={{ color: 'var(--color-green)' }}>4 simple steps</span>
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 700, margin: '0 auto' }}>
          {steps.map((s, i) => (
            <div key={s.n}
              style={{
                display: 'flex', gap: '1.5rem', alignItems: 'flex-start',
                opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateX(-20px)',
                transition: `all 0.5s ease ${i * 0.12}s`,
              }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2.5rem',
                color: 'var(--color-green)', opacity: 0.3, lineHeight: 1, minWidth: 60, paddingTop: 4,
              }}>{s.n}</div>
              <div className="card" style={{ padding: '1.25rem 1.5rem', flex: 1 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '0.4rem' }}>{s.title}</h3>
                <p style={{ color: 'var(--color-text2)', fontSize: '0.9rem', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------- Features ----------
function Features() {
  const [ref, visible] = useInView()
  const features = [
    {
      tag: 'Core', icon: '⚡',
      title: 'Live table dashboard',
      desc: 'See all your tables at a glance — green = free, amber = running, blue = paused. Real-time cost ticking every second.',
    },
    {
      tag: 'Core', icon: '🧾',
      title: 'Auto billing',
      desc: 'Stop time → bill is calculated instantly. Zero maths, zero errors. Supports cash, UPI, and "collect later".',
    },
    {
      tag: 'Core', icon: '🍟',
      title: 'Canteen integration',
      desc: 'Link food & drinks to any active table session. All merged into one clean bill at checkout.',
    },
    {
      tag: 'Differentiator', icon: '📲',
      title: 'WhatsApp receipts',
      desc: 'One tap sends the full bill to the customer\'s WhatsApp. They get proof, you get zero disputes.',
    },
    {
      tag: 'Differentiator', icon: '🔗',
      title: 'Customer live view',
      desc: 'QR code on each table → customer scans → sees their live timer and running cost on their own phone.',
    },
    {
      tag: 'Differentiator', icon: '📶',
      title: 'Works offline',
      desc: 'Power cuts? Wi-Fi down? CueTrack keeps running. All data is stored locally and syncs when you\'re back online.',
    },
    {
      tag: 'Analytics', icon: '📈',
      title: 'Revenue analytics',
      desc: 'Monthly vs last month, peak hours heatmap, projected annual revenue, best-performing tables. All in one dashboard.',
    },
    {
      tag: 'Analytics', icon: '📅',
      title: 'Full history',
      desc: 'Filter by any month or year. Export to CSV for accounting. Never lose a transaction record.',
    },
    {
      tag: 'Access', icon: '🔐',
      title: 'Owner & staff logins',
      desc: 'Owner sees everything. Staff can only operate tables and billing — no access to financials or settings.',
    },
  ]

  const tagColors = { Core: 'tag-blue', Differentiator: 'tag-green', Analytics: 'tag-amber', Access: 'tag-red' }

  return (
    <section id="features" ref={ref} style={{ padding: '6rem 2rem', background: 'var(--color-bg2)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <span className="tag tag-blue" style={{ marginBottom: '1rem', display: 'inline-flex' }}>Features</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, marginBottom: '1rem' }}>
            Everything you need, <span style={{ color: 'var(--color-green)' }}>nothing you don't</span>
          </h2>
          <p style={{ color: 'var(--color-text2)', maxWidth: 480, margin: '0 auto' }}>
            We deliberately kept it simple. No bloat. Every feature solves a real problem we heard from club owners.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {features.map((f, i) => (
            <div key={f.title} className="card"
              style={{
                padding: '1.5rem', cursor: 'default',
                opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(16px)',
                transition: `all 0.4s ease ${i * 0.06}s`,
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(34,197,94,0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.6rem' }}>{f.icon}</span>
                <span className={`tag ${tagColors[f.tag]}`}>{f.tag}</span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '0.5rem' }}>{f.title}</h3>
              <p style={{ color: 'var(--color-text2)', fontSize: '0.88rem', lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------- Why CueTrack ----------
function WhyCueTrack() {
  const [ref, visible] = useInView()
  const comparisons = [
    { aspect: 'Pricing', others: 'Paid subscriptions only', us: 'Free to start, always' },
    { aspect: 'Offline support', others: 'Needs internet always', us: 'Full offline mode' },
    { aspect: 'WhatsApp receipt', others: 'Not available', us: 'One-tap send' },
    { aspect: 'Customer live timer', others: 'Not available', us: 'QR code on each table' },
    { aspect: 'Setup time', others: '2+ hours with support', us: '< 15 minutes, self-serve' },
    { aspect: 'Daily summary', others: 'Log in to check', us: 'WhatsApp message to owner' },
    { aspect: 'Target audience', others: 'Large chains', us: 'Local clubs like yours' },
  ]

  return (
    <section id="why-cuetrack" ref={ref} style={{ padding: '6rem 2rem', position: 'relative' }} className="grid-bg">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span className="tag tag-amber" style={{ marginBottom: '1rem', display: 'inline-flex' }}>Why CueTrack</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, marginBottom: '1rem' }}>
            Built specifically for <span style={{ color: 'var(--color-amber)' }}>local Indian clubs</span>
          </h2>
          <p style={{ color: 'var(--color-text2)', maxWidth: 500, margin: '0 auto' }}>
            Other software was built for large chains. CueTrack is built for the 5-table shop near your college.
          </p>
        </div>

        <div className="card" style={{ overflow: 'hidden', opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(20px)', transition: 'all 0.5s ease' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg3)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'left', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text3)', width: '30%' }}>Feature</th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'left', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text3)', width: '35%' }}>Others (CueFlow etc.)</th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'left', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-green)', width: '35%' }}>CueTrack</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((c, i) => (
                <tr key={c.aspect} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text)' }}>{c.aspect}</td>
                  <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.88rem', color: 'var(--color-text3)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ color: 'var(--color-red)', fontWeight: 700 }}>✗</span> {c.others}
                    </span>
                  </td>
                  <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.88rem', color: 'var(--color-text)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ color: 'var(--color-green)', fontWeight: 700 }}>✓</span> {c.us}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

// ---------- Success Stories ----------
function Stories() {
  return (
    <section id="stories" style={{ padding: '6rem 2rem', background: 'var(--color-bg2)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span className="tag tag-green" style={{ marginBottom: '1rem', display: 'inline-flex' }}>Success Stories</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, marginBottom: '1rem' }}>
            Clubs already <span style={{ color: 'var(--color-green)' }}>loving it</span>
          </h2>
          <p style={{ color: 'var(--color-text2)', maxWidth: 500, margin: '0 auto' }}>
            We're currently piloting with clubs near VIT Vellore. Stories coming soon — want to be the first?
          </p>
        </div>

        {/* Placeholder cards - will be replaced with real testimonials */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {['Your club could be here', 'Your club could be here', 'Your club could be here'].map((_, i) => (
            <div key={i} className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'var(--color-bg3)', border: '2px dashed var(--color-border)',
                margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem',
              }}>?</div>
              <div style={{
                height: 12, background: 'var(--color-bg3)', borderRadius: 6,
                marginBottom: 8, width: '80%', marginLeft: 'auto', marginRight: 'auto',
              }} />
              <div style={{ height: 10, background: 'var(--color-bg3)', borderRadius: 6, width: '60%', marginLeft: 'auto', marginRight: 'auto' }} />
              <p style={{ color: 'var(--color-text3)', fontSize: '0.8rem', marginTop: '1rem' }}>
                Be one of the first clubs to try CueTrack — free, forever.
              </p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <a href="#contact" className="btn-primary">
            Get early access — it's free →
          </a>
        </div>
      </div>
    </section>
  )
}

// ---------- Contact ----------
function Contact() {
  const [form, setForm] = useState({ name: '', club: '', phone: '', message: '' })
  const [sent, setSent] = useState(false)

  // IMPORTANT: Replace 91XXXXXXXXXX with your actual WhatsApp number
  const YOUR_WHATSAPP = '9560728395'

  const handleSubmit = (e) => {
    e.preventDefault()   // stops the page from doing any navigation
    e.stopPropagation()  // stops the event from bubbling up
    const lines = [
      `🎱 *CueTrack Enquiry*`,
      ``,
      `👤 Name: ${form.name}`,
      `🏪 Club: ${form.club}`,
      `📱 Phone: ${form.phone}`,
      `💬 Message: ${form.message || '—'}`,
    ]
    const msg = encodeURIComponent(lines.join('\n'))
    // Opens WhatsApp in a new tab — does NOT navigate current page
    const url = `https://wa.me/${YOUR_WHATSAPP}?text=${msg}`
    const win = window.open(url, '_blank', 'noopener,noreferrer')
    if (win) win.focus()
    setSent(true)
  }

  return (
    <section id="contact" style={{ padding: '6rem 2rem', position: 'relative' }} className="grid-bg">
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span className="tag tag-blue" style={{ marginBottom: '1rem', display: 'inline-flex' }}>Contact</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 700, marginBottom: '1rem' }}>
            Ready to <span style={{ color: 'var(--color-green)' }}>go digital?</span>
          </h2>
          <p style={{ color: 'var(--color-text2)', lineHeight: 1.7 }}>
            Drop your details and we'll set your club up for free. Usually takes less than 15 minutes.
          </p>
        </div>

        {sent ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '0.5rem' }}>Message sent!</h3>
            <p style={{ color: 'var(--color-text2)' }}>We'll WhatsApp you back within a few hours.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--color-text2)', marginBottom: 6, display: 'block' }}>Your name</label>
              <input className="input-field" required placeholder="Rahul Kumar"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--color-text2)', marginBottom: 6, display: 'block' }}>Club name</label>
              <input className="input-field" required placeholder="Cues & Cushions, Vellore"
                value={form.club} onChange={e => setForm({ ...form, club: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--color-text2)', marginBottom: 6, display: 'block' }}>WhatsApp number</label>
              <input className="input-field" required placeholder="+91 98765 43210" type="tel"
                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--color-text2)', marginBottom: 6, display: 'block' }}>Any questions or special needs?</label>
              <textarea className="input-field" rows={3} placeholder="I have 6 tables, 2 pool and 4 snooker..."
                value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                style={{ resize: 'vertical' }} />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              Send via WhatsApp →
            </button>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text3)', textAlign: 'center' }}>
              This opens WhatsApp with your message pre-filled. No spam, ever.
            </p>
          </form>
        )}
      </div>
    </section>
  )
}

// ---------- Footer ----------
function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--color-border)', padding: '2.5rem 2rem',
      background: 'var(--color-bg2)',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--color-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#0a1a0f" strokeWidth="2"/>
              <circle cx="12" cy="12" r="3" fill="#0a1a0f"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>CueTrack</span>
          <span style={{ color: 'var(--color-text3)', fontSize: '0.85rem' }}>— Built with ❤️ by a fellow player</span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {NAV_LINKS.map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(' ', '-')}`}
              style={{ color: 'var(--color-text3)', fontSize: '0.85rem', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = 'var(--color-text)'}
              onMouseLeave={e => e.target.style.color = 'var(--color-text3)'}
            >{l}</a>
          ))}
        </div>
        <div style={{ color: 'var(--color-text3)', fontSize: '0.8rem' }}>© 2025 CueTrack</div>
      </div>
    </footer>
  )
}

// ---------- Page ----------
export default function Landing() {
  return (
    <>
      <Navbar />
      <Hero />
      <Problem />
      <Solution />
      <Features />
      <WhyCueTrack />
      <Stories />
      <Contact />
      <Footer />
    </>
  )
}