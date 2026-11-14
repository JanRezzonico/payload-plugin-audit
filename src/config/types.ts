import type { ConfigAccess } from './access/types.js'
import type { ConfigCollections } from './collections/types.js'
import type { ConfigDb } from './db/types.js'
import type { ConfigDisabled } from './disabled/types.js'
import type { ConfigUi } from './ui/types.js'
import type { ConfigUserCollections } from './user-collections/types.js'

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

type PluginConfig = {
  access: ConfigAccess

  collections: ConfigCollections

  db: ConfigDb

  disabled: ConfigDisabled

  ui: ConfigUi

  userCollections: ConfigUserCollections
}

type IncomingPluginConfig = {
  access: ConfigAccess

  collections: ConfigCollections

  db?: DeepPartial<ConfigDb>

  disabled?: DeepPartial<ConfigDisabled>

  ui?: DeepPartial<ConfigUi>

  userCollections: ConfigUserCollections
}

export type { DeepPartial, IncomingPluginConfig, PluginConfig }
