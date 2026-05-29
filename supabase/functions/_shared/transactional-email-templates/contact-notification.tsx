import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Link, Img, Row as EmailRow, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://www.wallcoverings.co.za'
const LOGO_URL = `${SITE_URL}/wci-logo.png`
const INSTAGRAM_URL = 'https://www.instagram.com/wciwallpapers/'
const LINKEDIN_URL = 'https://www.linkedin.com/company/wci-wallpapers'

interface Props {
  formType?: string
  name?: string
  surname?: string
  email?: string
  phone?: string
  company?: string
  location?: string
  country?: string
  projectName?: string
  role?: string
  message?: string
  projectStage?: string
  quantityEstimate?: string
  tradeAssist?: string
  projectType?: string
  bespokeType?: string
  attachmentUrl?: string
}

const DetailRow = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) return null
  return (
    <Text style={row}>
      <strong style={rowLabel}>{label}:</strong> {value}
    </Text>
  )
}

const ContactNotificationEmail = (props: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`New ${props.formType || 'contact'} submission from ${props.name || ''} ${props.surname || ''}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="WCI Wallpapers" width="120" height="auto" style={logo} />
        <Hr style={divider} />
        <Heading style={h1}>
          New {props.formType || 'contact'} enquiry
        </Heading>
        <Section style={detailsSection}>
          <DetailRow label="Form type" value={props.formType} />
          <DetailRow label="Name" value={[props.name, props.surname].filter(Boolean).join(' ')} />
          <DetailRow label="Email" value={props.email} />
          <DetailRow label="Phone" value={props.phone} />
          <DetailRow label="Company" value={props.company} />
          <DetailRow label="Role" value={props.role} />
          <DetailRow label="Location" value={props.location} />
          <DetailRow label="Country" value={props.country} />
          <DetailRow label="Project" value={props.projectName} />
          <DetailRow label="Project type" value={props.projectType} />
          <DetailRow label="Project stage" value={props.projectStage} />
          <DetailRow label="Quantity estimate" value={props.quantityEstimate} />
          <DetailRow label="Trade assist" value={props.tradeAssist} />
          <DetailRow label="Bespoke type" value={props.bespokeType} />
        </Section>
        {props.message && (
          <>
            <Hr style={lightDivider} />
            <Text style={messageLabel}>Message:</Text>
            <Text style={messageText}>{props.message}</Text>
          </>
        )}
        {props.attachmentUrl && (
          <>
            <Hr style={lightDivider} />
            <Text style={messageLabel}>Attachment:</Text>
            <Link href={props.attachmentUrl} style={attachmentLink}>View / Download Attachment</Link>
          </>
        )}
        <Hr style={divider} />
        <Text style={footer}>
          This is an automated notification from WCI Wallpapers.
        </Text>
        <Section style={socialSection}>
          <EmailRow>
            <Column align="left">
              <Link href={SITE_URL} style={siteLink}>wallcoverings.co.za</Link>
            </Column>
            <Column align="right">
              <Link href={INSTAGRAM_URL} style={socialLink}>Instagram</Link>
              <Text style={socialDot}>{"\u00A0\u00A0\u2022\u00A0\u00A0"}</Text>
              <Link href={LINKEDIN_URL} style={socialLink}>LinkedIn</Link>
            </Column>
          </EmailRow>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactNotificationEmail,
  subject: (data: Record<string, any>) =>
    `New ${data.formType || 'contact'} enquiry from ${data.name || 'a visitor'}`,
  displayName: 'Contact team notification',
  previewData: {
    formType: 'project',
    name: 'Jane',
    surname: 'Doe',
    email: 'jane@example.com',
    phone: '+27 82 123 4567',
    company: 'Studio Nine',
    message: "I'm interested in a custom wallcovering for a hotel lobby.",
    projectType: 'Hospitality',
    projectStage: 'Design',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '40px 30px', maxWidth: '560px', margin: '0 auto' }
const logo = { margin: '0 0 20px' }
const divider = { borderColor: '#D8D6D1', margin: '24px 0' }
const lightDivider = { borderColor: '#EDEBE8', margin: '20px 0 16px' }
const h1 = { fontSize: '22px', fontWeight: '400' as const, color: '#1C1C1C', lineHeight: '1.4', margin: '0 0 20px' }
const detailsSection = { margin: '0' }
const row = { fontSize: '14px', color: '#1C1C1C', lineHeight: '1.8', margin: '0' }
const rowLabel = { color: '#6F6F6F' }
const messageLabel = { fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#BFBAB0', margin: '0 0 8px', fontWeight: '600' as const }
const messageText = { fontSize: '14px', color: '#1C1C1C', lineHeight: '1.7', margin: '0', whiteSpace: 'pre-wrap' as const }
const footer = { fontSize: '13px', color: '#BFBAB0', lineHeight: '1.6', margin: '0 0 20px' }
const attachmentLink = { fontSize: '14px', color: '#1C1C1C', textDecoration: 'underline', textUnderlineOffset: '3px' }
const socialSection = { margin: '0' }
const siteLink = { fontSize: '12px', color: '#BFBAB0', textDecoration: 'none' }
const socialLink = { fontSize: '12px', color: '#BFBAB0', textDecoration: 'none' }
const socialDot = { fontSize: '12px', color: '#BFBAB0', display: 'inline' as const, margin: '0', padding: '0' }
