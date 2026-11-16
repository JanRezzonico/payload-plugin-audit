import { deepMergeWithSourceArrays } from 'payload'

import type { IncomingPluginConfig, PluginConfig } from '../types.js'

import { uiDefaults } from './defaults.js'

/**
 * @throws `AuditPluginValidationError` if the config is not valid
 */
const validateUi = (incomingConfig: IncomingPluginConfig['ui']): PluginConfig['ui'] => {
  const merged: PluginConfig['ui'] = deepMergeWithSourceArrays(uiDefaults, incomingConfig ?? {})

  merged.fields.user.description.beforeCollection =
    merged.fields.user.description.beforeCollection.trim() + ' '

  merged.fields.user.description.beforeId = merged.fields.user.description.beforeId.trim() + ' '

  merged.fields.entity.description.beforeCollection =
    merged.fields.entity.description.beforeCollection.trim() + ' '

  merged.fields.entity.description.beforeId = merged.fields.entity.description.beforeId.trim() + ' '

  return merged
}
export { validateUi }
