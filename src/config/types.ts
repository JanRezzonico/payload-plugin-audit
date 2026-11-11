import type { CollectionSlug } from 'payload'

import type {
  ConfigCanManageAudits,
  ConfigCanSeeAudits,
  ConfigLogsCollectionHidden,
} from './access/types.js'
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

  logsCollectionHidden?: ConfigLogsCollectionHidden

  userCollection: CollectionSlug
}

type AuditPluginPayloadConfig = {
  customizeFields: ConfigCustomizeFields
  disabled: false
  logsCollectionHidden: ConfigLogsCollectionHidden
  logsCollectionSlug: `audit-plugin-logs`
  pluginPrefix: 'audit-plugin'
} & IncomingAuditPluginPayloadConfig

export type { AuditPluginPayloadConfig, IncomingAuditPluginPayloadConfig }
