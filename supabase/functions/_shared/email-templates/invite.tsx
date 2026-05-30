/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Button, Container, Head, Heading, Html, Hr, Img, Link, Preview, Text, Section, Row, Column,
} from 'npm:@react-email/components@0.0.22'

const SITE_URL = 'https://www.wallcoverings.co.za'
const LOGO_URL = `${SITE_URL}/wci-logo.png`
const INSTAGRAM_URL = 'https://www.instagram.com/wciwallpapers/'
const LINKEDIN_URL = 'https://www.linkedin.com/company/wci-wallpapers'

interface InviteEmailProps { siteName: string; siteUrl: string; confirmationUrl: string; context?: string }

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl, context }: InviteEmailProps) => {
  const isExistingClient = context === 'existing_client'

  const previewText = isExistingClient
    ? 'Action required — update your WCI Wallpapers password'
    : "You\u2019ve been invited to join WCI Wallpapers"

  const heading = isExistingClient ? 'Update your password' : "You\u2019ve been invited"

  const bodyLines = isExistingClient
    ? [
        <>We\u2019re migrating to a new, more secure platform. Your account and any saved moodboards or preferences have been carried over and are safe.</>,
        <>To continue accessing your account after the upgrade, you\u2019ll need to set a new password. This is a one-time step \u2014 it only takes a moment.</>,
      ]
    : [
        <>You\u2019ve been invited to join{' '}
          <Link href={siteUrl} style={link}><strong>WCI Wallpapers</strong></Link>.
          Click the button below to set your password and get started.</>,
      ]

  const buttonLabel = isExistingClient ? 'SET YOUR PASSWORD' : 'ACCEPT INVITATION'

  const footerText = isExistingClient
    ? "If you don\u2019t complete this step before our upgrade, you\u2019ll still be able to register again \u2014 but please get in touch and we\u2019ll restore your saved data manually."
    : "If you weren\u2019t expecting this invitation, you can safely ignore this email."

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} alt="WCI Wallpapers" width="120" height="auto" style={logo} />
          <Hr style={divider} />
          <Heading style={h1}>{heading}</Heading>
          {bodyLines.map((line, i) => (
            <Text key={i} style={text}>{line}</Text>
          ))}
          <Section style={buttonSection}>
            <Button style={button} href={confirmationUrl}>{buttonLabel}</Button>
          </Section>
          <Hr style={divider} />
          <Text style={footer}>{footerText}</Text>
          <Section style={socialSection}>
            <Row>
              <Column align="left">
                <Link href={SITE_URL} style={siteLink}>wallcoverings.co.za</Link>
              </Column>
              <Column align="right">
                <Link href={INSTAGRAM_URL} style={socialLink}>Instagram</Link>
                <Text style={socialDot}>{"\u00A0\u00A0\u2022\u00A0\u00A0"}</Text>
                <Link href={LINKEDIN_URL} style={socialLink}>LinkedIn</Link>
              </Column>
            </Row>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '40px 30px', maxWidth: '560px', margin: '0 auto' }
const logo = { margin: '0 0 20px' }
const divider = { borderColor: '#D8D6D1', margin: '24px 0' }
const h1 = { fontSize: '22px', fontWeight: '400' as const, color: '#1C1C1C', lineHeight: '1.4', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#6F6F6F', lineHeight: '1.7', margin: '0 0 16px' }
const link = { color: '#1C1C1C', textDecoration: 'underline', textUnderlineOffset: '3px' }
const buttonSection = { margin: '8px 0' }
const button = { display: 'inline-block' as const, backgroundColor: '#1C1C1C', color: '#ffffff', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase' as const, borderRadius: '50px', padding: '14px 32px', textDecoration: 'none', fontWeight: '500' as const }
const footer = { fontSize: '13px', color: '#BFBAB0', lineHeight: '1.6', margin: '0 0 20px' }
const socialSection = { margin: '0' }
const siteLink = { fontSize: '12px', color: '#BFBAB0', textDecoration: 'none' }
const socialLink = { fontSize: '12px', color: '#BFBAB0', textDecoration: 'none' }
const socialDot = { fontSize: '12px', color: '#BFBAB0', display: 'inline' as const, margin: '0', padding: '0' }
