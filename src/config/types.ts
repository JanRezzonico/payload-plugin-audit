import type { CollectionSlug } from 'payload'

import type { ConfigCanManageAudits, ConfigCanSeeAudits } from './access/types.js'
import type { EnabledCollections } from './collection-configs/types.js'
import type {
  ConfigCustomizeFields,
  OptionalConfigCustomizeFields,
} from './customize-fields/types.js'

type IncomingAuditPluginPayloadConfig = {
  canManageAudits: ConfigCanManageAudits

  canSeeAudits: ConfigCanSeeAudits

  customizeFields?: OptionalConfigCustomizeFields

  disabled?: boolean

  enabledCollections: EnabledCollections

  userCollection: CollectionSlug
}

type AuditPluginPayloadConfig = {
  customizeFields: ConfigCustomizeFields
  disabled: false
  logsCollectionSlug: `audit-plugin-logs`
  pluginPrefix: 'audit-plugin'
} & IncomingAuditPluginPayloadConfig

export type { AuditPluginPayloadConfig, IncomingAuditPluginPayloadConfig }
