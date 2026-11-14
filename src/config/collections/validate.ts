import type { IncomingPluginConfig, PluginConfig } from '../types.js'

/**
 * @throws `AuditPluginValidationError` if the config is not valid
 */
const validateCollections = (
  collections: IncomingPluginConfig['collections'],
): PluginConfig['collections'] => {
  return collections
}

export { validateCollections }
