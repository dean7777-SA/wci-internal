import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Img, Link, Row as EmailRow, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL   = 'https://www.wallcoverings.co.za'
const LOGO_URL   = `${SITE_URL}/wci-logo.png`
const DASH_URL   = 'https://wci-internal.vercel.app/installations'

interface Product {
  name: string
  sku?: string | null
  quantity?: number | null
  unit?: string | null
}

interface Props {
  installerName?: string
  installationTitle?: string
  clientName?: string
  siteAddress?: string
  suburb?: string
  scheduledDate?: string
  scheduledEndDate?: string
  scheduledTimeStart?: string
  scheduledTimeEnd?: string
  priority?: string
  notes?: string
  products?: Product[]
  installationId?: string
}

const priorityColor = (p?: string) => {
  if (p === 'high')   return '#ef4444'
  if (p === 'medium') return '#f59e0b'
  return '#22c55e'
}

const priorityLabel = (p?: string) => {
  if (p === 'high')   return 'HIGH PRIORITY'
  if (p === 'medium') return 'MEDIUM PRIORITY'
  return 'LOW PRIORITY'
}

const fmtDate = (iso?: string) => {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

const InstallerNotificationEmail = (props: Props) => {
  const {
    installerName, installationTitle, clientName, siteAddress, suburb,
    scheduledDate, scheduledEndDate, scheduledTimeStart, scheduledTimeEnd,
    priority, notes, products = [], installationId,
  } = props

  const startStr  = fmtDate(scheduledDate)
  const endStr    = fmtDate(scheduledEndDate)
  const dateRange = endStr && endStr !== startStr ? `${startStr} → ${endStr}` : (startStr ?? 'TBC')
  const timeRange = [scheduledTimeStart, scheduledTimeEnd].filter(Boolean).join(' – ')
  const location  = [suburb, siteAddress].filter(Boolean).join(', ') || '—'
  const dashLink  = installationId ? `${DASH_URL}` : DASH_URL

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`Installation scheduled: ${installationTitle ?? 'New job'} – ${dateRange}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} alt="WCI Wallpapers" width="100" height="auto" style={logo} />
          <Hr style={divider} />

          {/* Priority badge */}
          {priority && (
            <Section style={{ margin: '0 0 16px' }}>
              <Text style={{
                display: 'inline-block' as const,
                backgroundColor: priorityColor(priority),
                color: '#fff',
                fontSize: '10px',
                fontWeight: '700',
                letterSpacing: '0.08em',
                padding: '3px 10px',
                borderRadius: '999px',
                margin: 0,
              }}>
                {priorityLabel(priority)}
              </Text>
            </Section>
          )}

          <Heading style={h1}>Hi {installerName ?? 'there'},</Heading>
          <Text style={intro}>
            You have been scheduled for an installation. Please review the details below and confirm your availability.
          </Text>

          {/* Job details */}
          <Section style={card}>
            <Text style={cardTitle}>{installationTitle ?? 'Installation Job'}</Text>
            <Hr style={lightDivider} />

            <EmailRow style={detailRow}>
              <Column style={iconCol}><Text style={icon}>👤</Text></Column>
              <Column>
                <Text style={detailLabel}>Client</Text>
                <Text style={detailValue}>{clientName ?? '—'}</Text>
              </Column>
            </EmailRow>

            <EmailRow style={detailRow}>
              <Column style={iconCol}><Text style={icon}>📍</Text></Column>
              <Column>
                <Text style={detailLabel}>Location</Text>
                <Text style={detailValue}>{location}</Text>
              </Column>
            </EmailRow>

            <EmailRow style={detailRow}>
              <Column style={iconCol}><Text style={icon}>📅</Text></Column>
              <Column>
                <Text style={detailLabel}>Date</Text>
                <Text style={detailValue}>{dateRange}</Text>
              </Column>
            </EmailRow>

            {timeRange && (
              <EmailRow style={detailRow}>
                <Column style={iconCol}><Text style={icon}>⏰</Text></Column>
                <Column>
                  <Text style={detailLabel}>Time</Text>
                  <Text style={detailValue}>{timeRange}</Text>
                </Column>
              </EmailRow>
            )}
          </Section>

          {/* Products */}
          {products.length > 0 && (
            <>
              <Text style={sectionLabel}>Products / Materials</Text>
              <Section style={productsTable}>
                {products.map((p, i) => (
                  <EmailRow key={i} style={i % 2 === 0 ? productRowEven : productRowOdd}>
                    <Column style={{ padding: '8px 12px' }}>
                      <Text style={productName}>{p.name}</Text>
                      {p.sku && <Text style={productMeta}>SKU: {p.sku}</Text>}
                    </Column>
                    <Column style={{ padding: '8px 12px', textAlign: 'right' as const, whiteSpace: 'nowrap' as const }}>
                      {(p.quantity != null) && (
                        <Text style={productQty}>{p.quantity}{p.unit ? ` ${p.unit}` : ''}</Text>
                      )}
                    </Column>
                  </EmailRow>
                ))}
              </Section>
            </>
          )}

          {/* Notes */}
          {notes && (
            <>
              <Text style={sectionLabel}>Notes</Text>
              <Section style={notesBox}>
                <Text style={notesText}>{notes}</Text>
              </Section>
            </>
          )}

          {/* CTA */}
          <Hr style={divider} />
          <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
            <Link href={dashLink} style={ctaButton}>View Installation Dashboard</Link>
          </Section>

          <Text style={footer}>
            Please reply to confirm receipt or contact your supervisor if you have any questions.
            This is an automated notification from WCI Wallpapers.
          </Text>

          <Section style={socialSection}>
            <EmailRow>
              <Column align="left">
                <Link href={SITE_URL} style={siteLink}>wallcoverings.co.za</Link>
              </Column>
            </EmailRow>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry = {
  component: InstallerNotificationEmail,
  subject: ({ installationTitle, scheduledDate }) => {
    const d = scheduledDate
      ? new Date(scheduledDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'TBC'
    return `Installation Scheduled: ${installationTitle ?? 'New Job'} – ${d}`
  },
  from: 'WCI Installations <installations@notify.wallcoverings.co.za>',
}

export default InstallerNotificationEmail

// ── Styles ────────────────────────────────────────────────────

const main: React.CSSProperties = {
  backgroundColor: '#f4f4f5',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const container: React.CSSProperties = {
  maxWidth: '560px',
  margin: '32px auto',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  overflow: 'hidden',
  padding: '32px',
  border: '1px solid #e4e4e7',
}

const logo: React.CSSProperties = { margin: '0 0 8px' }

const divider: React.CSSProperties = {
  borderTop: '1px solid #e4e4e7',
  margin: '16px 0',
}

const lightDivider: React.CSSProperties = {
  borderTop: '1px solid #f4f4f5',
  margin: '8px 0',
}

const h1: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: '700',
  color: '#18181b',
  margin: '0 0 8px',
}

const intro: React.CSSProperties = {
  fontSize: '14px',
  color: '#52525b',
  margin: '0 0 20px',
  lineHeight: '1.6',
}

const sectionLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '700',
  color: '#71717a',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  margin: '20px 0 8px',
}

const card: React.CSSProperties = {
  backgroundColor: '#fafafa',
  borderRadius: '8px',
  border: '1px solid #e4e4e7',
  padding: '16px',
  marginBottom: '4px',
}

const cardTitle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '700',
  color: '#18181b',
  margin: '0 0 8px',
}

const detailRow: React.CSSProperties = { margin: '6px 0' }

const iconCol: React.CSSProperties = {
  width: '28px',
  verticalAlign: 'top' as const,
}

const icon: React.CSSProperties = {
  fontSize: '14px',
  margin: '2px 0 0',
  lineHeight: '1.4',
}

const detailLabel: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: '600',
  color: '#a1a1aa',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '0',
}

const detailValue: React.CSSProperties = {
  fontSize: '13px',
  color: '#18181b',
  margin: '1px 0 0',
  fontWeight: '500',
}

const productsTable: React.CSSProperties = {
  border: '1px solid #e4e4e7',
  borderRadius: '8px',
  overflow: 'hidden',
}

const productRowEven: React.CSSProperties = { backgroundColor: '#fafafa' }
const productRowOdd:  React.CSSProperties = { backgroundColor: '#ffffff' }

const productName: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '500',
  color: '#18181b',
  margin: 0,
}

const productMeta: React.CSSProperties = {
  fontSize: '11px',
  color: '#a1a1aa',
  margin: '2px 0 0',
}

const productQty: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#3f3f46',
  margin: 0,
}

const notesBox: React.CSSProperties = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fde68a',
  borderRadius: '8px',
  padding: '12px 16px',
}

const notesText: React.CSSProperties = {
  fontSize: '13px',
  color: '#78350f',
  margin: 0,
  lineHeight: '1.6',
}

const ctaButton: React.CSSProperties = {
  display: 'inline-block' as const,
  backgroundColor: '#18181b',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: '600',
  padding: '12px 28px',
  borderRadius: '8px',
  textDecoration: 'none',
}

const footer: React.CSSProperties = {
  fontSize: '11px',
  color: '#a1a1aa',
  margin: '0 0 16px',
  lineHeight: '1.6',
  textAlign: 'center' as const,
}

const socialSection: React.CSSProperties = { margin: '0' }

const siteLink: React.CSSProperties = {
  fontSize: '11px',
  color: '#a1a1aa',
  textDecoration: 'none',
}
