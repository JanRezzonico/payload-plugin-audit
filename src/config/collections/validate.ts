import { AuditPluginValidationError } from 'src/utils/AuditPluginValidationError.js'

import type { IncomingPluginConfig, PluginConfig } from '../types.js'

/**
 * @throws `AuditPluginValidationError` if the config is not valid
 */
const validateCollections = (
  collections: IncomingPluginConfig['collections'],
): PluginConfig['collections'] => {
  if (collections.length === 0) {
    throw new AuditPluginValidationError('collections must contain at least one collection slug')
  }
  return collections
}

export { validateCollections }
