import type {
  ConfigCanManageAudits,
  ConfigCanSeeAudits,
  ConfigLogsCollectionHidden,
} from './access/types.js'
import type { EnabledCollections } from './collection-configs/types.js'
import type { ConfigCustom, OptionalConfigCustom } from './custom/types.js'
import type { IncomingUserCollections, UserCollections } from './user-collections/types.js'

type Slugs = {
  createdByVirtualField: `${Slugs['pluginPrefix']}-created-by`
  logsCollection: `${Slugs['pluginPrefix']}-logs`
  pluginPrefix: 'audit-plugin'
  updateDeltaVirtualField: `${Slugs['pluginPrefix']}-update-delta`
}

type IncomingAuditPluginPayloadConfig = {
  /**
   * Payload access control function.
   * Controls access to manage audit logs and the corresponding audit fields.
   */
  canManageAudits: ConfigCanManageAudits

  /**
   * Payload access control function.
   * Controls access to view audit logs and the corresponding audit fields.
   */
  canSeeAudits: ConfigCanSeeAudits

  /**
   * Customizes labels and date formatting for fields added by the plugin.
   */
  custom?: OptionalConfigCustom

  /**
   * Disables the plugin when set to true.
   *
   * @default false
   */
  disabled?: boolean

  /**
   * Collections that should receive audit logging.
   */
  enabledCollections: EnabledCollections

  /**
   * Hides the audit logs collection from the Payload admin panel when true.
   *
   * @default false
   * Anyone allowed by `canSeeAudits` can also see the collection in the admin panel.
   */
  logsCollectionHidden?: ConfigLogsCollectionHidden

  /**
   * The collection slugs used for users associated with audit records.
   */
  userCollections: IncomingUserCollections
}

type AuditPluginPayloadConfig = {
  custom: ConfigCustom
  disabled: false
  logsCollectionHidden: ConfigLogsCollectionHidden
  slugs: Slugs
  userCollections: UserCollections
} & IncomingAuditPluginPayloadConfig

export type { AuditPluginPayloadConfig, IncomingAuditPluginPayloadConfig }
