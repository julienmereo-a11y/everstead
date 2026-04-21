import React, { useState, useEffect } from 'react'

const AIRTABLE_FORM = 'https://airtable.com/appXXUKK4cq6XRoxk/pag8DPIU0ISXt4oHV/form'

const features = [
  { icon: '🏦', label: 'Accounts & assets', desc: 'Every bank, investment, and digital account in one place.' },
  { icon: '📄', label: 'Document vault', desc: 'Wills, insurance, property deeds — securely stored and accessible.' },
  { icon: '👥', label: 'Trusted people', desc: 'Assign executors, proxies, and advisors with controlled access.' },
  { icon: '📋', label: 'Step-by-step instructions', desc: 'Leave clear guidance for your family, on your terms.' },
  { icon: '❤️', label: 'Final wishes', desc: 'Funeral preferences, personal letters, sentimental notes.' },
  { icon: '🔒', label: 'Bank-level security', desc: 'AES-256 encryption, UK data residency, SOC 2 infrastructure.' },
]

const stats = [
  { value: '14 days', label: 'Free trial' },
  { value: 'AES-256', label: 'Encryption' },
  { value: 'UK GDPR', label: 'Compliant' },
  { value: '£0', label: 'To get started' },
]

export default function ComingSoon() {
  const [count, setCount] = useState(0)

  // Animated counter for waitlist
  useEffect(() => {
    const target = 247
    const step = Math.ceil(target / 60)
    const timer = setInterval(() => {
      setCount(c => {
        if (c + step >= target) { clearInterval(timer); return target }
        return c + step
      })
    }, 24)
    return () => clearInterval(timer)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d1628',
      fontFamily: 'Georgia, "Times New Roman", serif',
      color: '#fff',
      overflow: 'hidden',
    }}>

      {/* Grid overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(to right,rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.03) 1px,transparent 1px)',
        backgroundSize: '52px 52px',
      }} />

      {/* Radial glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(76,125,71,0.12) 0%, transparent 70%)',
      }} />

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav style={{
        position: 'relative', zIndex: 10,
        maxWidth: 960, margin: '0 auto',
        padding: '28px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo inline SVG */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill="rgba(76,125,71,0.25)"/>
            <polyline points="14,5 23,11 23,22 5,22 5,11 14,5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <rect x="10" y="15" width="8" height="7" rx="2" fill="#4c7d47"/>
            <path d="M11.5,15 L11.5,12.5 C11.5,10 16.5,10 16.5,12.5 L16.5,15" stroke="#4c7d47" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          </svg>
          <span style={{ fontSize: 20, fontWeight: 400, letterSpacing: '-0.02em', color: '#fff' }}>Everstead</span>
        </div>

        <div style={{
          background: 'rgba(76,125,71,0.2)',
          border: '1px solid rgba(76,125,71,0.4)',
          borderRadius: 999,
          padding: '5px 14px',
          fontSize: 11,
          fontFamily: '-apple-system, sans-serif',
          color: '#86b382',
          letterSpacing: '0.06em',
          fontWeight: 500,
        }}>
          LAUNCHING SOON IN LONDON
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 5,
        maxWidth: 760, margin: '0 auto',
        padding: '60px 32px 0',
        textAlign: 'center',
      }}>

        <p style={{
          fontSize: 12,
          fontFamily: '-apple-system, sans-serif',
          letterSpacing: '0.16em',
          color: '#4c7d47',
          fontWeight: 600,
          marginBottom: 24,
          textTransform: 'uppercase',
        }}>
          Digital estate planning, reimagined
        </p>

        <h1 style={{
          fontSize: 'clamp(38px, 6vw, 68px)',
          fontWeight: 400,
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          color: '#ffffff',
          marginBottom: 24,
        }}>
          Put your digital life in order,<br />
          <span style={{ color: 'rgba(255,255,255,0.55)' }}>so your family is not left guessing.</span>
        </h1>

        <p style={{
          fontSize: 18,
          fontFamily: '-apple-system, sans-serif',
          fontWeight: 400,
          color: 'rgba(255,255,255,0.6)',
          lineHeight: 1.7,
          maxWidth: 560,
          margin: '0 auto 48px',
        }}>
          Everstead helps you securely organise accounts, documents, instructions, and final wishes — so loved ones know what to do when it matters most.
        </p>

        {/* CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <a
            href={AIRTABLE_FORM}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#ffffff',
              color: '#0d1628',
              fontSize: 15,
              fontFamily: '-apple-system, sans-serif',
              fontWeight: 700,
              padding: '16px 36px',
              borderRadius: 12,
              textDecoration: 'none',
              letterSpacing: '-0.01em',
              transition: 'transform 0.15s, box-shadow 0.15s',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
            onMouseEnter={e => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)' }}
            onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)' }}
          >
            Join the waitlist →
          </a>
          <p style={{
            fontSize: 12,
            fontFamily: '-apple-system, sans-serif',
            color: 'rgba(255,255,255,0.35)',
          }}>
            {count}+ families already on the list · Free to join
          </p>
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 5,
        maxWidth: 760, margin: '64px auto 0',
        padding: '0 32px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 2,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}>
          {stats.map(({ value, label }) => (
            <div key={label} style={{
              padding: '20px 16px',
              textAlign: 'center',
              borderRight: '1px solid rgba(255,255,255,0.06)',
            }}>
              <p style={{ fontSize: 22, fontWeight: 400, color: '#fff', marginBottom: 4 }}>{value}</p>
              <p style={{ fontSize: 11, fontFamily: '-apple-system, sans-serif', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 5,
        maxWidth: 760, margin: '64px auto 0',
        padding: '0 32px',
      }}>
        <p style={{
          textAlign: 'center',
          fontSize: 11,
          fontFamily: '-apple-system, sans-serif',
          letterSpacing: '0.16em',
          color: 'rgba(255,255,255,0.35)',
          textTransform: 'uppercase',
          marginBottom: 32,
          fontWeight: 600,
        }}>
          Everything in one place
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}>
          {features.map(({ icon, label, desc }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14,
              padding: '20px 18px',
            }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>{icon}</div>
              <p style={{
                fontSize: 13,
                fontFamily: '-apple-system, sans-serif',
                fontWeight: 600,
                color: '#fff',
                marginBottom: 6,
              }}>{label}</p>
              <p style={{
                fontSize: 12,
                fontFamily: '-apple-system, sans-serif',
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.5,
              }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── QUOTE ────────────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 5,
        maxWidth: 600, margin: '72px auto 0',
        padding: '0 32px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 1, height: 48,
          background: 'linear-gradient(to bottom, rgba(76,125,71,0.6), transparent)',
          margin: '0 auto 32px',
        }} />
        <blockquote style={{
          fontSize: 'clamp(18px, 2.5vw, 24px)',
          fontWeight: 400,
          fontStyle: 'italic',
          color: 'rgba(255,255,255,0.7)',
          lineHeight: 1.6,
          marginBottom: 20,
        }}>
          "When someone dies, the hardest part is often the paperwork, the passwords, and the unanswered questions."
        </blockquote>
        <p style={{
          fontSize: 12,
          fontFamily: '-apple-system, sans-serif',
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: '0.06em',
        }}>
          Everstead exists so your family never has to face that alone.
        </p>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 5,
        maxWidth: 760, margin: '72px auto 0',
        padding: '0 32px 80px',
        textAlign: 'center',
      }}>
        <div style={{
          background: 'rgba(76,125,71,0.1)',
          border: '1px solid rgba(76,125,71,0.25)',
          borderRadius: 20,
          padding: '48px 40px',
        }}>
          <h2 style={{
            fontSize: 'clamp(24px, 4vw, 38px)',
            fontWeight: 400,
            color: '#fff',
            marginBottom: 12,
            letterSpacing: '-0.02em',
          }}>
            Give your family clarity, not chaos.
          </h2>
          <p style={{
            fontSize: 15,
            fontFamily: '-apple-system, sans-serif',
            color: 'rgba(255,255,255,0.5)',
            marginBottom: 32,
            lineHeight: 1.6,
          }}>
            Join the waitlist and be among the first families to use Everstead when we launch in London.
          </p>
          <a
            href={AIRTABLE_FORM}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#4c7d47',
              color: '#fff',
              fontSize: 14,
              fontFamily: '-apple-system, sans-serif',
              fontWeight: 700,
              padding: '14px 32px',
              borderRadius: 10,
              textDecoration: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            Join the waitlist →
          </a>
          <p style={{
            fontSize: 11,
            fontFamily: '-apple-system, sans-serif',
            color: 'rgba(255,255,255,0.25)',
            marginTop: 16,
          }}>
            No credit card · No commitment · Launching in London 2026
          </p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer style={{
        position: 'relative', zIndex: 5,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '24px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: 760,
        margin: '0 auto',
      }}>
        <p style={{
          fontSize: 12,
          fontFamily: '-apple-system, sans-serif',
          color: 'rgba(255,255,255,0.2)',
        }}>
          © 2026 Everstead Ltd · Registered in England & Wales
        </p>
        <p style={{
          fontSize: 12,
          fontFamily: '-apple-system, sans-serif',
          color: 'rgba(255,255,255,0.2)',
        }}>
          hello@everstead.care
        </p>
      </footer>

    </div>
  )
}
