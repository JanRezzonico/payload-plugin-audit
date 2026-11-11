import type { CollectionSlug } from 'payload'

import type { ConfigCanAccessAudits } from './can-access-audits/types.js'
import type { EnabledCollections } from './collection-configs/types.js'
import type {
  ConfigCustomizeFields,
  OptionalConfigCustomizeFields,
} from './customize-fields/types.js'

import { mergeCustomizeFields } from './customize-fields/index.js'

type IncomingAuditPluginPayloadConfig = {
  /**
   * Payload access control for the audit plugin.
   * This function determines whether a user can access the audit logs
   * at both API and admin UI levels.
   */
  canAccessAudits: ConfigCanAccessAudits
  /**
   * Optional customization for the audit plugin's fields.
   * This allows you to modify the appearance and behavior of the audit fields,
   * and localize the labels if needed. If not provided, default values will be used.
   */
  customizeFields?: OptionalConfigCustomizeFields
  /**
   * Optional flag to disable the audit plugin.
   * If set to true, the plugin will not be active, no audit fields will be added to collections
   * and no audit hooks will be executed.
   * @default false (plugin is enabled)
   */
  disabled?: boolean
  /**
   * Enable / Disable audit logging for specific collections.
   * Unspecified collections will default to false (audit logging disabled).
   */
  enabledCollections: EnabledCollections
  /**
   * The name of the collection that contains user data.
   * This is used to establish relationships between audit fields and the user collection.
   * It should match the slug of the user collection in your Payload configuration.
   */
  userCollection: CollectionSlug
}

type AuditPluginPayloadConfig = {
  customizeFields: ConfigCustomizeFields
  disabled: false
  logsCollectionSlug: 'audit-plugin-logs'
} & IncomingAuditPluginPayloadConfig

const isPluginEnabled = (config: IncomingAuditPluginPayloadConfig): boolean => {
  if (config.disabled) {
    return false
  }

  if (config.enabledCollections.length === 0) {
    return false
  }

  return true
}

const preparePluginConfig = (
  config: IncomingAuditPluginPayloadConfig,
): AuditPluginPayloadConfig => {
  if (!isPluginEnabled(config)) {
    throw new Error('Invalid audit plugin configuration')
  }
  const customizeFields = mergeCustomizeFields(config.customizeFields)

  return {
    ...config,
    customizeFields,
    disabled: false,
    logsCollectionSlug: 'audit-plugin-logs' as const,
  }
}

export type { AuditPluginPayloadConfig, IncomingAuditPluginPayloadConfig }
export { isPluginEnabled, preparePluginConfig }
