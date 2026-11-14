import type { IncomingPluginConfig, PluginConfig } from '../types.js'

/**
 * @throws Error if the config is not valid
 */
const validateCollections = (
  collections: IncomingPluginConfig['collections'],
): PluginConfig['collections'] => {
  if (collections.length === 0) {
    throw new Error('Collections config cannot be empty')
  }
  return collections
}

export { validateCollections }
