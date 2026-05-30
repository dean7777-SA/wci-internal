/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Button, Container, Head, Heading, Html, Hr, Img, Link, Preview, Text, Section, Row, Column,
} from 'npm:@react-email/components@0.0.22'

const SITE_URL = 'https://www.wallcoverings.co.za'
const LOGO_URL = `${SITE_URL}/wci-logo.png`
const INSTAGRAM_URL = 'https://www.instagram.com/wciwallpapers/'
const LINKEDIN_URL = 'https://www.linkedin.com/company/wci-wallpapers'

interface MagicLinkEmailProps { siteName: string; confirmationUrl: string }

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your login link for WCI Wallpapers</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="WCI Wallpapers" width="120" height="auto" style={logo} />
        <Hr style={divider} />
        <Heading style={h1}>Your login link</Heading>
        <Text style={text}>Click the button below to log in to WCI Wallpapers. This link will expire shortly.</Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>Log In</Button>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>If you didn{"\u2019"}t request this link, you can safely ignore this email.</Text>
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

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '40px 30px', maxWidth: '560px', margin: '0 auto' }
const logo = { margin: '0 0 20px' }
const divider = { borderColor: '#D8D6D1', margin: '24px 0' }
const h1 = { fontSize: '22px', fontWeight: '400' as const, color: '#1C1C1C', lineHeight: '1.4', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#6F6F6F', lineHeight: '1.7', margin: '0 0 16px' }
const buttonSection = { margin: '8px 0' }
const button = { display: 'inline-block' as const, backgroundColor: '#1C1C1C', color: '#ffffff', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase' as const, borderRadius: '50px', padding: '14px 32px', textDecoration: 'none', fontWeight: '500' as const }
const footer = { fontSize: '13px', color: '#BFBAB0', lineHeight: '1.6', margin: '0 0 20px' }
const socialSection = { margin: '0' }
const siteLink = { fontSize: '12px', color: '#BFBAB0', textDecoration: 'none' }
const socialLink = { fontSize: '12px', color: '#BFBAB0', textDecoration: 'none' }
const socialDot = { fontSize: '12px', color: '#BFBAB0', display: 'inline' as const, margin: '0', padding: '0' }
