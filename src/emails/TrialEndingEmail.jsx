import {
  Html, Head, Body, Container, Text, Link, Hr, Preview,
} from '@react-email/components'

export default function TrialEndingEmail({ firstName = 'there', daysLeft = 3 }) {
  return (
    <Html>
      <Head />
      <Preview>Your Everstead trial ends in {daysLeft} days, {firstName}.</Preview>
      <Body style={body}>
        <Container style={container}>

          <Text style={logo}>Everstead</Text>

          <Text style={heading}>
            Your trial ends in {daysLeft} day{daysLeft > 1 ? 's' : ''}, {firstName}.
          </Text>

          <Text style={paragraph}>
            You've started something important. Don't let it go unfinished.
          </Text>

          <Text style={paragraph}>
            Everything you've added to your Everstead plan — your accounts, documents, trusted people — will remain safe and accessible when you subscribe.
          </Text>

          <Text style={paragraph}>
            After your trial ends, your plan will be locked. Your data won't be deleted, but your family won't be able to access it if something happens.
          </Text>

          <Hr style={hr} />

          <Link href="https://www.everstead.care/dashboard" style={button}>
            Continue your plan →
          </Link>

          <Text style={paragraph}>
            If you have any questions or need help, just reply to this email.
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