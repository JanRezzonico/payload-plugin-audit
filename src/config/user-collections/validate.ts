import type { IncomingPluginConfig, PluginConfig } from '../types.js'

/**
 * @throws Error if the config is not valid
 */
const validateUserCollections = (
  incomingConfig: IncomingPluginConfig['userCollections'],
): PluginConfig['userCollections'] => {
  if (incomingConfig.length === 0) {
    throw new Error('User collections config cannot be empty')
  }
  return incomingConfig
}

export { validateUserCollections }
