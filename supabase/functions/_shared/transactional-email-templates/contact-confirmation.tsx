import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Wallcoverings'

interface Props {
  name?: string
  formType?: string
}

const ContactConfirmationEmail = ({ name, formType }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Thank you for contacting {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{SITE_NAME}</Text>
        <Hr style={divider} />
        <Heading style={h1}>
          {name ? `Thank you, ${name}.` : 'Thank you for reaching out.'}
        </Heading>
        <Text style={text}>
          We have received your {formType || 'enquiry'} and a member of our team will be in touch shortly.
        </Text>
        <Text style={text}>
          If your matter is urgent, please don't hesitate to reach out to us directly.
        </Text>
        <Hr style={divider} />
        <Text style={footer}>
          Warm regards,<br />The {SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactConfirmationEmail,
  subject: "We've received your enquiry",
  displayName: 'Contact confirmation',
  previewData: { name: 'Jane', formType: 'general enquiry' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '40px 30px', maxWidth: '560px', margin: '0 auto' }
const brand = { fontSize: '13px', letterSpacing: '3px', color: '#1C1C1C', textTransform: 'uppercase' as const, margin: '0 0 20px' }
const divider = { borderColor: '#D8D6D1', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: '400' as const, color: '#1C1C1C', lineHeight: '1.4', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#6F6F6F', lineHeight: '1.7', margin: '0 0 16px' }
const footer = { fontSize: '13px', color: '#BFBAB0', lineHeight: '1.6', margin: '20px 0 0' }
