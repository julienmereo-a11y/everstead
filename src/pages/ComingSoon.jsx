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
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="data:image/png;base64,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" alt="Everstead" style={ height: 40, width: 'auto' } />
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
