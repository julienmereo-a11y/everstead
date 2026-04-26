import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Link,
  Hr,
  Preview,
} from '@react-email/components'

export default function WelcomeEmail({ firstName = 'there' }) {
  return (
    <Html>
      <Head />
      <Preview>You've taken the first step, {firstName}.</Preview>
      <Body style={body}>
        <Container style={container}>

          {/* Logo */}
          <Text style={logo}>Everstead</Text>

          {/* Heading */}
          <Text style={heading}>
            You've taken the first step, {firstName}.
          </Text>

          {/* Body */}
          <Text style={paragraph}>
            Welcome to Everstead.
          </Text>

          <Text style={paragraph}>
            What you've just done — deciding to get your digital life in order — is one of the most thoughtful things you can do for the people you love. Most people never do it.
          </Text>

          <Text style={paragraph}>
            Over the next 14 days, you can start building your Everstead plan at your own pace. There's no rush, no checklist to complete tonight. Just start with one thing — an account, a document, a name.
          </Text>

          <Hr style={hr} />

          <Text style={paragraph}>A few things to know:</Text>

          <Text style={listItem}>→ Your information is encrypted and only accessible to you</Text>
          <Text style={listItem}>→ You choose exactly what your trusted people can see</Text>
          <Text style={listItem}>→ You can update everything at any time</Text>

          <Hr style={hr} />

          <Link href="https://www.everstea