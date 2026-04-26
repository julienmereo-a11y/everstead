import {
  Html, Head, Body, Container, Text, Link, Hr, Preview,
} from '@react-email/components'

export default function InviteAcceptedEmail({ firstName = 'there', trustedPersonName = 'Someone', role = 'trusted contact' }) {
  return (
    <Html>
      <Head />
      <Preview>{trustedPersonName} has accepted your invitation.</Preview>
      <Body style={body}>
        <Container style={container}>

          <Text style={logo}>Everstead</Text>

          <Text style={heading}>
            {trustedPersonName} has accepted your invitation.
          </Text>

          <Text style={paragraph}>
            Hi {firstName},
          </Text>

          <Text style={paragraph}>
            Good news — {trustedPersonName} has accepted their role as your <strong>{role}</strong> on your Everstead plan.
          </Text>

          <Text style={paragraph}>
            They now have access to the sections you've chosen to share with them. You can update their permissions at any time from your dashboard.
          </Text>

          <Hr style={hr} />

          <Link href="https://www.everstead.care/dashboard" style={button}>
            View your trusted people →
          </Link>

          <Text style={paragraph}>
            If you didn't invite {trustedPersonName} or have any concerns, please reply to this email immediately.
          </Text>

          <Text style={signature}>
            Julien<br />
            Founder, Everstead
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            © 2026 Everstead Digital Ltd · Registered in England & Wales
          </Text>

        </Container>
      </Body>
    </Html>
  )
}

const body = { backgroundColor: '#f8f7f5', fontFamily: 'Georgia, serif' }
const container = { margin: '0 auto', padding: '40px 24px', maxWidth: '560px' }
const logo = { fontSize: '22px', fontWeight: '400', color: '#0d1628', letterSpacing: '-0.02em', marginBottom: '32px' }
const heading = { fontSize: '24px', fontWeight: '400', color: '#0d1628', lineHeight: '1.3', marginBottom: '24px' }
const paragraph = { fontSize: '15px', color: '#44403c', lineHeight: '1.7', marginBottom: '16px' }
const button = { display: 'inline-block', backgroundColor: '#0d1628', color: '#ffffff', fontSize: '14px', fontWeight: '600', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', marginBottom: '24px' }
const signature = { fontSize: '15px', color: '#0d1628', lineHeight: '1.7', marginTop: '24px' }
const hr = { borderColor: '#e5e2dc', margin: '24px 0' }
const footer = { fontSize: '11px', color: '#a8a29e', textAlign: 'center' }