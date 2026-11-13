import type { AccessManage, AccessRead, ConfigLogsCollectionHidden } from './access/types.js'
import type { EnabledCollections } from './collections/types.js'
import type { ConfigCustom, OptionalConfigCustom } from './custom/types.js'
import type { IncomingUserCollections, UserCollections } from './user-collections/types.js'

type IncomingAuditPluginPayloadConfig = {
  /**
   * Payload access control functions.
   * Controls access to manage and view audit logs and the corresponding audit fields.
   */
  access: {
    /**
     * Payload access control function.
     * Controls access to manage audit logs and the corresponding audit fields.
     */
    manage: AccessManage
    /**
     * Payload access control function.
     * Controls access to view audit logs and the corresponding audit fields.
     */
    read: AccessRead
  }

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
   * Anyone allowed by `access.read` can also see the collection in the admin panel.
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
