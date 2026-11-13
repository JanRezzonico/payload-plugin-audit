import type {
  ConfigCanManageAudits,
  ConfigCanSeeAudits,
  ConfigLogsCollectionHidden,
} from './access/types.js'
import type { EnabledCollections } from './collections/types.js'
import type { ConfigCustom, OptionalConfigCustom } from './custom/types.js'
import type { IncomingUserCollections, UserCollections } from './user-collections/types.js'

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
   * Collections that should receive audit logging.
   */
  collections: EnabledCollections

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
  userCollections: UserCollections
} & IncomingAuditPluginPayloadConfig

export type { AuditPluginPayloadConfig, IncomingAuditPluginPayloadConfig }
