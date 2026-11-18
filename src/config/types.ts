import type { ConfigAccess } from './access/types.js'
import type { ConfigCollections } from './collections/types.js'
import type { ConfigDb } from './db/types.js'
import type { ConfigState } from './state/types.js'
import type { ConfigUi } from './ui/types.js'
import type { ConfigUserCollections } from './user-collections/types.js'

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

type PluginConfig = {
  access: ConfigAccess

  collections: ConfigCollections

  db: ConfigDb

  state: ConfigState

  ui: ConfigUi

  userCollections: ConfigUserCollections
}

type IncomingPluginConfig = {
  /**
   * Payload access control configuration for the audit plugin.
   */
  access: Partial<ConfigAccess>

  /**
   * Payload configuration for the collections that should be audited.
   *
   * This is an array of collection slugs.
   *
   * Note: specifying an empty array will throw an error during the plugin initialization.
   *
   * The audit logs collection itself can never be audited and is automatically excluded from this configuration.
   *
   * @example ['posts', 'media']
   */
  collections: ConfigCollections

  /**
   * Configuration for the collections and fields used by the audit plugin in the database.
   *
   * This configuration allows you to customize the names of the collections and fields used by the audit plugin.
   *
   * Note that modifying these fields could warrant a database migration, as these configurations are
   * used to create the collections and fields in the database.
   */
  db?: DeepPartial<ConfigDb>

  /**
   * Controls the activation state of the audit plugin.
   *
   * - `enabled`: Normal behavior. The plugin functions as expected.
   * - `disabled`: Disables hooks, collections and virtual fields. Transitioning from `enabled` to `disabled` requires a database migration and a type update to remove the audit plugin's data.
   * - `inactive`: Disables hooks while keeping collections and virtual fields. No new audit logs will be generated.
   *
   * @default 'enabled'
   */
  state?: DeepPartial<ConfigState>

  /**
   * Various UI configuration options to customize the look
   * of the audit plugin in the Payload admin panel.
   */
  ui?: DeepPartial<ConfigUi>

  /**
   * List of collection slugs that are considered user collections.
   *
   * Include all collections that are auth-enabled and could interact
   * with a collection that is being audited.
   *
   * Note: specifying an empty array will throw an error during the plugin initialization.
   *
   * @example ['users']
   */
  userCollections: ConfigUserCollections
}

export type { DeepPartial, IncomingPluginConfig, PluginConfig }
