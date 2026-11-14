import { deepMergeWithSourceArrays } from 'payload'

import type { IncomingPluginConfig, PluginConfig } from '../types.js'

import { uiDefaults } from './defaults.js'

/**
 * @throws Error if the config is not valid
 */
const validateUi = (incomingConfig: IncomingPluginConfig['ui']): PluginConfig['ui'] => {
  const merged: PluginConfig['ui'] = deepMergeWithSourceArrays(uiDefaults, incomingConfig ?? {})

  merged.fields.user.description.beforeCollection =
    merged.fields.user.description.beforeCollection.trim() + ' '

  merged.fields.user.description.beforeUserId =
    merged.fields.user.description.beforeUserId.trim() + ' '

  return merged
}

export { validateUi }
