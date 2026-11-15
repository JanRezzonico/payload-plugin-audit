import type { IncomingPluginConfig, PluginConfig } from '../types.js'

import { AuditPluginValidationError } from '../../utils/AuditPluginValidationError.js'

/**
 * @throws `AuditPluginValidationError` if the config is not valid
 */
const validateUserCollections = (
  incomingConfig: IncomingPluginConfig['userCollections'],
): PluginConfig['userCollections'] => {
  if (incomingConfig.length === 0) {
    throw new AuditPluginValidationError('User collections config cannot be empty')
  }
  return incomingConfig
}

export { validateUserCollections }
