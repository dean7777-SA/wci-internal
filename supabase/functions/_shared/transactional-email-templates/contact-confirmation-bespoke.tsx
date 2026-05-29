import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Img, Link, Section, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://www.wallcoverings.co.za'
const LOGO_URL = `${SITE_URL}/wci-logo.png`
const INSTAGRAM_URL = 'https://www.instagram.com/wciwallpapers/'
const LINKEDIN_URL = 'https://www.linkedin.com/company/wci-wallpapers'

interface Props {
  name?: string
}

const BespokeConfirmationEmail = ({ name }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your bespoke enquiry has reached our studio</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="WCI Wallpapers" width="120" height="auto" style={logo} />
        <Hr style={divider} />
        <Heading style={h1}>
          {name ? `Thank you, ${name}.` : 'Thank you for reaching out.'}
        </Heading>
        <Text style={text}>
          Your bespoke enquiry has reached our studio — and with it, the beginning of a considered process.
        </Text>
        <Text style={text}>
          Bespoke work is where our craft is most fully expressed: a design developed in response to a specific space, a particular light, a defined atmosphere. A member of our design team will be in touch within 48 hours to begin understanding the intent behind your commission.
        </Text>
        <Text style={text}>
          Should your project be time-sensitive, you're welcome to reach us directly:
        </Text>
        <Text style={studioText}>
          Cape Town Studio{"\u00A0\u00A0\u2022\u00A0\u00A0"}Canal Walk, Century City{"\u00A0\u00A0\u2014\u00A0\u00A0"}021 465 6547<br />
          Johannesburg Studio{"\u00A0\u00A0\u2022\u00A0\u00A0"}Kramerville Corner, Sandton{"\u00A0\u00A0\u2014\u00A0\u00A0"}011 262 5213
        </Text>
        <Hr style={divider} />
        <Text style={footer}>
          Warm regards,<br />The WCI Wallpapers Team
        </Text>
        <Section style={socialSection}>
          <Row>
            <Column align="left">
              <Link href={SITE_URL} style={siteLink}>wallcoverings.co.za</Link>
            </Column>
            <Column align="right">
              <Link href={INSTAGRAM_URL} style={socialLink}>Instagram</Link>
              <Text style={socialDot}>&nbsp;&nbsp;•&nbsp;&nbsp;</Text>
              <Link href={LINKEDIN_URL} style={socialLink}>LinkedIn</Link>
            </Column>
          </Row>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BespokeConfirmationEmail,
  subject: 'Your bespoke enquiry has reached our studio',
  displayName: 'Bespoke design confirmation',
  previewData: { name: 'Jane Doe' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '40px 30px', maxWidth: '560px', margin: '0 auto' }
const logo = { margin: '0 0 20px' }
const divider = { borderColor: '#D8D6D1', margin: '24px 0' }
const h1 = { fontSize: '22px', fontWeight: '400' as const, color: '#1C1C1C', lineHeight: '1.4', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#6F6F6F', lineHeight: '1.7', margin: '0 0 16px' }
const studioText = { fontSize: '13px', color: '#6F6F6F', lineHeight: '2', margin: '0 0 4px' }
const footer = { fontSize: '13px', color: '#BFBAB0', lineHeight: '1.6', margin: '0 0 20px' }
const socialSection = { margin: '0' }
const siteLink = { fontSize: '12px', color: '#BFBAB0', textDecoration: 'none' }
const socialLink = { fontSize: '12px', color: '#BFBAB0', textDecoration: 'none' }
const socialDot = { fontSize: '12px', color: '#BFBAB0', display: 'inline' as const, margin: '0', padding: '0' }
