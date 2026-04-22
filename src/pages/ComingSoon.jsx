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
      fontFamily: "'Cormorant Garamond', Georgia, serif",
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
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="data:image/png;base64,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" alt="Everstead" style={{ height: 96, width: 'auto' }} />
        </div>

        <div style={{
          background: 'rgba(76,125,71,0.2)',
          border: '1px solid rgba(76,125,71,0.4)',
          borderRadius: 999,
          padding: '5px 14px',
          fontSize: 11,
          fontFamily: "'DM Sans', system-ui, sans-serif",
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
          fontFamily: "'DM Sans', system-ui, sans-serif",
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
          fontFamily: "'DM Sans', system-ui, sans-serif",
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
              fontFamily: "'DM Sans', system-ui, sans-serif",
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
            fontFamily: "'DM Sans', system-ui, sans-serif",
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
              <p style={{ fontSize: 11, fontFamily: "'DM Sans', system-ui, sans-serif", color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
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
          fontFamily: "'DM Sans', system-ui, sans-serif",
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
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontWeight: 600,
                color: '#fff',
                marginBottom: 6,
              }}>{label}</p>
              <p style={{
                fontSize: 12,
                fontFamily: "'DM Sans', system-ui, sans-serif",
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
          fontFamily: "'DM Sans', system-ui, sans-serif",
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
            fontFamily: "'DM Sans', system-ui, sans-serif",
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
              fontFamily: "'DM Sans', system-ui, sans-serif",
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
            fontFamily: "'DM Sans', system-ui, sans-serif",
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
          fontFamily: "'DM Sans', system-ui, sans-serif",
          color: 'rgba(255,255,255,0.2)',
        }}>
          © 2026 Everstead Ltd · Registered in England & Wales
        </p>
        <p style={{
          fontSize: 12,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          color: 'rgba(255,255,255,0.2)',
        }}>
          hello@everstead.care
        </p>
      </footer>

    </div>
  )
}
