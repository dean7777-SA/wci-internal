import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Hr, Img, Link, Preview, Text, Section, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://www.wallcoverings.co.za'
const LOGO_URL = `${SITE_URL}/wci-logo.png`
const INSTAGRAM_URL = 'https://www.instagram.com/wciwallpapers/'
const LINKEDIN_URL = 'https://www.linkedin.com/company/wci-wallpapers'

interface Props {
  recipientName?: string
  registerUrl?: string
  context?: string // 'team' | 'public'
}

const MigrationNoticeEmail = ({ recipientName, registerUrl, context }: Props) => {
  const isTeam = context === 'team'
  const firstName = recipientName?.split(' ')[0] ?? 'there'

  const previewText = isTeam
    ? 'Action required — re-register to access the WCI team portal'
    : 'Action required — re-register to continue using WCI Wallpapers'

  const heading = isTeam ? 'Team portal upgrade' : 'We\u2019ve upgraded our platform'

  const intro = isTeam
    ? `Hi ${firstName}, we\u2019ve migrated the WCI Wallpapers team portal to a new, more secure platform.`
    : `Hi ${firstName}, we\u2019ve migrated WCI Wallpapers to a new, more secure platform.`

  const body = isTeam
    ? 'To regain access to the team portal, please re-register using the link below. Once you\u2019ve signed up, contact Dean to have your account role and access reinstated.'
    : 'To continue using your account and access your saved moodboards and preferences, please re-register using the link below. Your saved items will be restored once you\u2019ve signed up.'

  const buttonLabel = 'REGISTER NOW'
  const url = registerUrl ?? (isTeam ? 'https://wci-internal.vercel.app' : 'https://www.wallcoverings.co.za')

  const footerText = isTeam
    ? 'Questions? Contact Dean at dean@wallcoverings.co.za.'
    : 'Questions? Contact us at info@wallcoverings.co.za \u2014 we\u2019re happy to help.'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} alt="WCI Wallpapers" width="120" height="auto" style={logo} />
          <Hr style={divider} />
          <Heading style={h1}>{heading}</Heading>
          <Text style={text}>{intro}</Text>
          <Text style={text}>{body}</Text>
          <Section style={buttonSection}>
            <Button style={button} href={url}>{buttonLabel}</Button>
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
                <Text style={socialDot}>{'\u00A0\u00A0\u2022\u00A0\u00A0'}</Text>
                <Link href={LINKEDIN_URL} style={socialLink}>LinkedIn</Link>
              </Column>
            </Row>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry = {
  component: MigrationNoticeEmail,
  subject: (data) =>
    data.context === 'team'
      ? 'Action required \u2014 re-register for the WCI team portal'
      : 'Action required \u2014 re-register to continue using WCI Wallpapers',
  displayName: 'Migration Notice',
  previewData: {
    recipientName: 'Jane Smith',
    context: 'public',
    registerUrl: 'https://www.wallcoverings.co.za',
  },
}

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '40px 30px', maxWidth: '560px', margin: '0 auto' }
const logo = { marginBottom: '24px' }
const divider = { borderColor: '#e5e5e5', margin: '24px 0' }
const h1 = { fontSize: '22px', fontWeight: '600', color: '#1C1C1C', margin: '0 0 16px' }
const text = { fontSize: '15px', lineHeight: '1.6', color: '#444444', margin: '0 0 14px' }
const buttonSection = { margin: '28px 0' }
const button = {
  backgroundColor: '#1C1C1C', color: '#ffffff', borderRadius: '999px',
  padding: '14px 32px', fontSize: '12px', fontWeight: '600', letterSpacing: '0.08em',
  textDecoration: 'none', display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#999999', margin: '0 0 16px' }
const socialSection = { marginTop: '8px' }
const siteLink = { fontSize: '12px', color: '#999999', textDecoration: 'none' }
const socialLink = { fontSize: '12px', color: '#999999', textDecoration: 'none', display: 'inline' }
const socialDot = { fontSize: '12px', color: '#999999', display: 'inline', margin: '0' }
const link = { color: '#1C1C1C' }
