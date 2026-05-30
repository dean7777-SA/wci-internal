/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as contactConfirmation } from './contact-confirmation.tsx'
import { template as contactConfirmationProject } from './contact-confirmation-project.tsx'
import { template as contactConfirmationBespoke } from './contact-confirmation-bespoke.tsx'
import { template as contactConfirmationTrade } from './contact-confirmation-trade.tsx'
import { template as contactConfirmationGeneral } from './contact-confirmation-general.tsx'
import { template as contactNotification } from './contact-notification.tsx'
import { template as estimateConfirmation } from './estimate-confirmation.tsx'
import { template as estimateNotification } from './estimate-notification.tsx'
import { template as assignmentNotification } from './assignment-notification.tsx'
import { template as migrationNotice } from './migration-notice.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'contact-confirmation': contactConfirmation,
  'contact-confirmation-project': contactConfirmationProject,
  'contact-confirmation-bespoke': contactConfirmationBespoke,
  'contact-confirmation-trade': contactConfirmationTrade,
  'contact-confirmation-general': contactConfirmationGeneral,
  'contact-notification': contactNotification,
  'estimate-confirmation': estimateConfirmation,
  'estimate-notification': estimateNotification,
  'assignment-notification': assignmentNotification,
  'migration-notice': migrationNotice,
}
