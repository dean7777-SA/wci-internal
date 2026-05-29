import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Img, Link, Section, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://www.wallcoverings.co.za'
const LOGO_URL = `${SITE_URL}/wci-logo.png`
const INSTAGRAM_URL = 'https://www.instagram.com/wciwallpapers/'
const LINKEDIN_URL = 'https://www.linkedin.com/company/wci-wallpapers'

interface Design {
  name?: string
  collection?: string
  colour?: string
  sku?: string
  category?: string
  image?: string | null
  sampleRequested?: boolean
}

interface WallDimension {
  name?: string
  width?: string
  height?: string
  notes?: string
}

interface Props {
  name?: string
  projectName?: string
  projectLocation?: string
  projectStage?: string
  projectNotes?: string
  requestType?: string
  designs?: Design[]
  wallDimensions?: WallDimension[]
}

const EstimateConfirmationEmail = ({
  name, projectName, projectLocation, projectStage, projectNotes,
  requestType, designs, wallDimensions,
}: Props) => {
  const hasDesigns = designs && designs.length > 0
  const hasWalls = wallDimensions && wallDimensions.length > 0
  const hasProjectDetails = projectName || projectLocation || projectStage || projectNotes

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your project selections have reached our studio</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} alt="WCI Wallpapers" width="120" height="auto" style={logo} />
          <Hr style={divider} />
          <Heading style={h1}>
            {name ? `Thank you, ${name}.` : 'Thank you.'}
          </Heading>
          <Text style={bodyText}>
            Your project selections have reached our studio. A member of our design team will prepare your request and respond personally within 48 hours.
          </Text>
          <Text style={bodyText}>
            This is the stage where a project begins to take shape {"\u2014"} where designs move from consideration into the context of your space. We look forward to supporting you through it.
          </Text>

          {hasProjectDetails && (
            <>
              <Hr style={lightDivider} />
              <Text style={sectionLabel}>Project Details</Text>
              {projectName && <Text style={detailRow}><span style={detailLabel}>Project:</span> {projectName}</Text>}
              {projectLocation && <Text style={detailRow}><span style={detailLabel}>Location:</span> {projectLocation}</Text>}
              {projectStage && <Text style={detailRow}><span style={detailLabel}>Stage:</span> {projectStage}</Text>}
              {requestType && <Text style={detailRow}><span style={detailLabel}>Request type:</span> {requestType}</Text>}
              {projectNotes && <Text style={detailRow}><span style={detailLabel}>Notes:</span> {projectNotes}</Text>}
            </>
          )}

          {hasDesigns && (
            <>
              <Hr style={lightDivider} />
              <Text style={sectionLabel}>Selected Designs ({designs!.length})</Text>
              {designs!.map((d, i) => (
                <Section key={i} style={designCard}>
                  <Row>
                    {d.image && (
                      <Column style={designImageCol}>
                        <Img src={d.image} alt={d.name || 'Design'} width="80" height="80" style={designImage} />
                      </Column>
                    )}
                    <Column style={designInfoCol}>
                      <Text style={designName}>
                        {d.collection || d.category || d.name || 'Untitled'}{d.colour ? ` \u2014 ${d.colour}` : ''}
                      </Text>
                      {d.sku && <Text style={designSku}>{d.sku}</Text>}
                      {d.sampleRequested && <Text style={designSample}>{"\u2022 Sample requested"}</Text>}
                    </Column>
                  </Row>
                </Section>
              ))}
            </>
          )}

          {hasWalls && (
            <>
              <Hr style={lightDivider} />
              <Text style={sectionLabel}>Wall Dimensions ({wallDimensions!.length})</Text>
              {wallDimensions!.map((w, i) => (
                <Text key={i} style={designRow}>
                  {w.name || `Wall ${i + 1}`}{w.width && w.height ? ` \u2014 ${w.width}m \u00D7 ${w.height}m` : ''}
                  {w.notes ? <span style={skuText}>{` (${w.notes})`}</span> : ''}
                </Text>
              ))}
            </>
          )}

          <Hr style={divider} />
          <Text style={bodyText}>
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

export const template = {
  component: EstimateConfirmationEmail,
  subject: 'Your project selections have reached our studio',
  displayName: 'Estimate confirmation',
  previewData: {
    name: 'Jane Doe',
    projectName: 'Hotel Lobby',
    projectLocation: 'Cape Town',
    projectStage: 'Design',
    requestType: 'estimate',
    designs: [
      { name: 'Panoramic Mural', category: 'Cosmic', colour: 'Sage', sku: 'PM-001', image: 'https://b2481037.smushcdn.com/2481037/wp-content/uploads/2024/12/Cosmic-Storm-Ocean_01_1200.jpg?lossy=0&strip=1&webp=1', sampleRequested: true },
      { name: 'Linear Texture', category: 'Dusk', colour: 'Charcoal', sku: 'LT-042', image: 'https://b2481037.smushcdn.com/2481037/wp-content/uploads/2024/09/Dusk-Mist_01_1200.jpg?lossy=0&strip=1&webp=1', sampleRequested: false },
    ],
    wallDimensions: [
      { name: 'Reception Wall', width: '6.2', height: '3.1', notes: 'Feature wall' },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '40px 30px', maxWidth: '560px', margin: '0 auto' }
const logo = { margin: '0 0 20px' }
const divider = { borderColor: '#D8D6D1', margin: '24px 0' }
const lightDivider = { borderColor: '#EDEBE8', margin: '20px 0 16px' }
const h1 = { fontSize: '22px', fontWeight: '400' as const, color: '#1C1C1C', lineHeight: '1.4', margin: '0 0 20px' }
const bodyText = { fontSize: '14px', color: '#6F6F6F', lineHeight: '1.7', margin: '0 0 16px' }
const sectionLabel = { fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#BFBAB0', margin: '0 0 10px', fontWeight: '600' as const }
const detailRow = { fontSize: '13px', color: '#6F6F6F', lineHeight: '1.6', margin: '0 0 4px' }
const detailLabel = { color: '#1C1C1C', fontWeight: '500' as const }
const designRow = { fontSize: '13px', color: '#1C1C1C', lineHeight: '1.6', margin: '0 0 6px' }
const designCard = { margin: '0 0 12px' }
const designImageCol = { width: '80px', verticalAlign: 'top' as const, paddingRight: '14px' }
const designImage = { borderRadius: '4px', objectFit: 'cover' as const, display: 'block' as const }
const designInfoCol = { verticalAlign: 'top' as const }
const designName = { fontSize: '13px', color: '#1C1C1C', lineHeight: '1.5', margin: '0 0 2px', fontWeight: '500' as const }
const designSku = { fontSize: '12px', color: '#BFBAB0', lineHeight: '1.4', margin: '0 0 2px' }
const designSample = { fontSize: '12px', color: '#6F6F6F', lineHeight: '1.4', margin: '0', fontStyle: 'italic' as const }
const skuText = { color: '#BFBAB0', fontSize: '12px' }
const studioText = { fontSize: '13px', color: '#6F6F6F', lineHeight: '2', margin: '0 0 4px' }
const footer = { fontSize: '13px', color: '#BFBAB0', lineHeight: '1.6', margin: '0 0 20px' }
const socialSection = { margin: '0' }
const siteLink = { fontSize: '12px', color: '#BFBAB0', textDecoration: 'none' }
const socialLink = { fontSize: '12px', color: '#BFBAB0', textDecoration: 'none' }
const socialDot = { fontSize: '12px', color: '#BFBAB0', display: 'inline' as const, margin: '0', padding: '0' }
