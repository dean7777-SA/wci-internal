import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Img, Column, Row as EmailRow, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://www.wallcoverings.co.za'
const LOGO_URL = `${SITE_URL}/wci-logo.png`
const INSTAGRAM_URL = 'https://www.instagram.com/wciwallpapers/'
const LINKEDIN_URL = 'https://www.linkedin.com/company/wci-wallpapers'

interface DesignItem {
  name?: string
  colour?: string
  sku?: string
  image?: string
  category?: string
  sampleRequested?: boolean
}

interface WallDimension {
  name?: string
  width?: string
  height?: string
  notes?: string
}

interface Props {
  fullName?: string
  email?: string
  phone?: string
  companyName?: string
  projectName?: string
  projectLocation?: string
  projectNotes?: string
  professionalRole?: string
  projectStage?: string
  requestType?: string
  designCount?: number
  wallCount?: number
  designs?: DesignItem[]
  wallDimensions?: WallDimension[]
  attachmentUrl?: string
}

const DetailRow = ({ label, value }: { label: string; value?: string | number | null }) => {
  if (!value && value !== 0) return null
  return (
    <Text style={row}>
      <strong style={rowLabel}>{label}:</strong> {value}
    </Text>
  )
}

const EstimateNotificationEmail = (props: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`New ${props.requestType || 'estimate'} request from ${props.fullName || ''}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="WCI Wallpapers" width="120" height="auto" style={logo} />
        <Hr style={divider} />
        <Heading style={h1}>
          New {props.requestType || 'estimate'} request
        </Heading>
        <Section style={detailsSection}>
          <DetailRow label="Name" value={props.fullName} />
          <DetailRow label="Email" value={props.email} />
          <DetailRow label="Phone" value={props.phone} />
          <DetailRow label="Company" value={props.companyName} />
          <DetailRow label="Role" value={props.professionalRole} />
          <DetailRow label="Project" value={props.projectName} />
          <DetailRow label="Location" value={props.projectLocation} />
          <DetailRow label="Stage" value={props.projectStage} />
          <DetailRow label="Request type" value={props.requestType} />
          <DetailRow label="Designs selected" value={props.designCount} />
          <DetailRow label="Wall entries" value={props.wallCount} />
        </Section>
        {props.designs && props.designs.length > 0 && (
          <>
            <Hr style={lightDivider} />
            <Text style={sectionLabel}>Selected Designs:</Text>
            {props.designs.map((design, i) => (
              <Section key={i} style={designCard}>
                <EmailRow>
                  {design.image && (
                    <Column style={designImgCol}>
                      <Img src={design.image} alt={design.name || ''} width="80" height="100" style={designImg} />
                    </Column>
                  )}
                  <Column style={designInfoCol}>
                    <Text style={designName}>{design.name || 'Unnamed design'}</Text>
                    {design.colour && <Text style={designDetail}>Colour: {design.colour}</Text>}
                    {design.sku && <Text style={designDetail}>SKU: {design.sku}</Text>}
                    {design.category && <Text style={designDetail}>Collection: {design.category}</Text>}
                    {design.sampleRequested && <Text style={designSample}>{"\u2726"} Sample requested</Text>}
                  </Column>
                </EmailRow>
              </Section>
            ))}
          </>
        )}
        {props.wallDimensions && props.wallDimensions.length > 0 && (
          <>
            <Hr style={lightDivider} />
            <Text style={sectionLabel}>Wall Dimensions:</Text>
            {props.wallDimensions.map((wall, i) => (
              <Text key={i} style={row}>
                {wall.name ? <strong style={rowLabel}>{wall.name}:</strong> : <strong style={rowLabel}>Wall {i + 1}:</strong>}
                {' '}{wall.width}m {"\u00D7"} {wall.height}m{wall.notes ? <>{" "}{"\u2014"}{" "}{wall.notes}</> : ''}
              </Text>
            ))}
          </>
        )}
        {props.projectNotes && (
          <>
            <Hr style={lightDivider} />
            <Text style={sectionLabel}>Notes:</Text>
            <Text style={messageText}>{props.projectNotes}</Text>
          </>
        )}
        {props.attachmentUrl && (
          <>
            <Hr style={lightDivider} />
            <Text style={sectionLabel}>Attachment:</Text>
            <Link href={props.attachmentUrl} style={attachmentLink}>View / Download Attachment</Link>
          </>
        )}
        <Hr style={divider} />
        <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
          <Link href="https://www.wallcoverings.co.za/sales" style={dashboardButton}>
            View in Sales Dashboard
          </Link>
        </Section>
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
  component: EstimateNotificationEmail,
  subject: (data: Record<string, any>) =>
    `New ${data.requestType || 'estimate'} request from ${data.fullName || 'a client'}`,
  displayName: 'Estimate team notification',
  previewData: {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+27 82 123 4567',
    companyName: 'Studio Nine',
    projectName: 'Hotel Lobby',
    projectLocation: 'Cape Town',
    projectStage: 'Design',
    requestType: 'estimate',
    designCount: 3,
    wallCount: 2,
    projectNotes: 'Need to match existing interior palette.',
    designs: [
      { name: 'Panoramic Mural', colour: 'Sage', sku: 'PM-001', category: 'Murals', sampleRequested: true },
      { name: 'Linear Texture', colour: 'Charcoal', sku: 'LT-042', category: 'Textures', sampleRequested: false },
      { name: 'Botanical Weave', colour: 'Natural', sku: 'BW-019', category: 'Weaves', sampleRequested: true },
    ],
    wallDimensions: [
      { name: 'Reception Wall', width: '6.2', height: '3.1', notes: 'Feature wall' },
      { name: 'Corridor', width: '12', height: '2.8' },
    ],
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
const sectionLabel = { fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#BFBAB0', margin: '0 0 8px', fontWeight: '600' as const }
const messageText = { fontSize: '14px', color: '#1C1C1C', lineHeight: '1.7', margin: '0', whiteSpace: 'pre-wrap' as const }
const footer = { fontSize: '13px', color: '#BFBAB0', lineHeight: '1.6', margin: '0 0 20px' }
const designCard = { margin: '12px 0', padding: '12px', backgroundColor: '#FAFAF8', borderRadius: '4px' }
const designImgCol = { width: '80px', verticalAlign: 'top' as const }
const designImg = { objectFit: 'cover' as const, borderRadius: '2px' }
const designInfoCol = { verticalAlign: 'top' as const, paddingLeft: '14px' }
const designName = { fontSize: '14px', fontWeight: '600' as const, color: '#1C1C1C', margin: '0 0 2px', lineHeight: '1.4' }
const designDetail = { fontSize: '13px', color: '#6F6F6F', margin: '0', lineHeight: '1.6' }
const designSample = { fontSize: '12px', color: '#8B6914', margin: '4px 0 0', fontWeight: '500' as const }
const attachmentLink = { fontSize: '14px', color: '#1C1C1C', textDecoration: 'underline', textUnderlineOffset: '3px' }
const dashboardButton = { display: 'inline-block' as const, padding: '12px 28px', backgroundColor: '#1C1C1C', color: '#ffffff', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase' as const, textDecoration: 'none', borderRadius: '4px', fontWeight: '500' as const }
const socialSection = { margin: '0' }
const siteLink = { fontSize: '12px', color: '#BFBAB0', textDecoration: 'none' }
const socialLink = { fontSize: '12px', color: '#BFBAB0', textDecoration: 'none' }
const socialDot = { fontSize: '12px', color: '#BFBAB0', display: 'inline' as const, margin: '0', padding: '0' }
